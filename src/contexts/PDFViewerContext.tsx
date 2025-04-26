import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useFileContext } from './FileContext';
import scrollManager from '../services/ScrollManagerService';

const EVENT_PROCESSING = {
    isProcessing: false,
    lastEventTimestamp: 0,
    sourceId: ''
};
interface PDFViewerContextProps {
    // Core properties
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
    setFileCurrentPage: (fileKey: string, page: number, scrollSync: string) => void;
    getFileActiveScrollPage: (fileKey: string) => number;
    setFileActiveScrollPage: (fileKey: string, page: number) => void;
    getFileRenderedPages: (fileKey: string) => Set<number>;
    setFileRenderedPages: (fileKey: string, pages: Set<number>) => void;

    // New properties for virtualization
    visiblePages: Set<number>;
    setVisiblePages: React.Dispatch<React.SetStateAction<Set<number>>>;
    getFileVisiblePages: (fileKey: string) => Set<number>;
    setFileVisiblePages: (fileKey: string, pages: Set<number>) => void;

    // New methods for scroll management
    isScrollingInProgress: () => boolean;
    isFileChangeInProgress: () => boolean;
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

    // New state for visible pages (virtualization)
    const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1, 2, 3]));

    // Use refs instead of state for file-specific data to avoid rerender loops
    const fileNumPagesRef = useRef<Map<string, number>>(new Map());
    const fileCurrentPageRef = useRef<Map<string, number>>(new Map());
    const fileActiveScrollPageRef = useRef<Map<string, number>>(new Map());
    const fileRenderedPagesRef = useRef<Map<string, Set<number>>>(new Map());
    // New ref for file-specific visible pages
    const fileVisiblePagesRef = useRef<Map<string, Set<number>>>(new Map());

    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const mainContainerRef = useRef<HTMLDivElement | null>(null);
    const contextInitializedRef = useRef<boolean>(false);

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

    // Add getters/setters for visible pages
    const getFileVisiblePages = useCallback((fileKey: string): Set<number> => {
        return fileVisiblePagesRef.current.get(fileKey) || new Set([1, 2, 3]);
    }, []);

    const setFileVisiblePages = useCallback((fileKey: string, pages: Set<number>) => {
        fileVisiblePagesRef.current.set(fileKey, pages);

        // Only update the global state if it's the current file
        if (currentFile && getFileKey(currentFile) === fileKey) {
            setVisiblePages(pages);
        }
    }, [currentFile]);

    const getFileCurrentPage = useCallback((fileKey: string): number => {
        return fileCurrentPageRef.current.get(fileKey) ?? 1;
    }, []);

    const setFileCurrentPage = useCallback((fileKey: string, page: number, source: string = 'unknown') => {
        // Skip if we're already processing an event from this source or if it happened too recently
        const now = Date.now();
        if (EVENT_PROCESSING.isProcessing &&
            EVENT_PROCESSING.sourceId === source &&
            now - EVENT_PROCESSING.lastEventTimestamp < 100) {
            return;
        }

        // Set state locally
        fileCurrentPageRef.current.set(fileKey, page);

        // Only update the global state if it's the current file
        if (currentFile && getFileKey(currentFile) === fileKey) {
            setCurrentPage(page);
        }

        // Only dispatch event if we're not scrolling and it's not our own event
        if (!scrollManager.isScrollingInProgress() &&
            !scrollManager.isFileChangeInProgress() &&
            source !== 'pdf-context') {

            try {
                // Mark that we're processing an event
                EVENT_PROCESSING.isProcessing = true;
                EVENT_PROCESSING.lastEventTimestamp = now;
                EVENT_PROCESSING.sourceId = 'pdf-context';

                // Dispatch the event
                window.dispatchEvent(new CustomEvent('pdf-page-changed', {
                    detail: {
                        fileKey,
                        pageNumber: page,
                        source: 'pdf-context',
                        timestamp: now
                    }
                }));
            } finally {
                // Reset after a short delay
                setTimeout(() => {
                    EVENT_PROCESSING.isProcessing = false;
                }, 50);
            }
        }
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

    // Methods to expose scroll manager state
    const isScrollingInProgress = useCallback(() => {
        return scrollManager.isScrollingInProgress();
    }, []);

    const isFileChangeInProgress = useCallback(() => {
        return scrollManager.isFileChangeInProgress();
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

    // Initialize ScrollManagerService when component mounts
    useEffect(() => {
        if (mainContainerRef.current && !contextInitializedRef.current) {
            // Initialize after a short delay to ensure DOM is ready
            setTimeout(() => {
                scrollManager.refreshObservers();
                contextInitializedRef.current = true;
            }, 500);
        }
    }, [mainContainerRef.current]);

    // When currentFile changes, sync the global state with file-specific state
    useEffect(() => {
        if (currentFile) {
            const fileKey = getFileKey(currentFile);

            // Update ScrollManagerService
            scrollManager.setFileChanging(true);

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

            if (fileVisiblePagesRef.current.has(fileKey)) {
                setVisiblePages(fileVisiblePagesRef.current.get(fileKey) || new Set([1, 2, 3]));
            } else {
                // If no visible pages set yet, create default based on current page
                const currentPageNum = fileCurrentPageRef.current.get(fileKey) ?? 1;
                const pageCount = fileNumPagesRef.current.get(fileKey) ?? 0;

                if (pageCount > 0) {
                    const newVisiblePages = new Set<number>();

                    // Make current page and surrounding pages visible
                    const pagesToShow = 2; // Number of pages to show above and below
                    for (
                        let i = Math.max(1, currentPageNum - pagesToShow);
                        i <= Math.min(pageCount, currentPageNum + pagesToShow);
                        i++
                    ) {
                        newVisiblePages.add(i);
                    }

                    setVisiblePages(newVisiblePages);
                    fileVisiblePagesRef.current.set(fileKey, newVisiblePages);
                }
            }

            // Allow scrolling again after a short delay
            setTimeout(() => {
                scrollManager.setFileChanging(false);
            }, 200);
        }
    }, [currentFile]);

    // Listen for page visibility changes from ScrollManagerService
    useEffect(() => {
        const handlePageVisibilityChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, pageNumber, visibilityRatio, source } = customEvent.detail ?? {};

            // Skip our own events or when no meaningful data
            if (source === 'pdf-context' || !fileKey || !pageNumber) return;

            // Update active page state if visibility is high enough
            if (visibilityRatio > 0.5) {
                setFileCurrentPage(fileKey, pageNumber);
                setFileActiveScrollPage(fileKey, pageNumber);

                // Calculate visible pages for virtualization
                const pageCount = getFileNumPages(fileKey);
                if (pageCount > 0) {
                    const newVisiblePages = new Set<number>();

                    // Show current page and surrounding pages
                    const pagesToShow = 2; // Pages above and below
                    for (
                        let i = Math.max(1, pageNumber - pagesToShow);
                        i <= Math.min(pageCount, pageNumber + pagesToShow);
                        i++
                    ) {
                        newVisiblePages.add(i);
                    }

                    setFileVisiblePages(fileKey, newVisiblePages);
                }

                // If this is for a different file and visibility is very high,
                // consider changing the current file
                if (
                    currentFile &&
                    getFileKey(currentFile) !== fileKey &&
                    visibilityRatio > 0.6 &&
                    !scrollManager.isFileChangeInProgress()
                ) {
                    const fileToSwitch = activeFiles.find(f => getFileKey(f) === fileKey);
                    if (fileToSwitch) {
                        setCurrentFile(fileToSwitch);
                    }
                }
            }
        };

        window.addEventListener('page-visibility-changed', handlePageVisibilityChange);

        return () => {
            window.removeEventListener('page-visibility-changed', handlePageVisibilityChange);
        };
    }, [
        currentFile,
        activeFiles,
        setCurrentFile,
        setFileCurrentPage,
        setFileActiveScrollPage,
        getFileNumPages,
        setFileVisiblePages
    ]);

    // Modified scrollToPage to use ScrollManagerService
    const scrollToPage = useCallback((pageNumber: number, fileKey?: string) => {
        // Get the file key to use
        const targetFileKey = fileKey ?? (currentFile ? getFileKey(currentFile) : null);
        if (!targetFileKey) return;

        // Update the file's current page (this is crucial for UI state consistency)
        setFileCurrentPage(targetFileKey, pageNumber);
        setFileActiveScrollPage(targetFileKey, pageNumber);

        // Use the ScrollManagerService for all scrolling operations
        scrollManager.scrollToPage(
            pageNumber,
            targetFileKey,
            {
                behavior: 'smooth',
                alignToTop: false,
                highlightThumbnail: true
            },
            'pdf-context'
        );
    }, [currentFile, setFileCurrentPage, setFileActiveScrollPage]);

    // Listen for page change events from other components
    useEffect(() => {
        const handleExternalPageChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, pageNumber, source } = customEvent.detail ?? {};

            // Skip our own events
            if (source === 'pdf-context') return;

            if (fileKey && pageNumber && currentFile) {
                const currentFileKey = getFileKey(currentFile);

                // Only respond if this is for the current file
                if (currentFileKey === fileKey) {
                    // Update the current page and active scroll page
                    setCurrentPage(pageNumber);
                    setActiveScrollPage(pageNumber);

                    // Also update file-specific state
                    fileCurrentPageRef.current.set(fileKey, pageNumber);
                    fileActiveScrollPageRef.current.set(fileKey, pageNumber);

                    // Update visible pages for virtualization
                    const pageCount = getFileNumPages(fileKey);
                    if (pageCount > 0) {
                        const newVisiblePages = new Set<number>();

                        // Show current page and surrounding pages
                        const pagesToShow = 2; // Pages above and below
                        for (
                            let i = Math.max(1, pageNumber - pagesToShow);
                            i <= Math.min(pageCount, pageNumber + pagesToShow);
                            i++
                        ) {
                            newVisiblePages.add(i);
                        }

                        setVisiblePages(newVisiblePages);
                        fileVisiblePagesRef.current.set(fileKey, newVisiblePages);
                    }
                } else if (!scrollManager.isFileChangeInProgress()) {
                    // If it's for a different file, consider switching
                    const fileToSwitch = activeFiles.find(f => getFileKey(f) === fileKey);
                    if (fileToSwitch) {
                        // Mark that we're changing files
                        scrollManager.setFileChanging(true);
                        // Update file-specific state before switching
                        fileCurrentPageRef.current.set(fileKey, pageNumber);
                        fileActiveScrollPageRef.current.set(fileKey, pageNumber);

                        // Change current file
                        setCurrentFile(fileToSwitch);

                        // Allow scrolling again after a short delay
                        setTimeout(() => {
                            scrollManager.setFileChanging(false);
                        }, 50);
                    }
                }
            }
        };

        window.addEventListener('pdf-page-changed', handleExternalPageChange);

        return () => {
            window.removeEventListener('pdf-page-changed', handleExternalPageChange);
        };
    }, [currentFile, activeFiles, setCurrentFile, getFileNumPages]);

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

    const contextValue = useMemo(() => ({
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
        setFileRenderedPages,

        // New virtualization properties
        visiblePages,
        setVisiblePages,
        getFileVisiblePages,
        setFileVisiblePages,

        // Scroll manager state
        isScrollingInProgress,
        isFileChangeInProgress
    }), [
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
        getFileNumPages,
        setFileNumPages,
        getFileCurrentPage,
        setFileCurrentPage,
        getFileActiveScrollPage,
        setFileActiveScrollPage,
        getFileRenderedPages,
        setFileRenderedPages,
        visiblePages,
        setVisiblePages,
        getFileVisiblePages,
        setFileVisiblePages,
        isScrollingInProgress,
        isFileChangeInProgress
    ]);

    return (
        <PDFViewerContext.Provider value={contextValue}>
            {children}
        </PDFViewerContext.Provider>
    );
};
