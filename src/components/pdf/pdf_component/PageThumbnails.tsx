import React, { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { useFileContext } from '../../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../../contexts/PDFViewerContext';
import { FaChevronUp, FaChevronDown, FaFile } from 'react-icons/fa';
import '../../../styles/modules/pdf/PageThumbnails.css';

interface PageThumbnailsProps {
    isSidebarCollapsed?: boolean;
}

const PageThumbnails: React.FC<PageThumbnailsProps> = ({ isSidebarCollapsed }) => {
    // Previous sidebar collapsed state for detecting changes
    const wasCollapsed = useRef<boolean | undefined>(isSidebarCollapsed);

    const { activeFiles, currentFile, setCurrentFile } = useFileContext();
    const {
        scrollToPage,
        getFileNumPages,
        getFileCurrentPage,
        setFileCurrentPage,
        getFileActiveScrollPage
    } = usePDFViewerContext();

    const containerRef = useRef<HTMLDivElement>(null);
    const thumbnailsRef = useRef<HTMLDivElement>(null);
    const [isFirstRender, setIsFirstRender] = useState<boolean>(true);

    // Store last seen page to detect genuine page changes
    const lastSeenPageRef = useRef<Map<string, number>>(new Map());

    // Flag to control when automatic scrolling should happen
    const shouldAutoScrollRef = useRef<boolean>(false);

    // Track when user is manually scrolling
    const userScrollingRef = useRef<boolean>(false);

    const [inputPage, setInputPage] = useState<string>('');

    // Track navigation in progress to prevent update loops
    const navigationInProgress = useRef(false);

    // Track which file's thumbnails are expanded
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

    // We need to track visible page per file
    const [visiblePages, setVisiblePages] = useState<Map<string, number>>(new Map());

    // Initialize
    useEffect(() => {
        setIsFirstRender(false);

        // Initialize with all files expanded
        const initialExpanded = new Set<string>();
        activeFiles.forEach(file => {
            const fileKey = getFileKey(file);
            initialExpanded.add(fileKey);
        });
        setExpandedFiles(initialExpanded);

        // Initialize with current pages for each file
        const initialPages = new Map<string, number>();
        activeFiles.forEach(file => {
            const fileKey = getFileKey(file);
            const currentPage = getFileCurrentPage(fileKey);
            initialPages.set(fileKey, currentPage);

            // Initialize last seen page
            lastSeenPageRef.current.set(fileKey, currentPage);
        });
        setVisiblePages(initialPages);
    }, []);

    // Handle sidebar collapse/expand transitions
    useEffect(() => {
        // Skip on first render
        if (isFirstRender) return;

        // Check if sidebar visibility changed
        if (wasCollapsed.current !== isSidebarCollapsed) {
            // If sidebar is now visible (was collapsed, now expanded)
            if (!isSidebarCollapsed && currentFile) {
                const fileKey = getFileKey(currentFile);
                const currentPage = getFileCurrentPage(fileKey);

                // Make sure the file is expanded
                setExpandedFiles(prev => {
                    const newExpanded = new Set(prev);
                    newExpanded.add(fileKey);
                    return newExpanded;
                });

                // We'll wait until thumbnails are fully rendered before scrolling
                // First set a longer delay to allow thumbnails to load
                setTimeout(() => {
                    // Check if Document and Page components are rendered
                    const thumbnailElement = document.getElementById(`thumbnail-${fileKey}-${currentPage}`);
                    if (thumbnailElement) {
                        // If thumbnail exists, scroll to it
                        thumbnailElement.scrollIntoView({ behavior: 'auto', block: 'center' });
                    } else {
                        // If thumbnail doesn't exist yet, we need to wait a bit longer
                        // PDF rendering might still be in progress
                        const checkAndScrollInterval = setInterval(() => {
                            const thumbnailElement = document.getElementById(`thumbnail-${fileKey}-${currentPage}`);
                            if (thumbnailElement) {
                                thumbnailElement.scrollIntoView({ behavior: 'auto', block: 'center' });
                                clearInterval(checkAndScrollInterval);
                            }
                        }, 200); // Check every 200ms

                        // Clear interval after 5 seconds to prevent infinite checking
                        setTimeout(() => {
                            clearInterval(checkAndScrollInterval);
                            // Last attempt - try to scroll to file header if thumbnail still not found
                            const fileHeaderElement = document.getElementById(`file-thumbnail-header-${fileKey}`);
                            if (fileHeaderElement) {
                                fileHeaderElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                            }
                        }, 5000);
                    }
                }, 500); // Increased delay to allow for initial rendering
            }

            // Update ref
            wasCollapsed.current = isSidebarCollapsed;
        }
    }, [isSidebarCollapsed, currentFile, isFirstRender]);

    // Helper function to scroll a thumbnail into view
    const scrollThumbnailIntoView = (fileKey: string, pageNumber: number) => {
        // Don't scroll if user is manually scrolling
        if (userScrollingRef.current) return;

        // Check if the thumbnail exists
        const thumbnailElement = document.getElementById(`thumbnail-${fileKey}-${pageNumber}`);

        if (thumbnailElement && expandedFiles.has(fileKey)) {
            // Use non-smooth behavior for more reliable positioning
            thumbnailElement.scrollIntoView({
                behavior: 'auto',
                block: 'center'
            });
        } else {
            // Fall back to file header if thumbnail isn't found or file not expanded
            const fileHeaderElement = document.getElementById(`file-thumbnail-header-${fileKey}`);
            if (fileHeaderElement) {
                fileHeaderElement.scrollIntoView({
                    behavior: 'auto',
                    block: 'start'
                });
            }
        }
    };

    // Track user scrolling to prevent auto-scroll interference
    useEffect(() => {
        if (!thumbnailsRef.current) return;

        const handleUserScroll = () => {
            // Set user scrolling flag
            userScrollingRef.current = true;

            // Clear auto-scroll flag when user scrolls
            shouldAutoScrollRef.current = false;

            // Reset user scrolling flag after a delay
            clearTimeout(userScrollTimeoutRef.current);
            userScrollTimeoutRef.current = setTimeout(() => {
                userScrollingRef.current = false;
            }, 1000);
        };

        // Store timeout ref for cleanup
        const userScrollTimeoutRef = { current: undefined as any };

        const thumbnailsContainer = thumbnailsRef.current;
        thumbnailsContainer.addEventListener('scroll', handleUserScroll, { passive: true });

        return () => {
            thumbnailsContainer.removeEventListener('scroll', handleUserScroll);
            clearTimeout(userScrollTimeoutRef.current);
        };
    }, []);

    // When the current file changes, expand and scroll to it after PDF thumbnails are loaded
    useEffect(() => {
        if (!thumbnailsRef.current || !currentFile || isSidebarCollapsed) return;

        const fileKey = getFileKey(currentFile);
        const currentPage = getFileCurrentPage(fileKey);

        // Ensure this file is expanded
        setExpandedFiles(prev => {
            const newExpanded = new Set(prev);
            newExpanded.add(fileKey);
            return newExpanded;
        });

        // Use a more reliable approach for scrolling after thumbnails load
        if (!isSidebarCollapsed) {
            // Give time for expansion animation and PDF rendering
            setTimeout(() => {
                const thumbnailElement = document.getElementById(`thumbnail-${fileKey}-${currentPage}`);
                if (thumbnailElement) {
                    // If thumbnail exists, scroll to it immediately
                    thumbnailElement.scrollIntoView({ behavior: 'auto', block: 'center' });
                } else {
                    // If thumbnail doesn't exist yet, set up a check interval
                    const checkAndScrollInterval = setInterval(() => {
                        const thumbnailElement = document.getElementById(`thumbnail-${fileKey}-${currentPage}`);
                        if (thumbnailElement) {
                            thumbnailElement.scrollIntoView({ behavior: 'auto', block: 'center' });
                            clearInterval(checkAndScrollInterval);
                        }
                    }, 200);

                    // Stop checking after a reasonable timeout
                    setTimeout(() => {
                        clearInterval(checkAndScrollInterval);
                        // Last fallback - scroll to file header
                        const fileHeaderElement = document.getElementById(`file-thumbnail-header-${fileKey}`);
                        if (fileHeaderElement) {
                            fileHeaderElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                        }
                    }, 3000);
                }
            }, 300);
        }
    }, [currentFile, isSidebarCollapsed]);

    // Handle page changes in main viewer - only scroll if page changed externally
    useEffect(() => {
        if (!thumbnailsRef.current || isFirstRender || isSidebarCollapsed) return;

        // Skip if navigation is in progress from thumbnails
        if (navigationInProgress.current) return;

        activeFiles.forEach(file => {
            const fileKey = getFileKey(file);
            const currentPageForFile = getFileCurrentPage(fileKey);
            const visiblePageForFile = visiblePages.get(fileKey) || 1;
            const lastSeenPage = lastSeenPageRef.current.get(fileKey) || 1;

            // Check if the page changed since we last saw it
            if (currentPageForFile !== lastSeenPage) {
                // Update last seen page
                lastSeenPageRef.current.set(fileKey, currentPageForFile);

                // Update visible page in state to keep UI in sync
                if (currentPageForFile !== visiblePageForFile) {
                    setVisiblePages(prev => {
                        const newMap = new Map(prev);
                        newMap.set(fileKey, currentPageForFile);
                        return newMap;
                    });
                }

                // Only auto-scroll if this is the current file and not during user scrolling
                if (currentFile && getFileKey(currentFile) === fileKey && !userScrollingRef.current) {
                    // Enable auto-scroll for page changes
                    shouldAutoScrollRef.current = true;

                    // Use requestAnimationFrame for smooth scrolling
                    requestAnimationFrame(() => {
                        if (shouldAutoScrollRef.current) {
                            scrollThumbnailIntoView(fileKey, currentPageForFile);
                            // Reset auto-scroll flag after scrolling
                            shouldAutoScrollRef.current = false;
                        }
                    });
                }
            }
        });
    }, [activeFiles, currentFile, isFirstRender, expandedFiles, getFileCurrentPage, isSidebarCollapsed, visiblePages]);

    const handleThumbnailClick = (file: File, pageNumber: number) => {
        const fileKey = getFileKey(file);
        const currentPageForFile = getFileCurrentPage(fileKey);
        const isChangingFile = currentFile !== file;

        // Always navigate if changing files or if the page is different
        if (isChangingFile || pageNumber !== currentPageForFile) {
            // Set flag to prevent input field updates
            navigationInProgress.current = true;

            // First update visible page to prevent flickering
            setVisiblePages(prev => {
                const newMap = new Map(prev);
                newMap.set(fileKey, pageNumber);
                return newMap;
            });

            // Update last seen page
            lastSeenPageRef.current.set(fileKey, pageNumber);

            // Set as the current file if it's not already
            if (isChangingFile) {
                setCurrentFile(file);
            }

            // Use requestAnimationFrame to ensure state updates are processed first
            requestAnimationFrame(() => {
                // Navigate to the page
                scrollToPage(pageNumber, fileKey);

                // Reset flag after the scroll animation completes
                setTimeout(() => {
                    navigationInProgress.current = false;
                }, 300);
            });
        } else {
            // Even if it's the same page in the same file, ensure scrolling to it
            // This handles the case of clicking on the first page when it's already active
            scrollToPage(pageNumber, fileKey);
        }
    };

    const handleNavigatePrevious = (file: File) => {
        const fileKey = getFileKey(file);
        const currentPageForFile = getFileCurrentPage(fileKey);

        if (currentPageForFile > 1) {
            // Set flag to prevent input field updates
            navigationInProgress.current = true;

            // Update input immediately
            const newPage = currentPageForFile - 1;

            // Update visible page immediately to prevent flickering
            setVisiblePages(prev => {
                const newMap = new Map(prev);
                newMap.set(fileKey, newPage);
                return newMap;
            });

            // Update last seen page
            lastSeenPageRef.current.set(fileKey, newPage);

            // Set as the current file if it's not already
            if (currentFile !== file) {
                setCurrentFile(file);
            }

            // Navigate
            scrollToPage(newPage, fileKey);

            // Reset flag after a delay
            setTimeout(() => {
                navigationInProgress.current = false;
            }, 300);
        }
    };

    const handleNavigateNext = (file: File) => {
        const fileKey = getFileKey(file);
        const currentPageForFile = getFileCurrentPage(fileKey);
        const numPagesForFile = getFileNumPages(fileKey);

        if (currentPageForFile < numPagesForFile) {
            // Set flag to prevent input field updates
            navigationInProgress.current = true;

            // Update immediately
            const newPage = currentPageForFile + 1;

            // Update visible page immediately
            setVisiblePages(prev => {
                const newMap = new Map(prev);
                newMap.set(fileKey, newPage);
                return newMap;
            });

            // Update last seen page
            lastSeenPageRef.current.set(fileKey, newPage);

            // Set as the current file if it's not already
            if (currentFile !== file) {
                setCurrentFile(file);
            }

            // Navigate
            scrollToPage(newPage, fileKey);

            // Reset flag after a delay
            setTimeout(() => {
                navigationInProgress.current = false;
            }, 300);
        }
    };

    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>, file: File) => {
        const value = e.target.value;
        // Allow only numbers
        if (/^\d*$/.test(value)) {
            setInputPage(value);
        }
    };

    const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, file: File) => {
        if (e.key === 'Enter') {
            const fileKey = getFileKey(file);
            const numPagesForFile = getFileNumPages(fileKey);
            const page = parseInt(inputPage, 10);

            if (!isNaN(page) && page >= 1 && page <= numPagesForFile) {
                // Set flag to prevent input field updates
                navigationInProgress.current = true;

                // Update visible page immediately
                setVisiblePages(prev => {
                    const newMap = new Map(prev);
                    newMap.set(fileKey, page);
                    return newMap;
                });

                // Update last seen page
                lastSeenPageRef.current.set(fileKey, page);

                // Set as the current file if it's not already
                if (currentFile !== file) {
                    setCurrentFile(file);
                }

                // Navigate
                scrollToPage(page, fileKey);

                // Remove focus from the input
                (e.target as HTMLInputElement).blur();

                // Reset flag after a delay
                setTimeout(() => {
                    navigationInProgress.current = false;
                }, 300);
            }
        }
    };

    const handlePageInputBlur = (e: React.FocusEvent<HTMLInputElement>, file: File) => {
        const fileKey = getFileKey(file);
        const numPagesForFile = getFileNumPages(fileKey);
        const currentPageForFile = getFileCurrentPage(fileKey);
        const page = parseInt(inputPage, 10);

        // Reset to current page if invalid input
        if (isNaN(page) || page < 1 || page > numPagesForFile) {
            setInputPage(currentPageForFile.toString());
        } else if (page !== currentPageForFile) {
            // Set flag to prevent input field updates
            navigationInProgress.current = true;

            // Update visible page immediately
            setVisiblePages(prev => {
                const newMap = new Map(prev);
                newMap.set(fileKey, page);
                return newMap;
            });

            // Update last seen page
            lastSeenPageRef.current.set(fileKey, page);

            // Set as the current file if it's not already
            if (currentFile !== file) {
                setCurrentFile(file);
            }

            // Navigate
            scrollToPage(page, fileKey);

            // Reset flag after a delay
            setTimeout(() => {
                navigationInProgress.current = false;
            }, 300);
        }
    };

    const toggleFileExpansion = (fileKey: string) => {
        setExpandedFiles(prev => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(fileKey)) {
                newExpanded.delete(fileKey);
            } else {
                newExpanded.add(fileKey);

                // If expanding the current file, wait for thumbnails to load and then scroll
                if (currentFile && getFileKey(currentFile) === fileKey) {
                    const currentPage = getFileCurrentPage(fileKey);

                    // Wait for thumbnails to render
                    setTimeout(() => {
                        const thumbnailElement = document.getElementById(`thumbnail-${fileKey}-${currentPage}`);
                        if (thumbnailElement) {
                            thumbnailElement.scrollIntoView({ behavior: 'auto', block: 'center' });
                        } else {
                            // If thumbnails aren't rendered yet, wait a bit more
                            const checkInterval = setInterval(() => {
                                const thumbnail = document.getElementById(`thumbnail-${fileKey}-${currentPage}`);
                                if (thumbnail) {
                                    thumbnail.scrollIntoView({ behavior: 'auto', block: 'center' });
                                    clearInterval(checkInterval);
                                }
                            }, 200);

                            // Don't check forever
                            setTimeout(() => clearInterval(checkInterval), 3000);
                        }
                    }, 250);
                }
            }
            return newExpanded;
        });
    };

    if (isSidebarCollapsed) {
        return null;
    }

    if (activeFiles.length === 0) {
        return (
            <div
                className="page-thumbnails-wrapper empty"
                ref={containerRef}
                style={{ width: '100%' }}
            >
                <div>Upload a PDF to view thumbnails</div>
            </div>
        );
    }

    return (
        <div
            className="page-thumbnails-wrapper"
            ref={containerRef}
            style={{ width: '100%' }}
        >
            <div className="thumbnails-header">
                <h3>Files ({activeFiles.length})</h3>
            </div>

            <div className="thumbnails-container" ref={thumbnailsRef}>
                {activeFiles.map((file) => {
                    const fileKey = getFileKey(file);
                    const numPagesForFile = getFileNumPages(fileKey);
                    const currentPageForFile = getFileCurrentPage(fileKey);
                    const isExpanded = expandedFiles.has(fileKey);
                    const isCurrentFile = currentFile === file;
                    const visiblePageForFile = visiblePages.get(fileKey) || currentPageForFile;

                    // Generate array of page numbers for this file
                    const pagesToRender = isExpanded
                        ? Array.from({ length: numPagesForFile || 0 }, (_, i) => i + 1)
                        : [];

                    return (
                        <div
                            key={`file-thumbnails-${fileKey}`}
                            className={`file-thumbnails-section ${isCurrentFile ? 'current-file' : ''}`}
                        >
                            <div
                                className="file-thumbnails-header"
                                onClick={() => toggleFileExpansion(fileKey)}
                                id={`file-thumbnail-header-${fileKey}`}
                            >
                                <div className="file-info">
                                    <FaFile className="file-icon" />
                                    <span className="file-name">{file.name}</span>
                                </div>
                                <div className="expansion-indicator">
                                    {isExpanded ? "▼" : "►"}
                                </div>
                            </div>

                            {isExpanded && (
                                <>
                                    <div className="file-page-navigation">
                                        <button
                                            className="nav-button"
                                            onClick={() => handleNavigatePrevious(file)}
                                            disabled={currentPageForFile <= 1}
                                            aria-label="Previous page"
                                            title="Previous page"
                                        >
                                            <FaChevronUp size={18} />
                                        </button>
                                        <div className="page-input-container">
                                            <input
                                                type="text"
                                                className="page-input"
                                                value={visiblePageForFile.toString()}
                                                onChange={(e) => handlePageInputChange(e, file)}
                                                onKeyDown={(e) => handlePageInputKeyDown(e, file)}
                                                onBlur={(e) => handlePageInputBlur(e, file)}
                                                title="Enter page number"
                                                aria-label="Enter page number"
                                            />
                                            <span className="page-separator">/</span>
                                            <span className="total-pages">{numPagesForFile}</span>
                                        </div>
                                        <button
                                            className="nav-button"
                                            onClick={() => handleNavigateNext(file)}
                                            disabled={currentPageForFile >= numPagesForFile}
                                            aria-label="Next page"
                                            title="Next page"
                                        >
                                            <FaChevronDown size={18} />
                                        </button>
                                    </div>

                                    <Document
                                        file={file}
                                        loading={<p className="thumbnails-loading">Loading thumbnails...</p>}
                                        error={<p className="thumbnails-loading">Error loading thumbnails</p>}
                                    >
                                        <div className="file-thumbnails-grid">
                                            {pagesToRender.map(pageNumber => {
                                                // Only mark as active if this is the current file and the active page
                                                const isActivePage = isCurrentFile && getFileActiveScrollPage(fileKey) === pageNumber;

                                                return (
                                                    <div
                                                        key={`thumb-${fileKey}-${pageNumber}`}
                                                        className={`thumbnail-wrapper ${isActivePage ? 'active' : ''}`}
                                                        onClick={() => handleThumbnailClick(file, pageNumber)}
                                                        title={`Go to page ${pageNumber}`}
                                                        data-page={pageNumber}
                                                        id={`thumbnail-${fileKey}-${pageNumber}`}
                                                    >
                                                        <div className="thumbnail-inner">
                                                            <Page
                                                                pageNumber={pageNumber}
                                                                renderTextLayer={false}
                                                                renderAnnotationLayer={false}
                                                                className="thumbnail-page"
                                                                scale={0.2}
                                                                loading={
                                                                    <div style={{
                                                                        width: 100,
                                                                        height: 100,
                                                                        backgroundColor: 'var(--bg-tertiary)',
                                                                        borderRadius: 'var(--border-radius-sm)'
                                                                    }} />
                                                                }
                                                            />
                                                        </div>
                                                        <div className="page-number-label">{pageNumber}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </Document>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PageThumbnails;
