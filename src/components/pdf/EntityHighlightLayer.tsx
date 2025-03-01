import React, { useState, useRef, useEffect } from 'react';
import { useHighlightContext, HighlightType, HighlightRect } from '../../contexts/HighlightContext';
import { usePDFContext } from '../../contexts/PDFContext';

interface EntityHighlightLayerProps {
    pageNumber: number;
    debug?: boolean;
    pageSize?: {
        width: number;
        height: number;
        offsetX?: number;
        offsetY?: number;
    };
}

const EntityHighlightLayer: React.FC<EntityHighlightLayerProps> = ({
                                                                       pageNumber,
                                                                       debug = false,
                                                                       pageSize,
                                                                   }) => {
    const { annotations, selectedAnnotation, setSelectedAnnotation } = useHighlightContext();
    const { isEditingMode } = usePDFContext();
    const containerRef = useRef<HTMLDivElement>(null);

    // Only entity-type highlights
    const entityAnnotations = (annotations[pageNumber] || []).filter(
        ann => ann.type === HighlightType.ENTITY
    );

    const [hoveredAnnotation, setHoveredAnnotation] = useState<{
        annotation: HighlightRect;
        position: { x: number; y: number };
    } | null>(null);

    useEffect(() => {
        if (!containerRef.current || !pageSize) return;
        const container = containerRef.current;

        container.style.width = `${pageSize.width}px`;
        container.style.height = `${pageSize.height}px`;
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.zIndex = '10010';
        container.style.transformOrigin = 'top left';

        if (pageSize.offsetX || pageSize.offsetY) {
            container.style.transform = `translate(${pageSize.offsetX || 0}px, ${pageSize.offsetY || 0}px)`;
        }

        if (debug) {
            console.log(`[EntityHighlightLayer] Page ${pageNumber} dimensions applied:`, {
                width: pageSize.width,
                height: pageSize.height,
                offsetX: pageSize.offsetX,
                offsetY: pageSize.offsetY
            });
        }
    }, [pageNumber, pageSize, debug]);

    const handleHighlightClick = (e: React.MouseEvent, annotation: HighlightRect) => {
        e.stopPropagation();
        if (!isEditingMode) return;

        if (selectedAnnotation && selectedAnnotation.id === annotation.id) {
            setSelectedAnnotation(null);
        } else {
            setSelectedAnnotation(annotation);
        }
    };

    const handleHighlightMouseEnter = (e: React.MouseEvent, annotation: HighlightRect) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setHoveredAnnotation({
            annotation,
            position: {
                x: rect.left + rect.width / 2,
                y: rect.top,
            },
        });
    };

    const handleHighlightMouseLeave = () => {
        setHoveredAnnotation(null);
    };

    return (
        <div
            ref={containerRef}
            className="entity-highlight-layer"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: debug ? 'rgba(0,255,0,0.1)' : 'transparent',
                pointerEvents: 'none',
                overflow: 'hidden',
                boxSizing: 'border-box',
                border: debug ? '1px dotted green' : 'none',
            }}
        >
            {entityAnnotations.map((ann) => (
                <div
                    key={`entity-highlight-${ann.id}`}
                    className={`highlight-rect entity-highlight ${
                        selectedAnnotation?.id === ann.id ? 'selected' : ''
                    }`}
                    style={{
                        position: 'absolute',
                        left: ann.x,
                        top: ann.y,
                        width: ann.w,
                        height: ann.h,
                        backgroundColor: ann.color || '#ff7171',
                        color: '#ff7171',
                        opacity: ann.opacity ?? 0.4,
                        cursor: isEditingMode ? 'pointer' : 'default',
                        border: selectedAnnotation?.id === ann.id
                            ? '2px dashed #000'
                            : '1px solid rgba(0,0,0,0.1)',
                        pointerEvents: 'auto',
                        boxSizing: 'border-box',
                        zIndex: 20,
                    }}
                    onClick={(e) => handleHighlightClick(e, ann)}
                    onMouseEnter={(e) => handleHighlightMouseEnter(e, ann)}
                    onMouseLeave={handleHighlightMouseLeave}
                >

                </div>
            ))}

            {hoveredAnnotation && (
                <div
                    className="highlight-tooltip entity-tooltip"
                    style={{
                        position: 'fixed',
                        left: hoveredAnnotation.position.x,
                        top: hoveredAnnotation.position.y -30,
                        pointerEvents: 'none',
                        transform: 'translateX(-50%)',
                        zIndex: 99999,
                        background: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                    }}
                >
                    {`Entity: ${hoveredAnnotation.annotation.entity || 'Unknown'}`}
                </div>
            )}
        </div>
    );
};

export default EntityHighlightLayer;
