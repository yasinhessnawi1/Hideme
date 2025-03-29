import React, {useState, useMemo, useCallback, useEffect} from 'react';
import { useHighlightContext, HighlightRect } from '../../../contexts/HighlightContext';
import { useEditContext } from '../../../contexts/EditContext';
import '../../../styles/modules/pdf/HighlightLayer.css';

interface BaseHighlightLayerProps {
    pageNumber: number;
    highlights: HighlightRect[];
    layerClass: string;
    fileKey?: string; // Optional file key for multi-file support
}

/**
 * Base component for all highlight layers
 * Optimized for better performance with memoization and reduced rerenders
 */
const BaseHighlightLayer: React.FC<BaseHighlightLayerProps> = ({
                                                                   pageNumber,
                                                                   highlights,
                                                                   layerClass,
                                                                   fileKey
                                                               }) => {
    const { selectedAnnotation, setSelectedAnnotation, removeAnnotation } = useHighlightContext();
    const { isEditingMode, getColorForModel } = useEditContext();

    const [hoveredAnnotation, setHoveredAnnotation] = useState<{
        annotation: HighlightRect;
        position: { x: number; y: number };
    } | null>(null);

    // Filter out highlights that don't belong to this file if fileKey is provided
    const filteredHighlights = useMemo(() => {
        // More strict filtering to ensure file isolation
        if (!fileKey) return highlights;

        // Enhanced filtering to prevent cross-contamination
        return highlights.filter(h => {
            // If highlight has no fileKey, check if it's for this page
            if (!h.fileKey) {
                return h.page === pageNumber;
            }
            // Otherwise, ensure it matches the current fileKey
            return h.fileKey === fileKey && h.page === pageNumber;
        });
    }, [highlights, fileKey, pageNumber]);

    // Log when filtered highlights change for debugging
    useEffect(() => {
        if (filteredHighlights.length > 0) {
            console.log(`[BaseHighlightLayer] ${layerClass} layer for page ${pageNumber}, file ${fileKey || 'default'}: ${filteredHighlights.length} highlights`);
        }
    }, [filteredHighlights.length, layerClass, pageNumber, fileKey]);

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
        }
    }, [isEditingMode, removeAnnotation, pageNumber, fileKey]);

    const handleHighlightMouseEnter = useCallback((e: React.MouseEvent, annotation: HighlightRect) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setHoveredAnnotation({
            annotation,
            position: {
                x: rect.left + rect.width / 2,
                y: rect.top,
            },
        });
    }, []);

    const handleHighlightMouseLeave = useCallback(() => {
        setHoveredAnnotation(null);
    }, []);

    // Get the appropriate color for an entity highlight - memoize to avoid recalculation
    const getHighlightColor = useCallback((highlight: HighlightRect): string => {
        // If the highlight has a model property and is an entity highlight
        if (highlight.type === 'ENTITY' && highlight.model) {
            return getColorForModel(highlight.model);
        }
        // Otherwise, use the color specified in the highlight
        return highlight.color;
    }, [getColorForModel]);

    useEffect(() => {
        // Cleanup function
        return () => {
            // Reset any hover state when component unmounts
            setHoveredAnnotation(null);
        };
    }, []);

    // Memoize highlight rendering to prevent unnecessary recalculations
    const renderedHighlights = useMemo(() => {
        if (filteredHighlights.length === 0) {
            return null;
        }

        return filteredHighlights.map((highlight) => (
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
                data-highlight-id={highlight.id}
                data-highlight-type={highlight.type}
                data-highlight-file={highlight.fileKey || 'default'}
                data-highlight-page={pageNumber}
            />
        ));
    }, [
        filteredHighlights,
        layerClass,
        selectedAnnotation,
        isEditingMode,
        getHighlightColor,
        pageNumber,
        handleHighlightClick,
        handleHighlightDoubleClick,
        handleHighlightMouseEnter,
        handleHighlightMouseLeave
    ]);

    return (
        <div
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
                        left: hoveredAnnotation.position.x,
                        top: hoveredAnnotation.position.y - 24,
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
        return highlight.type || 'Highlight';
    }
}

// Update the React.memo comparison function in BaseHighlightLayer.tsx
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

    // Deep compare highlight IDs if lengths match
    if (prevProps.highlights.length > 0) {
        // Create sets of IDs for efficient comparison
        const prevIds = new Set(prevProps.highlights.map(h => h.id));
        const nextIds = new Set(nextProps.highlights.map(h => h.id));

        // If the sets have different sizes, they're different
        if (prevIds.size !== nextIds.size) {
            return false;
        }

        // Check if all IDs in prevIds exist in nextIds
        for (const id of prevIds) {
            if (!nextIds.has(id)) {
                return false;
            }
        }
    }

    // Don't re-render if everything is the same
    return true;
});
