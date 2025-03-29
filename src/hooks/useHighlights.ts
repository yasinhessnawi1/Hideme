// src/hooks/useHighlights.ts
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { HighlightType, useHighlightContext } from '../contexts/HighlightContext';
import { useEditContext } from '../contexts/EditContext';
import { usePDFViewerContext } from '../contexts/PDFViewerContext';
import { useBatchSearch } from '../contexts/SearchContext';
import { usePDFApi } from '../hooks/usePDFApi';
import { EntityHighlightManager } from '../utils/EntityHighlightManager';
import { SearchHighlightManager } from '../utils/SearchHighlightManager';
import { PDFPageViewport } from '../types/pdfTypes';

interface UseHighlightsProps {
    pageNumber: number;
    viewport: PDFPageViewport | null;
    textContent: any | null;
    fileKey?: string; // Optional file key for multi-file support
}

/**
 * Custom hook to manage PDF highlights (search, entity, manual)
 * Optimized for better performance and reduced re-renders
 */
export const useHighlights = ({ pageNumber, viewport, textContent, fileKey }: UseHighlightsProps) => {
    const {
        getAnnotations,
        addAnnotation,
        clearAnnotationsByType,
        getNextHighlightId
    } = useHighlightContext();

    const {
        detectionMapping,
        showSearchHighlights,
        showEntityHighlights,
        showManualHighlights,
        getFileDetectionMapping
    } = useEditContext();

    const { getFileRenderedPages } = usePDFViewerContext();
    const { getDetectionResults } = usePDFApi();

    // Get batch search context
    const { getSearchResultsForPage } = useBatchSearch();

    // Track processed pages with refs to prevent unnecessary re-processing
    // Enhanced with better file isolation
    const processedSearchPagesRef = useRef<Map<string, Set<number>>>(new Map());
    const processedEntityPagesRef = useRef<Map<string, Set<number>>>(new Map());

    // Use refs to track processing in progress to prevent duplicate processing
    const searchProcessingRef = useRef<Set<string>>(new Set());
    const entityProcessingRef = useRef<Set<string>>(new Set());

    // Improved cache structure for better file isolation
    const annotationsCache = useRef<Map<string, Map<number, any[]>>>(new Map());
    const [annotationUpdateTrigger, setAnnotationUpdateTrigger] = useState(0);

    // Add a debounce flag to prevent too frequent updates
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Track unmounting for cleanup
    const isMountedRef = useRef(true);

    // Track the last processed file to prevent unnecessary reprocessing
    const lastProcessedFileRef = useRef<string | null>(null);

    // Track if a file is new (not seen before)
    const newFilesRef = useRef<Set<string>>(new Set());

    // Get rendered pages for the current file - memoized
    const renderedPages = useMemo(() => {
        return fileKey ? getFileRenderedPages(fileKey) : new Set([pageNumber]);
    }, [fileKey, getFileRenderedPages, pageNumber]);

    // Get detection results for this file - memoized
    const fileDetectionMapping = useMemo(() => {
        if (!fileKey) return detectionMapping;

        // First try to get from EditContext file mappings
        const contextMapping = getFileDetectionMapping(fileKey);
        if (contextMapping) {
            return contextMapping;
        }

        // Then try to get from API cache
        const apiResult = getDetectionResults(fileKey);
        if (apiResult) {
            return apiResult;
        }

        // Fall back to context for backward compatibility
        return detectionMapping;
    }, [fileKey, getFileDetectionMapping, getDetectionResults, detectionMapping]);

    // Get a unique cache key for this page and file - memoized
    const getPageKey = useCallback((page: number, fileKey?: string): string => {
        return `${fileKey || '_default'}-${page}`;
    }, []);

    // Debounced trigger for annotation updates
    const triggerAnnotationUpdate = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
                setAnnotationUpdateTrigger(prev => prev + 1);
            }
            debounceTimerRef.current = null;
        }, 50); // 50ms debounce
    }, []);

    // Check if a file is new (not processed before)
    const isNewFile = useCallback((fileKey: string): boolean => {
        if (!fileKey) return false;

        // If we've already marked it as new, return true
        if (newFilesRef.current.has(fileKey)) {
            return true;
        }

        // Check if we have any processed entity pages for this file
        const hasProcessedEntityPages = processedEntityPagesRef.current.has(fileKey) &&
            processedEntityPagesRef.current.get(fileKey)!.size > 0;

        // Check if we have any processed search pages for this file
        const hasProcessedSearchPages = processedSearchPagesRef.current.has(fileKey) &&
            processedSearchPagesRef.current.get(fileKey)!.size > 0;

        // Check if EntityHighlightManager has processed entities for this file
        const hasProcessedEntities = typeof EntityHighlightManager.hasProcessedEntitiesForFile === 'function' &&
            EntityHighlightManager.hasProcessedEntitiesForFile(fileKey);

        // If none of these are true, it's a new file
        const isNew = !hasProcessedEntityPages && !hasProcessedSearchPages && !hasProcessedEntities;

        // If it's new, add it to our set of new files
        if (isNew) {
            newFilesRef.current.add(fileKey);
        }

        return isNew;
    }, []);

    // Initialize a new file with proper highlighting
    const initializeNewFile = useCallback((fileKey: string) => {
        if (!fileKey) return;

        console.log(`[useHighlights] Initializing new file: ${fileKey}`);

        // Reset any existing processed data for this file to ensure clean state
        if (typeof EntityHighlightManager.resetProcessedEntitiesForFile === 'function') {
            EntityHighlightManager.resetProcessedEntitiesForFile(fileKey);
        }

        if (typeof SearchHighlightManager.resetProcessedDataForFile === 'function') {
            SearchHighlightManager.resetProcessedDataForFile(fileKey);
        }

        // Clear our local tracking for this file
        processedEntityPagesRef.current.delete(fileKey);
        processedSearchPagesRef.current.set(fileKey, new Set<number>());

        // Dispatch an event to force reprocessing highlights for this file
        window.dispatchEvent(new CustomEvent('reset-entity-highlights', {
            detail: {
                fileKey,
                resetType: 'new-file',
                forceProcess: true
            }
        }));

        // Update the last processed file
        lastProcessedFileRef.current = fileKey;

        // Trigger re-render to show highlights
        triggerAnnotationUpdate();
    }, [triggerAnnotationUpdate]);

    // Check for new files and initialize them
    useEffect(() => {
        if (!fileKey) return;

        // If this is a new file and not the last processed file
        if (isNewFile(fileKey) && lastProcessedFileRef.current !== fileKey) {
            initializeNewFile(fileKey);
        }
    }, [fileKey, isNewFile, initializeNewFile]);

    // Listen for reset entity highlights event with enhanced event data
    useEffect(() => {
        const handleResetEntityHighlights = (event: Event) => {
            console.log('[useHighlights] Received reset-entity-highlights event');

            // Check if this is a CustomEvent with detail
            const customEvent = event as CustomEvent;
            const eventDetail = customEvent.detail || {};
            const eventFileKey = eventDetail.fileKey;
            const resetType = eventDetail.resetType || 'unknown';
            const forceProcess = eventDetail.forceProcess || false;

            // Only reset if this is for our file, a global reset, or force processing is requested
            if (fileKey && eventFileKey && fileKey !== eventFileKey && !forceProcess) {
                console.log(`[useHighlights] Ignoring reset for different file: ${eventFileKey}, current: ${fileKey}`);
                return;
            }

            // If this is a file change reset, we don't clear entity highlights
            // This is the key change to fix entity highlight persistence
            if (resetType === 'file-change' && !forceProcess) {
                console.log(`[useHighlights] Skipping entity highlight reset for file change`);
                return;
            }

            // If we have a specific file key in the event and it matches our file key, or force processing is requested
            if ((fileKey && eventFileKey && fileKey === eventFileKey) || forceProcess) {
                // Clear processed entity pages for the current file
                if (fileKey) {
                    processedEntityPagesRef.current.delete(fileKey);
                    console.log(`[useHighlights] Reset processed entity pages for file ${fileKey}`);
                } else {
                    // If no fileKey, reset all
                    processedEntityPagesRef.current.clear();
                    console.log('[useHighlights] Reset all processed entity pages');
                }

                // Trigger re-render to reprocess highlights
                triggerAnnotationUpdate();
            } else if (!eventFileKey) {
                // Global reset with no specific file key
                processedEntityPagesRef.current.clear();
                console.log('[useHighlights] Reset all processed entity pages (global reset)');
                triggerAnnotationUpdate();
            }
        };

        window.addEventListener('reset-entity-highlights', handleResetEntityHighlights);

        return () => {
            window.removeEventListener('reset-entity-highlights', handleResetEntityHighlights);
        };
    }, [fileKey, triggerAnnotationUpdate]);

    // Expose the EntityHighlightManager's reset method to the window object
    useEffect(() => {
        // Add the reset function to the window object for global access
        window.resetEntityHighlightsForFile = (fileKey: string) => {
            if (typeof EntityHighlightManager.resetProcessedEntitiesForFile === 'function') {
                EntityHighlightManager.resetProcessedEntitiesForFile(fileKey);

                // Also reset our local tracking
                processedEntityPagesRef.current.delete(fileKey);

                console.log(`[useHighlights] Reset entity highlights for file ${fileKey} via global function`);
                return true;
            }
            return false;
        };

        // Add a function to remove file tracking when a file is removed
        window.removeFileHighlightTracking = (fileKey: string) => {
            if (!fileKey) return false;

            console.log(`[useHighlights] Removing highlight tracking for file ${fileKey}`);

            // Remove from EntityHighlightManager
            if (typeof EntityHighlightManager.removeFileFromProcessedEntities === 'function') {
                EntityHighlightManager.removeFileFromProcessedEntities(fileKey);
            }

            // Remove from SearchHighlightManager
            if (typeof SearchHighlightManager.removeFileFromProcessedData === 'function') {
                SearchHighlightManager.removeFileFromProcessedData(fileKey);
            }

            // Remove from our local tracking
            processedEntityPagesRef.current.delete(fileKey);
            processedSearchPagesRef.current.delete(fileKey);

            // Remove from annotations cache
            annotationsCache.current.delete(fileKey);

            // Remove from new files set
            newFilesRef.current.delete(fileKey);

            // If this was the last processed file, clear it
            if (lastProcessedFileRef.current === fileKey) {
                lastProcessedFileRef.current = null;
            }

            return true;
        };

        return () => {
            // Clean up when component unmounts
            delete window.resetEntityHighlightsForFile;
            delete window.removeFileHighlightTracking;
        };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Process search highlights with reduced re-renders and better file isolation
    useEffect(() => {
        // Skip if conditions aren't met
        if (!showSearchHighlights || !renderedPages.has(pageNumber)) {
            return;
        }

        // Generate a unique key for this page and file
        const fileKey1 = fileKey || '_default';
        const pageKey = getPageKey(pageNumber, fileKey1);

        // Skip if already processing
        if (searchProcessingRef.current.has(pageKey)) {
            return;
        }

        // Check if this page has already been processed by the SearchHighlightManager
        if (typeof SearchHighlightManager.isPageProcessedForFile === 'function' &&
            SearchHighlightManager.isPageProcessedForFile(fileKey1, pageNumber) &&
            !isNewFile(fileKey1)) {
            // Skip if already processed by the manager and not a new file
            return;
        }

        // Get the file's processed search pages
        let fileProcessedPages = processedSearchPagesRef.current.get(fileKey1);
        if (!fileProcessedPages) {
            fileProcessedPages = new Set<number>();
            processedSearchPagesRef.current.set(fileKey1, fileProcessedPages);
        }

        // Skip if this page is already processed for this file and not a new file
        if (fileProcessedPages.has(pageNumber) && !isNewFile(fileKey1)) {
            return;
        }

        console.log(`[useHighlights] Processing search highlights for page ${pageNumber}${fileKey ? ` in file ${fileKey}` : ''}`);

        // Mark as processing
        searchProcessingRef.current.add(pageKey);

        try {
            // Clear existing search highlights for this page
            clearAnnotationsByType(HighlightType.SEARCH, pageNumber, fileKey);

            // Get search results from batch search context
            const searchResults = getSearchResultsForPage(pageNumber, fileKey);

            if (searchResults.length > 0) {
                // Create and use search manager with force reprocess option if needed
                const searchManager = new SearchHighlightManager(
                    searchResults,
                    (page, annotation) => {
                        // Add to annotations
                        addAnnotation(page, annotation, fileKey);

                        // Store in our local cache
                        const fileCache = ensureFileCache(fileKey1);
                        const pageHighlights = fileCache.get(page) || [];
                        fileCache.set(page, [...pageHighlights, annotation]);
                    },
                    fileKey,
                    { forceReprocess: isNewFile(fileKey1) }
                );
                searchManager.processHighlights();
            }

            // Update processed pages in ref
            fileProcessedPages.add(pageNumber);

            // Trigger re-render to show highlights
            triggerAnnotationUpdate();
        } catch (error) {
            console.error('[useHighlights] Error processing search highlights:', error);
        } finally {
            // Clear processing status
            searchProcessingRef.current.delete(pageKey);
        }
    }, [
        pageNumber,
        fileKey,
        showSearchHighlights,
        renderedPages,
        addAnnotation,
        clearAnnotationsByType,
        getSearchResultsForPage,
        getPageKey,
        triggerAnnotationUpdate,
        isNewFile
    ]);

    // Helper to ensure a file cache exists
    const ensureFileCache = useCallback((fileKey: string) => {
        let fileCache = annotationsCache.current.get(fileKey);
        if (!fileCache) {
            fileCache = new Map<number, any[]>();
            annotationsCache.current.set(fileKey, fileCache);
        }
        return fileCache;
    }, []);

    // Process entity highlights with better state management and file isolation
    useEffect(() => {
        // Skip if conditions aren't met
        if (!showEntityHighlights || !viewport || !textContent || !renderedPages.has(pageNumber)) {
            return;
        }

        // Generate a unique key for this page and file
        const fileKey1 = fileKey || '_default';
        const pageKey = getPageKey(pageNumber, fileKey1);

        // Skip if already processing
        if (entityProcessingRef.current.has(pageKey)) {
            return;
        }

        // Check if this page has already been processed by the EntityHighlightManager
        if (typeof EntityHighlightManager.isPageProcessedForFile === 'function' &&
            EntityHighlightManager.isPageProcessedForFile(fileKey1, pageNumber) &&
            !isNewFile(fileKey1)) {
            // Skip if already processed by the manager and not a new file
            return;
        }

        // Get the file's processed entity pages
        let fileProcessedPages = processedEntityPagesRef.current.get(fileKey1);
        if (!fileProcessedPages) {
            fileProcessedPages = new Set<number>();
            processedEntityPagesRef.current.set(fileKey1, fileProcessedPages);
        }

        // Skip if this page is already processed for this file and not a new file
        if (fileProcessedPages.has(pageNumber) && !isNewFile(fileKey1)) {
            return;
        }

        console.log(`[useHighlights] Processing entity highlights for page ${pageNumber}${fileKey ? ` in file ${fileKey}` : ''}`);

        // Mark as processing
        entityProcessingRef.current.add(pageKey);

        try {
            // Get detection mapping for this file - use memoized version
            let detectionMappingForFile = fileDetectionMapping;

            // If no detection mapping found
            if (!detectionMappingForFile) {
                console.log(`[useHighlights] No entity detection mapping available for page ${pageNumber}${fileKey ? ` in file ${fileKey}` : ''}`);

                // Update processed pages even if we don't have a mapping
                // to prevent constant rechecking
                fileProcessedPages.add(pageNumber);

                return;
            }

            // Log found mapping
            console.log(`[useHighlights] Using detection mapping for page ${pageNumber}`,
                detectionMappingForFile.pages ?
                    `(${detectionMappingForFile.pages.length} pages available)` :
                    'but no pages array found');

            // Clear existing entity highlights for this page only
            // This ensures we don't lose highlights on other pages
            clearAnnotationsByType(HighlightType.ENTITY, pageNumber, fileKey);

            // Get the correct structure - might be different based on API response
            const detectionMappingToUse = detectionMappingForFile.redaction_mapping || detectionMappingForFile;

            // Create entity manager with the detection mapping and force reprocess option if needed
            const entityManager = new EntityHighlightManager(
                pageNumber,
                viewport,
                textContent,
                detectionMappingToUse,
                () => getNextHighlightId(),
                (page, annotation) => {
                    // Add to annotations
                    addAnnotation(page, annotation, fileKey);

                    // Store in our local cache
                    const fileCache = ensureFileCache(fileKey1);
                    const pageHighlights = fileCache.get(page) || [];
                    fileCache.set(page, [...pageHighlights, annotation]);
                },
                fileKey,
                { forceReprocess: isNewFile(fileKey1) }
            );

            // Process entity highlights
            entityManager.processHighlights();

            // Update processed pages in ref
            fileProcessedPages.add(pageNumber);

            // Trigger re-render to show highlights
            triggerAnnotationUpdate();

            // If this was a new file, mark it as processed
            if (isNewFile(fileKey1)) {
                // Remove from new files set after processing
                setTimeout(() => {
                    newFilesRef.current.delete(fileKey1);
                }, 1000); // Small delay to ensure all pages are processed
            }
        } catch (error) {
            console.error('[useHighlights] Error processing entity highlights:', error);
        } finally {
            // Clear processing status
            entityProcessingRef.current.delete(pageKey);
        }
    }, [
        pageNumber,
        viewport,
        textContent,
        fileKey,
        showEntityHighlights,
        renderedPages,
        fileDetectionMapping,
        addAnnotation,
        clearAnnotationsByType,
        getNextHighlightId,
        getPageKey,
        triggerAnnotationUpdate,
        ensureFileCache,
        isNewFile
    ]);

    // Get annotations for this page and file
    const annotations = useMemo(() => {
        // Get annotations from context
        const contextAnnotations = getAnnotations(pageNumber, fileKey);

        // Filter by visibility settings
        return contextAnnotations.filter(ann => {
            if (ann.type === HighlightType.SEARCH) return showSearchHighlights;
            if (ann.type === HighlightType.ENTITY) return showEntityHighlights;
            if (ann.type === HighlightType.MANUAL) return showManualHighlights;
            return true;
        });
    }, [
        pageNumber,
        fileKey,
        getAnnotations,
        showSearchHighlights,
        showEntityHighlights,
        showManualHighlights,
        annotationUpdateTrigger // Include this to trigger re-render when annotations change
    ]);

    // Return annotations for this page
    return {
        annotations,
        triggerAnnotationUpdate
    };
};

// Add the global reset function type to the Window interface
declare global {
    interface Window {
        resetEntityHighlightsForFile?: (fileKey: string) => boolean;
        removeFileHighlightTracking?: (fileKey: string) => boolean;
    }
}
