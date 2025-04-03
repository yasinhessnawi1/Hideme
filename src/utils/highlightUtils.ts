import highlightManager from './HighlightManager';

/**
 * Utility functions for highlight management with standardized deletion logic
 */


/**
 * Clean up highlight tracking for file removal
 * Comprehensive cleanup when a file is being removed from the application
 * @param fileKey The file key being removed
 */
export const cleanupFileHighlights = (fileKey: string): void => {
    if (!fileKey) {
        console.warn('[highlightUtils] Attempted to clean up highlights with empty fileKey');
        return;
    }

    console.log(`[highlightUtils] Performing complete highlight cleanup for file: ${fileKey}`);

    // Remove all highlights for this file
    const removed = highlightManager.removeHighlightsByFile(fileKey);

    // Reset tracked entity pages
    if (typeof window.resetEntityHighlightsForFile === 'function') {
        window.resetEntityHighlightsForFile(fileKey);
    }

    // Reset all highlight tracking for this file
    if (typeof window.removeFileHighlightTracking === 'function') {
        window.removeFileHighlightTracking(fileKey);
    }

    // Dispatch comprehensive cleanup event
    window.dispatchEvent(new CustomEvent('file-highlights-cleanup', {
        detail: {
            fileKey,
            removedCount: removed,
            timestamp: Date.now()
        }
    }));

    console.log(`[highlightUtils] Removed ${removed} highlights for file: ${fileKey}`);
};
