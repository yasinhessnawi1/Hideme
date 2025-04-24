import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useFileContext } from './FileContext';
import scrollingService from '../services/UnifiedScrollingService';


interface PDFViewerContextProps {
    numPages: number;
    setNumPages: React.Dispatch<React.SetStateAction<number>>;
    currentPage: number;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    scrollToPage: (pageNumber: number, fileKey?: string) => void;
    zoomLevel: number;
    setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
    pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    renderedPages: Set<number>;
    setRenderedPages: React.Dispatch<React.SetStateAction<Set<number>>>;
    activeScrollPage: number;
    setActiveScrollPage: React.Dispatch<React.SetStateAction<number>>;
    mainContainerRef: React.RefObject<HTMLDivElement | null>;

    // File-specific functions
    getFileNumPages: (fileKey: string) => number;
    setFileNumPages: (fileKey: string, pages: number) => void;
    getFileCurrentPage: (fileKey: string) => number;
    setFileCurrentPage: (fileKey: string, page: number) => void;
    getFileActiveScrollPage: (fileKey: string) => number;
    setFileActiveScrollPage: (fileKey: string, page: number) => void;
    getFileRenderedPages: (fileKey: string) => Set<number>;
    setFileRenderedPages: (fileKey: string, pages: Set<number>) => void;
}

const PDFViewerContext = createContext<PDFViewerContextProps | undefined>(undefined);

export const usePDFViewerContext = () => {
    const context = useContext(PDFViewerContext);
    if (!context) {
        throw new Error('usePDFViewerContext must be used within a PDFViewerProvider');
    }
    return context;
};

// Helper function to generate a unique key for a file
export const getFileKey = (file: File): string => {
    return file.name;
};

export const PDFViewerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentFile, setCurrentFile, activeFiles } = useFileContext();

    // State for the currently displayed PDF (for backward compatibility)
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set([1]));
    const [activeScrollPage, setActiveScrollPage] = useState(1);

    // Use refs instead of state for file-specific data to avoid rerender loops
    const fileNumPagesRef = useRef<Map<string, number>>(new Map());
    const fileCurrentPageRef = useRef<Map<string, number>>(new Map());
    const fileActiveScrollPageRef = useRef<Map<string, number>>(new Map());
    const fileRenderedPagesRef = useRef<Map<string, Set<number>>>(new Map());

    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const mainContainerRef = useRef<HTMLDivElement | null>(null);
    const lastVisibleFileRef = useRef<string | null>(null);

    // Simple getter/setter for file-specific values that don't trigger renders
    const getFileNumPages = useCallback((fileKey: string): number => {
        return fileNumPagesRef.current.get(fileKey) ?? 0;
    }, []);

    const setFileNumPages = useCallback((fileKey: string, pages: number) => {
        fileNumPagesRef.current.set(fileKey, pages);

        // Only update the global state if it's the current file
        if (currentFile && getFileKey(currentFile) === fileKey) {
            setNumPages(pages);
        }
    }, [currentFile]);

    const getFileCurrentPage = useCallback((fileKey: string): number => {
        return fileCurrentPageRef.current.get(fileKey) ?? 1;
    }, []);

    const setFileCurrentPage = useCallback((fileKey: string, page: number) => {
        fileCurrentPageRef.current.set(fileKey, page);

        // Only update the global state if it's the current file
        if (currentFile && getFileKey(currentFile) === fileKey) {
            setCurrentPage(page);
        }

        // IMPROVEMENT: Emit an event for the page change
        window.dispatchEvent(new CustomEvent('pdf-page-changed', {
            detail: { fileKey, pageNumber: page }
        }));
    }, [currentFile]);

    const getFileActiveScrollPage = useCallback((fileKey: string): number => {
        return fileActiveScrollPageRef.current.get(fileKey) ?? 1;
    }, []);

    const setFileActiveScrollPage = useCallback((fileKey: string, page: number) => {
        fileActiveScrollPageRef.current.set(fileKey, page);

        // Only update the global state if it's the current file
        if (currentFile && getFileKey(currentFile) === fileKey) {
            setActiveScrollPage(page);
        }
    }, [currentFile]);

    const getFileRenderedPages = useCallback((fileKey: string): Set<number> => {
        return fileRenderedPagesRef.current.get(fileKey) || new Set([1]);
    }, []);

    const setFileRenderedPages = useCallback((fileKey: string, pages: Set<number>) => {
        fileRenderedPagesRef.current.set(fileKey, pages);

        // Only update the global state if it's the current file
        if (currentFile && getFileKey(currentFile) === fileKey) {
            setRenderedPages(pages);
        }
    }, [currentFile]);

    // Import the utility service
    const pdfUtilityService = React.useMemo(() => {
        // Dynamically import to avoid circular dependencies
        return import('../store/PDFUtilityStore').then(module => module.default);
    }, []);

    // Handle zoom level changes to scale highlights properly
    useEffect(() => {
        // When zoom level changes, update highlight scaling
        pdfUtilityService.then(service => {
            service.scaleHighlights(zoomLevel);
        });
    }, [zoomLevel, pdfUtilityService]);

    // Update page refs array when numPages changes
    useEffect(() => {
        pageRefs.current = Array(numPages).fill(null);
    }, [numPages]);

    // When currentFile changes, sync the global state with file-specific state
    useEffect(() => {
        if (currentFile) {
            const fileKey = getFileKey(currentFile);

            // Sync from file-specific to global (only if data exists)
            if (fileNumPagesRef.current.has(fileKey)) {
                setNumPages(fileNumPagesRef.current.get(fileKey) ?? 0);
            }

            if (fileCurrentPageRef.current.has(fileKey)) {
                setCurrentPage(fileCurrentPageRef.current.get(fileKey) ?? 1);
            }

            if (fileActiveScrollPageRef.current.has(fileKey)) {
                setActiveScrollPage(fileActiveScrollPageRef.current.get(fileKey) ?? 1);
            }

            if (fileRenderedPagesRef.current.has(fileKey)) {
                setRenderedPages(fileRenderedPagesRef.current.get(fileKey) || new Set([1]));
            }
        }
    }, [currentFile]);

    const scrollToPage = useCallback((pageNumber: number, fileKey?: string) => {
        // Get the file key to use
        const targetFileKey = fileKey ?? (currentFile ? getFileKey(currentFile) : null);
        if (!targetFileKey) return;

        // Update the file's current page (this is crucial for UI state consistency)
        setFileCurrentPage(targetFileKey, pageNumber);
        setFileActiveScrollPage(targetFileKey, pageNumber);

        // Use the unified scrolling service for all scrolling operations
        scrollingService.scrollToPage(pageNumber, targetFileKey, 'pdf-context', {
            behavior: 'smooth',
            highlightThumbnail: true
        });
    }, [currentFile, setFileCurrentPage, setFileActiveScrollPage]);

    // Helper function to find file that's most visible in viewport
    const findMostVisibleFile = useCallback(() => {
        const container = mainContainerRef.current;
        if (!container) return null;

        const containerRect = container.getBoundingClientRect();
        const fileContainers = document.querySelectorAll('.pdf-file-container');

        let mostVisibleFile = null;
        let maxVisibleArea = 0;

        fileContainers.forEach(fileContainer => {
            const fileKey = fileContainer.getAttribute('data-file-key');
            if (!fileKey) return;

            const fileRect = fileContainer.getBoundingClientRect();

            // Calculate overlap with viewport
            const visibleTop = Math.max(fileRect.top, containerRect.top);
            const visibleBottom = Math.min(fileRect.bottom, containerRect.bottom);

            // If there's no overlap, skip this file
            if (visibleBottom <= visibleTop) return;

            const visibleHeight = visibleBottom - visibleTop;
            const visibleArea = visibleHeight * fileRect.width;

            // Prioritize files closer to the center of the viewport
            const containerCenter = containerRect.top + containerRect.height / 2;
            const distanceToCenter = Math.abs( containerCenter);

            // Adjust score based on distance to center
            const adjustedArea = visibleArea * (1 - distanceToCenter / containerRect.height);

            if (adjustedArea > maxVisibleArea) {
                maxVisibleArea = adjustedArea;
                mostVisibleFile = fileKey;
            }
        });

        return mostVisibleFile;
    }, []);

    // Add scroll tracking
    useEffect(() => {
        const handleScroll = () => {
            if (!mainContainerRef.current || scrollingService.isCurrentlyScrolling()) return;

            const visiblePage = scrollingService.findMostVisiblePage();

            if (visiblePage.fileKey && visiblePage.pageNumber) {
                // If we found a visible file and it's different from the current file,
                // update the current file
                if (visiblePage.fileKey !== lastVisibleFileRef.current) {
                    lastVisibleFileRef.current = visiblePage.fileKey;

                    // Find the file object that matches this key
                    const matchingFile = activeFiles.find(file => {
                        return getFileKey(file) === visiblePage.fileKey;
                    });

                    // Update the current file if needed
                    if (matchingFile && (!currentFile || getFileKey(currentFile) !== visiblePage.fileKey)) {
                        setCurrentFile(matchingFile);
                    }
                }

                // Always update the active page for this file
                if (visiblePage.pageNumber) {
                    const currentActivePage = getFileActiveScrollPage(visiblePage.fileKey);

                    // Only update if the page changed to avoid unnecessary updates
                    if (currentActivePage !== visiblePage.pageNumber) {
                        setFileActiveScrollPage(visiblePage.fileKey, visiblePage.pageNumber);
                        setFileCurrentPage(visiblePage.fileKey, visiblePage.pageNumber);
                    }
                }
            }
        };

        const container = mainContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });

            // Run once immediately to set initial states
            setTimeout(handleScroll, 500);

            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [
        activeFiles,
        currentFile,
        getFileActiveScrollPage,
        setFileActiveScrollPage,
        setFileCurrentPage,
        setCurrentFile,
        findMostVisibleFile
    ]);

    // Listen for scroll events from other components
    useEffect(() => {
        const handleExternalPageChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, pageNumber } = customEvent.detail || {};

            if (fileKey && pageNumber && currentFile) {
                const currentFileKey = getFileKey(currentFile);

                // Only respond if this is for the current file
                if (currentFileKey === fileKey) {
                    // Update the current page and active scroll page
                    setCurrentPage(pageNumber);
                    setActiveScrollPage(pageNumber);
                }
            }
        };

        window.addEventListener('pdf-page-changed', handleExternalPageChange);

        return () => {
            window.removeEventListener('pdf-page-changed', handleExternalPageChange);
        };
    }, [currentFile]);

    // Add keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if focus is in an input field
            if (e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Only handle navigation for the current file
            if (!currentFile) return;
            const fileKey = getFileKey(currentFile);

            // Get current page and total pages
            const currentFilePage = getFileCurrentPage(fileKey);
            const totalPages = getFileNumPages(fileKey);

            if (e.key === 'ArrowDown' || e.key === 'PageDown') {
                if (currentFilePage < totalPages) {
                    e.preventDefault();
                    scrollToPage(currentFilePage + 1, fileKey);
                }
            } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
                if (currentFilePage > 1) {
                    e.preventDefault();
                    scrollToPage(currentFilePage - 1, fileKey);
                }
            } else if (e.key === 'Home') {
                e.preventDefault();
                scrollToPage(1, fileKey);
            } else if (e.key === 'End') {
                e.preventDefault();
                scrollToPage(totalPages, fileKey);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [currentFile, getFileCurrentPage, getFileNumPages, scrollToPage]);

    return (
        <PDFViewerContext.Provider
            value={{
                // Global state (for backward compatibility)
                numPages,
                setNumPages,
                currentPage,
                setCurrentPage,
                scrollToPage,
                zoomLevel,
                setZoomLevel,
                pageRefs,
                renderedPages,
                setRenderedPages,
                activeScrollPage,
                setActiveScrollPage,
                mainContainerRef,

                // File-specific functions
                getFileNumPages,
                setFileNumPages,
                getFileCurrentPage,
                setFileCurrentPage,
                getFileActiveScrollPage,
                setFileActiveScrollPage,
                getFileRenderedPages,
                setFileRenderedPages
            }}
        >
            {children}
        </PDFViewerContext.Provider>
    );
};
