import {useCallback, useEffect, useRef} from 'react';
import {useFileContext} from '../contexts/FileContext';
import {getFileKey, usePDFViewerContext} from '../contexts/PDFViewerContext';
import scrollingService from '../services/UnifiedScrollingService';
import { NavigationOptions } from '../types/pdfTypes';

/**
 * Custom hook to provide PDF navigation capabilities with
 * synchronized scrolling across different components using precise viewport positioning
 */
export const usePDFNavigation = (sourceName: string = 'component') => {
    const { currentFile, files, setCurrentFile } = useFileContext();
    const {
        getFileCurrentPage,
        getFileNumPages,
        setFileCurrentPage,
        mainContainerRef,
        pageRefs
    } = usePDFViewerContext();

    const navigationInProgressRef = useRef<boolean>(false);
    const lastNavigationTimeRef = useRef<number>(0);

    /**
     * Helper to get accurate page position for scrolling
     */
    const getPagePosition = useCallback((pageNumber: number, fileKey: string): number | null => {
        try {
            // Try to find the page element through various means
            let pageElement: HTMLElement | null = null;

            // Method 1: Try direct selector first (most reliable)
            pageElement = document.querySelector(
                `.pdf-file-container[data-file-key="${fileKey}"] [data-page-number="${pageNumber}"]`
            ) as HTMLElement | null;

            // Method 2: Try through pageRefs if available (for same file navigation)
            if (!pageElement && currentFile && getFileKey(currentFile) === fileKey) {
                pageElement = pageRefs.current[pageNumber - 1] || null;
            }

            // Method 3: Use scrollingService cached elements
            if (!pageElement) {
                // This will use the service's element cache
                const pageElementId = `page-${fileKey}-${pageNumber}`;
                pageElement = document.getElementById(pageElementId);
            }

            if (!pageElement) {
                console.warn(`[Navigation] Couldn't find page element for page ${pageNumber} in file ${fileKey}`);
                return null;
            }

            // Get container and calculate offset
            const container = mainContainerRef.current;
            if (!container) {
                console.warn('[Navigation] Main container ref not available');
                return null;
            }

            const containerRect = container.getBoundingClientRect();
            const pageRect = pageElement.getBoundingClientRect();

            // Calculate the scroll position that centers the page in the viewport
            // Account for the element's position relative to the container
            return container.scrollTop + (pageRect.top - containerRect.top) -
                (containerRect.height / 2) + (pageRect.height / 2);
        } catch (error) {
            console.error('[Navigation] Error getting page position:', error);
            return null;
        }
    }, [currentFile, mainContainerRef, pageRefs]);

    /**
     * Internal function to perform the actual scrolling
     */
    const performScroll = useCallback((
        pageNumber: number,
        fileKey: string,
        behavior: ScrollBehavior = 'smooth',
        alignToTop: boolean = false
    ) => {
        const container = mainContainerRef.current;
        if (!container) return false;

        // Try to get position with our helper
        const scrollPosition = getPagePosition(pageNumber, fileKey);

        // If we got a position, scroll to it
        if (scrollPosition !== null) {
            try {
                // If we're aligning to top, adjust the position accordingly
                const finalPosition = alignToTop
                    ? scrollPosition - container.getBoundingClientRect().height * 0.1 // Add a small offset from top
                    : scrollPosition;

                // Perform the scroll operation with specified behavior
                container.scrollTo({
                    top: finalPosition,
                    behavior
                });

                // Mark the page as active visually
                setTimeout(() => {
                    const pageElement = document.querySelector(
                        `.pdf-file-container[data-file-key="${fileKey}"] [data-page-number="${pageNumber}"]`
                    );

                    if (pageElement) {
                        // Remove active class from all pages in this file
                        const filePages = document.querySelectorAll(
                            `.pdf-file-container[data-file-key="${fileKey}"] .pdf-page-wrapper`
                        );
                        filePages.forEach(page => page.classList.remove('active'));

                        // Add active class to this page
                        pageElement.classList.add('active');

                        // Add animation class and remove it after animation completes
                        pageElement.classList.add('just-activated');
                        setTimeout(() => {
                            pageElement.classList.remove('just-activated');
                        }, 1500);
                    }
                }, 100);

                return true;
            } catch (error) {
                console.error('[Navigation] Error scrolling to position:', error);
                return false;
            }
        }

        // If we couldn't get a position, try using the scrolling service as fallback
        scrollingService.scrollToPage(pageNumber, fileKey, sourceName, {
            behavior,
            alignToTop,
            forceElementSelection: true
        });

        return true;
    }, [getPagePosition, mainContainerRef, sourceName]);

    /**
     * Navigate to a specific page in a specific file
     * @param pageNumber The page number to navigate to
     * @param fileKey The unique key of the file (optional, uses current file if not provided)
     * @param options Additional scrolling options
     */
    const navigateToPage = useCallback((
        pageNumber: number,
        fileKey?: string,
        options?: NavigationOptions
    ) => {
        // Avoid rapid repeated navigation (debounce)
        const now = Date.now();
        if (now - lastNavigationTimeRef.current < 100) {
            return;
        }
        lastNavigationTimeRef.current = now;

        // Skip if navigation is already in progress
        if (navigationInProgressRef.current) {
            console.log('[Navigation] Navigation already in progress, skipping');
            return;
        }

        navigationInProgressRef.current = true;

        try {
            // Get the file key to use
            const targetFileKey = fileKey || (currentFile ? getFileKey(currentFile) : null);
            if (!targetFileKey) {
                console.warn('[Navigation] No target file key for navigation');
                navigationInProgressRef.current = false;
                return;
            }

            // Validate page number
            const totalPages = getFileNumPages(targetFileKey);
            const validPageNumber = Math.max(1, Math.min(pageNumber, totalPages || 1));

            // If page number was invalid, log a warning
            if (validPageNumber !== pageNumber) {
                console.warn(`[Navigation] Invalid page number ${pageNumber}, adjusted to ${validPageNumber}`);
            }

            // If fileKey is provided and it's different from current file, switch to that file
            const shouldChangeFile = fileKey &&
                currentFile &&
                getFileKey(currentFile) !== fileKey &&
                (options?.forceFileChange !== false);

            if (shouldChangeFile) {
                const file = files.find(f => getFileKey(f) === fileKey);
                if (file) {
                    console.log(`[Navigation] Switching to file: ${fileKey}, page: ${validPageNumber}`);

                    // First update the current page in the context
                    setFileCurrentPage(fileKey, validPageNumber);

                    // Set the current file to trigger the file switch
                    setCurrentFile(file);

                    // Allow some time for the file change to process
                    setTimeout(() => {
                        // Use our precise scrolling function
                        performScroll(
                            validPageNumber,
                            fileKey,
                            options?.behavior ?? 'auto',
                            options?.alignToTop || false
                        );

                        // If highlightThumbnail option is not explicitly false, highlight the thumbnail
                        if (options?.highlightThumbnail !== false) {
                            setTimeout(() => {
                                // Find and scroll to the thumbnail for this page
                                const thumbnailElement = document.getElementById(
                                    `thumbnail-${fileKey}-${validPageNumber}`
                                );

                                if (thumbnailElement) {
                                    thumbnailElement.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'center'
                                    });

                                    // Add highlight pulse
                                    thumbnailElement.classList.add('highlight-pulse');
                                    setTimeout(() => {
                                        thumbnailElement.classList.remove('highlight-pulse');
                                    }, 1500);
                                }
                            }, 300);
                        }

                        // Reset navigation flag after a delay
                        setTimeout(() => {
                            navigationInProgressRef.current = false;
                        }, 500);
                    }, 150);
                } else {
                    console.error(`[Navigation] File with key ${fileKey} not found`);
                    navigationInProgressRef.current = false;
                }
            } else {
                // Same file navigation - just scroll to the page
                console.log(`[Navigation] Navigating to page ${validPageNumber} in current file ${targetFileKey}`);

                // Update current page in the context directly
                setFileCurrentPage(targetFileKey, validPageNumber);

                // Use our precise scrolling function
                const scrollSuccess = performScroll(
                    validPageNumber,
                    targetFileKey,
                    options?.behavior ?? 'smooth',
                    options?.alignToTop || false
                );

                // If the scroll didn't succeed with our method, fall back to the scrolling service
                if (!scrollSuccess) {
                    console.log('[Navigation] Fallback to scrolling service');
                    scrollingService.scrollToPage(
                        validPageNumber,
                        targetFileKey,
                        sourceName,
                        {
                            behavior: options?.behavior ?? 'smooth',
                            alignToTop: options?.alignToTop,
                            highlightThumbnail: options?.highlightThumbnail !== false
                        }
                    );
                }

                // If highlightThumbnail option is not explicitly false, highlight the thumbnail
                if (options?.highlightThumbnail !== false) {
                    setTimeout(() => {
                        // Find and scroll to the thumbnail for this page
                        const thumbnailElement = document.getElementById(
                            `thumbnail-${targetFileKey}-${validPageNumber}`
                        );

                        if (thumbnailElement) {
                            thumbnailElement.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                            });

                            // Add highlight pulse
                            thumbnailElement.classList.add('highlight-pulse');
                            setTimeout(() => {
                                thumbnailElement.classList.remove('highlight-pulse');
                            }, 1500);
                        }
                    }, 300);
                }

                // Reset navigation flag after a delay
                setTimeout(() => {
                    navigationInProgressRef.current = false;
                }, 300);
            }
        } catch (error) {
            console.error('[Navigation] Error during navigation:', error);
            navigationInProgressRef.current = false;
        }
    }, [
        currentFile,
        files,
        setCurrentFile,
        getFileNumPages,
        setFileCurrentPage,
        performScroll,
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
        pageNumber?: number,
        options?: NavigationOptions
    ) => {
        const file = files.find(f => getFileKey(f) === fileKey);
        if (!file) {
            console.error(`[Navigation] File with key ${fileKey} not found`);
            return;
        }

        // Default to first page if not specified
        const targetPage = pageNumber ?? 1;

        // Navigate to the file and page
        navigateToPage(targetPage, fileKey, options);
    }, [files, navigateToPage]);

    // Listen for external page changes
    useEffect(() => {
        const handleExternalPageChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, pageNumber, source } = customEvent.detail || {};

            // Skip if we're the source
            if (source === sourceName) return;

            if (fileKey && pageNumber) {
                // Update the navigation status if we're not in an active navigation
                if (!navigationInProgressRef.current) {
                    console.log(`[${sourceName}] Received external page change: ${pageNumber} in file ${fileKey}`);
                }
            }
        };

        window.addEventListener('pdf-page-changed', handleExternalPageChange);

        return () => {
            window.removeEventListener('pdf-page-changed', handleExternalPageChange);
        };
    }, [sourceName]);

    // Return all navigation methods
    return {
        navigateToPage,
        navigateToNextPage,
        navigateToPrevPage,
        navigateToFirstPage,
        navigateToLastPage,
        navigateToFile,
        isNavigating: () => navigationInProgressRef.current
    };
};

export default usePDFNavigation;
