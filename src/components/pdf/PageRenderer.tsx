import React, { useCallback, useState, useRef } from 'react';
import { Page } from 'react-pdf';
import { usePDFViewerContext } from '../../contexts/PDFViewerContext';
import { useEditContext } from '../../contexts/EditContext';
import PageOverlay from './PageOverlay';
import HighlightLayerFactory from './highlighters/HighlightLayerFactory';
import { PDFPageViewport, TextContent } from '../../types/pdfTypes';
import { useViewportSize } from '../../hooks/useViewportSize';

interface PageRendererProps {
    pageNumber: number;
    fileKey?: string; // Optional file key for multi-file support
}

const PageRenderer: React.FC<PageRendererProps> = ({ pageNumber, fileKey }) => {
    const {
        pageRefs,
        zoomLevel,
        activeScrollPage,
        getFileActiveScrollPage
    } = usePDFViewerContext();

    const { isEditingMode } = useEditContext();

    const [viewport, setViewport] = useState<PDFPageViewport | null>(null);
    const [textContent, setTextContent] = useState<TextContent | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    // Use the viewport size hook
    const { viewportSize, setCanvasReference } = useViewportSize(
        wrapperRef,
        viewport,
        zoomLevel
    );

    // Determine if this page is active for the current file
    const isActive = () => {
        // If a fileKey is provided, use that
        if (fileKey) {
            return getFileActiveScrollPage(fileKey) === pageNumber;
        }
        // Otherwise use the global activeScrollPage (for backward compatibility)
        return activeScrollPage === pageNumber;
    };

    const onPageRenderSuccess = useCallback(async (page: any) => {
        const newViewport = page.getViewport({ scale: zoomLevel }) as unknown as PDFPageViewport;

        try {
            const textContentRaw = await page.getTextContent();
            setViewport(newViewport);
            setTextContent(textContentRaw as TextContent);

            // Find the canvas element and set it as a reference
            const pageElement = wrapperRef.current;
            if (pageElement) {
                const canvas = pageElement.querySelector('canvas');
                if (canvas) {
                    setCanvasReference(canvas);
                }
            }
        } catch (err) {
            console.error('Error on page render success', pageNumber, err);
        }
    }, [pageNumber, zoomLevel, setCanvasReference]);

    const isPageActive = isActive();

    return (
        <div
            className={`pdf-page-wrapper ${isPageActive ? 'active' : ''}`}
            data-page-number={pageNumber}
            ref={(el) => {
                if (el) {
                    wrapperRef.current = el;
                    if (!fileKey) {
                        // Only use the global pageRefs for backward compatibility
                        pageRefs.current[pageNumber - 1] = el;
                    }
                }
            }}
        >
            {/* Add a more visible page number indicator */}
            <div className="page-number-indicator">{pageNumber}</div>

            <Page
                pageNumber={pageNumber}
                scale={zoomLevel}
                onRenderSuccess={onPageRenderSuccess}
                renderTextLayer
                renderAnnotationLayer
                className="pdf-page"
            />

            {viewport && textContent && (
                <>
                    <PageOverlay
                        pageNumber={pageNumber}
                        viewport={viewport}
                        isEditingMode={isEditingMode}
                        pageSize={viewportSize}
                        fileKey={fileKey}
                    />

                    <HighlightLayerFactory
                        pageNumber={pageNumber}
                        viewport={viewport}
                        textContent={textContent}
                        pageSize={viewportSize}
                        fileKey={fileKey}
                    />
                </>
            )}
        </div>
    );
};

export default PageRenderer;
