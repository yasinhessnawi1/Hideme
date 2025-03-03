// src/components/pdf/PDFViewer.tsx

import React, {useCallback, useEffect, useMemo, useRef, useState,} from 'react';
import {Document, Page, pdfjs} from 'react-pdf';
// If you have local custom definitions for your PDF viewport & text content:
import type {ExtracteText, PDFPageViewport, TextContent} from '../../types/pdfTypes';
// NOTE: If you have multiple pdfjs-dist versions, specifying PDFDocumentProxy can cause conflicts.
// We'll remove the explicit type to avoid the mismatch:
import {usePDFContext} from '../../contexts/PDFContext';
import {usePDFApi} from "../../hooks/usePDFApi";
import {HighlightType, useHighlightContext} from '../../contexts/HighlightContext';
import HighlightLayerFactory from './HighlightLayerFactory';

// If you have custom highlight managers:
import {SearchHighlightManager} from '../../utils/SearchHighlightManager';
import {EntityHighlightManager} from '../../utils/EntityHighlightManager';
import {ManualHighlightManager} from '../../utils/ManualHighlightManager';

// CSS + worker setup
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import '../../styles/pages/pdf/PdfViewer.css';
import useTheme from "../../hooks/useTheme";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

/** Data about page's rendered size & offsets for highlight alignment. */
interface PageSizeData {
    cssWidth: number;  // actual CSS pixel width of the rendered <canvas>
    cssHeight: number; // actual CSS pixel height
    offsetX: number;
    offsetY: number;
    scaleX: number; // ratio = cssWidth / viewport.width
    scaleY: number; // ratio = cssHeight / viewport.height
}

/**
 * The stored data for each page: we keep its viewport, textContent,
 * measured size, and the reference to the <canvas>.
 */
interface PageData {
    viewport: PDFPageViewport | null;
    textContent: TextContent | null;
    size: PageSizeData;
    canvasRef: HTMLCanvasElement | null;
}

/** For manual drag-to-highlight */
interface SelectionCoords {
    x: number;
    y: number;
    pageIndex: number; // zero-based index
}

const PDFViewer: React.FC = () => {
    const {
        file,
        numPages,
        setNumPages,
        currentPage,
        zoomLevel,
        highlightColor,
        searchQueries,
        isRegexSearch,
        isCaseSensitive,
        detectionMapping,
        pageRefs,
        renderedPages,
        mainContainerRef,
        isEditingMode,
    } = usePDFContext();

    const {
        addAnnotation,
        clearAnnotationsByType,
        getNextHighlightId,
        showSearchHighlights,
        showEntityHighlights,
        showManualHighlights,
    } = useHighlightContext();

    // Store data for each page
    const [pageData, setPageData] = useState<Map<number, PageData>>(new Map());
    const {theme} = useTheme();
    const [processedSearchPages, setProcessedSearchPages] = useState<Set<number>>(new Set());
    const [processedEntityPages, setProcessedEntityPages] = useState<Set<number>>(new Set());
    const [extractedText, setExtractedText] = useState<ExtracteText>({pages: []});
    // For manual highlight rectangle
    const [selectionStart, setSelectionStart] = useState<SelectionCoords | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const {runExtractText} = usePDFApi();

    // Track canvas refs and alignment state with refs to avoid re-renders
    const canvasRefs = useRef<Map<number, HTMLCanvasElement | null>>(new Map());
    const isAligning = useRef<boolean>(false);
    const alignmentTimeoutRef = useRef<number | null>(null);

    // React-PDF doc options - memoized to avoid unnecessary reloads
    const documentOptions = useMemo(
        () => ({
            cMapUrl: 'https://unpkg.com/pdfjs-dist@2.16.105/cmaps/',
            cMapPacked: true,
        }),
        []
    );

    /**
     * We do not specify the param type to avoid mismatch
     * with possible multiple pdfjs-dist versions
     */
    const onDocumentLoadSuccess = useCallback(
        (pdf: any) => {
            setNumPages(pdf.numPages);

            // reset everything
            setPageData(new Map());
            setProcessedSearchPages(new Set());
            setProcessedEntityPages(new Set());
            clearAnnotationsByType(HighlightType.SEARCH);
            clearAnnotationsByType(HighlightType.ENTITY);
            clearAnnotationsByType(HighlightType.MANUAL);
        },
        [setNumPages, clearAnnotationsByType]
    );

    /**
     * Align highlight containers after measuring the actual <canvas>
     * Improved to avoid infinite update loops
     */
    const alignHighlightsWithCanvas = useCallback(() => {
        // Prevent concurrent alignments to avoid state update conflicts
        if (isAligning.current) return;
        isAligning.current = true;

        const pages = document.querySelectorAll('.pdf-page-wrapper');
        let pageDataUpdated = false;
        const newData = new Map(pageData);

        pages.forEach((wrapper) => {
            const pageNumber = parseInt(wrapper.getAttribute('data-page-number') || '0');
            if (!pageNumber) return;

            const canvas = wrapper.querySelector('canvas');
            const highlightContainer = wrapper.querySelector('.highlight-layers-container');
            if (!canvas || !highlightContainer) return;

            const canvasRect = canvas.getBoundingClientRect();
            const wrapperRect = wrapper.getBoundingClientRect();

            // offset from the .pdf-page-wrapper top-left
            const offsetX = canvasRect.left - wrapperRect.left;
            const offsetY = canvasRect.top - wrapperRect.top;

            const existing = newData.get(pageNumber);
            if (existing && existing.viewport) {
                const cssWidth = canvasRect.width;
                const cssHeight = canvasRect.height;

                const viewportWidth = existing.viewport.width;
                const viewportHeight = existing.viewport.height;

                // ratio = CSS px / PDF viewport points
                const scaleX = cssWidth / viewportWidth;
                const scaleY = cssHeight / viewportHeight;

                // Only update if dimensions have actually changed
                if (!existing.canvasRef ||
                    Math.abs(existing.size.cssWidth - cssWidth) > 1 ||
                    Math.abs(existing.size.cssHeight - cssHeight) > 1 ||
                    Math.abs(existing.size.offsetX - offsetX) > 1 ||
                    Math.abs(existing.size.offsetY - offsetY) > 1) {

                    pageDataUpdated = true;
                    newData.set(pageNumber, {
                        ...existing,
                        size: {
                            cssWidth,
                            cssHeight,
                            offsetX,
                            offsetY,
                            scaleX,
                            scaleY,
                        },
                        canvasRef: canvas as HTMLCanvasElement
                    });
                }
            }

            // Apply transform directly to avoid unnecessary re-renders
            const containerStyle = highlightContainer as HTMLElement;
            containerStyle.style.position = 'absolute';
            containerStyle.style.left = '0px';
            containerStyle.style.top = '0px';
            containerStyle.style.width = `${canvasRect.width}px`;
            containerStyle.style.height = `${canvasRect.height}px`;
            containerStyle.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });

        // Only update state if necessary to avoid re-renders
        if (pageDataUpdated) {
            setPageData(newData);
        }

        // Reset alignment flag after a short delay to allow other operations to complete
        setTimeout(() => {
            isAligning.current = false;
        }, 50);
    }, [pageData]);

    // Debounced alignment function to avoid excessive updates
    const debouncedAlign = useCallback(() => {
        if (alignmentTimeoutRef.current !== null) {
            window.clearTimeout(alignmentTimeoutRef.current);
        }

        alignmentTimeoutRef.current = window.setTimeout(() => {
            alignHighlightsWithCanvas();
            alignmentTimeoutRef.current = null;
        }, 100);
    }, [alignHighlightsWithCanvas]);

    /**
     * Observe new canvas elements with improved handling to avoid loops
     */
    useEffect(() => {
        if (!file) return;

        const observer = new MutationObserver((mutations) => {
            let foundCanvas = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node instanceof HTMLElement) {
                            const pageWrapper = node.closest('.pdf-page-wrapper');
                            if (pageWrapper) {
                                const pageNum = parseInt(pageWrapper.getAttribute('data-page-number') || '0');
                                if (pageNum > 0) {
                                    const canvas = pageWrapper.querySelector('canvas');
                                    if (canvas) {
                                        canvasRefs.current.set(pageNum, canvas as HTMLCanvasElement);
                                        foundCanvas = true;
                                    }
                                }
                            }
                        }
                    });
                }
            });

            if (foundCanvas && !isAligning.current) {
                debouncedAlign();
            }
        });

        observer.observe(document.body, {childList: true, subtree: true});
        return () => {
            observer.disconnect();
            if (alignmentTimeoutRef.current !== null) {
                window.clearTimeout(alignmentTimeoutRef.current);
            }
        };
    }, [file, debouncedAlign]);

    /**
     * Called after each <Page> is rendered
     */
    const onPageRenderSuccess = useCallback(
        async (page: pdfjs.PDFPageProxy) => {
            const pageNumber = page.pageNumber;
            // Cast the result from getViewport(...) to unknown, then to PDFPageViewport
            // to avoid "not sufficiently overlapping" error
            const viewport = page.getViewport({scale: zoomLevel}) as unknown as PDFPageViewport;
            try {
                const textContentRaw = await page.getTextContent();
                const textContent = textContentRaw as TextContent;

                setPageData((prev) => {
                    const newData = new Map(prev);
                    const existing = newData.get(pageNumber);

                    // Only update if viewport or textContent has changed
                    if (!existing ||
                        !existing.viewport ||
                        !existing.textContent ||
                        existing.viewport.width !== viewport.width ||
                        existing.viewport.height !== viewport.height) {

                        newData.set(pageNumber, {
                            viewport,
                            textContent,
                            size: {
                                cssWidth: existing?.size.cssWidth || 0,
                                cssHeight: existing?.size.cssHeight || 0,
                                offsetX: existing?.size.offsetX || 0,
                                offsetY: existing?.size.offsetY || 0,
                                scaleX: existing?.size.scaleX || 1,
                                scaleY: existing?.size.scaleY || 1,
                            },
                            canvasRef: existing?.canvasRef || null
                        });

                        return newData;
                    }

                    return prev; // No changes needed
                });

                // Use debounced alignment to prevent excessive updates
                debouncedAlign();
            } catch (err) {
                console.error('Error on page render success', pageNumber, err);
            }
        },
        [zoomLevel, debouncedAlign]
    );

    /**
     * Extract text from PDF only once
     */
    useEffect(() => {
        if (!file || extractedText.pages.length > 0) return;

        runExtractText(file)
            .then((text) => {
                setExtractedText(text);
            })
            .catch((err) => console.error("Error extracting text:", err));
    }, [file, extractedText.pages.length, runExtractText]);

    /**
     * Process search highlights with proper dependency tracking
     */
    useEffect(() => {
        // Only run if there is a file, search term(s), and extracted text is populated.
        if (!file || !searchQueries || searchQueries.length === 0 || extractedText?.pages?.length === 0) {
            // If search queries are empty, clear all search highlights
            if (searchQueries?.length === 0) {
                clearAnnotationsByType(HighlightType.SEARCH);
                setProcessedSearchPages(new Set());
            }
            return;
        }

        // For each rendered page, process the highlights if not already done
        // or if search parameters have changed
        const newProcessedPages = new Set<number>();

        renderedPages.forEach((pageNum) => {
            // Always clear existing search annotations on that page before adding new ones
            clearAnnotationsByType(HighlightType.SEARCH, pageNum);

            // Instantiate the manager using the extracted text
            const searchManager = new SearchHighlightManager(
                extractedText,
                searchQueries,
                getNextHighlightId,
                addAnnotation,
                {
                    isCaseSensitive,
                    isRegexSearch,
                }
            );

            // Process the highlights. The manager should match against words
            // from extractedText and compute precise positions.
            searchManager.processHighlights();
            newProcessedPages.add(pageNum);
        });

        setProcessedSearchPages(newProcessedPages);
    }, [
        file,
        searchQueries,
        extractedText,
        renderedPages,
        clearAnnotationsByType,
        getNextHighlightId,
        addAnnotation,
        isCaseSensitive,
        isRegexSearch,
    ]);

    /**
     * Process entity highlights with proper dependency tracking
     */
    useEffect(() => {
        if (!file || !detectionMapping) return;

        const newProcessedPages = new Set<number>();

        renderedPages.forEach((pageNum) => {
            const data = pageData.get(pageNum);
            if (!data || !data.viewport || !data.textContent) return;

            clearAnnotationsByType(HighlightType.ENTITY, pageNum);

            const entityManager = new EntityHighlightManager(
                pageNum,
                data.viewport,
                data.textContent,
                detectionMapping,
                getNextHighlightId,
                addAnnotation
            );

            entityManager.processHighlights();
            newProcessedPages.add(pageNum);
        });

        setProcessedEntityPages(newProcessedPages);
    }, [
        file,
        pageData,
        renderedPages,
        detectionMapping,
        clearAnnotationsByType,
        getNextHighlightId,
        addAnnotation
    ]);

    /**
     * Manual highlight
     */
    const handlePageMouseDown = useCallback(
        (e: React.MouseEvent, pageIndex: number) => {
            if (!isEditingMode) return;

            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0) {
                // user is selecting text
                return;
            }

            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setSelectionStart({x, y, pageIndex});
            setSelectionEnd({x, y});
            setIsSelecting(true);
        },
        [isEditingMode]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!isSelecting || !selectionStart) return;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setSelectionEnd({x, y});
        },
        [isSelecting, selectionStart]
    );

    const handleMouseUp = useCallback(() => {
        if (!isSelecting || !selectionStart || !selectionEnd) {
            setIsSelecting(false);
            return;
        }

        const manualManager = new ManualHighlightManager(
            selectionStart.pageIndex + 1,
            getNextHighlightId,
            addAnnotation,
            highlightColor
        );
        manualManager.createRectangleHighlight(
            selectionStart.x,
            selectionStart.y,
            selectionEnd.x,
            selectionEnd.y
        );

        setIsSelecting(false);
        setSelectionStart(null);
        setSelectionEnd(null);
    }, [isSelecting, selectionStart, selectionEnd, getNextHighlightId, addAnnotation, highlightColor]);

    // Debounced resize handler
    useEffect(() => {
        const handleResize = () => {
            debouncedAlign();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [debouncedAlign]);

    return (
        <div className="pdf-viewer-container" ref={mainContainerRef}>
            <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                options={documentOptions}
                className="pdf-document"
                loading={<div>Loading PDF...</div>}
                error={<div>Error loading PDF.</div>}
            >
                {Array.from(new Array(numPages), (_, i) => (
                    <div
                        key={`page-wrapper-${i + 1}`}
                        className={`pdf-page-wrapper ${currentPage === i + 1 ? 'active' : ''}`}
                        data-page-number={i + 1}
                        ref={(el) => {
                            pageRefs.current[i] = el;
                        }}
                        onMouseDown={(e) => handlePageMouseDown(e, i)}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => setIsSelecting(false)}
                    >
                        {renderedPages.has(i + 1) && (
                            <>
                                <Page
                                    pageNumber={i + 1}
                                    scale={zoomLevel as number}
                                    onRenderSuccess={onPageRenderSuccess}
                                    renderTextLayer
                                    renderAnnotationLayer
                                    className="pdf-page"
                                />
                                <div
                                    className="highlight-layers-container"
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    {pageData.get(i + 1) && (
                                        <HighlightLayerFactory
                                            pageNumber={i + 1}
                                            showSearch={showSearchHighlights}
                                            showEntity={showEntityHighlights}
                                            showManual={showManualHighlights}
                                            pageSize={{
                                                width: pageData.get(i + 1)!.size.cssWidth,
                                                height: pageData.get(i + 1)!.size.cssHeight,
                                                offsetX: pageData.get(i + 1)!.size.offsetX,
                                                offsetY: pageData.get(i + 1)!.size.offsetY,
                                            }}
                                        />
                                    )}
                                </div>

                                {isSelecting && selectionStart && selectionEnd && selectionStart.pageIndex === i && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: Math.min(selectionStart.x, selectionEnd.x),
                                            top: Math.min(selectionStart.y, selectionEnd.y),
                                            width: Math.abs(selectionEnd.x - selectionStart.x),
                                            height: Math.abs(selectionEnd.y - selectionStart.y),
                                            backgroundColor: highlightColor,
                                            opacity: 0.3,
                                            pointerEvents: 'none',
                                            zIndex: 999,
                                        }}
                                    />
                                )}
                            </>
                        )}
                    </div>
                ))}
            </Document>
        </div>
    );
};

export default PDFViewer;
