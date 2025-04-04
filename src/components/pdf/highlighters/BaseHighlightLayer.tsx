import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useHighlightContext, HighlightRect } from '../../../contexts/HighlightContext';
import { useEditContext } from '../../../contexts/EditContext';
import HighlightContextMenu from './HighlightContextMenu';
import highlightManager from '../../../utils/HighlightManager';
import '../../../styles/modules/pdf/HighlightLayer.css';

interface BaseHighlightLayerProps {
    pageNumber: number;
    highlights: HighlightRect[];
    layerClass: string;
    fileKey?: string;
    viewport?: any;
}

/**
 * Base component for all highlight layers
 */
const BaseHighlightLayer: React.FC<BaseHighlightLayerProps> = ({
                                                                   pageNumber,
                                                                   highlights,
                                                                   layerClass,
                                                                   fileKey,
                                                                   viewport
                                                               }) => {
    const { selectedAnnotation, setSelectedAnnotation, removeAnnotation } = useHighlightContext();
    const { isEditingMode, getColorForModel, getSearchColor } = useEditContext();

    // Create ref for the container to use with viewport sizing
    const containerRef = useRef<HTMLDivElement>(null);

    // State for hover and context menu
    const [hoveredAnnotation, setHoveredAnnotation] = useState<{
        annotation: HighlightRect;
        position: { x: number; y: number };
    } | null>(null);

    // New state for context menu
    const [contextMenuState, setContextMenuState] = useState<{
        annotation: HighlightRect;
        position: { x: number; y: number };
    } | null>(null);

    // Filter out highlights that don't belong to this file if fileKey is provided
    const filteredHighlights = useMemo(() => {
        // More strict filtering to ensure file isolation
        if (!fileKey) return highlights;

        return highlights.filter(h => {
            // If highlight has no fileKey, check if it's for this page
            if (!h.fileKey) {
                return h.page === pageNumber;
            }
            // Otherwise, ensure it matches the current fileKey
            return h.fileKey === fileKey && h.page === pageNumber;
        });
    }, [highlights, fileKey, pageNumber]);


    // Memoize the event handlers to prevent recreating them on every render
    const handleHighlightClick = useCallback((e: React.MouseEvent, annotation: HighlightRect) => {
        e.stopPropagation();
        if (!isEditingMode) return;

        if (selectedAnnotation && selectedAnnotation.id === annotation.id) {
            setSelectedAnnotation(null);
        } else {
            setSelectedAnnotation(annotation);
        }
    }, [isEditingMode, selectedAnnotation, setSelectedAnnotation]);

    const handleHighlightDoubleClick = useCallback((e: React.MouseEvent, annotation: HighlightRect) => {
        e.stopPropagation();
        if (!isEditingMode) return;

        if (window.confirm('Remove this highlight?')) {
            removeAnnotation(pageNumber, annotation.id, fileKey);
            highlightManager.removeHighlightData(annotation.id);
        }
    }, [isEditingMode, removeAnnotation, pageNumber, fileKey]);

    const handleHighlightMouseEnter = useCallback((e: React.MouseEvent, annotation: HighlightRect) => {
        // Get the highlight element's rectangle to position the tooltip correctly
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

        // Position the tooltip above the highlight's center point
        setHoveredAnnotation({
            annotation,
            position: {
                x: rect.left + (rect.width / 2),
                y: rect.top
            },
        });
    }, []);

    const handleHighlightMouseLeave = useCallback(() => {
        setHoveredAnnotation(null);
    }, []);

    // New handler for right-click / context menu
    const handleContextMenu = useCallback((e: React.MouseEvent, annotation: HighlightRect) => {
        e.preventDefault();
        e.stopPropagation();

        // Store annotation and position where the context menu should appear
        // Use the exact click coordinates for the context menu
        setContextMenuState({
            annotation,
            position: { x: e.clientX, y: e.clientY },
        });
    }, []);

    // Close context menu
    const closeContextMenu = useCallback(() => {
        setContextMenuState(null);
    }, []);

    // Get the appropriate color for an entity highlight - memoize to avoid recalculation
    const getHighlightColor = useCallback((highlight: HighlightRect): string => {
        if (highlight.type === 'ENTITY' && highlight.model) {
            return getColorForModel(highlight.model);
        } else if (highlight.type === 'SEARCH'){
            return getSearchColor();
        }
        return highlight.color;
    }, [getColorForModel, getSearchColor]);

    useEffect(() => {
        // Cleanup function
        return () => {
            // Reset any hover state when component unmounts
            setHoveredAnnotation(null);
            setContextMenuState(null);
        };
    }, []);



    // Memoize highlight rendering to prevent unnecessary recalculations
    const renderedHighlights = useMemo(() => {
        if (filteredHighlights.length === 0) {
            return null;
        }

        return filteredHighlights.map((highlight) => {
            // Store each highlight in the highlightManager for persistence
            highlightManager.storeHighlightData({
                ...highlight,
                timestamp: highlight.timestamp ?? Date.now()
            });

            return (
                <div
                    key={`highlight-${highlight.id}`}
                    className={`highlight-rect ${layerClass}-highlight ${
                        selectedAnnotation?.id === highlight.id ? 'selected' : ''
                    }`}
                    style={{
                        position: 'absolute',
                        left: highlight.x,
                        top: highlight.y,
                        width: highlight.w,
                        height: highlight.h,
                        backgroundColor: getHighlightColor(highlight),
                        opacity: highlight.opacity ?? 0.4,
                        cursor: isEditingMode ? 'pointer' : 'default',
                        border: selectedAnnotation?.id === highlight.id ? '2px dashed #000' : '1px solid rgba(0,0,0,0.2)',
                        pointerEvents: 'auto',
                        boxSizing: 'border-box',
                        borderRadius: '3px',
                    }}
                    onClick={(e) => handleHighlightClick(e, highlight)}
                    onDoubleClick={(e) => handleHighlightDoubleClick(e, highlight)}
                    onMouseEnter={(e) => handleHighlightMouseEnter(e, highlight)}
                    onMouseLeave={handleHighlightMouseLeave}
                    onContextMenu={(e) => handleContextMenu(e, highlight)}
                    data-highlight-id={highlight.id}
                    data-highlight-type={highlight.type}
                    data-highlight-file={highlight.fileKey || 'default'}
                    data-highlight-page={pageNumber}
                />
            );
        });
    }, [filteredHighlights, layerClass, isEditingMode, getHighlightColor, pageNumber, handleHighlightClick, handleHighlightDoubleClick, handleHighlightMouseEnter, handleHighlightMouseLeave, handleContextMenu, selectedAnnotation?.id]);

    return (
        <div
            ref={containerRef}
            className={`highlight-layer ${layerClass}`}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                backgroundColor: 'transparent',
                border: 'none',
            }}
            data-highlight-layer={layerClass}
            data-page={pageNumber}
            data-file={fileKey || 'default'}
            data-count={filteredHighlights.length}
        >
            {renderedHighlights}

            {hoveredAnnotation && (
                <div
                    className="highlight-tooltip"
                    style={{
                        position: 'fixed',
                        left: hoveredAnnotation.annotation.x,
                        top: hoveredAnnotation.annotation.y - 24,
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 1000,
                    }}
                >
                    {getTooltipContent(hoveredAnnotation.annotation)}
                </div>
            )}

            {contextMenuState && (
                <HighlightContextMenu
                    highlight={contextMenuState.annotation}
                    onClose={closeContextMenu}
                    wrapperRef={containerRef}
                    viewport={viewport}
                    zoomLevel={1.0} // You might want to pass the actual zoom level here
                />
            )}
        </div>
    );
};

// Helper function to get the tooltip content based on the highlight type
function getTooltipContent(highlight: HighlightRect): string {
    if (highlight.type === 'ENTITY' && highlight.entity) {
        const model = highlight.model ? ` (${highlight.model})` : '';
        return `Entity: ${highlight.entity}${model}`;
    } else if (highlight.type === 'SEARCH' && highlight.text) {
        return `Search: "${highlight.text}"`;
    } else if (highlight.text) {
        return highlight.text;
    } else {
        return highlight.type ?? 'Highlight';
    }
}

export default React.memo(BaseHighlightLayer, (prevProps, nextProps) => {
    // Always re-render if the file key changes
    if (prevProps.fileKey !== nextProps.fileKey) {
        return false;
    }

    // Always re-render if the page number changes
    if (prevProps.pageNumber !== nextProps.pageNumber) {
        return false;
    }

    // Re-render if the layer class changes
    if (prevProps.layerClass !== nextProps.layerClass) {
        return false;
    }

    // Re-render if the highlight count changes
    if (prevProps.highlights.length !== nextProps.highlights.length) {
        return false;
    }

    // We need a more thorough comparison for search highlights
    // since they might change even when count stays the same
    if (prevProps.layerClass === 'search' && prevProps.highlights.length > 0) {
        // Create sets of IDs for comparison
        const prevIds = new Set(prevProps.highlights.map(h => h.id));
        const nextIds = new Set(nextProps.highlights.map(h => h.id));

        // If any ID is different, we need to re-render
        if (prevIds.size !== nextIds.size) {
            return false;
        }

        // Check if all IDs in prevIds exist in nextIds
        for (const id of prevIds) {
            if (!nextIds.has(id)) {
                return false;
            }
        }

        // Check if all IDs in nextIds exist in prevIds
        for (const id of nextIds) {
            if (!prevIds.has(id)) {
                return false;
            }
        }
    }

    // Don't re-render if everything is the same
    return true;
});
