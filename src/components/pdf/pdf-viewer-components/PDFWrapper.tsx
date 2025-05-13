import React, { useCallback, useEffect, useState, useRef, memo } from 'react';
import { Document } from 'react-pdf';
import { useFileContext } from '../../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../../contexts/PDFViewerContext';
import PageRenderer from './PageRenderer';
import '../../../styles/modules/pdf/PdfViewer.css';
import scrollManager from '../../../services/client-services/ScrollManagerService';
import { useInView } from 'react-intersection-observer';
import { useNotification } from '../../../contexts/NotificationContext';
import { useLanguage } from '../../../contexts/LanguageContext';

interface PDFDocumentWrapperProps {
    file?: File; // New prop to accept a specific file
    fileKey?: string;
    forceOpen?: boolean;
}

/**
 * Component to render a PDF document with pages
 */
const PDFWrapper: React.FC<PDFDocumentWrapperProps> = ({
    file,
    fileKey,
    forceOpen = false // Default to false
}) => {
    const { currentFile, isFileOpen } = useFileContext();
    const {
        numPages,
        setNumPages,
        setRenderedPages,
        getFileNumPages,
        setFileNumPages,
        setFileRenderedPages,
        mainContainerRef,
        zoomLevel
    } = usePDFViewerContext();
    const { notify } = useNotification();
    const { t } = useLanguage();
    const [loadError, setLoadError] = useState<Error | null>(null);

    // Document dragging state
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dragStartPos = useRef({ x: 0, y: 0 });
    const currentTransform = useRef({ x: 0, y: 0 });
    const documentContainerRef = useRef<HTMLDivElement | null>(null);

    // Track document initialization
    const hasInitializedRef = useRef<boolean>(false);
    const pdfDocumentRef = useRef<any>(null);

    // Configure IntersectionObserver options
    const inViewOptions = {
        threshold: 0.1, // 10% visibility is enough
        root: forceOpen ? null : mainContainerRef.current // Use viewport root in fullscreen overlay
    };

    // For intersection detection, we'll use react-intersection-observer
    const { ref: documentRef, inView } = useInView(inViewOptions);

    // Use the provided file or fall back to currentFile from context
    const pdfFile = file || currentFile;

    // Determine the file key to use
    const pdfFileKey = fileKey ?? (pdfFile ? getFileKey(pdfFile) : '');

    // Track whether this document is the current one
    const isCurrentDocument = currentFile && getFileKey(currentFile) === pdfFileKey;

    // Check if the file is open - we only need to render if it's open
    const isOpen = forceOpen || (pdfFile ? isFileOpen(pdfFile) : false);

    // Add class based on zoom level for draggable behavior
    const documentClassName = `pdf-document-container ${zoomLevel > 1 ? 'zoomed' : ''} ${isDragging ? 'dragging' : ''}`;

    // Implement document dragging functionality
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only enable dragging when zoomed in and not on text content
        if (zoomLevel > 1.0 && e.target &&
            !(e.target as Element).closest('.react-pdf__Page__textContent') &&
            !(e.target as Element).closest('.page-overlay')) {
            setIsDragging(true);
            dragStartPos.current = { x: e.clientX, y: e.clientY };

            // Add dragging cursor style
            if (documentContainerRef.current) {
                documentContainerRef.current.style.cursor = 'grabbing';
            }

            e.preventDefault();
        }
    }, [zoomLevel]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging && documentContainerRef.current) {
            const deltaX = e.clientX - dragStartPos.current.x;
            const deltaY = e.clientY - dragStartPos.current.y;

            // Calculate new position
            const newX = currentTransform.current.x + deltaX;
            const newY = currentTransform.current.y + deltaY;

            // Update position
            setDragOffset({ x: newX, y: newY });

            // Update reference for next move
            dragStartPos.current = { x: e.clientX, y: e.clientY };
            currentTransform.current = { x: newX, y: newY };
        }
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);

            // Reset cursor
            if (documentContainerRef.current) {
                documentContainerRef.current.style.cursor = zoomLevel > 1 ? 'grab' : 'auto';
            }
        }
    }, [isDragging, zoomLevel]);

    // Add and remove event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Reset drag offset when zoom level changes
    useEffect(() => {
        setDragOffset({ x: 0, y: 0 });
        currentTransform.current = { x: 0, y: 0 };

        // Update cursor based on zoom level
        if (documentContainerRef.current) {
            documentContainerRef.current.style.cursor = zoomLevel > 1 ? 'grab' : 'auto';
        }
    }, [zoomLevel]);

    // Clean up state on file change
    useEffect(() => {
        setLoadError(null);

        return () => {
            hasInitializedRef.current = false;
        };
    }, [pdfFile, pdfFileKey]);

    // Document options
    const documentOptions = React.useMemo(() => ({
        cMapUrl: 'https://unpkg.com/pdfjs-dist@2.16.105/cmaps/',
        cMapPacked: true,
    }), []);

    // Handle document load success
    const onDocumentLoadSuccess = useCallback((pdf: any) => {
        if (!pdfFile || !pdfFileKey) return;

        hasInitializedRef.current = true;
        setLoadError(null);

        try {
            const pageCount = pdf.numPages;
            pdfDocumentRef.current = pdf;

            console.log(`PDF loaded with ${pageCount} pages for file: ${pdfFile.name}`);

            // Store PDF document reference
            pdfDocumentRef.current = pdf;

            // Update page counts
            if (pdfFileKey) {
                setFileNumPages(pdfFileKey, pageCount);

                // Initialize with all pages visible since we don't need virtualization anymore
                const pagesToRender = new Set<number>();
                for (let i = 1; i <= pageCount; i++) {
                    pagesToRender.add(i);
                }

                setFileRenderedPages(pdfFileKey, pagesToRender);

                // Also update global state if this is the current file
                if (isCurrentDocument) {
                    setNumPages(pageCount);
                    setRenderedPages(pagesToRender);
                }
            } else {
                // Backward compatibility
                setNumPages(pageCount);

                // Render all pages
                const pagesToRender = new Set<number>();
                for (let i = 1; i <= pageCount; i++) {
                    pagesToRender.add(i);
                }

                setRenderedPages(pagesToRender);
            }

            // Dispatch document loaded event
            window.dispatchEvent(new CustomEvent('pdf-document-loaded', {
                detail: {
                    fileKey: pdfFileKey,
                    pdfDocument: pdf,
                    timestamp: Date.now(),
                    numPages: pageCount
                }
            }));

            // Register for page visibility tracking
            setTimeout(() => {
                scrollManager.refreshObservers();
            }, 300);

        } catch (error) {
            notify({
                message: t('pdf', 'errorLoadingPdfGeneric'),
                type: 'error',
                duration: 3000
            });
        }
    }, [
        pdfFile,
        pdfFileKey,
        isCurrentDocument,
        setNumPages,
        setRenderedPages,
        setFileNumPages,
        setFileRenderedPages,
        t
    ]);


    // Handle document requests from other components
    useEffect(() => {
        const handleDocumentRequest = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey: requestedKey, requestId } = customEvent.detail ?? {};

            if (!requestedKey || !pdfFile || !pdfFileKey) return;

            // Check if this is our file
            const isMatch = (pdfFileKey === requestedKey ||
                    pdfFileKey.includes(requestedKey) ||
                    requestedKey.includes(pdfFileKey) ||
                    pdfFile.name.includes(requestedKey)) ??
                requestedKey.includes(pdfFile.name);

            if (isMatch && pdfDocumentRef.current) {
                console.log(`[PDFDocumentWrapper] Responding to document request for ${requestedKey}`);

                // Respond with our document
                window.dispatchEvent(new CustomEvent('pdf-document-response', {
                    detail: {
                        fileKey: pdfFileKey,
                        filename: pdfFile.name,
                        pdfDocument: pdfDocumentRef.current,
                        requestId: requestId,
                        timestamp: Date.now()
                    }
                }));
            }
        };

        window.addEventListener('request-pdf-document', handleDocumentRequest);

        return () => {
            window.removeEventListener('request-pdf-document', handleDocumentRequest);
        };
    }, [pdfFile, pdfFileKey]);

    // If there's no file or the file is not open, don't render
    if (!pdfFile || !isOpen) {
        console.log(`[PDFDocumentWrapper] Not rendering - pdfFile: ${!!pdfFile}, isOpen: ${isOpen}, forceOpen: ${forceOpen}`);
        return null;
    }

    // Get the number of pages for this file
    const displayNumPages = pdfFileKey
        ? getFileNumPages(pdfFileKey) || numPages
        : numPages;

    // Calculate draggable container style with transform for dragging
    const draggableContainerStyle = {
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
    };

    return (
        <div
            className={documentClassName}
            data-file-name={pdfFile.name}
            data-file-key={pdfFileKey}
            data-zoom-level={zoomLevel.toFixed(1)}
            ref={(el) => {
                if (el) {
                    documentRef(el);  // For IntersectionObserver
                    documentContainerRef.current = el;  // For dragging
                }
            }}
            onMouseDown={handleMouseDown}
        >
            {loadError && (
                <div className="pdf-error">
                    <h3>{t('pdf', 'errorLoadingPdf')}</h3>
                    <p>{t('pdf', 'couldNotLoadPdf')}</p>
                    <p>{t('pdf', 'tryUploadingAgain')}</p>
                </div>
            )}

            <div className="pdf-document-draggable-container" style={draggableContainerStyle}>
                <Document
                    file={pdfFile}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={() => notify({
                        message: t('pdf', 'errorLoadingPdfGeneric'),
                        type: 'error',
                        duration: 3000
                    })}
                    loading={<div className="pdf-loading-placeholder"></div>}
                    error={<div className="pdf-error-placeholder"></div>}
                    options={documentOptions}
                    className="pdf-document"
                    key={pdfFileKey} // Add key to force re-render when file changes
                >
                    {!loadError && inView && Array.from({ length: displayNumPages }, (_, i) => {
                        const pageNum = i + 1;

                        return (
                            <PageRenderer
                                key={`page-${pdfFileKey}-${pageNum}`}
                                pageNumber={pageNum}
                                fileKey={pdfFileKey}
                                isVisible={true} // Always visible since we don't need virtualization anymore
                            />
                        );
                    })}
                </Document>
            </div>
        </div>
    );
};

// Memoize component to prevent unnecessary re-renders
export default memo(PDFWrapper, (prevProps, nextProps) => {
    // Re-render if file, fileKey, or forceOpen changes
    return (
        prevProps.file === nextProps.file &&
        prevProps.fileKey === nextProps.fileKey &&
        prevProps.forceOpen === nextProps.forceOpen
    );
});
