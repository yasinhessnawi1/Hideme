import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { usePdfContext } from '../../contexts/PdfContext';
import '../../styles/playground/PagePreviews.css';

// Import text and annotation layer CSS
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

// Set up PDF.js worker using a public CDN (adjust version if needed)
pdfjs.GlobalWorkerOptions.workerSrc =
    'https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';

const PagePreviews: React.FC = () => {
    const { file, numPages, currentPage, setCurrentPage } = usePdfContext();

    // State for the sidebar's width (in pixels)
    const [sidebarWidth, setSidebarWidth] = useState<number>(250);
    const containerRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef<boolean>(false);

    // Handle dragging for resizing the sidebar
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current || !containerRef.current) return;
            // Calculate new width based on mouse X relative to container's left edge
            const newWidth = e.clientX - containerRef.current.getBoundingClientRect().left;
            // Set a minimum width to avoid collapse
            if (newWidth > 150) setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            if (isResizing.current) {
                isResizing.current = false;
                document.body.style.cursor = 'default';
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startResizing = (e: React.MouseEvent<HTMLDivElement>) => {
        isResizing.current = true;
        document.body.style.cursor = 'ew-resize';
    };

    if (!file) {
        return <div className="previews-empty">No PDF Uploaded</div>;
    }

    const handleThumbnailClick = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div
            className="page-previews-wrapper"
            ref={containerRef}
            style={{ width: `${sidebarWidth}px` }}
        >
            <div className="previews-container">
                <Document
                    className={'document-preview'}
                    file={file}
                    onLoadSuccess={() => {
                        // Optionally update state if needed.
                    }}
                    loading={<p>Loading Thumbnails...</p>}
                >
                    {Array.from(new Array(numPages), (_, index) => (
                        <div
                            key={index}
                            className={`thumbnail-wrapper ${currentPage === index + 1 ? 'active' : ''}`}
                            onClick={() => handleThumbnailClick(index + 1)}
                        >
                            <div className="thumbnail-inner">
                                <Page pageNumber={index + 1} width={80} />
                            </div>
                            <span className="page-number-label">{index + 1}</span>
                        </div>
                    ))}
                </Document>
            </div>
            <div className="resizer" onMouseDown={startResizing} />
        </div>
    );
};

export default PagePreviews;
