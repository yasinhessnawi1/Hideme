import React, { useState, useCallback } from 'react';
import { useEditContext } from '../../contexts/EditContext';
import { ManualHighlightProcessor } from '../../managers/ManualHighlightProcessor';
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
 * Component for handling manual highlight creation through mouse interactions
 * Updated to use the ManualHighlightProcessor
 */
const PageOverlay: React.FC<PageOverlayProps> = ({
                                                     pageNumber,
                                                     viewport,
                                                     isEditingMode,
                                                     pageSize,
                                                     fileKey
                                                 }) => {
    const { highlightColor } = useEditContext();

    // State for selection
    const [selectionStart, setSelectionStart] = useState<{x: number; y: number} | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<{x: number; y: number} | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);

    // Mousedown handling
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!isEditingMode) return;

        // Avoid capturing text selections
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            return;
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setSelectionStart({x, y});
        setSelectionEnd({x, y});
        setIsSelecting(true);

        // Prevent event propagation
        e.stopPropagation();
        e.preventDefault();
    }, [isEditingMode]);

    // Mouse move handling
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isSelecting || !selectionStart) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setSelectionEnd({x, y});
        e.preventDefault();
    }, [isSelecting, selectionStart]);

    // Mouse up handling
    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (!isSelecting || !selectionStart || !selectionEnd) {
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
                const safeFileKey = fileKey || '_default';

                // Create highlight using the processor
                ManualHighlightProcessor.createRectangleHighlight(
                    safeFileKey,
                    pageNumber,
                    startX,
                    startY,
                    endX,
                    endY,
                    highlightColor
                ).then(highlight => {
                    if (highlight) {
                        console.log(`[PageOverlay] Successfully created highlight with ID ${highlight.id}`);
                    }
                });
            } else {
                console.log('[PageOverlay] Selection too small, ignoring');
            }
        } catch (error) {
            console.error('[PageOverlay] Error creating highlight:', error);
        } finally {
            // Reset state
            setIsSelecting(false);
            setSelectionStart(null);
            setSelectionEnd(null);
        }
    }, [selectionStart, selectionEnd, pageNumber, fileKey, highlightColor]);

    // Mouse leave handling
    const handleMouseLeave = useCallback(() => {
        if (isSelecting && selectionStart && selectionEnd) {
            handleMouseUp({} as React.MouseEvent);
        }
        setIsSelecting(false);
    }, [handleMouseUp, isSelecting, selectionStart, selectionEnd]);

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
                willChange: 'transform',
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
