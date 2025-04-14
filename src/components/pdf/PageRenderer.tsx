import React, { useCallback, useState, useRef, useEffect, memo } from 'react';
import { Page } from 'react-pdf';
import { usePDFViewerContext } from '../../contexts/PDFViewerContext';
import { useEditContext } from '../../contexts/EditContext';
import PageOverlay from './PageOverlay';
import HighlightLayerFactory from './highlighters/HighlightLayerFactory';
import { PDFPageViewport, TextContent, ViewportSize } from '../../types/pdfTypes';
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

    // Track if this component is mounted to prevent state updates after unmount
    const isMountedRef = useRef<boolean>(true);

    // Track if this has already been rendered
    const hasRenderedRef = useRef<boolean>(false);

    // Use the viewport size hook
    const { viewportSize, setCanvasReference } = useViewportSize(
        wrapperRef,
        viewport,
        zoomLevel
    );

    // Set mounted status on mount/unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Determine if this page is active for the current file
    const isActive = useCallback(() => {
        // If a fileKey is provided, use that
        if (fileKey) {
            const activePage = getFileActiveScrollPage(fileKey);
            console.log(`[PageRenderer] Checking if page ${pageNumber} is active for file ${fileKey}. Active page: ${activePage}`);
            return activePage === pageNumber;
        }
        // Otherwise use the global activeScrollPage (for backward compatibility)
        console.log(`[PageRenderer] Checking if page ${pageNumber} is active (global). Active page: ${activeScrollPage}`);
        return activeScrollPage === pageNumber;
    }, [fileKey, getFileActiveScrollPage, pageNumber, activeScrollPage]);
    
    // Also listen for page highlight events
    useEffect(() => {
        const handlePageHighlighted = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey: eventFileKey, pageNumber: eventPageNumber, source } = customEvent.detail || {};
            
            // Only process if this event applies to our page
            if (fileKey === eventFileKey && pageNumber === eventPageNumber) {
                console.log(`[PageRenderer] Received page highlight event for page ${pageNumber} in file ${fileKey}`);
                
                // Force rerender by accessing the wrapper element and updating its classes directly
                if (wrapperRef.current) {
                    wrapperRef.current.classList.add('active');
                }
            }
        };
        
        window.addEventListener('page-highlighted', handlePageHighlighted);
        
        return () => {
            window.removeEventListener('page-highlighted', handlePageHighlighted);
        };
    }, [fileKey, pageNumber]);

    const onPageRenderSuccess = useCallback(async (page: any) => {
        // Skip processing if component is unmounted
        if (!isMountedRef.current) return;

        // Get viewport with current zoom level
        const newViewport = page.getViewport({ scale: zoomLevel }) as unknown as PDFPageViewport;

        try {
            // Only load text content if not already loaded
            if (!textContent) {
                const textContentRaw = await page.getTextContent();

                // Check if component is still mounted before updating state
                if (isMountedRef.current) {
                    setTextContent(textContentRaw as TextContent);
                }
            }

            // Update viewport if it changed
            if (isMountedRef.current &&
                (!viewport ||
                    viewport.width !== newViewport.width ||
                    viewport.height !== newViewport.height)) {
                setViewport(newViewport);
            }

            // Find the canvas element and set it as a reference
            const pageElement = wrapperRef.current;
            if (pageElement) {
                const canvas = pageElement.querySelector('canvas');
                if (canvas) {
                    setCanvasReference(canvas);

                    // Dispatch an event when the page is fully rendered
                    // This helps with viewport-based navigation
                    window.dispatchEvent(new CustomEvent('pdf-page-render-complete', {
                        detail: {
                            pageNumber,
                            fileKey,
                            timestamp: Date.now(),
                            viewport: newViewport
                        }
                    }));
                }
            }

            // Mark as having rendered
            hasRenderedRef.current = true;
        } catch (err) {
            console.error('Error on page render success', pageNumber, err);
        }
    }, [pageNumber, zoomLevel, setCanvasReference, viewport, textContent, fileKey]);

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
                loading={
                    <div className="pdf-page-loading-placeholder" style={{
                        width: viewport?.width ?? '100%',
                        height: viewport?.height ?? 800,
                        backgroundColor: 'var(--background)'
                    }}></div>
                }
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

// Memoize the component with a custom comparison function
export default memo(PageRenderer, (prevProps, nextProps) => {
    // Only re-render if essential props change
    // This prevents unnecessary re-renders during scrolling
    return (
        prevProps.pageNumber === nextProps.pageNumber &&
        prevProps.fileKey === nextProps.fileKey
    );
});
