/**
 * Utility functions for interacting with the unified sidebar
 */

export type SidebarTabId = 'thumbnails' | 'files' | 'detection' | 'search' | 'redaction' | 'settings' | 'history';

/**
 * Activates a specific tab in the unified sidebar
 * @param tabId - The ID of the tab to activate
 * @param source - Optional source identifier for debugging
 */
export const activateSidebarTab = (tabId: SidebarTabId, source?: string) => {
    window.dispatchEvent(new CustomEvent('activate-sidebar-tab', {
        detail: {tabId, source}
    }));
};

/**
 * Opens the search tab and triggers a search with the given terms
 * @param searchTerms - Array of search terms to apply
 * @param options - Additional search options
 */
export const activateSearchWithTerms = (
    searchTerms: string[],
    options?: {
        caseSensitive?: boolean;
        wholeWords?: boolean;
        regex?: boolean;
    }
) => {
    // First activate the search tab
    activateSidebarTab('search', 'search-utility');

    // Then trigger the search with the terms
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger-search-with-terms', {
            detail: {searchTerms, options}
        }));
    }, 100);
};

/**
 * Opens the detection tab and triggers entity detection
 * @param filesToProcess - Optional array of files to process
 * @param detectionOptions - Optional detection configuration
 */
export const activateDetectionProcess = (
    filesToProcess?: File[],
    detectionOptions?: {
        presidio?: boolean;
        gliner?: boolean;
        gemini?: boolean;
        hideme?: boolean;
        threshold?: number;
        useBanlist?: boolean;
    }
) => {
    // First activate the detection tab
    activateSidebarTab('detection', 'detection-utility');

    // Then trigger the detection process
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger-entity-detection-process', {
            detail: {filesToProcess, detectionOptions}
        }));
    }, 100);
};

/**
 * Opens the redaction tab and applies redaction settings
 * @param redactionOptions - Redaction configuration
 */
export const activateRedactionProcess = (
    redactionOptions?: {
        scope?: 'current' | 'selected' | 'all';
        includeEntityTypes?: string[];
        manualSelections?: boolean;
    }
) => {
    // First activate the redaction tab
    activateSidebarTab('redaction', 'redaction-utility');

    // Then apply redaction settings
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('apply-redaction-settings', {
            detail: redactionOptions
        }));
    }, 100);
};

/**
 * Opens the files tab and selects specific files
 * @param fileKeys - Array of file keys to select
 */
export const activateFilesWithSelection = (fileKeys: string[]) => {
    // First activate the files tab
    activateSidebarTab('files', 'files-utility');

    // Then select the files
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('select-files', {
            detail: {fileKeys}
        }));
    }, 100);
};

/**
 * Opens the thumbnails tab and navigates to a specific page
 * @param fileKey - The file key
 * @param pageNumber - The page number to navigate to
 */
export const activateThumbnailsWithPage = (fileKey: string, pageNumber: number) => {
    // First activate the thumbnails tab
    activateSidebarTab('thumbnails', 'thumbnails-utility');

    // Then navigate to the page
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate-to-page', {
            detail: {fileKey, pageNumber}
        }));
    }, 100);
};

/**
 * Opens the settings tab
 * @param settingSection - Optional section to scroll to within settings
 */
export const activateSettings = (settingSection?: 'visibility' | 'colors' | 'clear') => {
    // First activate the settings tab
    activateSidebarTab('settings', 'settings-utility');

    // Then scroll to specific section if provided
    if (settingSection) {
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('scroll-to-settings-section', {
                detail: {settingSection}
            }));
        }, 100);
    }
};

/**
 * Opens the history tab and highlights a specific history item
 * @param historyItemId - The ID of the history item to highlight
 */
export const activateHistoryWithItem = (historyItemId: string) => {
    // First activate the history tab
    activateSidebarTab('history', 'history-utility');

    // Then highlight the history item
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('highlight-history-item', {
            detail: {historyItemId}
        }));
    }, 100);
};

/**
 * Checks if a specific tab is currently active
 * @param tabId - The tab ID to check
 * @returns Promise that resolves with boolean indicating if tab is active
 */
export const isSidebarTabActive = (tabId: SidebarTabId): Promise<boolean> => {
    return new Promise((resolve) => {
        const handleResponse = (event: Event) => {
            const customEvent = event as CustomEvent;
            const {activeTab} = customEvent.detail || {};
            window.removeEventListener('sidebar-tab-status-response', handleResponse);
            resolve(activeTab === tabId);
        };

        window.addEventListener('sidebar-tab-status-response', handleResponse);

        window.dispatchEvent(new CustomEvent('get-sidebar-tab-status', {
            detail: {requestedTab: tabId}
        }));

        // Timeout after 1 second
        setTimeout(() => {
            window.removeEventListener('sidebar-tab-status-response', handleResponse);
            resolve(false);
        }, 1000);
    });
}; 