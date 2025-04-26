import { useCallback, useRef } from 'react';
import { useFileContext } from '../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../contexts/PDFViewerContext';
import scrollManager, { ScrollOptions } from '../services/ScrollManagerService';

/**
 * Custom hook providing PDF navigation capabilities
 *
 * This hook provides a clean API for navigating between pages and files with
 * reliable scrolling and state updates.
 */
export const usePDFNavigation = (sourceName: string = 'navigation-hook') => {
    const { currentFile, files, setCurrentFile , } = useFileContext();
    const {
        getFileCurrentPage,
        getFileNumPages,
        setFileCurrentPage,
    } = usePDFViewerContext();
    const { setFileActiveScrollPage } = usePDFViewerContext();
    // Use a ref to track if navigation is in progress
    const navigationInProgressRef = useRef<boolean>(false);

    /**
     * Navigate to a specific page in a file
     */
        // In usePDFNavigation.ts, enhance the navigateToPage method
    const navigateToPage = useCallback((
            pageNumber: number,
            fileKey?: string,
            options: ScrollOptions = {}
        ): void => {
            // Get the file key to use
            const targetFileKey = fileKey ?? (currentFile ? getFileKey(currentFile) : null);
            if (!targetFileKey) {
                return;
            }

            // Validate page number
            const totalPages = getFileNumPages(targetFileKey);
            if (!totalPages) {
                return;
            }

            const validPageNumber = Math.max(1, Math.min(pageNumber, totalPages));

            // This is critical: update state first to ensure components are in sync
            setFileCurrentPage(targetFileKey, validPageNumber, 'navigation-hook');
            setFileActiveScrollPage(targetFileKey, validPageNumber);

            // Wait for state updates to apply before scrolling
            setTimeout(() => {
                // Now use ScrollManager for actual scrolling
                const scrollResult = scrollManager.scrollToPage(
                    validPageNumber,
                    targetFileKey,
                    {
                        behavior: options.behavior ?? 'smooth',
                        alignToTop: options.alignToTop ?? false,
                        highlightThumbnail: options.highlightThumbnail ?? true
                    },
                    sourceName
                );

                if (!scrollResult) {
                    console.warn('[PDFNavigation] Scroll request was not accepted by ScrollManager');
                }
            }, 10);
        }, [
            currentFile,
            getFileNumPages,
            setFileCurrentPage,
            setFileActiveScrollPage,
            sourceName
        ]);

    /**
     * Navigate to the next page in the current file
     */
    const navigateToNextPage = useCallback(() => {
        if (!currentFile) return;

        const fileKey = getFileKey(currentFile);
        const currentPage = getFileCurrentPage(fileKey);
        const totalPages = getFileNumPages(fileKey);

        if (currentPage < totalPages) {
            navigateToPage(currentPage + 1);
        }
    }, [currentFile, getFileCurrentPage, getFileNumPages, navigateToPage]);

    /**
     * Navigate to the previous page in the current file
     */
    const navigateToPrevPage = useCallback(() => {
        if (!currentFile) return;

        const fileKey = getFileKey(currentFile);
        const currentPage = getFileCurrentPage(fileKey);

        if (currentPage > 1) {
            navigateToPage(currentPage - 1);
        }
    }, [currentFile, getFileCurrentPage, navigateToPage]);

    /**
     * Navigate to the first page of the current file
     */
    const navigateToFirstPage = useCallback(() => {
        if (!currentFile) return;

        navigateToPage(1);
    }, [currentFile, navigateToPage]);

    /**
     * Navigate to the last page of the current file
     */
    const navigateToLastPage = useCallback(() => {
        if (!currentFile) return;

        const fileKey = getFileKey(currentFile);
        const totalPages = getFileNumPages(fileKey);

        navigateToPage(totalPages);
    }, [currentFile, getFileNumPages, navigateToPage]);

    /**
     * Navigate to a specific file and optional page
     */
    const navigateToFile = useCallback((
        fileKey: string,
        pageNumber: number = 1,
        options: ScrollOptions = {}
    ) => {
        const file = files.find(f => getFileKey(f) === fileKey);
        if (!file) {
            console.error(`[PDFNavigation] File with key ${fileKey} not found`);
            return;
        }
        setCurrentFile(file)
        // Navigate to the file and page
        navigateToPage(pageNumber, fileKey, options);
    }, [files, navigateToPage]);

    /**
     * Check if navigation is currently in progress
     */
    const isNavigating = useCallback(() => {
        return navigationInProgressRef.current;
    }, []);

    // Return all navigation methods
    return {
        navigateToPage,
        navigateToNextPage,
        navigateToPrevPage,
        navigateToFirstPage,
        navigateToLastPage,
        navigateToFile,
        isNavigating
    };
};

export default usePDFNavigation;
