import React, { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { usePDFContext } from '../../contexts/PDFContext';
import { FaChevronUp, FaChevronDown } from 'react-icons/fa';
import '../../styles/pages/pdf/PageThumbnails.css';

// Set threshold for number of pages before we implement virtualization
const VIRTUALIZATION_THRESHOLD = 20;

interface PageThumbnailsProps {
    isSidebarCollapsed?: boolean;
}

const PageThumbnails: React.FC<PageThumbnailsProps> = ({ isSidebarCollapsed }) => {
    const {
        file,
        numPages,
        currentPage,
        scrollToPage,
        activeScrollPage
    } = usePDFContext();

    // State for the sidebar's width (in pixels)
    const [sidebarWidth, setSidebarWidth] = useState<number>(220);
    const containerRef = useRef<HTMLDivElement>(null);
    const thumbnailsRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef<boolean>(false);
    const [isFirstRender, setIsFirstRender] = useState<boolean>(true);

    // State for virtualized rendering
    const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({
        start: 1,
        end: Math.min(numPages || 10, 10)
    });

    // Update when the file or numPages changes
    useEffect(() => {
        if (numPages) {
            setVisibleRange({
                start: 1,
                end: Math.min(numPages, 10)
            });
        }
    }, [file, numPages]);

    // Initialize once component mounts
    useEffect(() => {
        setIsFirstRender(false);

        // Initialize visible range on first render
        if (thumbnailsRef.current && numPages) {
            handleScroll();
        }
    }, []);

    // Handle dragging for resizing the sidebar
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current || !containerRef.current) return;

            // Calculate new width based on mouse X relative to container's left edge
            const newWidth = e.clientX - containerRef.current.getBoundingClientRect().left;

            // Set a minimum width to avoid collapse
            if (newWidth > 150 && newWidth < 350) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            if (isResizing.current) {
                isResizing.current = false;
                document.body.style.cursor = 'default';
                document.body.classList.remove('resizing');
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    // Handle scroll events for virtualization
    const handleScroll = () => {
        if (!thumbnailsRef.current || !numPages || numPages <= VIRTUALIZATION_THRESHOLD) return;

        const { scrollTop, clientHeight } = thumbnailsRef.current;
        const thumbnailHeight = 120; // Approximate height of each thumbnail

        // Calculate visible range
        const start = Math.max(1, Math.floor(scrollTop / thumbnailHeight));
        const visibleCount = Math.ceil(clientHeight / thumbnailHeight) + 2; // Add buffer
        const end = Math.min(numPages, start + visibleCount);

        setVisibleRange({ start, end });
    };

    // Set up scroll listener
    useEffect(() => {
        const container = thumbnailsRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [numPages]);

    // Scroll to ensure current page is visible
    useEffect(() => {
        if (!thumbnailsRef.current || !numPages || isFirstRender) return;

        const thumbnailHeight = 120; // Approximate height of each thumbnail
        const currentThumbnailPosition = (currentPage - 1) * thumbnailHeight;
        const scrollTop = thumbnailsRef.current.scrollTop;
        const clientHeight = thumbnailsRef.current.clientHeight;

        // Check if current page is outside the visible area
        if (currentThumbnailPosition < scrollTop || currentThumbnailPosition > scrollTop + clientHeight - thumbnailHeight) {
            // Scroll to make the current page visible in the middle of the view
            thumbnailsRef.current.scrollTo({
                top: currentThumbnailPosition - (clientHeight / 2) + (thumbnailHeight / 2),
                behavior: 'smooth'
            });
        }
    }, [currentPage, isFirstRender, numPages]);

    const startResizing = (e: React.MouseEvent<HTMLDivElement>) => {
        isResizing.current = true;
        document.body.style.cursor = 'ew-resize';
        document.body.classList.add('resizing');
        e.preventDefault();
    };

    const handleThumbnailClick = (pageNumber: number) => {
        scrollToPage(pageNumber);
    };

    const handleNavigatePrevious = () => {
        if (currentPage > 1) {
            scrollToPage(currentPage - 1);
        }
    };

    const handleNavigateNext = () => {
        if (currentPage < (numPages || 1)) {
            scrollToPage(currentPage + 1);
        }
    };

    // Determine which pages to render based on virtualization
    const shouldVirtualize = numPages ? numPages > VIRTUALIZATION_THRESHOLD : false;
    const pagesToRender = shouldVirtualize
        ? Array.from({ length: visibleRange.end - visibleRange.start + 1 }, (_, i) => visibleRange.start + i)
        : Array.from({ length: numPages || 0 }, (_, i) => i + 1);

    if (!file) {
        return (
            <div
                className="page-thumbnails-wrapper empty"
                ref={containerRef}
                style={{ width: isSidebarCollapsed ? '0px' : `${sidebarWidth}px` }}
            >
                {!isSidebarCollapsed && <div>Upload a PDF to view thumbnails</div>}
            </div>
        );
    }

    return (
        <div
            className="page-thumbnails-wrapper"
            ref={containerRef}
            style={{ width: isSidebarCollapsed ? '0px' : `${sidebarWidth}px` }}
        >
            {!isSidebarCollapsed && (
                <>
                    <div className="thumbnails-header">
                        <h3>Pages</h3>
                        <div className="page-navigation">
                            <button
                                className="nav-button"
                                onClick={handleNavigatePrevious}
                                disabled={currentPage <= 1}
                                aria-label="Previous page"
                                title="Previous page"
                            >
                                <FaChevronUp size={18} />
                            </button>
                            <span className="page-indicator">{currentPage} / {numPages}</span>
                            <button
                                className="nav-button"
                                onClick={handleNavigateNext}
                                disabled={currentPage >= (numPages || 1)}
                                aria-label="Next page"
                                title="Next page"
                            >
                                <FaChevronDown size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="thumbnails-container" ref={thumbnailsRef} onScroll={handleScroll}>
                        {/* Spacer for virtualization */}
                        {shouldVirtualize && (
                            <div
                                className="thumbnails-spacer"
                                style={{ height: `${(visibleRange.start - 1) * 120}px` }}
                            />
                        )}

                        <Document
                            file={file}
                            loading={<p className="thumbnails-loading">Loading thumbnails...</p>}
                            error={<p className="thumbnails-loading">Error loading thumbnails</p>}
                        >
                            {pagesToRender.map(pageNumber => (
                                <div
                                    key={`thumb-${pageNumber}`}
                                    className={`thumbnail-wrapper ${activeScrollPage === pageNumber ? 'active' : ''}`}
                                    onClick={() => handleThumbnailClick(pageNumber)}
                                    title={`Go to page ${pageNumber}`}
                                >
                                    <div className="thumbnail-inner">
                                        <Page
                                            pageNumber={pageNumber}
                                            width={sidebarWidth - 40}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            loading={
                                                <div style={{
                                                    width: sidebarWidth - 40,
                                                    height: 100,
                                                    backgroundColor: 'var(--bg-tertiary)',
                                                    borderRadius: 'var(--border-radius-sm)'
                                                }} />
                                            }
                                        />
                                    </div>
                                    <div className="page-number-label">{pageNumber}</div>
                                </div>
                            ))}
                        </Document>

                        {/* Spacer for virtualization */}
                        {shouldVirtualize && numPages && (
                            <div
                                className="thumbnails-spacer"
                                style={{ height: `${(numPages - visibleRange.end) * 120}px` }}
                            />
                        )}
                    </div>

                    <div className="resizer" onMouseDown={startResizing} />
                </>
            )}
        </div>
    );
};

export default PageThumbnails;
