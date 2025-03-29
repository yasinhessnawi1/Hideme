import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useHighlightContext } from '../../contexts/HighlightContext';
import { useEditContext } from '../../contexts/EditContext';
import { ManualHighlightManager } from '../../utils/ManualHighlightManager';
import { PDFPageViewport } from '../../types/pdfTypes';

interface PageOverlayProps {
    pageNumber: number;
    viewport: PDFPageViewport;
    isEditingMode: boolean;
    pageSize: {
        cssWidth: number;
        cssHeight: number;
        offsetX: number;
        offsetY: number;
        scaleX: number;
        scaleY: number;
    };
    fileKey?: string; // Optional file key for multi-file support
}

/**
 * Component responsible for handling manual highlight creation
 * through mouse interaction on PDF pages
 */
const PageOverlay: React.FC<PageOverlayProps> = ({
                                                     pageNumber,
                                                     viewport,
                                                     isEditingMode,
                                                     pageSize,
                                                     fileKey
                                                 }) => {
    const { getNextHighlightId, addAnnotation } = useHighlightContext();
    const { highlightColor } = useEditContext();

    const [selectionStart, setSelectionStart] = useState<{x: number; y: number} | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<{x: number; y: number} | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);

    // Use refs to prevent duplicate handling and race conditions
    const isSelectingRef = useRef(false);
    const selectionStartTimeRef = useRef<number>(0);
    const lastCreatedHighlightRef = useRef<string | null>(null);

    // Create a new highlight manager each time to ensure it has the latest state
    const getHighlightManager = useCallback(() => {
        return new ManualHighlightManager(
            pageNumber,
            getNextHighlightId,
            addAnnotation,
            highlightColor,
            fileKey
        );
    }, [pageNumber, getNextHighlightId, addAnnotation, highlightColor, fileKey]);

    // Reset selection state when page or file changes
    useEffect(() => {
        setSelectionStart(null);
        setSelectionEnd(null);
        setIsSelecting(false);
        isSelectingRef.current = false;
        lastCreatedHighlightRef.current = null;
    }, [pageNumber, fileKey]);

    // Explicitly track mousedown state to prevent mouse capture issues
    const mouseIsDownRef = useRef(false);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!isEditingMode) return;

        // Mark that mouse is down - important for reliable tracking
        mouseIsDownRef.current = true;

        // Avoid capturing text selections
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            return;
        }

        // Prevent double-triggering
        if (isSelectingRef.current) return;
        isSelectingRef.current = true;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Record timestamp for debugging race conditions
        selectionStartTimeRef.current = Date.now();

        console.log(`[Highlight] Starting manual highlight at (${x}, ${y}) on page ${pageNumber}${fileKey ? ` for file ${fileKey}` : ''}`);

        setSelectionStart({x, y});
        setSelectionEnd({x, y});
        setIsSelecting(true);

        // Prevent event propagation that could interfere with highlighting
        e.stopPropagation();
        e.preventDefault();
    }, [isEditingMode, pageNumber, fileKey]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!mouseIsDownRef.current || !isSelectingRef.current || !selectionStart) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update selection end point
        setSelectionEnd({x, y});

        // Prevent default behavior during selection
        e.preventDefault();
    }, [selectionStart]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        // Reset mouse tracking state
        mouseIsDownRef.current = false;

        // Only process if we were selecting
        if (!isSelectingRef.current || !selectionStart || !selectionEnd) {
            isSelectingRef.current = false;
            setIsSelecting(false);
            return;
        }

        try {
            // Calculate the minimal dimensions
            const startX = Math.min(selectionStart.x, selectionEnd.x);
            const startY = Math.min(selectionStart.y, selectionEnd.y);
            const endX = Math.max(selectionStart.x, selectionEnd.x);
            const endY = Math.max(selectionStart.y, selectionEnd.y);

            // Check if dimensions are reasonable - lower threshold to allow smaller highlights
            const width = endX - startX;
            const height = endY - startY;

            if (width > 2 && height > 2) { // Changed from 3 to 2 for more flexibility
                console.log(`[Highlight] Creating manual highlight at (${startX}, ${startY}) with size ${width}x${height} for page ${pageNumber}${fileKey ? ` in file ${fileKey}` : ''}`);

                // Create a new manager instance each time to ensure fresh state
                const highlightManager = getHighlightManager();

                // Create the highlight using the manager
                const highlight = highlightManager.createRectangleHighlight(
                    startX, startY, endX, endY
                );

                if (highlight) {
                    console.log(`[Highlight] Successfully created highlight with ID ${highlight.id}`);
                    lastCreatedHighlightRef.current = highlight.id;
                }
            } else {
                console.log('[Highlight] Selection too small, ignoring');
            }
        } catch (error) {
            console.error('[Highlight] Error creating highlight:', error);
        } finally {
            // Always reset state
            setIsSelecting(false);
            setSelectionStart(null);
            setSelectionEnd(null);
            isSelectingRef.current = false;
        }
    }, [selectionStart, selectionEnd, pageNumber, fileKey, getHighlightManager]);

    // Handle mouse leaving the overlay
    const handleMouseLeave = useCallback(() => {
        // Only complete selection if mouse was down when leaving
        if (mouseIsDownRef.current && isSelectingRef.current && selectionStart && selectionEnd) {
            handleMouseUp({} as React.MouseEvent);
        }

        // Reset tracking states
        mouseIsDownRef.current = false;
        isSelectingRef.current = false;
        setIsSelecting(false);
    }, [handleMouseUp, selectionStart, selectionEnd]);

    return (
        <div
            className="page-overlay"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${pageSize.cssWidth}px`,
                height: `${pageSize.cssHeight}px`,
                transform: `translate(${pageSize.offsetX}px, ${pageSize.offsetY}px)`,
                pointerEvents: isEditingMode ? 'auto' : 'none',
                zIndex: 15,
                cursor: isEditingMode ? 'crosshair' : 'default',
                willChange: 'transform', /* Performance optimization */
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        >
            {isSelecting && selectionStart && selectionEnd && (
                <div
                    className="selection-overlay"
                    style={{
                        position: 'absolute',
                        left: Math.min(selectionStart.x, selectionEnd.x),
                        top: Math.min(selectionStart.y, selectionEnd.y),
                        width: Math.abs(selectionEnd.x - selectionStart.x),
                        height: Math.abs(selectionEnd.y - selectionStart.y),
                        backgroundColor: highlightColor,
                        opacity: 0.3,
                        zIndex: 20,
                    }}
                />
            )}
        </div>
    );
};

export default PageOverlay;
