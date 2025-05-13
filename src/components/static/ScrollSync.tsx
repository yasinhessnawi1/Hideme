import React, { useEffect, useRef } from 'react';
import { useFileContext } from '../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../contexts/PDFViewerContext';
import scrollManager from '../../services/client-services/ScrollManagerService';

/**
 * ScrollSync component
 *
 * This component provides scroll synchronization between different parts of the app:
 * - Tracks which page is most visible during scrolling
 * - Updates active page and file state based on visibility
 * - Handles scroll position persistence between file switches
 * - Coordinates scroll events between main viewer and thumbnails
 */
const ScrollSync: React.FC = () => {
    // Get context data
    const {
        currentFile,
        files,
        activeFiles,
        setCurrentFile
    } = useFileContext();

    const {
        mainContainerRef,
        setFileCurrentPage,
        setFileActiveScrollPage,
        getFileCurrentPage,
    } = usePDFViewerContext();

    // Refs for tracking scroll state
    const isScrollingRef = useRef<boolean>(false);
    const lastVisibleFileRef = useRef<string | null>(null);
    const scrollPositionRef = useRef<number>(0);
    const scrollStartTimeRef = useRef<number>(0);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const observersInitializedRef = useRef<boolean>(false);


    const eventProcessingRef = useRef({
        isProcessing: false,
        lastEventTimestamp: 0
    });
    // Initialize observers when DOM is ready
    useEffect(() => {
        // Wait for DOM to be ready before initializing observers
        const initializeObservers = () => {
            if (!observersInitializedRef.current && mainContainerRef.current) {
                scrollManager.initializeObservers();
                observersInitializedRef.current = true;
                console.log('[ScrollSync] Initialized intersection observers');
            }
        };

        // Try to initialize immediately
        initializeObservers();

        // Fallback: try again after a delay in case DOM isn't fully ready
        const initTimeout = setTimeout(initializeObservers, 500);

        return () => {
            clearTimeout(initTimeout);
        };
    }, [mainContainerRef.current]);

    // Re-initialize observers when active files change
    useEffect(() => {
        if (activeFiles.length > 0 && observersInitializedRef.current) {
            console.log('[ScrollSync] Files changed, refreshing observers');
            // Wait for DOM to update before refreshing observers
            setTimeout(() => {
                scrollManager.refreshObservers();
            }, 300);
        }
    }, [activeFiles.length]);

    // Update state on scroll
    useEffect(() => {
        if (!mainContainerRef.current) return;

        const handleScroll = () => {
            // Skip if already scrolling programmatically
            if (isScrollingRef.current || scrollManager.isScrollingInProgress() || scrollManager.isFileChangeInProgress()) {
                return;
            }

            const container = mainContainerRef.current;
            if (!container) return;

            // Record current scroll position
            scrollPositionRef.current = container.scrollTop;

            // Record when scroll started if not already scrolling
            if (scrollStartTimeRef.current === 0) {
                scrollStartTimeRef.current = Date.now();
            }

            // Save current scroll position for the current file
            if (currentFile) {
                const fileKey = getFileKey(currentFile);
                scrollManager.saveScrollPosition(fileKey, scrollPositionRef.current);
            }

            // Debounce scroll events
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Process scroll after it stops
            scrollTimeoutRef.current = setTimeout(() => {
                // Calculate how long user has been scrolling
                scrollStartTimeRef.current = 0;

                // Get the most visible page
                const visiblePage = scrollManager.findMostVisiblePage();

                // Process page changes
                if (visiblePage.fileKey && visiblePage.pageNumber) {
                    // Update page numbers for this file
                    setFileCurrentPage(visiblePage.fileKey, visiblePage.pageNumber, "scroll-sync");
                    setFileActiveScrollPage(visiblePage.fileKey, visiblePage.pageNumber);

                    // Determine if file should change based on visibility and scroll time
                    const shouldSwitchFiles =
                        visiblePage.fileKey &&
                        currentFile &&
                        getFileKey(currentFile) !== visiblePage.fileKey

                    if (shouldSwitchFiles) {
                        const newFile = files.find(file => getFileKey(file) === visiblePage.fileKey);
                        if (newFile) {
                            console.log(`[ScrollSync] Changing current file to ${visiblePage.fileKey}`);

                            // Save current scroll position
                            if (currentFile) {
                                const currentFileKey = getFileKey(currentFile);
                                scrollManager.saveScrollPosition(currentFileKey, scrollPositionRef.current);
                            }

                            // Mark that we're changing files
                            scrollManager.setFileChanging(true);

                            // Update current file
                            setCurrentFile(newFile);

                            // After changing file, ensure we restore scroll position
                            setTimeout(() => {
                                if (container) {
                                    container.scrollTop = scrollPositionRef.current;
                                }
                                scrollManager.setFileChanging(false);
                            }, 50);
                        }
                    }
                }
            }, 20);
        };

        // Register scroll listener
        const container = mainContainerRef.current;
        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [
        mainContainerRef,
        currentFile,
        files,
        setCurrentFile,
        setFileCurrentPage,
        setFileActiveScrollPage
    ]);



    // Restore scroll position when current file changes
    useEffect(() => {
        if (!currentFile || !mainContainerRef.current) return;

        const fileKey = getFileKey(currentFile);

        // Keep track of the current file
        if (lastVisibleFileRef.current !== fileKey) {
            lastVisibleFileRef.current = fileKey;
        }

        // Restore saved scroll position if we have one
        if (!scrollManager.isScrollingInProgress()) {
            const savedPosition = scrollManager.getSavedScrollPosition(fileKey);

            if (savedPosition !== undefined) {
                // Use a small timeout to ensure rendering completes
                setTimeout(() => {
                    if (mainContainerRef.current) {
                        mainContainerRef.current.scrollTop = savedPosition;

                        // Get current page
                        const currentPage = getFileCurrentPage(fileKey) || 1;

                        // Highlight the current page
                        scrollManager.highlightActivePage(fileKey, currentPage);
                    }
                }, 50);
            } else {
                // If no saved position, scroll to first page
                setTimeout(() => {
                    const pageElement = document.querySelector(
                        `.pdf-file-container[data-file-key="${fileKey}"] [data-page-number="1"]`
                    ) as HTMLElement;

                    if (pageElement && mainContainerRef.current) {
                        const position = scrollManager.calculateScrollPosition(pageElement, true);
                        if (position !== null) {
                            mainContainerRef.current.scrollTop = position;
                        }

                        // Update page state
                        setFileCurrentPage(fileKey, 1, "scroll-sync");
                        setFileActiveScrollPage(fileKey, 1);

                        // Highlight first page
                        scrollManager.highlightActivePage(fileKey, 1);
                    }
                }, 100);
            }
        }
    }, [
        currentFile,
        mainContainerRef,
        getFileCurrentPage,
        setFileCurrentPage,
        setFileActiveScrollPage
    ]);

    // Register with the scroll manager
    useEffect(() => {
        // Register a scroll handler to keep our state in sync
        scrollManager.addScrollListener('scroll-sync', (pageNumber, fileKey) => {
            // Update the file's current page
            setFileCurrentPage(fileKey, pageNumber, "scroll-sync");
            setFileActiveScrollPage(fileKey, pageNumber);
        });

        return () => {
            // Clean up when unmounting
            scrollManager.removeScrollListener('scroll-sync');
        };
    }, [setFileCurrentPage, setFileActiveScrollPage]);

    // This component doesn't render anything
    return null;
};

export default ScrollSync;
