import { useCallback, useState, useRef } from 'react';
import { RedactionMapping } from '../types/types';
import { batchHybridDetect, batchRedactPdfs } from '../services/BatchApiService';
import { BatchSearchService } from '../services/BatchSearchService';
import { getFileKey } from '../contexts/PDFViewerContext';

/**
 * Hook for calling PDF-related API endpoints with state management
 */
export const usePDFApi = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileErrors, setFileErrors] = useState<Map<string, string>>(new Map());
    const [progress, setProgress] = useState<number>(0);

    // Store cached detection results with a stable reference
    const detectionResultsCache = useRef<Map<string, any>>(new Map());

    // API result cache for memoization
    const apiResultCache = useRef<Map<string, any>>(new Map());

    // Reset error state
    const resetErrors = useCallback(() => {
        setError(null);
        setFileErrors(new Map());
    }, []);

    /**
     * Create a stable cache key for API operations
     */
    const getOrCreateCacheKey = useCallback((files: File[], operation: string, options: any = {}): string => {
        // Create a stable cache key based on file keys and options
        const fileKeys = files.map(file => getFileKey(file)).sort((a, b) => a.localeCompare(b)).join('-');
        const optionsString = JSON.stringify(options);
        return `${operation}-${fileKeys}-${optionsString}`;
    }, []);

    /**
     * Get cached result if available
     */
    const getCachedResult = useCallback((cacheKey: string) => {
        return apiResultCache.current.get(cacheKey);
    }, []);

    /**
     * Set result in cache
     */
    const setCachedResult = useCallback((cacheKey: string, result: any) => {
        apiResultCache.current.set(cacheKey, result);
    }, []);

    /**
     * Get cached detection results for a specific file
     */
    const getDetectionResults = useCallback((fileKey: string): any => {
        const result = detectionResultsCache.current.get(fileKey);
        if (result) {
            return result;
        }
        return null;
    }, []);

    /**
     * Update the runBatchHybridDetect function to properly store results
     */
    const runBatchHybridDetect = useCallback(async (
        files: File[],
        options: {
            presidio?: string[] | null ;
            gliner?: string[] | null;
            gemini?: string[] | null;
        } = {}
    ): Promise<Record<string, any>> => {
        if (files.length === 0) {
            return {};
        }

        setLoading(true);
        resetErrors();
        setProgress(0);

        try {
            // Create cache key
            const cacheKey = getOrCreateCacheKey(files, 'hybrid-detect', options);

            // Check cache first
            const cachedResult = getCachedResult(cacheKey);
            if (cachedResult) {
                console.log(`[APIDebug] Using cached results for batch detection`);
                setProgress(100);
                return cachedResult;
            }

            console.log(`[APIDebug] Starting batch hybrid detection for ${files.length} files`);

            // Progressive progress updates
            setProgress(10);

            // Call the batch hybrid detection API
            const results = await batchHybridDetect(files, options);

            setProgress(50);

            console.log(`[APIDebug] Detection complete for ${Object.keys(results).length} files`);

            // Process each file to use the proper file key
            // Clear existing cache entries for these files first to prevent stale data
            files.forEach(file => {
                const fileKey = getFileKey(file);
                detectionResultsCache.current.delete(fileKey);
            });

            // Map file objects to their keys to ensure proper caching
            const resultsWithCorrectKeys: Record<string, any> = {};
            setProgress(80);
            // Process each file to use the proper file key
            files.forEach(file => {
                const fileKey = getFileKey(file);
                const fileName = file.name;

                // If we have results for this file name, store them with the fileKey
                if (results[fileName]) {
                    // FIXED: Create a deep copy of the results to ensure isolation between files
                    const resultCopy = JSON.parse(JSON.stringify(results[fileName]));

                    // Add file information to detection results for better tracking
                    if (resultCopy.pages) {
                        resultCopy.fileKey = fileKey;
                        resultCopy.fileName = fileName;
                    }

                    resultsWithCorrectKeys[fileKey] = resultCopy;

                    // Store in our detection cache
                    detectionResultsCache.current.set(fileKey, resultCopy);
                    console.log(`[APIDebug] Mapped detection results from ${fileName} to ${fileKey}`);
                }
            });

            // Store in API cache
            setCachedResult(cacheKey, resultsWithCorrectKeys);

            console.log(`[APIDebug] Updated detection results cache:`,
                `(${Object.keys(resultsWithCorrectKeys).length})`,
                Object.keys(resultsWithCorrectKeys));

            setProgress(100);
            return resultsWithCorrectKeys;
        } catch (err: any) {
            const errorMsg = err.message || 'Error in batch hybrid detection';
            setError(errorMsg);
            setProgress(0);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [getOrCreateCacheKey, getCachedResult, setCachedResult, resetErrors]);

    /**
     * Redact a single PDF file
     */
    const runRedactPdf = useCallback(async (
        file: File,
        redactionMapping: RedactionMapping,
        remove_images : boolean = false
    ): Promise<Blob> => {
        // Implementation unchanged
        setLoading(true);
        resetErrors();
        setProgress(0);

        try {
            console.log(`[APIDebug] Starting redaction for file: ${file.name}`);

            // Create a mapping object with this file's redaction mapping
            const fileKey = getFileKey(file);
            const mappings: Record<string, RedactionMapping> = {
                [fileKey]: redactionMapping
            };

            setProgress(20);

            // Use the batch API with a single file
            const result = await batchRedactPdfs([file], mappings, remove_images);

            setProgress(100);

            // Return the blob for the redacted file
            const redactedBlob = result[fileKey];
            if (!redactedBlob) {
                setError(`No redacted PDF returned for ${file.name}`);
            }
            return redactedBlob;
        } catch (err: any) {
            const errorMsg = err.message || 'Error in redaction';
            setError(errorMsg);
            setProgress(0);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [resetErrors]);

    /**
     * Redact multiple PDF files in batch
     */
    const runBatchRedactPdfs = useCallback(async (
        files: File[],
        redactionMappings: Record<string, RedactionMapping>,
        remove_images : boolean = false
    ): Promise<Record<string, Blob>> => {
        // Implementation unchanged
        if (files.length === 0) {
            return {};
        }

        setLoading(true);
        resetErrors();
        setProgress(0);

        try {
            console.log(`[APIDebug] Starting batch redaction for ${files.length} files`);

            // Filter files to only those with redaction mappings
            const filesToRedact = files.filter(file => {
                const fileKey = getFileKey(file);
                return !!redactionMappings[fileKey];
            });

            if (filesToRedact.length === 0) {
                setError('No files with valid redaction mappings');
            }

            setProgress(10);

            // Call the batch redaction API
            const results = await batchRedactPdfs(filesToRedact, redactionMappings, remove_images);

            setProgress(100);
            return results;
        } catch (err: any) {
            const errorMsg = err.message || 'Error in batch redaction';
            setError(errorMsg);
            setProgress(0);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [resetErrors]);

    /**
     * Run a batch search across multiple files
     */
    const runBatchSearch = useCallback(async (
        files: File[],
        searchTerm: string,
        options: {
            case_sensitive?: boolean;
            isCaseSensitive?: boolean;
            isAiSearch?: boolean;
            ai_search?: boolean;
        } = {}
    ): Promise<any> => {
        // Implementation unchanged
        if (files.length === 0 || !searchTerm.trim()) {
            throw new Error('Files and search term are required');
        }

        setLoading(true);
        resetErrors();
        setProgress(0);

        try {
            // Create cache key for search
            const cacheKey = getOrCreateCacheKey(files, 'search', {
                term: searchTerm,
                ...options
            });

            // Check cache first
            const cachedResult = getCachedResult(cacheKey);
            if (cachedResult) {
                console.log(`[APIDebug] Using cached results for search: "${searchTerm}"`);
                setProgress(100);
                return cachedResult;
            }

            console.log(`[APIDebug] Searching for "${searchTerm}" in ${files.length} files`);

            setProgress(10);

            // Call the batch search API
            const results = await BatchSearchService.batchSearch(
                files,
                searchTerm,
                {
                    case_sensitive: options.isCaseSensitive,
                    ai_search: options.isAiSearch
                }
            );

            // Cache results
            setCachedResult(cacheKey, results);

            setProgress(100);

            console.log(`[APIDebug] Search found ${results.batch_summary?.total_matches || 0} matches`);

            return results;
        } catch (error: any) {
            console.error("[APIDebug] Search error:", error);
            setError(error.message || 'Error during batch search');
            setProgress(0);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [getOrCreateCacheKey, getCachedResult, setCachedResult, resetErrors]);

    /**
     * Clear detection results cache for specific files or all files
     */
    const clearDetectionCache = useCallback((fileKeys?: string[]) => {
        if (fileKeys && fileKeys.length > 0) {
            // Clear only specific file keys
            fileKeys.forEach(key => {
                detectionResultsCache.current.delete(key);
            });
            console.log(`[APIDebug] Cleared detection cache for ${fileKeys.length} files`);
        } else {
            // Clear entire cache
            detectionResultsCache.current.clear();
            console.log(`[APIDebug] Cleared entire detection cache`);
        }
    }, []);

    return {
        // State
        loading,
        error,
        fileErrors,
        progress,

        // Main API methods
        runBatchHybridDetect,
        getDetectionResults,
        runRedactPdf,
        runBatchRedactPdfs,
        runBatchSearch,

        // Cache management
        clearDetectionCache,

        // Utility
        resetErrors
    };
};
