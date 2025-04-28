import React, { useState, useCallback } from 'react';
import { useEditContext } from '../../contexts/EditContext';
import { ManualHighlightProcessor } from '../../managers/ManualHighlightProcessor';
import { PDFPageViewport, HighlightCreationMode } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';

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
    highlightingMode: HighlightCreationMode; // Current highlighting mode
}

/**
 * Component for handling manual highlight creation through mouse interactions
 * Updated to use the ManualHighlightProcessor and support different highlighting modes
 */
const PageOverlay: React.FC<PageOverlayProps> = ({
                                                     pageNumber,
                                                     viewport,
                                                     isEditingMode,
                                                     pageSize,
                                                     fileKey,
                                                     highlightingMode
                                                 }) => {
    const { manualColor } = useEditContext();

    // State for selection
    const [selectionStart, setSelectionStart] = useState<{x: number; y: number} | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<{x: number; y: number} | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const { notify } = useNotification();
    // Only handle rectangular selection in this component
    const isRectangularMode = highlightingMode === HighlightCreationMode.RECTANGULAR;

    // Mousedown handling
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!isEditingMode || !isRectangularMode) return;

        // Avoid capturing text selections

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setSelectionStart({x, y});
        setSelectionEnd({x, y});
        setIsSelecting(true);

        // Prevent event propagation
        e.stopPropagation();
        e.preventDefault();
    }, [isEditingMode, isRectangularMode]);

    // Mouse move handling
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isSelecting || !selectionStart || !isRectangularMode) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setSelectionEnd({x, y});
        e.preventDefault();
    }, [isSelecting, selectionStart, isRectangularMode]);

    // Mouse up handling
    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (!isSelecting || !selectionStart || !selectionEnd || !isRectangularMode) {
            setIsSelecting(false);
            return;
        }

        try {
            // Calculate dimensions
            const startX = Math.min(selectionStart.x, selectionEnd.x);
            const startY = Math.min(selectionStart.y, selectionEnd.y);
            const endX = Math.max(selectionStart.x, selectionEnd.x);
            const endY = Math.max(selectionStart.y, selectionEnd.y);

            // Check if dimensions are reasonable
            const width = endX - startX;
            const height = endY - startY;

            if (width > 2 && height > 2) {
                const safeFileKey = fileKey ?? '_default';

                // Account for current zoom level
                const zoomFactor = viewport.scale ?? 1;

                // Convert coordinates to unzoomed values
                const unzoomedStartX = startX / zoomFactor;
                const unzoomedStartY = startY / zoomFactor;
                const unzoomedEndX = endX / zoomFactor;
                const unzoomedEndY = endY / zoomFactor;

                // Create highlight using the processor
                ManualHighlightProcessor.createRectangleHighlight(
                    safeFileKey,
                    pageNumber,
                    unzoomedStartX,
                    unzoomedStartY,
                    unzoomedEndX,
                    unzoomedEndY,
                    manualColor,
                    undefined,
                    HighlightCreationMode.RECTANGULAR,
                );
            } else {
                notify({
                    message: 'Selection too small, ignoring',
                    type: 'info',
                    duration: 3000
                });
            }
        } catch (error) {
            notify({
                message: `Error creating highlight: ${error}`,
                type: 'error',
                duration: 3000
            });
        } finally {
            // Reset state
            setIsSelecting(false);
            setSelectionStart(null);
            setSelectionEnd(null);
        }
    }, [selectionStart, selectionEnd, pageNumber, fileKey, manualColor, isRectangularMode, viewport.scale]);

    // Mouse leave handling
    const handleMouseLeave = useCallback(() => {
        if (isSelecting && selectionStart && selectionEnd) {
            handleMouseUp({} as React.MouseEvent);
        }
        setIsSelecting(false);
    }, [handleMouseUp, isSelecting, selectionStart, selectionEnd]);

    // Only show cursor style for rectangular mode
    const cursorStyle = isEditingMode && isRectangularMode ? 'crosshair' : 'default';

    // Only capture pointer events in rectangular mode
    const pointerEvents = isEditingMode && isRectangularMode ? 'auto' : 'none';

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
                pointerEvents: pointerEvents,
                zIndex: 15,
                cursor: cursorStyle,
                willChange: 'transform',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        >
            {isSelecting && selectionStart && selectionEnd && isRectangularMode && (
                <div
                    className="selection-overlay"
                    style={{
                        position: 'absolute',
                        left: Math.min(selectionStart.x, selectionEnd.x),
                        top: Math.min(selectionStart.y, selectionEnd.y),
                        width: Math.abs(selectionEnd.x - selectionStart.x),
                        height: Math.abs(selectionEnd.y - selectionStart.y),
                        backgroundColor: manualColor,
                        opacity: 0.3,
                        zIndex: 20,
                    }}
                />
            )}
        </div>
    );
};

export default PageOverlay;
