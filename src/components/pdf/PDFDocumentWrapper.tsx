import React, { useCallback, useEffect, useState, useRef, memo } from 'react';
import { Document } from 'react-pdf';
import { useFileContext } from '../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../contexts/PDFViewerContext';
import PageRenderer from './PageRenderer';
import '../../styles/modules/pdf/PdfViewer.css';
import scrollManager from '../../services/ScrollManagerService';
import { useInView } from 'react-intersection-observer';

interface PDFDocumentWrapperProps {
    file?: File; // New prop to accept a specific file
    fileKey?: string;
    forceOpen?: boolean;
    pageWidth: number; // Add back pageWidth prop
}

/**
 * Component to render a PDF document with pages
 */
const PDFDocumentWrapper: React.FC<PDFDocumentWrapperProps> = ({ file, fileKey, forceOpen = false, pageWidth // Default to false
                                                               }) => {
    const { currentFile, isFileOpen } = useFileContext();
    const {
        numPages,
        setNumPages,
        setRenderedPages,
        getFileNumPages,
        setFileNumPages,
        setFileRenderedPages,
        mainContainerRef
    } = usePDFViewerContext();

    const [loadError, setLoadError] = useState<Error | null>(null);
    const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));

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


    // Clean up state on file change
    useEffect(() => {
        setLoadError(null);

        if (pdfFile && pdfFileKey) {
            console.log(`[PDFDocumentWrapper] Rendering file: ${pdfFile.name} with key: ${pdfFileKey}`);
        }

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
                setVisiblePages(pagesToRender);

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
                setVisiblePages(pagesToRender);
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
            console.error(`[PDFDocumentWrapper] Error in onDocumentLoadSuccess:`, error);
            setLoadError(error instanceof Error ? error : new Error('Unknown error loading PDF'));
        }
    }, [
        pdfFile,
        pdfFileKey,
        isCurrentDocument,
        setNumPages,
        setRenderedPages,
        setFileNumPages,
        setFileRenderedPages
    ]);

    // Handle document load error
    const onDocumentLoadError = useCallback((error: Error) => {
        console.error(`[PDFDocumentWrapper] Error loading document:`, error);
        setLoadError(error);
    }, []);

    // Handle document requests from other components
    useEffect(() => {
        const handleDocumentRequest = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey: requestedKey, requestId } = customEvent.detail || {};

            if (!requestedKey || !pdfFile || !pdfFileKey) return;

            // Check if this is our file
            const isMatch = pdfFileKey === requestedKey ||
                pdfFileKey.includes(requestedKey) ||
                requestedKey.includes(pdfFileKey) ||
                pdfFile.name.includes(requestedKey) ||
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

    console.log(`[PDFDocumentWrapper] Rendering document - file: ${pdfFile.name}, pages: ${displayNumPages}, forceOpen: ${forceOpen}`);

    return (
        <div
            className="pdf-document-container"
            data-file-name={pdfFile.name}
            data-file-key={pdfFileKey}
            ref={documentRef}
        >
            {loadError && (
                <div className="pdf-error">
                    <h3>Error Loading PDF</h3>
                    <p>Could not load the PDF file</p>
                    <p>Please try uploading the file again or check if the file is valid.</p>
                </div>
            )}

            <Document
                file={pdfFile}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
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
    );
};

// Memoize component to prevent unnecessary re-renders
export default memo(PDFDocumentWrapper, (prevProps, nextProps) => {
    // Re-render if file, fileKey, or forceOpen changes
    return (
        prevProps.file === nextProps.file &&
        prevProps.fileKey === nextProps.fileKey &&
        prevProps.forceOpen === nextProps.forceOpen &&
        prevProps.pageWidth === nextProps.pageWidth
    );
});
