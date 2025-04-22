import React, { useCallback, useEffect, useState, useRef, memo } from 'react';
import { Document } from 'react-pdf';
import { useFileContext } from '../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../contexts/PDFViewerContext';
import PageRenderer from './PageRenderer';
import '../../styles/modules/pdf/PdfViewer.css';
import scrollingService from '../../services/UnifiedScrollingService';

interface PDFDocumentWrapperProps {
    file?: File; // New prop to accept a specific file
    fileKey?: string; // Optional fileKey prop for multi-file support
}

const PDFDocumentContent = ({
                                file,
                                fileKey,
                                numPages,
                                onDocumentLoadSuccess,
                                onDocumentLoadError,
                                documentOptions
                            }: {
    file: File,
    fileKey: string,
    numPages: number,
    onDocumentLoadSuccess: (pdf: any) => void,
    onDocumentLoadError: (error: Error) => void,
    documentOptions: any
}) => {
    const [error, setError] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const pdfDocumentRef = useRef<any>(null);

    // Only render pages if this matches the current file or we're not in a file change
    const shouldRenderPages = !scrollingService.isFileChangeScrollActive();

    // Track if component is mounted to prevent state updates after unmount
    const isMountedRef = useRef<boolean>(true);

    useEffect(() => {
        isMountedRef.current = true;
        setLoading(true);
        setError(false);

        return () => {
            isMountedRef.current = false;
        };
    }, [file]);

    let handleLoadSuccess = (pdf: any) => {
        if (isMountedRef.current) {
            setLoading(false);
            setError(false);
            onDocumentLoadSuccess(pdf);

            // Dispatch event that this file is loaded
            window.dispatchEvent(new CustomEvent('pdf-file-loaded', {
                detail: { fileKey, timestamp: Date.now() }
            }));

            // Check that PDF document has required properties before dispatching event
            if (pdf && typeof pdf === 'object' && pdf.numPages > 0) {
                console.log(`[PDFDocumentWrapper] PDF document loaded successfully: ${fileKey} with ${pdf.numPages} pages`);

                // Use a timeout to ensure the PDF is fully initialized before we try to use it
                setTimeout(() => {
                    // ADDED: Dispatch event with the PDF.js document instance
                    window.dispatchEvent(new CustomEvent('pdf-document-loaded', {
                        detail: {
                            fileKey,
                            pdfDocument: pdf,
                            timestamp: Date.now(),
                            numPages: pdf.numPages
                        }
                    }));
                }, 500); // Short delay to ensure PDF is fully initialized
            } else {
                console.warn(`[PDFDocumentWrapper] PDF document not fully initialized: ${fileKey}`);
            }
        }
    };

    const handleLoadError = (error: Error) => {
        if (isMountedRef.current) {
            setLoading(false);
            setError(true);
            onDocumentLoadError(error);

            // Dispatch event that this file had an error
            window.dispatchEvent(new CustomEvent('pdf-file-error', {
                detail: { fileKey, error: error.message, timestamp: Date.now() }
            }));
        }
    };
    useEffect(() => {
        // Update the reference when the document loads
        const updateDocumentRef = (pdf: any) => {
            pdfDocumentRef.current = pdf;
        };

        // Handler for document requests
        const handleDocumentRequest = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey: requestedKey, requestId } = customEvent.detail || {};

            if (!requestedKey || !file || !fileKey) return;

            // Check if this is our file (with flexible matching)
            const isMatch = fileKey === requestedKey ||
                fileKey.includes(requestedKey) ||
                requestedKey.includes(fileKey) ||
                file.name.includes(requestedKey) ||
                requestedKey.includes(file.name);

            if (isMatch && pdfDocumentRef.current) {
                console.log(`[PDFDocumentWrapper] Responding to document request for ${requestedKey}`);

                // Respond with our document
                window.dispatchEvent(new CustomEvent('pdf-document-response', {
                    detail: {
                        fileKey: fileKey,
                        filename: file.name,
                        pdfDocument: pdfDocumentRef.current,
                        requestId: requestId,
                        timestamp: Date.now()
                    }
                }));
            }
        };

        // Update reference in handleLoadSuccess
        const originalHandleLoadSuccess = handleLoadSuccess;
        handleLoadSuccess = (pdf: any) => {
            updateDocumentRef(pdf);
            originalHandleLoadSuccess(pdf);
        };

        window.addEventListener('request-pdf-document', handleDocumentRequest);

        return () => {
            window.removeEventListener('request-pdf-document', handleDocumentRequest);
        };
    }, [file, fileKey]);

    return (
        <div
            className="pdf-document-container"
            data-file-name={file.name}
            data-file-key={fileKey}
        >
            {error && (
                <div className="pdf-error">
                    <h3>Error Loading PDF</h3>
                    <p>Could not load the PDF file</p>
                    <p>Please try uploading the file again or check if the file is valid.</p>
                </div>
            )}

            <Document
                file={file}
                onLoadSuccess={handleLoadSuccess}
                onLoadError={handleLoadError}
                loading={<div className="pdf-loading-placeholder"></div>}
                error={<div className="pdf-error-placeholder"></div>}
                options={documentOptions}
                className="pdf-document"
            >
                {!error && shouldRenderPages && Array.from({length: numPages}, (_, i) => (
                    <PageRenderer
                        key={`page-${fileKey}-${i + 1}`}
                        pageNumber={i + 1}
                        fileKey={fileKey}
                    />
                ))}
            </Document>
        </div>
    );
};

// Memoize the internal component to prevent re-renders
const MemoizedPDFDocumentContent = memo(PDFDocumentContent, (prevProps, nextProps) => {
    return (
        prevProps.file === nextProps.file &&
        prevProps.fileKey === nextProps.fileKey &&
        prevProps.numPages === nextProps.numPages
    );
});

export const PDFDocumentWrapper: React.FC<PDFDocumentWrapperProps> = ({ file, fileKey }) => {
    const { currentFile } = useFileContext();
    const {
        numPages,
        setNumPages,
        setRenderedPages,
        getFileNumPages,
        setFileNumPages,
        setFileRenderedPages
    } = usePDFViewerContext();

    const [loadError, setLoadError] = useState<Error | null>(null);

    // Track if this component has loaded the PDF
    const hasInitializedRef = useRef<boolean>(false);

    // Use the provided file or fall back to currentFile from context
    const pdfFile = file || currentFile;

    // Determine the file key to use
    const pdfFileKey = fileKey ?? (pdfFile ? getFileKey(pdfFile) : '');

    // Track whether this document is the current one
    const isCurrentDocument = currentFile && getFileKey(currentFile) === pdfFileKey;

    // Log when file or fileKey changes to debug file isolation issues
    useEffect(() => {
        setLoadError(null);

        if (pdfFile && pdfFileKey) {
            console.log(`[PDFDocumentWrapper] Rendering file: ${pdfFile.name} with key: ${pdfFileKey}`);
        }

        return () => {
            // Cleanup when component unmounts or file changes
            hasInitializedRef.current = false;
        };
    }, [pdfFile, pdfFileKey]);

    // Document options with memoization
    const documentOptions = React.useMemo(() => ({
        cMapUrl: 'https://unpkg.com/pdfjs-dist@2.16.105/cmaps/',
        cMapPacked: true,
    }), []);

    const onDocumentLoadSuccess = useCallback((pdf: any) => {
        if (!pdfFile || !pdfFileKey) return;

        hasInitializedRef.current = true;
        setLoadError(null);

        try {
            const pageCount = pdf.numPages;
            console.log(`PDF loaded with ${pageCount} pages for file: ${pdfFile.name}`);

            // If we have a file key, update the file-specific page data
            if (pdfFileKey) {
                setFileNumPages(pdfFileKey, pageCount);

                // Initial pages to render
                const initialPagesToShow = Math.min(pageCount, 3);
                const pagesToRender = new Set<number>();

                for (let i = 1; i <= initialPagesToShow; i++) {
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

                // Initially render first page and a couple more for smoother experience
                const pagesToRender = new Set<number>();
                const initialPagesToShow = Math.min(pageCount, 3);

                for (let i = 1; i <= initialPagesToShow; i++) {
                    pagesToRender.add(i);
                }

                setRenderedPages(pagesToRender);
            }

        } catch (error) {
            console.error(`[PDFDocumentWrapper] Error in onDocumentLoadSuccess:`, error);
            setLoadError(error instanceof Error ? error : new Error('Unknown error loading PDF'));
        }
    }, [setNumPages, setRenderedPages, setFileNumPages, setFileRenderedPages]);

    const onDocumentLoadError = useCallback((error: Error) => {
        console.error(`[PDFDocumentWrapper] Error loading document:`, error);
        setLoadError(error);
    }, []);

    if (!pdfFile) return null;

    // Get the number of pages for this file
    const displayNumPages = pdfFileKey
        ? getFileNumPages(pdfFileKey) || numPages
        : numPages;

    return (
        <MemoizedPDFDocumentContent
            file={pdfFile}
            fileKey={pdfFileKey}
            numPages={displayNumPages}
            onDocumentLoadSuccess={onDocumentLoadSuccess}
            onDocumentLoadError={onDocumentLoadError}
            documentOptions={documentOptions}
        />
    );
}

// Memoize the entire component to prevent unnecessary re-renders
export default React.memo(PDFDocumentWrapper, (prevProps, nextProps) => {
    // Only re-render if the file or fileKey changes
    return (
        prevProps.file === nextProps.file &&
        prevProps.fileKey === nextProps.fileKey
    );
});
