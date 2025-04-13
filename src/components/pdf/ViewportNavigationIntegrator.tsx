import React, { useEffect, useRef, useCallback } from 'react';
import { useFileContext } from '../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../contexts/PDFViewerContext';
import { usePDFNavigation } from '../../hooks/usePDFNavigation';
import { NavigationOptions } from '../../types/pdfTypes';

interface PendingNavigation {
    fileKey: string;
    pageNumber: number;
    options: NavigationOptions;
}

/**
 * ViewportNavigationIntegrator component
 * 
 * This component enhances navigation precision using viewport calculations.
 * It doesn't render anything visible but improves the PDF viewing experience by:
 * 
 * - Providing viewport-aware page navigation
 * - Handling navigation requests and tracking page initialization
 * - Patching the navigation hook to use viewport calculations
 * - Observing page rendering completion for reliable navigation timing
 * - Supporting deferred navigation to pages that aren't rendered yet
 */
const ViewportNavigationIntegrator: React.FC = () => {
    const { currentFile } = useFileContext();
    const { mainContainerRef } = usePDFViewerContext();

    // Use our navigation hook
    const navigation = usePDFNavigation('viewport-integrator');

    // Track if there are pending navigation requests
    const pendingNavigationRef = useRef<PendingNavigation | null>(null);

    // Reference to track page elements that have been initialized
    const initializedPagesRef = useRef<Set<string>>(new Set());

    /**
     * Calculate exact scroll position for a page to center it in the viewport
     */
    const calculatePagePosition = useCallback((pageElement: HTMLElement): number | null => {
        if (!mainContainerRef.current) return null;

        try {
            const container = mainContainerRef.current;
            const containerRect = container.getBoundingClientRect();
            const pageRect = pageElement.getBoundingClientRect();

            // Calculate position to center the page in viewport
            return container.scrollTop +
                (pageRect.top - containerRect.top) -
                (containerRect.height / 2) +
                (pageRect.height / 2);
        } catch (error) {
            console.error('[ViewportIntegrator] Error calculating page position:', error);
            return null;
        }
    }, [mainContainerRef.current]);

    /**
     * Perform precise scrolling to a page using viewport calculations
     */
    const scrollToPageWithViewport = useCallback((
        pageNumber: number,
        fileKey: string,
        behavior: ScrollBehavior = 'smooth',
        alignToTop: boolean = false
    ): boolean => {
        if (!mainContainerRef.current) return false;

        // Find page element
        const pageElement = document.querySelector(
            `.pdf-file-container[data-file-key="${fileKey}"] [data-page-number="${pageNumber}"]`
        ) as HTMLElement | null;

        if (!pageElement) {
            console.warn(`[ViewportIntegrator] Page element for page ${pageNumber} not found`);
            return false;
        }

        // Calculate position
        const scrollTop = calculatePagePosition(pageElement);
        if (scrollTop === null) return false;

        // Adjust for alignToTop if needed
        const finalScrollTop = alignToTop
            ? scrollTop - (mainContainerRef.current.clientHeight * 0.4) // Align near top with some space
            : scrollTop;

        // Perform scroll
        mainContainerRef.current.scrollTo({
            top: finalScrollTop,
            behavior
        });

        // Apply active page styling
        const filePages = document.querySelectorAll(
            `.pdf-file-container[data-file-key="${fileKey}"] .pdf-page-wrapper`
        );

        filePages.forEach(page => page.classList.remove('active'));
        pageElement.classList.add('active');

        // Add animation for visual feedback
        pageElement.classList.add('just-activated');
        setTimeout(() => {
            pageElement.classList.remove('just-activated');
        }, 1500);

        return true;
    }, [calculatePagePosition, mainContainerRef.current]);

    // Handle custom navigation events that require viewport precision
    useEffect(() => {
        const handlePreciseNavigationRequest = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, pageNumber, options } = customEvent.detail || {};

            if (!fileKey || !pageNumber) return;

            console.log(`[ViewportIntegrator] Received precise navigation request to page ${pageNumber} in file ${fileKey}`);

            // Store the request for later if page is not ready
            pendingNavigationRef.current = {
                fileKey,
                pageNumber,
                options: options || {}
            };

            // Check if we can navigate immediately
            const pageElement = document.querySelector(
                `.pdf-file-container[data-file-key="${fileKey}"] [data-page-number="${pageNumber}"]`
            );

            if (pageElement) {
                const success = scrollToPageWithViewport(
                    pageNumber,
                    fileKey,
                    options?.behavior || 'smooth',
                    options?.alignToTop || false
                );

                if (success) {
                    pendingNavigationRef.current = null;

                    // Dispatch completion event
                    window.dispatchEvent(new CustomEvent('pdf-precise-navigation-complete', {
                        detail: {
                            fileKey,
                            pageNumber,
                            success: true
                        }
                    }));
                }
            }
        };

        window.addEventListener('pdf-precise-navigation-request', handlePreciseNavigationRequest);

        return () => {
            window.removeEventListener('pdf-precise-navigation-request', handlePreciseNavigationRequest);
        };
    }, [scrollToPageWithViewport]);

    // Handle pending navigation requests when pages become available
    useEffect(() => {
        const handlePageRenderComplete = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { pageNumber, fileKey } = customEvent.detail || {};

            if (!pageNumber || !fileKey) return;

            // Check if this page was just initialized
            const pageKey = `${fileKey}-${pageNumber}`;
            if (initializedPagesRef.current.has(pageKey)) return;

            // Mark as initialized
            initializedPagesRef.current.add(pageKey);

            console.log(`[ViewportIntegrator] Page ${pageNumber} in file ${fileKey} is ready`);

            // Check if there's a pending navigation to this page
            if (pendingNavigationRef.current &&
                pendingNavigationRef.current.fileKey === fileKey &&
                pendingNavigationRef.current.pageNumber === pageNumber) {

                console.log(`[ViewportIntegrator] Processing pending navigation to page ${pageNumber}`);

                const { options } = pendingNavigationRef.current;
                pendingNavigationRef.current = null;

                // Execute the navigation now that the page is available
                setTimeout(() => {
                    scrollToPageWithViewport(
                        pageNumber,
                        fileKey,
                        options?.behavior || 'smooth',
                        options?.alignToTop || false
                    );
                }, 50);
            }
        };

        window.addEventListener('pdf-page-render-complete', handlePageRenderComplete);

        return () => {
            window.removeEventListener('pdf-page-render-complete', handlePageRenderComplete);
        };
    }, [scrollToPageWithViewport]);

    // Expose viewport navigation globally for other components to use
    useEffect(() => {
        // Add the viewport-aware navigation method to window
        (window as any).navigateToPageWithViewport = (
            pageNumber: number,
            fileKey: string,
            options: {
                behavior?: ScrollBehavior,
                alignToTop?: boolean
            } = {}
        ) => {
            // Dispatch event for the integrator to handle
            window.dispatchEvent(new CustomEvent('pdf-precise-navigation-request', {
                detail: {
                    fileKey,
                    pageNumber,
                    options
                }
            }));
        };

        return () => {
            // Clean up
            delete (window as any).navigateToPageWithViewport;
        };
    }, []);

    // When current file changes, reset initialized pages for that file
    useEffect(() => {
        if (!currentFile) return;

        const fileKey = getFileKey(currentFile);

        // Clear initialized pages for this file to ensure fresh navigation
        initializedPagesRef.current = new Set(
            Array.from(initializedPagesRef.current).filter(key => !key.startsWith(fileKey))
        );
    }, [currentFile]);

    // Listen for page render completion events from PageRenderer components
    useEffect(() => {
        // Add event dispatcher to PageRenderer components
        const addRenderCompleteDispatcher = () => {
            // Add this code to all canvases that finish rendering
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((node) => {
                            if (node instanceof HTMLElement && node.tagName === 'CANVAS') {
                                // Find the parent page wrapper
                                let pageWrapper = node.closest('.pdf-page-wrapper');
                                if (pageWrapper) {
                                    const pageNumber = pageWrapper.getAttribute('data-page-number');
                                    const fileContainer = pageWrapper.closest('.pdf-file-container');
                                    const fileKey = fileContainer?.getAttribute('data-file-key');

                                    if (pageNumber && fileKey) {
                                        // Dispatch event after a small delay to ensure full rendering
                                        setTimeout(() => {
                                            window.dispatchEvent(new CustomEvent('pdf-page-render-complete', {
                                                detail: {
                                                    pageNumber: parseInt(pageNumber, 10),
                                                    fileKey,
                                                    timestamp: Date.now()
                                                }
                                            }));
                                        }, 100);
                                    }
                                }
                            }
                        });
                    }
                });
            });

            // Start observing the document for canvas elements
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            return observer;
        };

        // Start the observer
        const observer = addRenderCompleteDispatcher();

        return () => {
            // Clean up the observer when component unmounts
            observer.disconnect();
        };
    }, []);

    // Enhance the navigation hook to use viewport-based navigation when appropriate
    useEffect(() => {
        const originalNavigateToPage = navigation.navigateToPage;

        // Patch the navigation.navigateToPage method
        (navigation as any).originalNavigateToPage = originalNavigateToPage;
        (navigation as any).navigateToPage = (
            pageNumber: number,
            fileKey?: string,
            options?: NavigationOptions
        ): void => {
            // If no fileKey, use the current file's key
            const targetFileKey = fileKey || (currentFile ? getFileKey(currentFile) : null);
            if (!targetFileKey) return;

            const isChangingFile = fileKey && currentFile && getFileKey(currentFile) !== fileKey;

            // For same-file navigation, use viewport-based scrolling
            if (!isChangingFile && currentFile) {
                window.dispatchEvent(new CustomEvent('pdf-precise-navigation-request', {
                    detail: {
                        fileKey: targetFileKey,
                        pageNumber,
                        options
                    }
                }));
            } else {
                // For file changes, use the original navigation
                originalNavigateToPage(pageNumber, fileKey, options);
            }
        };

        return () => {
            // Restore original method on unmount
            if ((navigation as any).originalNavigateToPage) {
                (navigation as any).navigateToPage = (navigation as any).originalNavigateToPage;
            }
        };
    }, [navigation, currentFile]);

    return null; // This component doesn't render anything visible
};

export default ViewportNavigationIntegrator;