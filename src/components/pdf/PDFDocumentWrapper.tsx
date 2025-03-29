import React, { useCallback, useEffect } from 'react';
import { Document } from 'react-pdf';
import { useFileContext } from '../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../contexts/PDFViewerContext';
import { useHighlightContext } from '../../contexts/HighlightContext';
import PageRenderer from './PageRenderer';
import '../../styles/modules/pdf/PdfViewer.css';

interface PDFDocumentWrapperProps {
    file?: File; // New prop to accept a specific file
    fileKey?: string; // Optional fileKey prop for multi-file support
}

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

    const { clearAnnotations, dumpAnnotationStats } = useHighlightContext();

    // Use the provided file or fall back to currentFile from context
    const pdfFile = file || currentFile;

    // Determine the file key to use
    const pdfFileKey = fileKey || (pdfFile ? getFileKey(pdfFile) : '');

    // Log when file or fileKey changes to debug file isolation issues
    useEffect(() => {
        if (pdfFile && pdfFileKey) {
            console.log(`[PDFDocumentWrapper] Rendering file: ${pdfFile.name} with key: ${pdfFileKey}`);
        }
    }, [pdfFile, pdfFileKey]);

    // Document options with memoization
    const documentOptions = React.useMemo(() => ({
        cMapUrl: 'https://unpkg.com/pdfjs-dist@2.16.105/cmaps/',
        cMapPacked: true,
    }), []);

    const onDocumentLoadSuccess = useCallback((pdf: any) => {
        const pageCount = pdf.numPages;
        console.log(`PDF loaded with ${pageCount} pages for file: ${pdfFile?.name}`);

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
            if (currentFile && getFileKey(currentFile) === pdfFileKey) {
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

        // For debugging
        dumpAnnotationStats();
    }, [
        pdfFile,
        pdfFileKey,
        currentFile,
        setNumPages,
        setRenderedPages,
        clearAnnotations,
        setFileNumPages,
        setFileRenderedPages,
        dumpAnnotationStats
    ]);

    if (!pdfFile) return null;

    // Get the number of pages for this file
    const displayNumPages = pdfFileKey
        ? getFileNumPages(pdfFileKey) || numPages
        : numPages;

    return (
        <div
            className="pdf-document-container"
            data-file-name={pdfFile.name}
            data-file-key={pdfFileKey}
        >
            <Document
                file={pdfFile}
                onLoadSuccess={onDocumentLoadSuccess}
                options={documentOptions}
                className="pdf-document"
            >
                {Array.from({length: displayNumPages}, (_, i) => (
                    <PageRenderer
                        key={`page-${pdfFileKey}-${i + 1}`}
                        pageNumber={i + 1}
                        fileKey={pdfFileKey}
                    />
                ))}
            </Document>
        </div>
    );
}

export default PDFDocumentWrapper;
