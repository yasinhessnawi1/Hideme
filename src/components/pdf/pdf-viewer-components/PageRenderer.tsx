import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import {Page} from 'react-pdf';
import {usePDFViewerContext} from '../../../contexts/PDFViewerContext';
import {useEditContext} from '../../../contexts/EditContext';
import PageOverlay from './PageOverlay';
import TextSelectionHighlighter from '../highlighters/TextSelectionHighlighter';
import HighlightLayerFactory from '../highlighters/HighlightLayerFactory';
import {HighlightCreationMode, PDFPageViewport, TextContent} from '../../../types';
import {useViewportSize} from '../../../hooks/general/useViewportSize';
import scrollManager from '../../../services/client-services/ScrollManagerService';
import {useNotification} from '../../../contexts/NotificationContext';
import {useLanguage} from '../../../contexts/LanguageContext';
import {mapBackendErrorToMessage} from '../../../utils/errorUtils';

interface PageRendererProps {
    pageNumber: number;
    fileKey?: string; // Optional file key for multi-file support
    isVisible?: boolean; // Flag for virtualization
}

/**
 * Component to render a single PDF page with highlights and overlays
 */
const PageRenderer: React.FC<PageRendererProps> = ({
                                                       pageNumber,
                                                       fileKey,
                                                       isVisible = true // Default to visible if not specified
                                                   }) => {
    const {
        pageRefs,
        zoomLevel,
        activeScrollPage,
        getFileActiveScrollPage
    } = usePDFViewerContext();

    const { isEditingMode, highlightingMode } = useEditContext();
    const { notify } = useNotification();
    const { t } = useLanguage();

    const [viewport, setViewport] = useState<PDFPageViewport | null>(null);
    const [textContent, setTextContent] = useState<TextContent | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    // Track component mount status to prevent state updates after unmount
    const isMountedRef = useRef<boolean>(true);

    // Track if this page has already been rendered
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
            return activePage === pageNumber;
        }
        // Otherwise use the global activeScrollPage (for backward compatibility)
        return activeScrollPage === pageNumber;
    }, [fileKey, getFileActiveScrollPage, pageNumber, activeScrollPage]);

    // Listen for page highlight events
    useEffect(() => {
        let highlightTimeout: NodeJS.Timeout | null = null;
        
        const handlePageHighlighted = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey: eventFileKey, pageNumber: eventPageNumber } = customEvent.detail ?? {};

            // Reduce logging - only log for this specific page
            if (fileKey === eventFileKey && pageNumber === eventPageNumber) {
                console.log(`[PageRenderer] Page highlight event received for ${eventFileKey}:${eventPageNumber}, this is ${fileKey}:${pageNumber}`);
            }

            if (!wrapperRef.current) return;

            // Clear any pending highlight timeout
            if (highlightTimeout) {
                clearTimeout(highlightTimeout);
                highlightTimeout = null;
            }

            // Debounce the highlight changes to prevent flickering
            highlightTimeout = setTimeout(() => {
                if (!wrapperRef.current) return;

                // Check if this event applies to our page
                if (fileKey === eventFileKey && pageNumber === eventPageNumber) {
                    // This page should be active
                    if (!wrapperRef.current.classList.contains('active')) {
                        console.log(`[PageRenderer] Setting page ${pageNumber} as active`);
                        wrapperRef.current.classList.add('active');

                        // Add animation highlight only if not already present
                        if (!wrapperRef.current.classList.contains('just-activated')) {
                            wrapperRef.current.classList.add('just-activated');
                            setTimeout(() => {
                                if (wrapperRef.current) {
                                    wrapperRef.current.classList.remove('just-activated');
                                }
                            }, 1500);
                        }
                    }
                } else if (fileKey === eventFileKey) {
                    // This is the same file but different page - remove active class
                    if (wrapperRef.current.classList.contains('active')) {
                        console.log(`[PageRenderer] Removing active from page ${pageNumber}`);
                        wrapperRef.current.classList.remove('active');
                        wrapperRef.current.classList.remove('just-activated');
                    }
                }
            }, 50); // 50ms debounce to batch rapid changes
        };

        window.addEventListener('page-highlighted', handlePageHighlighted);

        return () => {
            window.removeEventListener('page-highlighted', handlePageHighlighted);
            if (highlightTimeout) {
                clearTimeout(highlightTimeout);
            }
        };
    }, [fileKey, pageNumber]);

    // Handle page rendering
    const onPageRenderSuccess = useCallback(async (page: any) => {
        // Skip processing if component is unmounted
        if (!isMountedRef.current) return;

        // Get viewport with current zoom level
        const newViewport = page.getViewport({ scale: zoomLevel }) as unknown as PDFPageViewport;

        try {
            // Only load text content if not already loaded
            if (!textContent && isMountedRef.current) {
                const textContentRaw = await page.getTextContent();
                setTextContent(textContentRaw as TextContent);
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

            // Register this page with the scroll manager for visibility tracking
            setTimeout(() => {
                scrollManager.refreshObservers();
            }, 100);
        } catch (err) {
            notify({
                message: mapBackendErrorToMessage(err) || t('pageRenderer', 'errorLoadingPage').replace('{error}', String(err)),
                type: 'error',
                duration: 3000
            });
        }
    }, [pageNumber, zoomLevel, setCanvasReference, viewport, textContent, fileKey]);

    // Determine if this page is currently active
    const isPageActive = isActive();

    // Determine which highlighting mode is active
    const isTextSelectionMode = highlightingMode === HighlightCreationMode.TEXT_SELECTION;

    // For virtualization, we can optionally only render visible pages
    if (!isVisible && !isPageActive) {
        // Render a placeholder if not visible and not active
        return (
            <div
                className={`pdf-page-wrapper placeholder ${isPageActive ? 'active' : ''}`}
                data-page-number={pageNumber}
                ref={(el) => {
                    if (el) {
                        wrapperRef.current = el;
                        if (!fileKey) {
                            // Only use global pageRefs for backward compatibility
                            pageRefs.current[pageNumber - 1] = el;
                        }
                    }
                }}
                style={{
                    height: viewport?.height ? `${viewport.height}px` : '800px',
                    minHeight: '500px',
                    width: '100%'
                }}
            >
                <div className="page-number-indicator">{pageNumber}</div>
            </div>
        );
    }

    return (
        <div
            className={`pdf-page-wrapper ${isPageActive ? 'active' : ''}`}
            data-page-number={pageNumber}
            data-file-key={fileKey}  // Make sure this attribute is set
            data-file={fileKey}
            ref={(el) => {
                if (el) {
                    wrapperRef.current = el;
                    if (!fileKey) {
                        // Only use global pageRefs for backward compatibility
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
                    {/* PageOverlay for rectangular highlighting */}
                    <PageOverlay
                        pageNumber={pageNumber}
                        viewport={viewport}
                        isEditingMode={isEditingMode}
                        pageSize={viewportSize}
                        fileKey={fileKey}
                        highlightingMode={highlightingMode}
                    />

                    {/* TextSelectionHighlighter for text selection highlighting */}
                    <TextSelectionHighlighter
                        pageNumber={pageNumber}
                        viewport={viewport}
                        isEditingMode={isEditingMode}
                        pageSize={viewportSize}
                        fileKey={fileKey}
                        isActive={highlightingMode === HighlightCreationMode.TEXT_SELECTION}
                    />

                    <HighlightLayerFactory
                        pageNumber={pageNumber}
                        viewport={viewport}
                        textContent={textContent}
                        pageSize={viewportSize}
                        fileKey={fileKey}
                        containerRef={wrapperRef}
                    />
                </>
            )}
        </div>
    );
};

// Memoize the component with a custom comparison function
export default memo(PageRenderer, (prevProps, nextProps) => {
    // Only re-render if essential props change
    return (
        prevProps.pageNumber === nextProps.pageNumber &&
        prevProps.fileKey === nextProps.fileKey &&
        prevProps.isVisible === nextProps.isVisible
    );
});
