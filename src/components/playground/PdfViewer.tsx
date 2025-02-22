// src/components/playground/PdfViewer.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { usePdfContext } from '../../contexts/PdfContext';
import '../../styles/playground/PdfViewer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

// Worker from CDN – using .mjs or .js as appropriate
pdfjs.GlobalWorkerOptions.workerSrc =
    'https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';

interface HighlightRect {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    opacity?: number;
}

// Correction constants (in pixels at zoom level 1); adjust to fine‑tune offsets.
// Changed X_OFFSET_CORRECTION to +5 so the overlay shifts a bit to the right.
const X_OFFSET_CORRECTION = 1;
const Y_OFFSET_CORRECTION = -1;
const X_OFFSET_CORRECTION_SEARCH = -3;

const PdfViewer: React.FC = () => {
    const {
        file,
        currentPage,
        setNumPages,
        highlightColor,
        zoomLevel,
        selectedMlEntities,
        selectedAiEntities,
        isEditingMode,
        searchQueries,
    } = usePdfContext();

    // Outer container ref
    const containerRef = useRef<HTMLDivElement | null>(null);
    // New ref for the PDF page wrapper (used for coordinate reference)
    const pageWrapperRef = useRef<HTMLDivElement | null>(null);
    const highlightIdRef = useRef<number>(0);
    // Hidden canvas for potential measurement
    const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = document.createElement('canvas');
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
        hiddenCanvasRef.current = canvas;
        return () => {
            document.body.removeChild(canvas);
        };
    }, []);

    // Store extracted text items and page viewport for conversion logic
    const [pageTextItems, setPageTextItems] = useState<any[]>([]);
    const [pageViewport, setPageViewport] = useState<pdfjs.PageViewport | null>(null);

    // Overlays for highlighting
    const [annotations, setAnnotations] = useState<HighlightRect[]>([]);

    /* ========== Document & Page Handlers ========== */
    const onDocumentLoadSuccess = useCallback(
        (pdf: pdfjs.PDFDocumentProxy) => {
            console.log('[PdfViewer] Document load success. numPages:', pdf.numPages);
            setNumPages(pdf.numPages);
        },
        [setNumPages]
    );

    const onPageRenderSuccess = useCallback(async (page: pdfjs.PDFPageProxy) => {
        const viewport = page.getViewport({ scale: zoomLevel });
        setPageViewport(viewport);
        console.log(
            `[PdfViewer] onRenderSuccess for page #${page.pageNumber}, viewport height=${viewport.height}. Extracting text...`
        );
        const textContent = await page.getTextContent();
        setPageTextItems(textContent.items);
        console.log('[PdfViewer] Extracted text items count:', textContent.items.length);
    }, [zoomLevel]);

    /* ========== Text Selection Highlight Handler ========== */
    const handleTextSelection = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isEditingMode) {
            console.log('[PdfViewer] Text selection: Editing mode OFF, ignoring selection.');
            return;
        }
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        // Get the first range and its client rects
        const range = selection.getRangeAt(0);
        const rects = Array.from(range.getClientRects());
        const wrapperRect = pageWrapperRef.current?.getBoundingClientRect();
        if (!wrapperRect) return;

        // Build an array of highlights from each rect,
        // adjusting coordinates relative to the page wrapper.
        const newHighlights: HighlightRect[] = rects.map((rect) => {
            highlightIdRef.current += 1;
            return {
                id: highlightIdRef.current,
                x: rect.left - wrapperRect.left + (X_OFFSET_CORRECTION * zoomLevel),
                y: rect.top - wrapperRect.top + (Y_OFFSET_CORRECTION * zoomLevel),
                w: rect.width,
                h: rect.height,
                color: highlightColor,
                opacity: 0.4,
            };
        });

        // Instead of replacing, accumulate new highlights
        setAnnotations((prev) => [...prev, ...newHighlights]);
        // Clear the native selection
        selection.removeAllRanges();
    };

    /* ========== Helper: Create Highlight for a Substring ========== */
    /* ========== Helper: Create Highlight for a Substring ========== */
    const createSubstringHighlight = (
        baseId: number,
        chunkText: string,
        chunkWidth: number,
        chunkHeight: number,
        xBase: number,
        yBase: number,
        matchIndex: number,
        matchLength: number,
        highlightColor: string
    ) => {
        highlightIdRef.current += 1;
        const itemId = baseId + highlightIdRef.current;

        // Get the hidden canvas 2D context for text measurement
        const ctx = hiddenCanvasRef.current?.getContext('2d');
        if (!ctx) {
            // Fallback if canvas not available: use uniform approximation
            const approxCharWidth = chunkText.length > 0 ? chunkWidth / chunkText.length : 0;
            const xOffset = matchIndex * approxCharWidth;
            const subWidth = matchLength * approxCharWidth;
            const computedY = pageViewport ? pageViewport.height - yBase - chunkHeight : yBase;
            // Use a dynamic fudge factor plus correction constant
            const dynamicFudgeX = (2 * zoomLevel) + (X_OFFSET_CORRECTION_SEARCH * zoomLevel);
            const fallbackHighlight: HighlightRect = {
                id: itemId,
                x: xBase + xOffset + dynamicFudgeX,
                y: computedY,
                w: subWidth,
                h: chunkHeight,
                color: highlightColor,
                opacity: 0.4,
            };
            setAnnotations((prev) => [...prev, fallbackHighlight]);
            return fallbackHighlight;
        }

        // Set the font to approximate the PDF text style (adjust the font family/size as needed)
        ctx.font = `${10 * zoomLevel}px Arial`;

        // Measure widths for text before match and for the match itself
        const textBeforeMatch = chunkText.slice(0, matchIndex);
        const matchText = chunkText.slice(matchIndex, matchIndex + matchLength);
        const measuredBefore = ctx.measureText(textBeforeMatch).width;
        const measuredMatch = ctx.measureText(matchText).width;

        // Get full measured width and calculate scaling factor
        const fullMeasured = ctx.measureText(chunkText).width || chunkText.length;
        const scalingFactor = chunkWidth / fullMeasured;

        const xOffset = measuredBefore * scalingFactor;
        const subWidth = measuredMatch * scalingFactor;

        // Calculate y coordinate by inverting PDF coordinate if viewport is available
        const computedY = pageViewport ? pageViewport.height - yBase - chunkHeight : yBase;

        // Compute dynamic fudge factor and add correction offset
        const dynamicFudgeX = (2 * zoomLevel) + (X_OFFSET_CORRECTION_SEARCH * zoomLevel);

        const highlightRect: HighlightRect = {
            id: itemId,
            x: xBase + xOffset + dynamicFudgeX,
            y: computedY,
            w: subWidth,
            h: chunkHeight,
            color: highlightColor,
            opacity: 0.4,
        };

        setAnnotations((prev) => [...prev, highlightRect]);
        return highlightRect;
    };

    /* ========== 1) Search-based Highlight (Multiple Queries) ========== */
    useEffect(() => {
        console.log('[PdfViewer] useEffect (Search) triggered. searchQueries=', searchQueries);
        // Clear old search highlights (IDs >= 10000)
        setAnnotations((prev) => prev.filter((ann) => ann.id < 10000));

        if (!searchQueries.length || !pageViewport) {
            console.log('[PdfViewer] No search queries or no viewport. Exiting search effect.');
            return;
        }
        if (pageTextItems.length === 0) {
            console.log('[PdfViewer] pageTextItems=0. No text to search. Exiting search effect.');
            return;
        }

        let totalMatches = 0;
        pageTextItems.forEach((item) => {
            const originalText = item.str as string;
            if (!originalText) return;
            const chunkWidth = item.width || originalText.length * 5;
            const chunkHeight = item.height || 10;
            const transform = item.transform || [1, 0, 0, 1, 0, 0];
            const xBase = transform[4];
            const yBase = transform[5];

            searchQueries.forEach((term) => {
                const trimmedTerm = term.trim();
                if (!trimmedTerm) return;
                const regex = new RegExp(trimmedTerm, 'gi');
                let match;
                while ((match = regex.exec(originalText)) !== null) {
                    createSubstringHighlight(
                        10000,
                        originalText,
                        chunkWidth,
                        chunkHeight,
                        xBase,
                        yBase,
                        match.index,
                        match[0].length,
                        '#FFD700'
                    );
                    totalMatches++;
                }
            });
        });
        console.log('[PdfViewer] Search highlight done. Found ${totalMatches} matches.');
    }, [searchQueries, pageTextItems, pageViewport, zoomLevel]);

    /* ========== 2) Entity-based Highlight ========== */
    useEffect(() => {
        console.log('[PdfViewer] useEffect (Entities) triggered. ML:', selectedMlEntities, ' AI:', selectedAiEntities);
        // Clear old entity highlights (IDs between 5000..9999)
        setAnnotations((prev) => prev.filter((ann) => ann.id < 5000 || ann.id >= 10000));

        if (!pageViewport || pageTextItems.length === 0) return;
        if (!selectedMlEntities.length && !selectedAiEntities.length) return;

        const allEntities = [
            ...selectedMlEntities.map((ent) => ent.value.toLowerCase()),
            ...selectedAiEntities.map((ent) => ent.value.toLowerCase()),
        ];
        if (!allEntities.length) return;

        let entityMatchCount = 0;
        pageTextItems.forEach((item) => {
            const originalText = item.str.toLowerCase();
            if (!originalText) return;
            const chunkWidth = item.width || originalText.length * 4;
            const chunkHeight = item.height || 10;
            const transform = item.transform || [1, 0, 0, 1, 0, 0];
            const xBase = transform[4];
            const yBase = transform[5];

            allEntities.forEach((entityStr) => {
                let startIndex = 0;
                while (true) {
                    const foundIndex = originalText.indexOf(entityStr, startIndex);
                    if (foundIndex === -1) break;
                    const isAi = selectedAiEntities.find((ent) => ent.value.toLowerCase() === entityStr);
                    const entityHighlightColor = isAi ? '#90ee90' : '#87cefa';
                    createSubstringHighlight(
                        5000,
                        originalText,
                        chunkWidth,
                        chunkHeight,
                        xBase,
                        yBase,
                        foundIndex,
                        entityStr.length,
                        entityHighlightColor
                    );
                    entityMatchCount++;
                    startIndex = foundIndex + entityStr.length;
                }
            });
        });
        console.log('[PdfViewer] Entity highlight done. Found ${entityMatchCount} matches.');
    }, [selectedMlEntities, selectedAiEntities, pageTextItems, pageViewport, zoomLevel]);

    if (!file) {
        console.log('[PdfViewer] No file in context, returning viewer-empty.');
        return <div className="viewer-empty">No PDF Selected</div>;
    }

    return (
        <div className="pdf-viewer-container" ref={containerRef}>
            <div className="pdf-page-wrapper" ref={pageWrapperRef} onMouseUp={handleTextSelection}>
                <Document
                    file={file}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<p>Loading PDF...</p>}
                >
                    <Page
                        pageNumber={currentPage}
                        scale={zoomLevel}
                        onRenderSuccess={onPageRenderSuccess}
                    />
                </Document>

                {annotations.map((ann) => (
                    <div
                        key={ann.id}
                        className="redaction-box"
                        style={{
                            position: 'absolute',
                            left: ann.x,
                            top: ann.y,
                            width: ann.w,
                            height: ann.h,
                            backgroundColor: ann.color,
                            opacity: ann.opacity ?? 0.5,
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default PdfViewer;
