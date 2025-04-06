// src/hooks/useHighlights.ts - Critical fix for processing loop
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { HighlightType, useHighlightContext } from '../contexts/HighlightContext';
import { useEditContext } from '../contexts/EditContext';
import { usePDFViewerContext } from '../contexts/PDFViewerContext';
import { useBatchSearch } from '../contexts/SearchContext';
import { usePDFApi } from './usePDFApi';
import { EntityHighlightManager } from '../utils/EntityHighlightManager';
import { SearchHighlightManager } from '../utils/SearchHighlightManager';
import { PDFPageViewport } from '../types/pdfTypes';
import { v4 as uuidv4 } from 'uuid';


interface UseHighlightsProps {
    pageNumber: number;
    viewport: PDFPageViewport | null;
    textContent: any | null;
    fileKey?: string; // Optional file key for multi-file support
}

// GLOBAL STATE to track processed pages across ALL components
// This is critical for preventing processing loops
const GLOBAL_PROCESSED_PAGES = new Map<string, Set<number>>();
// Set a throttle time to break processing loops, but allow for auto-processed files
const GLOBAL_THROTTLE_TIME = 500; // 0.5 seconds between processing same page
// Special lower throttle time for auto-processed files
const AUTO_PROCESS_THROTTLE_TIME = 100; // 0.1 seconds between processing auto-processed files
const GLOBAL_LAST_PROCESSED = new Map<string, number>();

// Add the global reset function type to the Window interface
declare global {
    interface Window {
        resetEntityHighlightsForFile?: (fileKey: string) => boolean;
        removeFileHighlightTracking?: (fileKey: string) => boolean;
    }
}

// Define the global function outside the hook if it doesn't exist
if (typeof window !== 'undefined' && !window.removeFileHighlightTracking) {
    window.removeFileHighlightTracking = (fileKey: string): boolean => {
        try {
            // Clear all highlight tracking for this file
            if (typeof EntityHighlightManager.removeFileFromProcessedEntities === 'function') {
                EntityHighlightManager.removeFileFromProcessedEntities(fileKey);
            }

            if (typeof SearchHighlightManager.removeFileFromProcessedData === 'function') {
                SearchHighlightManager.removeFileFromProcessedData(fileKey);
            }

            // Clear global processing tracking
            GLOBAL_PROCESSED_PAGES.delete(fileKey);
            GLOBAL_LAST_PROCESSED.delete(fileKey);

            // Trigger a less aggressive reset event
            window.dispatchEvent(new CustomEvent('complete-file-highlight-reset', {
                detail: {
                    fileKey,
                    timestamp: Date.now(),
                    source: 'removeFileHighlightTracking'
                }
            }));

            console.log(`[HighlightTracking] Completely reset highlight tracking for file ${fileKey}`);
            return true;
        } catch (error) {
            console.error(`[HighlightTracking] Error resetting highlight tracking for file ${fileKey}:`, error);
            return false;
        }
    };
}

// Define and install the global resetEntityHighlightsForFile function
if (typeof window !== 'undefined' && !window.resetEntityHighlightsForFile) {
    window.resetEntityHighlightsForFile = (fileKey: string): boolean => {
        // Clear the global processed tracking for this file
        GLOBAL_PROCESSED_PAGES.delete(fileKey);

        if (typeof EntityHighlightManager.resetProcessedEntitiesForFile === 'function') {
            // This function now has throttling built in
            return EntityHighlightManager.resetProcessedEntitiesForFile(fileKey);
        }
        return false;
    };
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
        getNextHighlightId,
    } = useHighlightContext();

    const {
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

    // Track event handler registration to prevent duplicates
    const eventHandlersRegisteredRef = useRef(false);

    // Track reset event handling to prevent cascade
    const lastResetTimeRef = useRef<Map<string, number>>(new Map());
    const RESET_THROTTLE_TIME = 1000; // 1 second between resets

    // Components instance ID to track individual instances
    const instanceIdRef = useRef<string>(`inst-${Math.random().toString(36).substring(2, 9)}`);

    // Track unmounting for cleanup
    const isMountedRef = useRef(true);

    // Track the last processed file to prevent unnecessary reprocessing
    const lastProcessedFileRef = useRef<string | null>(null);

    // Track if a file is new (not seen before)
    const newFilesRef = useRef<Set<string>>(new Set());

    // Initialize global tracking if needed
    useEffect(() => {
        if (fileKey) {
            // Create the set if it doesn't exist
            if (!GLOBAL_PROCESSED_PAGES.has(fileKey)) {
                GLOBAL_PROCESSED_PAGES.set(fileKey, new Set<number>());
            }
        }
    }, [fileKey]);

    // Get rendered pages for the current file - memoized
    const renderedPages = useMemo(() => {
        return fileKey ? getFileRenderedPages(fileKey) : new Set([pageNumber]);
    }, [fileKey, getFileRenderedPages, pageNumber]);

    // Get detection results for this file - memoized with improved file isolation
    const fileDetectionMapping = useMemo(() => {
        if (!fileKey) return null;

        // First try to get from EditContext file mappings
        const contextMapping = getFileDetectionMapping(fileKey);
        if (contextMapping) {
            // Verify the mapping belongs to this file
            if ((contextMapping as any).fileKey && (contextMapping as any).fileKey !== fileKey) {
                console.warn(`[useHighlights] Detection mapping fileKey ${(contextMapping as any).fileKey} doesn't match component fileKey ${fileKey}, ignoring`);
                return null;
            }
            return contextMapping;
        }

        // Then try to get from API cache
        const apiResult = getDetectionResults(fileKey);
        if (apiResult) {
            // Verify the mapping belongs to this file
            if ((apiResult).fileKey && (apiResult).fileKey !== fileKey) {
                console.warn(`[useHighlights] API result fileKey ${(apiResult).fileKey} doesn't match component fileKey ${fileKey}, ignoring`);
                return null;
            }
            return apiResult;
        }

        // Don't fall back to generic detectionMapping to ensure file isolation
        return null;
    }, [fileKey, getFileDetectionMapping, getDetectionResults]);

    // Get a unique cache key for this page and file - memoized
    const getPageKey = useCallback((page: number, fileKey?: string): string => {
        return `${fileKey ?? '_default'}-${page}`;
    }, []);

    // CRITICAL CHECK: Is this page already processed globally?
    const isPageProcessedGlobally = useCallback((fileKey: string, page: number): boolean => {
        // Get the global set
        const processedPages = GLOBAL_PROCESSED_PAGES.get(fileKey);
        if (!processedPages) return false;

        // Check if this page is in the set
        return processedPages.has(page);
    }, []);

    // CRITICAL CHECK: Can we process this page based on time throttling?
    const canProcessPage = useCallback((fileKey: string, page: number): boolean => {
        const now = Date.now();
        const key = `${fileKey}-${page}`;
        const lastProcessed = GLOBAL_LAST_PROCESSED.get(key) ?? 0;
        
        // Check if this is an auto-processed file (needs shorter throttle time)
        const isAutoProcessed = sessionStorage.getItem(`auto-processed-${fileKey}`) === 'true';
        const throttleTime = isAutoProcessed ? AUTO_PROCESS_THROTTLE_TIME : GLOBAL_THROTTLE_TIME;

        // If too recent, skip processing
        if (now - lastProcessed < throttleTime) {
            console.log(`[useHighlights] Throttling processing for page ${page} of file ${fileKey} - last processed ${now - lastProcessed}ms ago (${isAutoProcessed ? 'auto-processed' : 'standard'} mode)`);
            return false;
        }

        // Update the processing time
        GLOBAL_LAST_PROCESSED.set(key, now);
        return true;
    }, []);

    // CRITICAL: Mark a page as processed globally
    const markPageAsProcessedGlobally = useCallback((fileKey: string, page: number): void => {
        let processedPages = GLOBAL_PROCESSED_PAGES.get(fileKey);
        if (!processedPages) {
            processedPages = new Set<number>();
            GLOBAL_PROCESSED_PAGES.set(fileKey, processedPages);
        }

        // Add this page to the global set
        processedPages.add(page);

        // Log for verification
        console.log(`[useHighlights] Marked page ${page} of file ${fileKey} as processed globally. Instance: ${instanceIdRef.current}`);
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
        }, 100); // 100ms debounce
    }, []);

    // Throttled reset handler to prevent event cascades
    const handleResetWithThrottle = useCallback((eventFileKey: string, resetType: string): boolean => {
        const now = Date.now();
        const lastReset = lastResetTimeRef.current.get(eventFileKey) ?? 0;
        
        // Check if this is an auto-processed file (needs special handling)
        const isAutoProcessed = sessionStorage.getItem(`auto-processed-${eventFileKey}`) === 'true';
        const throttleTime = isAutoProcessed ? AUTO_PROCESS_THROTTLE_TIME : RESET_THROTTLE_TIME;

        // Skip if this file was reset too recently, unless it's specifically an auto-process mapping event
        if (now - lastReset < throttleTime && resetType !== 'mapping-applied' && !isAutoProcessed) {
            console.log(`[useHighlights] Throttling reset for file ${eventFileKey} - last reset was ${now - lastReset}ms ago`);
            return false;
        }

        // Update the last reset time
        lastResetTimeRef.current.set(eventFileKey, now);

        // Reset processed entity pages
        processedEntityPagesRef.current.delete(eventFileKey);

        // Clear global tracking for this file if this is a force reset or auto-processed mapping
        if (resetType === 'force-reset' || resetType === 'new-file-init' || 
            resetType === 'mapping-applied' || isAutoProcessed) {
            GLOBAL_PROCESSED_PAGES.delete(eventFileKey);
            console.log(`[useHighlights] Cleared global processing tracking for file ${eventFileKey} (${resetType})`);
        }

        console.log(`[useHighlights] Reset processed entity pages for file ${eventFileKey} (${resetType})`);

        // Trigger annotation update
        triggerAnnotationUpdate();

        return true;
    }, [triggerAnnotationUpdate]);

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

        // Check global tracking
        const hasGlobalProcessing = GLOBAL_PROCESSED_PAGES.has(fileKey) &&
            GLOBAL_PROCESSED_PAGES.get(fileKey)!.size > 0;

        // Check if EntityHighlightManager has processed entities for this file
        const hasProcessedEntities = typeof EntityHighlightManager.hasProcessedEntitiesForFile === 'function' &&
            EntityHighlightManager.hasProcessedEntitiesForFile(fileKey);

        // If none of these are true, it's a new file
        const isNew = !hasProcessedEntityPages && !hasProcessedSearchPages && !hasProcessedEntities && !hasGlobalProcessing;

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

        // Clear global tracking
        GLOBAL_PROCESSED_PAGES.delete(fileKey);

        // Dispatch a single reset event with source information
        window.dispatchEvent(new CustomEvent('reset-entity-highlights', {
            detail: {
                fileKey,
                resetType: 'new-file-init',
                source: 'initialize-new-file',
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
        // Only register handlers once
        if (eventHandlersRegisteredRef.current) {
            return;
        }

        eventHandlersRegisteredRef.current = true;

        const handleResetEntityHighlights = (event: Event) => {
            // Check if this is a CustomEvent with detail
            const customEvent = event as CustomEvent;
            const eventDetail = customEvent.detail || {};
            const eventFileKey = eventDetail.fileKey;
            const resetType = eventDetail.resetType || 'unknown';
            const source = eventDetail.source || 'unknown';
            const forceProcess = eventDetail.forceProcess || false;

            if (!eventFileKey) {
                console.log('[useHighlights] Ignoring reset event with no fileKey');
                return;
            }

            console.log(`[useHighlights] Received reset-entity-highlights event from ${source} for file ${eventFileKey}`);

            // IMPORTANT: Skip handling if the component doesn't have a fileKey yet
            if (!fileKey) {
                return;
            }

            // Strict file isolation - only process events for this component's file
            if (fileKey !== eventFileKey) {
                console.log(`[useHighlights] Ignoring reset for different file: ${eventFileKey}, current: ${fileKey}`);
                return;
            }

            // If this is a file change reset, we need to process it if forceProcess is true
            if (resetType === 'file-change' && !forceProcess) {
                console.log(`[useHighlights] Skipping entity highlight reset for file change without force process`);
                return;
            }

            // Clear global tracking if it's a force process
            if (forceProcess) {
                GLOBAL_PROCESSED_PAGES.delete(eventFileKey);
            }

            // Use the throttled handler to prevent cascades
            handleResetWithThrottle(eventFileKey, resetType);
        };

        // Handler for detection completion events
        const handleEntityDetectionComplete = (event: Event) => {
            const customEvent = event as CustomEvent;
            const detail = customEvent.detail || {};
            const eventFileKey = detail.fileKey;
            const source = detail.source || 'unknown';
            const forceProcess = detail.forceProcess || false;
            const runId = detail.runId || 'unknown';

            if (!eventFileKey || !fileKey) return;

            // Only process if this applies to our file
            if (eventFileKey === fileKey) {
                console.log(`[useHighlights] Detection completed for file: ${eventFileKey} from ${source} (runId: ${runId})`);

                // Check if this is an auto-processed file
                const isAutoProcessed = sessionStorage.getItem(`auto-processed-${eventFileKey}`) === 'true';

                // Always clear global processing for auto-processed or force process
                if (forceProcess || isAutoProcessed || source.includes('auto-process')) {
                    GLOBAL_PROCESSED_PAGES.delete(eventFileKey);
                    console.log(`[useHighlights] Cleared global processing for auto-processed file: ${eventFileKey}`);
                }

                // Use throttled reset with reduced throttling for auto-processed files
                handleResetWithThrottle(eventFileKey, `detection-complete-${source}`);
                
                // For auto-processed files, force a delay then trigger a second reset to ensure all highlights appear
                if (isAutoProcessed || source.includes('auto-process')) {
                    setTimeout(() => {
                        console.log(`[useHighlights] Delayed second reset for auto-processed file: ${eventFileKey}`);
                        handleResetWithThrottle(eventFileKey, 'auto-process-delayed-reset');
                    }, 400);
                }
            }
        };

        // Handler for detection mapping events
        const handleApplyDetectionMappingCompleted = (event: Event) => {
            const customEvent = event as CustomEvent;
            const detail = customEvent.detail || {};
            const eventFileKey = detail.fileKey;
            const source = detail.source || 'unknown';
            const runId = detail.runId || 'unknown';
            const mapping = detail.mapping || null;

            if (!eventFileKey || !fileKey) return;

            // Only process if this applies to our file
            if (eventFileKey === fileKey) {
                console.log(`[useHighlights] Mapping applied for file: ${eventFileKey} from ${source} (runId: ${runId})`);

                // Check if this is an auto-processed file
                const isAutoProcessed = sessionStorage.getItem(`auto-processed-${eventFileKey}`) === 'true';

                // Always clear global processing tracking on mapping completion
                GLOBAL_PROCESSED_PAGES.delete(eventFileKey);
                
                // If this is auto-processed, ensure mapping has correct fileKey
                if (isAutoProcessed && mapping && mapping.fileKey && mapping.fileKey !== eventFileKey) {
                    console.log(`[useHighlights] Auto-processed detection mapping had mismatched fileKey. Fixing from ${mapping.fileKey} to ${eventFileKey}`);
                    mapping.fileKey = eventFileKey;
                }

                // Special handling for auto-processed files
                if (isAutoProcessed || source === 'auto-process') {
                    console.log(`[useHighlights] Auto-processed detection mapping received - triggering reset`);
                }

                // Use throttled reset to prevent cascades
                handleResetWithThrottle(eventFileKey, 'mapping-applied');
            }
        };

        // Register event listeners
        window.addEventListener('reset-entity-highlights', handleResetEntityHighlights);
        window.addEventListener('entity-detection-complete', handleEntityDetectionComplete as EventListener);
        window.addEventListener('apply-detection-mapping', handleApplyDetectionMappingCompleted as EventListener); // FIXED: correct event name to match what AutoProcessManager dispatches

        // Cleanup
        return () => {
            window.removeEventListener('reset-entity-highlights', handleResetEntityHighlights);
            window.removeEventListener('entity-detection-complete', handleEntityDetectionComplete as EventListener);
            window.removeEventListener('apply-detection-mapping', handleApplyDetectionMappingCompleted as EventListener); // FIXED: correct event name for cleanup
            eventHandlersRegisteredRef.current = false;
        };
    }, [fileKey, handleResetWithThrottle]);

    // Helper to ensure a file cache exists
    const ensureFileCache = useCallback((fileKey: string) => {
        let fileCache = annotationsCache.current.get(fileKey);
        if (!fileCache) {
            fileCache = new Map<number, any[]>();
            annotationsCache.current.set(fileKey, fileCache);
        }
        return fileCache;
    }, []);

    // Process search highlights with reduced re-renders and better file isolation
    useEffect(() => {
        // Skip if conditions aren't met
        if (!showSearchHighlights || !renderedPages.has(pageNumber) || !fileKey) {
            return;
        }

        // Generate a unique key for this page and file
        const fileKey1 = fileKey || '_default';
        const pageKey = getPageKey(pageNumber, fileKey1);

        // Skip if already processing
        if (searchProcessingRef.current.has(pageKey)) {
            return;
        }

        // IMPORTANT: For search highlights specifically, we need a different approach
        // to ensure they always display properly

        console.log(`[useHighlights] Processing search highlights for page ${pageNumber}${fileKey ? ` in file ${fileKey}` : ''}`);

        // Mark as processing
        searchProcessingRef.current.add(pageKey);

        try {
            // Get search results from batch search context
            const searchResults = getSearchResultsForPage(pageNumber, fileKey);

            // Log the search results for debugging
            console.log(`[useHighlights] Found ${searchResults.length} search results for page ${pageNumber} in file ${fileKey}`);

            if (searchResults.length > 0) {


                // Create and use search manager with force reprocess option
                const searchManager = new SearchHighlightManager(
                    searchResults,
                    (page, annotation) => {
                        // Add to annotations with guaranteed unique ID
                        const uniqueId = `search-${fileKey1}-${page}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                        const uniqueAnnotation = {
                            ...annotation,
                            id: uniqueId,
                            timestamp: Date.now(),
                            instanceId: uuidv4()  // Add a unique instance ID
                        };

                        addAnnotation(page, uniqueAnnotation, fileKey);

                        // Store in our local cache
                        const fileCache = ensureFileCache(fileKey1);
                        const pageHighlights = fileCache.get(page) || [];
                        fileCache.set(page, [...pageHighlights, uniqueAnnotation]);
                    },
                    fileKey,
                    { forceReprocess: true } // Always force reprocessing for search highlights
                );
                searchManager.processHighlights();
            }

            // Update processed pages in ref
            let fileProcessedPages = processedSearchPagesRef.current.get(fileKey1);
            if (!fileProcessedPages) {
                fileProcessedPages = new Set<number>();
                processedSearchPagesRef.current.set(fileKey1, fileProcessedPages);
            }
            fileProcessedPages.add(pageNumber);

            // CRITICAL: Mark as processed globally
            markPageAsProcessedGlobally(fileKey1, pageNumber);

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
        ensureFileCache,
        markPageAsProcessedGlobally
    ]);

    // Process entity highlights with better state management and file isolation
    useEffect(() => {
        // Skip if conditions aren't met
        if (!showEntityHighlights || !viewport || !textContent || !renderedPages.has(pageNumber) || !fileKey) {
            return;
        }

        // CRITICAL NEW CHECK: Skip if this page is already processed globally
        if (isPageProcessedGlobally(fileKey, pageNumber)) {
            return;
        }

        // CRITICAL NEW CHECK: Skip if throttled globally
        if (!canProcessPage(fileKey, pageNumber)) {
            return;
        }

        // Generate a unique key for this page and file
        const fileKey1 = fileKey || '_default';
        const pageKey = getPageKey(pageNumber, fileKey1);

        // Skip if already processing
        if (entityProcessingRef.current.has(pageKey)) {
            return;
        }

        // Check if this is an auto-processed file (still needs processing)
        const isAutoProcessed = sessionStorage.getItem(`auto-processed-${fileKey1}`) === 'true';

        // Check if this page has already been processed by the EntityHighlightManager
        // For auto-processed files, we want to force processing
        if (!isAutoProcessed &&
            typeof EntityHighlightManager.isPageProcessedForFile === 'function' &&
            EntityHighlightManager.isPageProcessedForFile(fileKey1, pageNumber) &&
            !isNewFile(fileKey1)) {
            // Skip if already processed by the manager and not a new file
            // Mark as processed globally
            markPageAsProcessedGlobally(fileKey1, pageNumber);
            return;
        }

        // Get the file's processed entity pages
        let fileProcessedPages = processedEntityPagesRef.current.get(fileKey1);
        if (!fileProcessedPages) {
            fileProcessedPages = new Set<number>();
            processedEntityPagesRef.current.set(fileKey1, fileProcessedPages);
        }

        // Skip if this page is already processed for this file and not a new or auto-processed file
        if (!isAutoProcessed && fileProcessedPages.has(pageNumber) && !isNewFile(fileKey1)) {
            // Mark as processed globally
            markPageAsProcessedGlobally(fileKey1, pageNumber);
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

                // CRITICAL: Mark as processed globally
                markPageAsProcessedGlobally(fileKey1, pageNumber);

                return;
            }

            // Verify the mapping belongs to this file, but check for auto-processed exception
            const isAutoProcessed = sessionStorage.getItem(`auto-processed-${fileKey1}`) === 'true';
            
            if ((detectionMappingForFile).fileKey &&
                (detectionMappingForFile).fileKey !== fileKey && !isAutoProcessed) {
                console.warn(`[useHighlights] Detection mapping belongs to file ${(detectionMappingForFile).fileKey} but processing for ${fileKey}, skipping`);

                // CRITICAL: Mark as processed globally despite mismatch
                markPageAsProcessedGlobally(fileKey1, pageNumber);
                return;
            }
            
            // If auto-processed, update the mapping's fileKey to match this file for proper processing
            if (isAutoProcessed && (detectionMappingForFile).fileKey && 
                (detectionMappingForFile).fileKey !== fileKey) {
                console.log(`[useHighlights] Auto-processed file detected. Updating mapping fileKey from ${(detectionMappingForFile).fileKey} to ${fileKey}`);
                (detectionMappingForFile).fileKey = fileKey;
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
            const detectionMappingToUse = (detectionMappingForFile).redaction_mapping || detectionMappingForFile;

            // Create entity manager with the detection mapping and force reprocess option if needed
            const entityManager = new EntityHighlightManager(
                pageNumber,
                viewport,
                textContent,
                detectionMappingToUse,
                () => getNextHighlightId(),
                (page, annotation) => {
                    // Add a timestamp to track when this highlight was created
                    const annotationWithTimestamp = {
                        ...annotation,
                        timestamp: Date.now(),
                        autoProcessed: isAutoProcessed || false
                    };
                    
                    // Add to annotations
                    addAnnotation(page, annotationWithTimestamp, fileKey);

                    // Store in our local cache
                    const fileCache = ensureFileCache(fileKey1);
                    const pageHighlights = fileCache.get(page) || [];
                    fileCache.set(page, [...pageHighlights, annotationWithTimestamp]);
                    
                    if (isAutoProcessed) {
                        console.log(`[useHighlights] Created auto-processed highlight on page ${page} for entity: ${annotation.entity || 'unknown'}`);
                    }
                },
                fileKey,
                { 
                    forceReprocess: isNewFile(fileKey1) || isAutoProcessed,
                    pageNumber: isAutoProcessed ? pageNumber : undefined // Only process this page for auto-processed files
                }
            );

            // Process entity highlights
            entityManager.processHighlights();

            // Update processed pages in ref
            fileProcessedPages.add(pageNumber);

            // CRITICAL: Mark as processed globally
            markPageAsProcessedGlobally(fileKey1, pageNumber);

            // Trigger re-render to show highlights
            triggerAnnotationUpdate();

            // If this was a new file or auto-processed, mark it as processed
            if (isNewFile(fileKey1) || isAutoProcessed) {
                // Mark as no longer auto-processed in session storage
                if (isAutoProcessed) {
                    sessionStorage.removeItem(`auto-processed-${fileKey1}`);
                }

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
        isNewFile,
        isPageProcessedGlobally,
        canProcessPage,
        markPageAsProcessedGlobally
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

    // Return annotations for this page and functions
    return {
        annotations,
        triggerAnnotationUpdate
    };
}
