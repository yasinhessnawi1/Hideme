import React, { useEffect, useRef } from 'react';
import { useFileContext } from '../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../contexts/PDFViewerContext';
import scrollingService from '../../services/UnifiedScrollingService';

/**
 * Component that provides global scroll synchronization
 * This component doesn't render anything visible but connects
 * various parts of the application for consistent scrolling
 */
const ScrollSync: React.FC = () => {
    const { currentFile, activeFiles, setCurrentFile } = useFileContext();
    const {
        mainContainerRef,
        setFileCurrentPage,
        setFileActiveScrollPage
    } = usePDFViewerContext();

    // Use our navigation hook

    // Track scroll timeout
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Track if we're programmatically scrolling
    const isScrollingRef = useRef<boolean>(false);

    // Track last visible file to prevent unnecessary file switches
    const lastVisibleFileRef = useRef<string | null>(null);

    // Track the current scroll position
    const scrollPositionRef = useRef<number>(0);

    // Track if user is actively scrolling (to prevent file changes)
    const userScrollingRef = useRef<boolean>(false);

    // Track when scroll started to prevent changes during active scroll
    const scrollStartTimeRef = useRef<number>(0);

    // Minimum time (ms) user must view a file before it will switch
    const FILE_CHANGE_MIN_TIME = 1000;

    // Visibility threshold for file switching (0-1)
    const FILE_VISIBILITY_THRESHOLD = 0.8; // 80% visible required

    // Flag to control file switching during scroll
    // Can be enabled/disabled based on your preference
    const DISABLE_FILE_SWITCHING_DURING_SCROLL = false;

    // Record the initial scroll position when the component mounts
    useEffect(() => {
        if (mainContainerRef.current) {
            scrollPositionRef.current = mainContainerRef.current.scrollTop;
        }
    }, [mainContainerRef]);

    // Monitor scroll position in the main viewer
    useEffect(() => {
        if (!mainContainerRef.current) return;

        const handleScroll = () => {
            // Skip if we're already scrolling programmatically
            if (isScrollingRef.current || scrollingService.isCurrentlyScrolling()) return;

            const container = mainContainerRef.current;
            if (!container) return;

            // Mark that user is actively scrolling
            userScrollingRef.current = true;

            // Record when scroll started if not already scrolling
            if (scrollStartTimeRef.current === 0) {
                scrollStartTimeRef.current = Date.now();
            }

            // Track current scroll position
            const currentScrollPosition = container.scrollTop;

            // Save the current scroll position for the current file
            if (currentFile) {
                const fileKey = getFileKey(currentFile);
                scrollingService.saveScrollPosition(fileKey, currentScrollPosition);
            }

            // Update internal scroll position reference
            scrollPositionRef.current = currentScrollPosition;

            // Debounce the scroll event
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Set a timeout to run after scrolling stops
            scrollTimeoutRef.current = setTimeout(() => {
                // First, mark that user is no longer actively scrolling
                userScrollingRef.current = false;

                // Calculate how long user has been scrolling
                const scrollTime = Date.now() - scrollStartTimeRef.current;
                scrollStartTimeRef.current = 0; // Reset scroll time

                // Get the most visible page with high visibility threshold
                const visiblePage = scrollingService.findMostVisiblePageWithThreshold(
                    FILE_VISIBILITY_THRESHOLD
                );

                // Always update page numbers regardless of file switching
                if (visiblePage.fileKey && visiblePage.pageNumber) {
                    // Update the page number for this file
                    setFileCurrentPage(visiblePage.fileKey, visiblePage.pageNumber);
                    setFileActiveScrollPage(visiblePage.fileKey, visiblePage.pageNumber);

                    // Notify other components about the page change
                    window.dispatchEvent(new CustomEvent('pdf-page-changed', {
                        detail: {
                            fileKey: visiblePage.fileKey,
                            pageNumber: visiblePage.pageNumber,
                            source: 'scroll-sync',
                            scrollPosition: currentScrollPosition
                        }
                    }));

                    // Check if we should switch files
                    const shouldSwitchFiles =
                        // Only switch if the configuration allows it
                        !DISABLE_FILE_SWITCHING_DURING_SCROLL &&
                        // Ensure there's a valid file to switch to
                        visiblePage.fileKey &&
                        currentFile &&
                        getFileKey(currentFile) !== visiblePage.fileKey &&
                        // Make sure the file has high enough visibility
                        visiblePage.visibilityRatio > FILE_VISIBILITY_THRESHOLD &&
                        // Only switch if user has scrolled long enough
                        scrollTime > FILE_CHANGE_MIN_TIME;

                    // Only switch files if conditions are met
                    if (shouldSwitchFiles) {
                        // Find the file object
                        const newFile = activeFiles.find(
                            file => getFileKey(file) === visiblePage.fileKey
                        );

                        if (newFile) {
                            // Save current scroll position
                            const currentFileKey = getFileKey(currentFile);
                            scrollingService.saveScrollPosition(currentFileKey, scrollPositionRef.current);

                            // Mark that we're switching files to prevent jumps
                            scrollingService.setFileChangeScroll(true);

                            // Update the current file
                            setCurrentFile(newFile);

                            // Apply visual active state to the page
                            setTimeout(() => {
                                const pageElement = document.querySelector(
                                    `.pdf-file-container[data-file-key="${visiblePage.fileKey}"] [data-page-number="${visiblePage.pageNumber}"]`
                                );
                                if (pageElement) {
                                    pageElement.classList.add('active');

                                    // Add and then remove the just-activated class for animation
                                    pageElement.classList.add('just-activated');
                                    setTimeout(() => {
                                        pageElement.classList.remove('just-activated');
                                    }, 1500);
                                }

                                // After changing file, restore the scroll position
                                if (container) {
                                    container.scrollTop = scrollPositionRef.current;
                                }

                                // Reset file change flag
                                scrollingService.setFileChangeScroll(false);
                            }, 50);
                        }
                    }
                }
            }, 300); // Wait for scrolling to stop completely
        };

        const container = mainContainerRef.current;
        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [mainContainerRef, setFileCurrentPage, setFileActiveScrollPage, currentFile, activeFiles, setCurrentFile]);

    // Handle direct navigation requests from other components
    useEffect(() => {
        const handleScrollServiceUpdate = (pageNumber: number, fileKey: string, source: string) => {
            // Skip if we initiated the scroll
            if (source === 'scroll-sync') return;

            // Skip if user is actively scrolling
            if (userScrollingRef.current) return;

            // Set flag to prevent feedback loops
            isScrollingRef.current = true;

            // Update the page tracking
            setFileCurrentPage(fileKey, pageNumber);
            setFileActiveScrollPage(fileKey, pageNumber);

            // Reset the flag after a delay
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 500);
        };

        // Register with the scrolling service
        scrollingService.addScrollListener('scroll-sync', handleScrollServiceUpdate);

        return () => {
            scrollingService.removeScrollListener('scroll-sync');
        };
    }, [setFileCurrentPage, setFileActiveScrollPage]);

    // When the current file changes, ensure scroll position is preserved
    useEffect(() => {
        if (!currentFile) return;

        const fileKey = getFileKey(currentFile);

        // Keep track of the current file
        if (lastVisibleFileRef.current !== fileKey) {
            lastVisibleFileRef.current = fileKey;
        }

        // Try to restore saved scroll position
        if (mainContainerRef.current && !userScrollingRef.current) {
            const savedPosition = scrollingService.getSavedScrollPosition(fileKey);

            if (savedPosition !== undefined && !scrollingService.isCurrentlyScrolling()) {
                // Use a small timeout to ensure rendering completes
                setTimeout(() => {
                    if (mainContainerRef.current) {
                        mainContainerRef.current.scrollTop = savedPosition;

                        // Find and highlight the active page
                        const activePage = document.querySelector(
                            `.pdf-file-container[data-file-key="${fileKey}"] [data-page-number="${activeFiles}"]`
                        );
                        if (activePage) {
                            activePage.classList.add('active');
                        }
                    }
                }, 50);
            }
        }
    }, [currentFile, mainContainerRef, activeFiles]);

    return null; // This component doesn't render anything
};

export default ScrollSync;
