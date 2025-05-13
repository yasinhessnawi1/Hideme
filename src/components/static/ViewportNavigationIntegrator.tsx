import React, { useEffect, useRef } from 'react';
import { useFileContext } from '../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../contexts/PDFViewerContext';
import { usePDFNavigation } from '../../hooks/general/usePDFNavigation';
import scrollManager from '../../services/client-services/ScrollManagerService';
import { NavigationOptions } from '../../types';

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
 * - Observing page rendering completion for reliable navigation timing
 * - Supporting deferred navigation to pages that aren't rendered yet
 */
const ViewportNavigationIntegrator: React.FC = () => {
    const { currentFile } = useFileContext();
    const { mainContainerRef } = usePDFViewerContext();

    // Use our navigation hook
    const navigation = usePDFNavigation('viewport-integrator');

    // Track pending navigation requests
    const pendingNavigationRef = useRef<PendingNavigation | null>(null);

    // Track initialized pages
    const initializedPagesRef = useRef<Set<string>>(new Set());

    /**
     * Handle navigation requests that require precise viewport positioning
     */
    useEffect(() => {
        const handlePreciseNavigationRequest = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, pageNumber, options } = customEvent.detail ?? {};

            if (!fileKey || !pageNumber) return;

            console.log(`[ViewportIntegrator] Received precise navigation request to page ${pageNumber} in file ${fileKey}`);

            // Store request for later if page is not ready
            pendingNavigationRef.current = {
                fileKey,
                pageNumber,
                options: options ?? {}
            };

            // Check if page is already initialized
            const pageKey = `${fileKey}-${pageNumber}`;
            if (initializedPagesRef.current.has(pageKey)) {
                // Page is ready, navigate immediately
                navigation.navigateToPage(pageNumber, fileKey, options);
                pendingNavigationRef.current = null;
            } else {
                // Page is not ready, keep pending request
                console.log(`[ViewportIntegrator] Page ${pageNumber} not initialized yet, will navigate when ready`);
            }
        };

        window.addEventListener('pdf-precise-navigation-request', handlePreciseNavigationRequest);

        return () => {
            window.removeEventListener('pdf-precise-navigation-request', handlePreciseNavigationRequest);
        };
    }, [navigation]);

    /**
     * Process pending navigation when pages become available
     */
    useEffect(() => {
        const handlePageRenderComplete = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { pageNumber, fileKey } = customEvent.detail || {};

            if (!pageNumber || !fileKey) return;

            // Mark page as initialized
            const pageKey = `${fileKey}-${pageNumber}`;
            initializedPagesRef.current.add(pageKey);

            console.log(`[ViewportIntegrator] Page ${pageNumber} in file ${fileKey} is ready`);

            // Check if there's a pending navigation to this page
            if (
                pendingNavigationRef.current &&
                pendingNavigationRef.current.fileKey === fileKey &&
                pendingNavigationRef.current.pageNumber === pageNumber
            ) {
                console.log(`[ViewportIntegrator] Processing pending navigation to page ${pageNumber}`);

                const { options } = pendingNavigationRef.current;
                pendingNavigationRef.current = null;

                // Execute navigation now that the page is available
                setTimeout(() => {
                    navigation.navigateToPage(pageNumber, fileKey, options);
                }, 50);
            }
        };

        window.addEventListener('pdf-page-render-complete', handlePageRenderComplete);

        return () => {
            window.removeEventListener('pdf-page-render-complete', handlePageRenderComplete);
        };
    }, [navigation]);

    /**
     * Expose viewport navigation globally for other components
     */
    useEffect(() => {
        // Define the global navigation method
        (window as any).navigateToPageWithViewport = (
            pageNumber: number,
            fileKey: string,
            options: {
                behavior?: ScrollBehavior,
                alignToTop?: boolean,
                highlightThumbnail?: boolean
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
            // Clean up global method
            delete (window as any).navigateToPageWithViewport;
        };
    }, []);

    /**
     * Reset page tracking when file changes
     */
    useEffect(() => {
        if (!currentFile) return;

        const fileKey = getFileKey(currentFile);

        // Clear initialized pages for the previous file to ensure fresh tracking
        initializedPagesRef.current = new Set(
            Array.from(initializedPagesRef.current).filter(key => !key.startsWith(fileKey))
        );
    }, [currentFile]);

    /**
     * Track page rendering completions
     */
    useEffect(() => {
        // Set up mutation observer to detect when canvas elements are added
        const addRenderCompleteDispatcher = () => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((node) => {
                            if (node instanceof HTMLElement && node.tagName === 'CANVAS') {
                                // Find parent page wrapper
                                const pageWrapper = node.closest('.pdf-page-wrapper');
                                if (pageWrapper) {
                                    const pageNumber = pageWrapper.getAttribute('data-page-number');
                                    const fileContainer = pageWrapper.closest('.pdf-file-container');
                                    const fileKey = fileContainer?.getAttribute('data-file-key');

                                    if (pageNumber && fileKey) {
                                        // Dispatch page render complete event
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

            // Start observing the document
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            return observer;
        };

        // Start the observer
        const observer = addRenderCompleteDispatcher();

        return () => {
            observer.disconnect();
        };
    }, []);

    /**
     * Enhance the navigation hook to use viewport navigation
     */
    useEffect(() => {
        // Install an intersection observer to detect when pages
        // become fully visible to improve navigation accuracy
        const enhanceNavigation = () => {
            // Set up observers for all pages
            scrollManager.refreshObservers();
        };

        // Run on mount and when container changes
        if (mainContainerRef.current) {
            enhanceNavigation();
        }

        // Also set up a timeout to run again after everything is fully rendered
        const timeoutId = setTimeout(enhanceNavigation, 1000);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [mainContainerRef.current]);

    // This component doesn't render anything visible
    return null;
};

export default ViewportNavigationIntegrator;
