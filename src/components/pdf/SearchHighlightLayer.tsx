import React, { useState, useEffect, useRef } from 'react';
import { useHighlightContext, HighlightType, HighlightRect } from '../../contexts/HighlightContext';
import { usePDFContext } from '../../contexts/PDFContext';
import '../../styles/pdf/HighlightLayer.css';

interface SearchHighlightLayerProps {
    pageNumber: number;
    debug?: boolean;
    pageSize?: {
        width: number;
        height: number;
        offsetX?: number;
        offsetY?: number;
    };
}

const SearchHighlightLayer: React.FC<SearchHighlightLayerProps> = ({
                                                                       pageNumber,
                                                                       debug = false,
                                                                       pageSize,
                                                                   }) => {
    const { annotations, selectedAnnotation, setSelectedAnnotation } = useHighlightContext();
    const { isEditingMode } = usePDFContext();
    const containerRef = useRef<HTMLDivElement>(null);

    // Get only SEARCH highlights on this page
    const searchAnnotations = (annotations[pageNumber] || []).filter(
        ann => ann.type === HighlightType.SEARCH
    );

    const [hoveredAnnotation, setHoveredAnnotation] = useState<{
        annotation: HighlightRect;
        position: { x: number; y: number };
    } | null>(null);

    // Position this layer exactly
    useEffect(() => {
        if (!containerRef.current || !pageSize) return;
        const container = containerRef.current;

        // Match the real page size (in CSS pixels), then translate
        container.style.width = `${pageSize.width}px`;
        container.style.height = `${pageSize.height}px`;
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.transformOrigin = 'top left';
        container.style.zIndex = '10000';
        container.style.overflow = 'hidden';
        container.style.pointerEvents = 'none';

        if (pageSize.offsetX !== undefined || pageSize.offsetY !== undefined) {
            container.style.transform = `translate(${pageSize.offsetX || 0}px, ${pageSize.offsetY || 0}px)`;
        }

        if (debug) {
            console.log(`[SearchHighlightLayer] Page ${pageNumber} positioned:`, {
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
            className="highlight-layer search-highlight-layer"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: debug ? 'rgba(0,225,255,0.1)' : 'transparent',
                pointerEvents: 'none',
                boxSizing: 'border-box',
                border: debug ? '1px dotted yellow' : 'none',
                transformOrigin: 'top left',
            }}
        >
            {searchAnnotations.map((ann) => (
                <div
                    key={`search-highlight-${ann.id}`}
                    className={`highlight-rect search-highlight ${selectedAnnotation?.id === ann.id ? 'selected' : ''}`}
                    style={{
                        position: 'absolute',
                        left: ann.x,
                        top: ann.y,
                        width: ann.w,
                        height: ann.h,
                        backgroundColor: ann.color || '#028dff',
                        opacity: ann.opacity ?? 0.4,
                        cursor: isEditingMode ? 'pointer' : 'default',
                        border: selectedAnnotation?.id === ann.id ? '2px dashed #000' : '1px solid rgba(0,0,0,0.2)',
                        pointerEvents: 'auto',
                        boxSizing: 'border-box',
                        zIndex: 10,
                    }}
                    onClick={(e) => handleHighlightClick(e, ann)}
                    onMouseEnter={(e) => handleHighlightMouseEnter(e, ann)}
                    onMouseLeave={handleHighlightMouseLeave}
                >
                    {debug && (
                        <div className="debug-info">
                            <small
                                style={{
                                    position: 'absolute',
                                    top: -40,
                                    left: 0,
                                    background: 'rgba(0,0,0,0.7)',
                                    color: 'white',
                                    padding: '2px',
                                    fontSize: '8px',
                                    pointerEvents: 'none',
                                    width: '60px',
                                }}
                            >
                                {`ID: ${ann.id}, X: ${Math.round(ann.x)}, Y: ${Math.round(ann.y)}, W: ${Math.round(ann.w)}, H: ${Math.round(ann.h)}`}
                            </small>
                        </div>
                    )}
                </div>
            ))}

            {hoveredAnnotation && (
                <div
                    className="highlight-tooltip search-tooltip"
                    style={{
                        position: 'absolute', // Changed from 'fixed' to 'absolute'
                        left: hoveredAnnotation.annotation.x + (hoveredAnnotation.annotation.w / 2),
                        top: hoveredAnnotation.annotation.y,
                        pointerEvents: 'none',
                        transform: 'translateX(-50%)',
                        zIndex: 99999,
                        background: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                    }}
                >
                    {hoveredAnnotation.annotation.text
                        ? `Search: "${hoveredAnnotation.annotation.text}"`
                        : 'Search match'}
                </div>

            )}
        </div>
    );
};

export default SearchHighlightLayer;
