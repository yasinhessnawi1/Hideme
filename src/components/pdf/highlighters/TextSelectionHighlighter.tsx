import React, {useEffect, useRef, useState} from 'react';
import {useEditContext} from '../../../contexts/EditContext';
import {ManualHighlightProcessor} from '../../../managers/ManualHighlightProcessor';
import {HighlightCreationMode, PDFPageViewport, ViewportSize} from '../../../types';

interface TextSelectionHighlighterProps {
    pageNumber: number;
    viewport: PDFPageViewport;
    isEditingMode: boolean;
    pageSize: ViewportSize;
    fileKey?: string;
    isActive: boolean;
}

interface SelectionRect {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
}

interface HighlightSpan {
    span: TextSpan;
    startOffset: number;
    endOffset: number;
    startX: number;
    endX: number;
}

interface TextSpan {
    element: HTMLElement;
    rect: DOMRect;
    text: string;
    left: number;
    top: number;
    right: number;
    bottom: number;
}

const TextSelectionHighlighter: React.FC<TextSelectionHighlighterProps> = ({
                                                                               pageNumber,
                                                                               viewport,
                                                                               isEditingMode,
                                                                               pageSize,
                                                                               fileKey,
                                                                               isActive
                                                                           }) => {
    const { manualColor } = useEditContext();

    // Use refs for values that change frequently to prevent re-renders
    const manualColorRef = useRef(manualColor);
    const viewportRef = useRef(viewport);

    // Update refs when values change
    useEffect(() => {
        manualColorRef.current = manualColor;
    }, [manualColor]);

    useEffect(() => {
        viewportRef.current = viewport;
    }, [viewport]);

    // Selection state
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
    const [selectedSpans, setSelectedSpans] = useState<HighlightSpan[]>([]);
    const [previewHighlights, setPreviewHighlights] = useState<HighlightSpan[]>([]);
    const [textSpans, setTextSpans] = useState<TextSpan[]>([]);

    // Refs for accessing state in event handlers (to avoid stale closures)
    const isSelectingRef = useRef(false);
    const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
    const selectionEndRef = useRef<{ x: number; y: number } | null>(null);
    const selectedSpansRef = useRef<HighlightSpan[]>([]);
    const previewHighlightsRef = useRef<HighlightSpan[]>([]);
    const textSpansRef = useRef<TextSpan[]>([]);

    // Refs
    const pageContainerRef = useRef<HTMLElement | null>(null);
    const textLayerRef = useRef<HTMLElement | null>(null);
    const selectionOverlayRef = useRef<HTMLDivElement | null>(null);
    const initializedRef = useRef(false);

    // Initialize page container and text layer references - ONLY ONCE
    useEffect(() => {
        if (!isActive || !isEditingMode || initializedRef.current) {
            return;
        }

        initializedRef.current = true;
        const safeFileKey = fileKey || '_default';

        // Build cache of text spans with their positions and content
        const buildTextSpansCache = () => {
            if (!textLayerRef.current || !pageContainerRef.current) {
                return;
            }

            const spans = Array.from(textLayerRef.current.querySelectorAll('span')) as HTMLElement[];
            const pageRect = pageContainerRef.current.getBoundingClientRect();

            const textSpansData: TextSpan[] = spans
                .filter(span => span.textContent && span.textContent.trim())
                .map(span => {
                    const rect = span.getBoundingClientRect();

                    // Calculate position relative to the PDF content area (where the overlay is positioned)
                    const pdfPage = pageContainerRef.current?.querySelector('.react-pdf__Page') as HTMLElement;
                    const contentArea = pdfPage || pageContainerRef.current;
                    const contentRect = contentArea?.getBoundingClientRect() || pageRect;

                    const relativeRect = {
                        left: rect.left - contentRect.left,
                        top: rect.top - contentRect.top,
                        right: rect.right - contentRect.left,
                        bottom: rect.bottom - contentRect.top,
                        width: rect.width,
                        height: rect.height
                    };

                    return {
                        element: span,
                        rect,
                        text: span.textContent || '',
                        left: relativeRect.left,
                        top: relativeRect.top,
                        right: relativeRect.right,
                        bottom: relativeRect.bottom
                    };
                })
                .sort((a, b) => {
                    // Sort by vertical position first, then horizontal
                    const verticalDiff = a.top - b.top;
                    if (Math.abs(verticalDiff) > 5) { // Different lines
                        return verticalDiff;
                    }
                    return a.left - b.left; // Same line, sort horizontally
                });

            setTextSpans(textSpansData);
        };

        const findPageContainer = () => {
            const selectors = [
                `.pdf-page-wrapper[data-page-number="${pageNumber}"][data-file="${safeFileKey}"]`,
                `.pdf-page-wrapper[data-page-number="${pageNumber}"][data-file-key="${safeFileKey}"]`,
                `[data-file-key="${safeFileKey}"] [data-page-number="${pageNumber}"]`,
                `[data-page-number="${pageNumber}"]`
            ];

            for (const selector of selectors) {
                const container = document.querySelector(selector) as HTMLElement;
                if (container) {
                    pageContainerRef.current = container;
                    const textLayer = container.querySelector('.react-pdf__Page__textContent') as HTMLElement;
                    if (textLayer) {
                        textLayerRef.current = textLayer;
                        return true;
                    }
                }
            }
            return false;
        };

        if (findPageContainer()) {
            pageContainerRef.current?.classList.add('custom-text-selection-mode');

            if (textLayerRef.current) {
                textLayerRef.current.style.userSelect = 'none';
                textLayerRef.current.style.webkitUserSelect = 'none';
                textLayerRef.current.style.pointerEvents = 'none';
            }

            // Delay text spans cache to ensure DOM is ready and PDF text layer is positioned
            setTimeout(() => {
                buildTextSpansCache();

                // If spans are still collapsed, try again after more delay
                setTimeout(() => {
                    if (textSpansRef.current.length > 0) {
                        const firstSpan = textSpansRef.current[0];
                        const lastSpan = textSpansRef.current[textSpansRef.current.length - 1];
                        // Check if spans seem properly positioned (not all at same Y coordinate)
                        if (Math.abs(firstSpan.top - lastSpan.top) < 1 && textSpansRef.current.length > 10) {
                            buildTextSpansCache();
                        }
                    }
                }, 500);
            }, 200);
        }

        return () => {
            initializedRef.current = false;
            pageContainerRef.current?.classList.remove('custom-text-selection-mode');
            if (textLayerRef.current) {
                textLayerRef.current.style.userSelect = '';
                textLayerRef.current.style.webkitUserSelect = '';
                textLayerRef.current.style.pointerEvents = '';
            }
        };
    }, [isActive, isEditingMode, pageNumber, fileKey]);

    // Create selection overlay - ONLY ONCE
    useEffect(() => {
        if (!isActive || !isEditingMode || !pageContainerRef.current || selectionOverlayRef.current) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'custom-text-selection-overlay';

        // Get the actual PDF content area within the page container
        const pdfPage = pageContainerRef.current.querySelector('.react-pdf__Page') as HTMLElement;
        const contentArea = pdfPage || pageContainerRef.current;
        const contentRect = contentArea.getBoundingClientRect();
        const containerRect = pageContainerRef.current.getBoundingClientRect();

        // Position overlay to match the PDF content area exactly
        const offsetTop = contentRect.top - containerRect.top;
        const offsetLeft = contentRect.left - containerRect.left;

        overlay.style.cssText = `
            position: absolute;
            top: ${offsetTop}px;
            left: ${offsetLeft}px;
            width: ${contentRect.width}px;
            height: ${contentRect.height}px;
            pointer-events: auto;
            z-index: 1000;
            cursor: text;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            touch-action: none;
        `;

        pageContainerRef.current.appendChild(overlay);
        selectionOverlayRef.current = overlay;

        // Helper function to get character position within a span
        const getCharacterPositionInSpan = (span: TextSpan, x: number): { offset: number; x: number } => {
            const element = span.element;
            const text = span.text;

            if (!text || text.length === 0) {
                return {offset: 0, x: span.left};
            }

            // Use canvas to measure text width for more accurate positioning
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const computedStyle = getComputedStyle(element);

            if (context) {
                context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;

                let closestOffset = 0;
                let closestDistance = Infinity;
                let closestX = span.left;

                // Check each character position
                for (let i = 0; i <= text.length; i++) {
                    const substr = text.substring(0, i);
                    const width = context.measureText(substr).width;
                    const charX = span.left + width;
                    const distance = Math.abs(x - charX);

                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestOffset = i;
                        closestX = charX;
                    }
                }

                return {offset: closestOffset, x: closestX};
            }

            // Fallback: simple proportional calculation
            const relativeX = Math.max(0, Math.min(x - span.left, span.right - span.left));
            const proportion = relativeX / (span.right - span.left);
            const offset = Math.round(proportion * text.length);
            const charX = span.left + relativeX;

            return {offset: Math.max(0, Math.min(offset, text.length)), x: charX};
        };

        // Helper function to get width of text substring
        const getTextWidth = (span: TextSpan, startOffset: number, endOffset: number): number => {
            const element = span.element;
            const text = span.text.substring(startOffset, endOffset);

            if (!text) return 0;

            // Use canvas for accurate text measurement
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const computedStyle = getComputedStyle(element);

            if (context) {
                context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
                return context.measureText(text).width;
            }

            // Fallback proportional calculation
            return ((endOffset - startOffset) / span.text.length) * (span.right - span.left);
        };

        // Helper function to find character-level selection
        const getCharacterLevelSelection = (startX: number, startY: number, endX: number, endY: number): HighlightSpan[] => {
            // Determine selection direction for proper text flow handling
            const isRightToLeft = endX < startX || (Math.abs(endX - startX) < 5 && endY < startY);

            // Set actual start and end based on reading order, not just min/max
            let actualStartX, actualStartY, actualEndX, actualEndY;

            if (isRightToLeft) {
                actualStartX = endX;
                actualStartY = endY;
                actualEndX = startX;
                actualEndY = startY;
            } else {
                actualStartX = startX;
                actualStartY = startY;
                actualEndX = endX;
                actualEndY = endY;
            }

            // For intersections, we still use min/max
            const minX = Math.min(startX, endX);
            const maxX = Math.max(startX, endX);
            const minY = Math.min(startY, endY);
            const maxY = Math.max(startY, endY);

            // Find all spans that intersect with the selection area
            const candidateSpans = textSpansRef.current.filter(span => {
                return !(span.right < minX || span.left > maxX ||
                    span.bottom < minY || span.top > maxY);
            });

            if (candidateSpans.length === 0) return [];

            // Sort spans by reading order
            candidateSpans.sort((a, b) => {
                const yDiff = a.top - b.top;
                if (Math.abs(yDiff) > 5) return yDiff;
                return a.left - b.left;
            });

            const result: HighlightSpan[] = [];

            candidateSpans.forEach((span, index) => {
                const isFirstSpan = index === 0;
                const isLastSpan = index === candidateSpans.length - 1;

                let startOffset = 0;
                let endOffset = span.text.length;
                let spanStartX = span.left;
                let spanEndX = span.right;

                // For single span selection
                if (candidateSpans.length === 1) {
                    const startPos = getCharacterPositionInSpan(span, actualStartX);
                    const endPos = getCharacterPositionInSpan(span, actualEndX);

                    startOffset = startPos.offset;
                    endOffset = endPos.offset;
                    spanStartX = span.left + getTextWidth(span, 0, startOffset);
                    spanEndX = span.left + getTextWidth(span, 0, endOffset);
                }
                // For multi-span selection
                else {
                    if (isFirstSpan) {
                        // First span: start from click position to end of span
                        const startPos = getCharacterPositionInSpan(span, actualStartX);
                        startOffset = startPos.offset;
                        spanStartX = span.left + getTextWidth(span, 0, startOffset);
                    } else if (isLastSpan) {
                        // Last span: start from beginning to click position
                        const endPos = getCharacterPositionInSpan(span, actualEndX);
                        endOffset = endPos.offset;
                        spanEndX = span.left + getTextWidth(span, 0, endOffset);
                    }
                    // Middle spans: select entirely (default values work)
                }

                // Only add if there's actual text to select
                if (startOffset < endOffset && span.text.trim()) {
                    result.push({
                        span,
                        startOffset,
                        endOffset,
                        startX: spanStartX,
                        endX: spanEndX
                    });
                }
            });

            return result;
        };

        // Helper function to expand selection to word boundaries (optional, can be disabled for more native feel)
        const expandToWordBoundaries = (spans: HighlightSpan[]): HighlightSpan[] => {
            // For now, return as-is for character-level precision
            // Could add word boundary expansion as an option
            return spans;
        };

        const onMouseDown = (e: MouseEvent) => {
            if (!isActive || !isEditingMode || !pageContainerRef.current || !selectionOverlayRef.current) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            // Get coordinates relative to the overlay
            const overlayRect = selectionOverlayRef.current.getBoundingClientRect();
            const x = e.clientX - overlayRect.left;
            const y = e.clientY - overlayRect.top;

            setIsSelecting(true);
            setSelectionStart({x, y});
            setSelectionEnd({x, y});
            setSelectedSpans([]);
            setPreviewHighlights([]);

            // Update cursor for active selection
            if (selectionOverlayRef.current) {
                selectionOverlayRef.current.style.cursor = 'text';
                // Add visual feedback by slightly changing overlay opacity during selection
                selectionOverlayRef.current.style.background = 'rgba(0, 123, 255, 0.02)';
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isSelectingRef.current || !selectionStartRef.current || !pageContainerRef.current || !selectionOverlayRef.current) return;

            e.preventDefault();

            const overlayRect = selectionOverlayRef.current.getBoundingClientRect();
            const x = e.clientX - overlayRect.left;
            const y = e.clientY - overlayRect.top;

            setSelectionEnd({x, y});

            // Get character-level selection
            const selectedSpans = getCharacterLevelSelection(
                selectionStartRef.current.x,
                selectionStartRef.current.y,
                x,
                y
            );

            // Optionally expand to word boundaries
            const finalSpans = expandToWordBoundaries(selectedSpans);

            // Update preview highlights
            setPreviewHighlights(finalSpans);
        };

        const onMouseUp = async (e: MouseEvent) => {
            if (!isSelectingRef.current || !selectionStartRef.current) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            setIsSelecting(false);

            // Reset cursor and clear selection feedback
            if (selectionOverlayRef.current) {
                selectionOverlayRef.current.style.cursor = 'text';
                selectionOverlayRef.current.style.background = '';
            }

            // Check if this was a meaningful selection (prevent accidental highlights from tiny movements)
            const overlayRect = selectionOverlayRef.current?.getBoundingClientRect();
            if (overlayRect) {
                const currentX = e.clientX - overlayRect.left;
                const currentY = e.clientY - overlayRect.top;
                const deltaX = Math.abs(currentX - selectionStartRef.current.x);
                const deltaY = Math.abs(currentY - selectionStartRef.current.y);

                // Only create highlights if there was meaningful selection movement
                if (deltaX < 3 && deltaY < 3) {
                    // Too small movement, clear selection without creating highlights
                    if (selectionOverlayRef.current) {
                        selectionOverlayRef.current.style.background = '';
                    }
                    setSelectionStart(null);
                    setSelectionEnd(null);
                    setSelectedSpans([]);
                    setPreviewHighlights([]);
                    return;
                }
            }

            // Use the ref to get the most current preview highlights
            const currentPreviewHighlights = previewHighlightsRef.current;

            // Finalize selection
            setSelectedSpans(currentPreviewHighlights);

            if (currentPreviewHighlights.length > 0) {
                console.log(`[TextSelectionHighlighter] Creating ${currentPreviewHighlights.length} highlights`);

                // Extract selected text with character-level precision
                const selectedText = currentPreviewHighlights
                    .map(({span, startOffset, endOffset}) =>
                        span.text.substring(startOffset, endOffset)
                    )
                    .join('')
                    .trim();

                console.log(`[TextSelectionHighlighter] Selected text: "${selectedText}"`);

                // Create highlights for each selected span with character-level precision
                const promises = currentPreviewHighlights.map(({span, startX, endX, startOffset, endOffset}, index) => {
                    const zoomFactor = viewportRef.current.scale || 1;

                    // Apply the same padding and offset corrections as preview highlights
                    const paddingHorizontal = 1;
                    const paddingVertical = 2;
                    const offsetX = -2;
                    const offsetY = -2;

                    const adjustedStartX = startX - paddingHorizontal + offsetX;
                    const adjustedTop = span.top - paddingVertical + offsetY;
                    const adjustedWidth = endX - startX + (paddingHorizontal * 2);
                    const adjustedHeight = span.bottom - span.top + (paddingVertical * 2);

                    const unzoomedX = adjustedStartX / zoomFactor;
                    const unzoomedY = adjustedTop / zoomFactor;
                    const unzoomedW = adjustedWidth / zoomFactor;
                    const unzoomedH = adjustedHeight / zoomFactor;

                    const selectedSpanText = span.text.substring(startOffset, endOffset);

                    console.log(`[TextSelectionHighlighter] Creating highlight ${index + 1}: "${selectedSpanText}" at (${unzoomedX.toFixed(1)}, ${unzoomedY.toFixed(1)}) ${unzoomedW.toFixed(1)}x${unzoomedH.toFixed(1)}`);

                    return ManualHighlightProcessor.createRectangleHighlight(
                        fileKey || '_default',
                        pageNumber,
                        unzoomedX,
                        unzoomedY,
                        unzoomedX + unzoomedW,
                        unzoomedY + unzoomedH,
                        manualColorRef.current,
                        selectedSpanText,
                        HighlightCreationMode.TEXT_SELECTION
                    );
                });

                try {
                    const results = await Promise.all(promises);
                    console.log(`[TextSelectionHighlighter] Successfully created ${results.length} highlights`);
                } catch (error) {
                    console.error('[TextSelectionHighlighter] Error creating highlights:', error);
                }
            } else {
                console.log(`[TextSelectionHighlighter] No preview highlights to create`);
            }

            // Clear selection immediately after creating highlights (native-like behavior)
            setSelectionStart(null);
            setSelectionEnd(null);
            setSelectedSpans([]);
            setPreviewHighlights([]);
        };

        overlay.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        return () => {
            overlay.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            selectionOverlayRef.current = null;
        };
    }, [isActive, isEditingMode, pageNumber]);

    // Render preview highlights
    useEffect(() => {
        if (!selectionOverlayRef.current) return;

        // Clear existing preview highlights
        const existingHighlights = selectionOverlayRef.current.querySelectorAll('.preview-highlight');
        existingHighlights.forEach(highlight => highlight.remove());

        // Create preview highlights for each selected span with character-level precision
        previewHighlights.forEach(({span, startX, endX}, index) => {
            const highlightElement = document.createElement('div');
            highlightElement.className = 'preview-highlight';
            // Add padding and offset correction to better align with text
            const paddingHorizontal = 2;
            const paddingVertical = 1;
            const offsetX = -1; // Adjust left positioning
            const offsetY = -1; // Adjust top positioning
            const highlightColor = manualColorRef.current;

            highlightElement.style.cssText = `
                position: absolute;
                left: ${startX - paddingHorizontal + offsetX}px;
                top: ${span.top - paddingVertical + offsetY}px;
                width: ${endX - startX + (paddingHorizontal * 2)}px;
                height: ${span.bottom - span.top + (paddingVertical * 2)}px;
                background: ${highlightColor}40;
                pointer-events: none;
                z-index: 1001;
                border-radius: 2px;
                border: 1px solid ${highlightColor}60;
            `;

            selectionOverlayRef.current?.appendChild(highlightElement);
        });
    }, [previewHighlights]);

    // Update refs when state changes
    useEffect(() => {
        isSelectingRef.current = isSelecting;
    }, [isSelecting]);

    useEffect(() => {
        selectionStartRef.current = selectionStart;
    }, [selectionStart]);

    useEffect(() => {
        selectionEndRef.current = selectionEnd;
    }, [selectionEnd]);

    useEffect(() => {
        selectedSpansRef.current = selectedSpans;
    }, [selectedSpans]);

    useEffect(() => {
        textSpansRef.current = textSpans;
    }, [textSpans]);

    useEffect(() => {
        previewHighlightsRef.current = previewHighlights;
    }, [previewHighlights]);

    return null;
};

export default TextSelectionHighlighter;
