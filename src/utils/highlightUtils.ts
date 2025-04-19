
import highlightManager from './HighlightManager';
import pdfHighlightStorageService from '../services/PDFHighlightStorageService';
import { HighlightRect } from '../types/pdfTypes';

/**
 * Utility functions for highlight management with standardized deletion logic
 */

/**
 * Clean up highlight tracking for file removal
 * Comprehensive cleanup when a file is being removed from the application
 * Ensures all highlights are removed from both IndexedDB and memory
 * @param fileKey The file key being removed
 * @returns Promise resolving to the number of highlights removed
 */

export const cleanupFileHighlights = async (fileKey: string): Promise<number> => {
    if (!fileKey) {
        console.warn('[highlightUtils] Attempted to clean up highlights with empty fileKey');
        return 0;
    }

    console.log(`[highlightUtils] Performing complete highlight cleanup for file: ${fileKey}`);

    try {
        // Record the current count for comparison
        const beforeCount = await pdfHighlightStorageService.countAllHighlights();

        // Get all highlights before removal (for verification)
        const beforeHighlights = await highlightManager.exportHighlights(fileKey);
        console.log(`[highlightUtils] Found ${beforeHighlights.length} highlights to remove for file: ${fileKey}`);

        // First, remove all highlights for this file from HighlightManager
        const removed = await highlightManager.removeHighlightsByFile(fileKey);

        // Also remove directly from IndexedDB to ensure complete cleanup
        const removedFromIndexedDB = await pdfHighlightStorageService.deleteHighlightsByFile(fileKey);

        // Verify removal with a count check
        const afterCount = await pdfHighlightStorageService.countAllHighlights();
        const countDifference = beforeCount - afterCount;

        // Log any discrepancies for debugging
        if (removedFromIndexedDB !== removed) {
            console.warn(`[highlightUtils] Discrepancy in removal counts - HighlightManager: ${removed}, IndexedDB: ${removedFromIndexedDB}`);
        }

        if (countDifference !== removedFromIndexedDB) {
            console.warn(`[highlightUtils] Discrepancy in total count difference (${countDifference}) vs reported removed (${removedFromIndexedDB})`);
        }

        // Reset tracked entity pages
        if (typeof window.resetEntityHighlightsForFile === 'function') {
            window.resetEntityHighlightsForFile(fileKey);
        }

        // Reset all highlight tracking for this file
        if (typeof window.removeFileHighlightTracking === 'function') {
            window.removeFileHighlightTracking(fileKey);
        }

        // Dispatch comprehensive cleanup event with detailed information
        window.dispatchEvent(new CustomEvent('file-highlights-cleanup', {
            detail: {
                fileKey,
                removedCount: Math.max(removed, removedFromIndexedDB),
                fromManager: removed,
                fromIndexedDB: removedFromIndexedDB,
                timestamp: Date.now()
            }
        }));

        console.log(`[highlightUtils] Cleanup complete - Removed ${removed} highlights from HighlightManager and ${removedFromIndexedDB} from IndexedDB for file: ${fileKey}`);

        // Listen for confirmation of cleanup
        const confirmationPromise = new Promise<void>(resolve => {
            const handleConfirmation = (event: Event) => {
                const customEvent = event as CustomEvent;
                const { fileKey: confirmedFileKey } = customEvent.detail || {};

                if (confirmedFileKey === fileKey) {
                    window.removeEventListener('highlights-cleanup-confirmed', handleConfirmation);
                    resolve();
                }
            };

            // Set up listener
            window.addEventListener('highlights-cleanup-confirmed', handleConfirmation);

            // Clean up listener after timeout
            setTimeout(() => {
                window.removeEventListener('highlights-cleanup-confirmed', handleConfirmation);
                resolve(); // Resolve anyway after timeout
            }, 2000);
        });

        // Wait for confirmation (with timeout)
        await confirmationPromise;

        return Math.max(removed, removedFromIndexedDB);
    } catch (error) {
        console.error(`[highlightUtils] Error cleaning up highlights for file: ${fileKey}`, error);
        return 0;
    }
};

/**
 * Initialize highlight storage for a new file
 * Sets up the necessary data structures for storing highlights for a file
 * @param fileKey The file key to initialize
 */
export const initializeFileHighlights = async (fileKey: string): Promise<void> => {
    if (!fileKey) {
        console.warn('[highlightUtils] Attempted to initialize highlights with empty fileKey');
        return;
    }

    console.log(`[highlightUtils] Initializing highlight storage for file: ${fileKey}`);

    // Dispatch initialization event
    window.dispatchEvent(new CustomEvent('file-highlights-init', {
        detail: {
            fileKey,
            timestamp: Date.now()
        }
    }));
};

/**
 * Get all highlights for a file and ensure they're loaded
 * This is a key method for initializing the highlights for a new file
 * @param fileKey The file key to get highlights for
 * @returns Promise resolving to an array of highlights
 */
export const getFileHighlights = async (fileKey: string): Promise<HighlightRect[]> => {
    if (!fileKey) {
        console.warn('[highlightUtils] Attempted to get highlights with empty fileKey');
        return [];
    }

    try {
        console.log(`[highlightUtils] Getting highlights for file: ${fileKey}`);

        // First ensure the file's IndexedDB storage is initialized
        await initializeFileHighlights(fileKey);

        // Load from both sources to ensure we have all highlights
        const managerHighlights = await highlightManager.exportHighlights(fileKey);
        let storageHighlights: HighlightRect[] = [];

        try {
            // Load directly from IndexedDB as well (potential source of additional highlights)
            storageHighlights = await pdfHighlightStorageService.getHighlightsByFile(fileKey);

            // If there's a difference in highlights between sources, reconcile them
            if (storageHighlights.length !== managerHighlights.length) {
                console.log(`[highlightUtils] Found highlight count mismatch for ${fileKey} - Manager: ${managerHighlights.length}, Storage: ${storageHighlights.length}`);

                // If storage has more, import them to the manager
                if (storageHighlights.length > managerHighlights.length) {
                    await highlightManager.importHighlights(storageHighlights);
                    console.log(`[highlightUtils] Imported ${storageHighlights.length} highlights from storage to manager`);
                    return storageHighlights;
                }
                // If manager has more, save them to storage
                else if (managerHighlights.length > storageHighlights.length) {
                    await pdfHighlightStorageService.storeHighlights(managerHighlights);
                    console.log(`[highlightUtils] Stored ${managerHighlights.length} highlights from manager to storage`);
                }
            }
        } catch (error) {
            console.error(`[highlightUtils] Error accessing storage highlights for file: ${fileKey}`, error);
        }

        // Return the larger set of highlights
        const result = managerHighlights.length >= storageHighlights.length
            ? managerHighlights
            : storageHighlights;

        console.log(`[highlightUtils] Returning ${result.length} highlights for file: ${fileKey}`);
        return result;
    } catch (error) {
        console.error(`[highlightUtils] Error getting highlights for file: ${fileKey}`, error);
        return [];
    }
};

/**
 * Preload highlights for a file to ensure they're ready for viewing
 * Call this when a file is first loaded or when switching to a file
 * @param fileKey The file key to preload highlights for
 * @returns Promise resolving to the number of highlights preloaded
 */
export const preloadFileHighlights = async (fileKey: string): Promise<number> => {
    if (!fileKey) {
        console.warn('[highlightUtils] Attempted to preload highlights with empty fileKey');
        return 0;
    }

    try {
        console.log(`[highlightUtils] Preloading highlights for file: ${fileKey}`);

        // First ensure the file is initialized
        await initializeFileHighlights(fileKey);

        // Then preload the highlights - using both IndexedDB and memory cache
        const highlights = await highlightManager.exportHighlights(fileKey);

        // Also load from the highlight storage service directly to ensure all highlights are cached
        let indexedDBHighlights = [];
        try {
            indexedDBHighlights = await pdfHighlightStorageService.getHighlightsByFile(fileKey);

            // If there's a mismatch between the manager and storage, sync them
            if (indexedDBHighlights.length !== highlights.length) {
                console.log(`[highlightUtils] Highlight count mismatch - manager: ${highlights.length}, storage: ${indexedDBHighlights.length}`);

                // If we have more in IndexedDB than in memory, import them
                if (indexedDBHighlights.length > highlights.length) {
                    await highlightManager.importHighlights(indexedDBHighlights);
                    console.log(`[highlightUtils] Imported ${indexedDBHighlights.length} highlights from IndexedDB to memory cache`);
                }
                // If we have more in memory than in IndexedDB, store them
                else if (highlights.length > indexedDBHighlights.length) {
                    await pdfHighlightStorageService.storeHighlights(highlights);
                    console.log(`[highlightUtils] Stored ${highlights.length} highlights from memory cache to IndexedDB`);
                }
            }
        } catch (error) {
            console.error(`[highlightUtils] Error syncing IndexedDB highlights for file: ${fileKey}`, error);
        }

        // Use the maximum count to ensure we report the correct number
        const highlightCount = Math.max(highlights.length, indexedDBHighlights.length);
        console.log(`[highlightUtils] Preloaded ${highlightCount} highlights for file: ${fileKey}`);

        // Dispatch an event to signal that highlights are loaded
        window.dispatchEvent(new CustomEvent('file-highlights-loaded', {
            detail: {
                fileKey,
                count: highlightCount,
                timestamp: Date.now()
            }
        }));

        return highlightCount;
    } catch (error) {
        console.error(`[highlightUtils] Error preloading highlights for file: ${fileKey}`, error);
        return 0;
    }
};
