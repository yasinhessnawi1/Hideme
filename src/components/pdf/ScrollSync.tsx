import React, { useEffect, useRef, useCallback } from 'react';
import { useFileContext } from '../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../contexts/PDFViewerContext';
import scrollingService from '../../services/UnifiedScrollingService';

/**
 * ScrollSync component
 * 
 * This component provides global scroll synchronization between different PDF components.
 * It doesn't render any visible UI but connects various parts of the application for 
 * consistent scrolling behavior.
 * 
 * Responsibilities:
 * - Monitor scroll events in the main container
 * - Track and save scroll position for each file
 * - Detect the most visible page during scrolling
 * - Update page numbers based on scroll position
 * - Handle file switching when scrolling between documents
 * - Respond to external navigation requests
 */
const ScrollSync: React.FC = () => {
    // Context hooks
    const { currentFile, activeFiles, setCurrentFile } = useFileContext();
    const { 
        mainContainerRef, 
        setFileCurrentPage, 
        setFileActiveScrollPage, 
        getFileCurrentPage 
    } = usePDFViewerContext();

    // Configuration constants
    const FILE_CHANGE_MIN_TIME = 1000; // Minimum time (ms) user must view a file before switching
    const FILE_VISIBILITY_THRESHOLD = 0.8; // 80% visibility required for file switching
    const DISABLE_FILE_SWITCHING_DURING_SCROLL = false; // Set to true to disable automatic file switching

    // Scroll state tracking refs
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isScrollingRef = useRef<boolean>(false);
    const lastVisibleFileRef = useRef<string | null>(null);
    const scrollPositionRef = useRef<number>(0);
    const userScrollingRef = useRef<boolean>(false);
    const scrollStartTimeRef = useRef<number>(0);

    /**
     * Find and highlight the active page visually
     */
    const highlightActivePage = useCallback((fileKey: string, pageNumber: number) => {
        console.log(`[ScrollSync] Highlighting active page ${pageNumber} in file ${fileKey}`);
        
        // Update state in the context first - this is crucial!
        setFileCurrentPage(fileKey, pageNumber);
        setFileActiveScrollPage(fileKey, pageNumber);
        
        // Immediate DOM operation to ensure it happens quickly
        const pageElement = document.querySelector(
            `.pdf-file-container[data-file-key="${fileKey}"] [data-page-number="${pageNumber}"]`
        );
        
        if (pageElement) {
            console.log(`[ScrollSync] Found page element for page ${pageNumber} in file ${fileKey}`);
            
            // Remove active class from all pages in this file first
            const filePages = document.querySelectorAll(
                `.pdf-file-container[data-file-key="${fileKey}"] .pdf-page-wrapper`
            );
            
            // First remove all active classes
            if (filePages.length > 0) {
                console.log(`[ScrollSync] Removing active class from ${filePages.length} pages`);
                filePages.forEach(page => page.classList.remove('active'));
            }
            
            // Then add active class to this page
            pageElement.classList.add('active');

            // Add animation class and remove it after animation completes
            pageElement.classList.add('just-activated');
            setTimeout(() => {
                pageElement.classList.remove('just-activated');
            }, 1500);
            
            // Dispatch an event that other components can listen for
            window.dispatchEvent(new CustomEvent('page-highlighted', {
                detail: {
                    fileKey,
                    pageNumber,
                    source: 'scroll-sync'
                }
            }));
        } else {
            console.warn(`[ScrollSync] Could not find page element for page ${pageNumber} in file ${fileKey}`);
            
            // Try again after a short delay as a fallback
            setTimeout(() => {
                const retryElement = document.querySelector(
                    `.pdf-file-container[data-file-key="${fileKey}"] [data-page-number="${pageNumber}"]`
                );
                
                if (retryElement) {
                    console.log(`[ScrollSync] Found page element on retry for page ${pageNumber}`);
                    
                    // Remove active class from all pages in this file
                    const filePages = document.querySelectorAll(
                        `.pdf-file-container[data-file-key="${fileKey}"] .pdf-page-wrapper`
                    );
                    filePages.forEach(page => page.classList.remove('active'));
                    
                    // Add active class to this page
                    retryElement.classList.add('active');
                }
            }, 100);
        }
    }, [setFileCurrentPage, setFileActiveScrollPage]);

    /**
     * Switch to a different file while preserving scroll position
     */
    const handleFileSwitch = useCallback((newFile: File, pageNumber: number) => {
        if (!currentFile || !mainContainerRef.current) return;

        // Save current scroll position before switching
        const currentFileKey = getFileKey(currentFile);
        scrollingService.saveScrollPosition(currentFileKey, scrollPositionRef.current);

        // Mark that we're switching files to prevent jumps
        scrollingService.setFileChangeScroll(true);

        // Update the current file
        setCurrentFile(newFile);

        // Get the new file key
        const newFileKey = getFileKey(newFile);

        // Apply visual active state to the page
        highlightActivePage(newFileKey, pageNumber);

        // Restore the scroll position after file change
        setTimeout(() => {
            if (mainContainerRef.current) {
                mainContainerRef.current.scrollTop = scrollPositionRef.current;
            }

            // Reset file change flag
            scrollingService.setFileChangeScroll(false);
        }, 100);
    }, [currentFile, setCurrentFile, highlightActivePage, mainContainerRef.current]);

    /**
     * Update page numbers without switching files
     */
    const updatePageNumbers = useCallback((fileKey: string, pageNumber: number, scrollPosition: number) => {
        // Update the page tracking
        setFileCurrentPage(fileKey, pageNumber);
        setFileActiveScrollPage(fileKey, pageNumber);

        // Notify other components about the page change
        window.dispatchEvent(new CustomEvent('pdf-page-changed', {
            detail: {
                fileKey,
                pageNumber,
                source: 'scroll-sync',
                scrollPosition
            }
        }));

        // Highlight the active page
        highlightActivePage(fileKey, pageNumber);
    }, [setFileCurrentPage, setFileActiveScrollPage, highlightActivePage]);

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
                // Mark that user is no longer actively scrolling
                userScrollingRef.current = false;

                // Calculate how long user has been scrolling
                const scrollTime = Date.now() - scrollStartTimeRef.current;
                scrollStartTimeRef.current = 0; // Reset scroll time

                // Get the most visible page with high visibility threshold
                const visiblePage = scrollingService.findMostVisiblePageWithThreshold(
                    FILE_VISIBILITY_THRESHOLD
                );

                // If we found a visible page, update page numbers
                if (visiblePage.fileKey && visiblePage.pageNumber) {
                    // Update the page number for this file
                    setFileCurrentPage(visiblePage.fileKey, visiblePage.pageNumber);
                    setFileActiveScrollPage(visiblePage.fileKey, visiblePage.pageNumber);
                    
                    // Highlight the active page
                    highlightActivePage(visiblePage.fileKey, visiblePage.pageNumber);

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
                        // Find the file object to switch to
                        const newFile = activeFiles.find(
                            file => getFileKey(file) === visiblePage.fileKey && visiblePage.fileKey !== null
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
                                // Use our helper for consistent highlighting
                                if (visiblePage.fileKey && visiblePage.pageNumber) {
                                    highlightActivePage(visiblePage.fileKey, visiblePage.pageNumber);
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
    }, [
        mainContainerRef, 
        currentFile, 
        activeFiles, 
        updatePageNumbers, 
        handleFileSwitch
    ]);

    // Handle direct navigation requests from other components
    useEffect(() => {
        const handleScrollServiceUpdate = (pageNumber: number, fileKey: string, source: string) => {
            // Skip if we initiated the scroll or user is actively scrolling
            if (source === 'scroll-sync' || userScrollingRef.current) return;

            // Set flag to prevent feedback loops
            isScrollingRef.current = true;

            // Update the page tracking
            setFileCurrentPage(fileKey, pageNumber);
            setFileActiveScrollPage(fileKey, pageNumber);
            
            // Highlight the active page immediately
            highlightActivePage(fileKey, pageNumber);

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
        if (!currentFile || !mainContainerRef.current) return;

        const fileKey = getFileKey(currentFile);

        // Keep track of the current file
        if (lastVisibleFileRef.current !== fileKey) {
            lastVisibleFileRef.current = fileKey;
        }

        // Try to restore saved scroll position
        if (!userScrollingRef.current && !scrollingService.isCurrentlyScrolling()) {
            const savedPosition = scrollingService.getSavedScrollPosition(fileKey);

            if (savedPosition !== undefined) {
                // Use a small timeout to ensure rendering completes
                setTimeout(() => {
                    if (mainContainerRef.current) {
                        mainContainerRef.current.scrollTop = savedPosition;

                        // Find and highlight the active page
                        const savedPage = getFileCurrentPage(fileKey);
                        
                        // Highlight active page using the highlightActivePage helper
                        highlightActivePage(fileKey, savedPage || 1);
                    }
                }, 50);
            }
        }
    }, [currentFile, mainContainerRef, getFileCurrentPage, highlightActivePage]);

    return null; // This component doesn't render anything visible
};

export default ScrollSync;