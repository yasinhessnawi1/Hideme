// The issue is in how we adjust the position based on zoom level
// Let's update the renderedHighlights calculation in BaseHighlightLayer.tsx

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useHighlightStore} from '../../../hooks/useHighlightStore';
import {useEditContext} from '../../../contexts/EditContext';
import {usePDFViewerContext} from '../../../contexts/PDFViewerContext';
import HighlightContextMenu from './HighlightContextMenu';
import '../../../styles/modules/pdf/HighlightLayer.css';
import {HighlightRect, HighlightType} from '../../../types/pdfTypes';
import { getEntityTranslationKeyAndModel } from '../../../utils/EntityUtils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { TranslationKey, NestedTranslationKey } from '../../../utils/i18n/translations';

interface BaseHighlightLayerProps {
    pageNumber: number;
    highlights: HighlightRect[];
    layerClass: string;
    fileKey?: string;
    viewport?: any;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Base component for all highlight layers, simplified to use highlight store
 */
const BaseHighlightLayer: React.FC<BaseHighlightLayerProps> = ({
                                                                   pageNumber,
                                                                   highlights,
                                                                   layerClass,
                                                                   fileKey,
                                                                   viewport,
                                                                   containerRef
                                                               }) => {
    const { removeHighlight } = useHighlightStore();
    const { isEditingMode, getColorForModel, getSearchColor, selectedHighlightId, setSelectedHighlightId, selectedHighlightIds, setSelectedHighlightIds } = useEditContext();
    const { zoomLevel } = usePDFViewerContext();
    const { t } = useLanguage();
    // State for selections and context menu
    const [hoveredAnnotation, setHoveredAnnotation] = useState<{
        annotation: HighlightRect;
        position: { x: number; y: number };
    } | null>(null);
    const [contextMenuState, setContextMenuState] = useState<{
        annotation: HighlightRect;
        position: { x: number; y: number };
    } | null>(null);

    // Get the appropriate color for a highlight
    const getHighlightColor = useCallback((highlight: HighlightRect): string => {
        if (highlight.type === 'ENTITY' && highlight.model) {
            return getColorForModel(highlight.model);
        } else if (highlight.type === 'SEARCH'){
            return getSearchColor();
        }
        return highlight.color as string;
    }, [getColorForModel, getSearchColor]);

    // Handle click on highlight
    const handleHighlightClick = useCallback((e: React.MouseEvent, highlight: HighlightRect) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Always allow selection, even if not in editing mode
        // This ensures search results can be selected
        setSelectedHighlightId(highlight.id);
        setSelectedHighlightIds([highlight.id]);

        // Dispatch a custom event to notify other components
        window.dispatchEvent(new CustomEvent('highlight-selected', {
            detail: {
                id: highlight.id,
                type: highlight.type,
                fileKey: highlight.fileKey,
                page: highlight.page
            }
        }));
    }, [setSelectedHighlightId, setSelectedHighlightIds]);

    // Handle double-click to delete
    const handleHighlightDoubleClick = useCallback((e: React.MouseEvent, highlight: HighlightRect) => {
        e.stopPropagation();
        removeHighlight(highlight.id);
    }, [isEditingMode, removeHighlight]);

    useEffect(() => {
        // Clear any stuck tooltips when highlights change
        setHoveredAnnotation(null);
        setContextMenuState(null);
    }, [highlights]);

// Add highlight removal event listener to ensure tooltips are cleared globally
    useEffect(() => {
        const handleHighlightRemoved = () => {
            // Clear tooltip and context menu when any highlight is removed
            setHoveredAnnotation(null);
            setContextMenuState(null);
        };

        window.addEventListener('highlight-removed', handleHighlightRemoved);

        return () => {
            window.removeEventListener('highlight-removed', handleHighlightRemoved);
        };
    }, []);
    
    // Handle mouse enter for hover tooltip
    const handleHighlightMouseEnter = useCallback((e: React.MouseEvent, highlight: HighlightRect) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

        setHoveredAnnotation({
            annotation: highlight,
            position: {
                x: rect.left + (rect.width / 2),
                y: rect.top
            },
        });
    }, []);

    // Handle mouse leave
    const handleHighlightMouseLeave = useCallback(() => {
        setHoveredAnnotation(null);
    }, []);

    // Handle right-click for context menu
    const handleContextMenu = useCallback((e: React.MouseEvent, highlight: HighlightRect) => {
        e.preventDefault();
        e.stopPropagation();

        setContextMenuState({
            annotation: highlight,
            position: { x: e.clientX, y: e.clientY },
        });
    }, []);

    // Close context menu
    const closeContextMenu = useCallback(() => {
        setContextMenuState(null);
    }, []);

    // Render highlights with proper zoom handling
    const renderedHighlights = useMemo(() => {
        if (highlights.length === 0) {
            return null;
        }

        return highlights.map((highlight) => {
            // For existing highlights that don't have originalX/Y/W/H properties,
            // use the current values as the original values
            if (highlight.originalX === undefined) {
                highlight.originalX = highlight.x;
            }
            if (highlight.originalY === undefined) {
                highlight.originalY = highlight.y;
            }
            if (highlight.originalW === undefined) {
                highlight.originalW = highlight.w;
            }
            if (highlight.originalH === undefined) {
                highlight.originalH = highlight.h;
            }

            // Calculate the scaled position and size based on zoom level
            const scaledX = (highlight.originalX || highlight.x) * zoomLevel;
            const scaledY = (highlight.originalY || highlight.y) * zoomLevel;
            const scaledW = (highlight.originalW || highlight.w) * zoomLevel;
            const scaledH = (highlight.originalH || highlight.h) * zoomLevel;

            return (
                <div
                    key={`highlight-${highlight.id}`}
                    className={`highlight-rect ${layerClass}-highlight ${
                        selectedHighlightId === highlight.id || selectedHighlightIds?.includes(highlight.id) ? 'selected' : ''
                    }`}
                    style={{
                        position: 'absolute',
                        left: scaledX,
                        top: scaledY,
                        width: scaledW,
                        height: scaledH,
                        backgroundColor: getHighlightColor(highlight),
                        opacity: highlight.opacity ?? 0.4,
                        cursor: isEditingMode ? 'pointer' : 'default',
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
    }, [
        highlights,
        layerClass,
        zoomLevel,
        selectedHighlightId,
        isEditingMode,
        getHighlightColor,
        handleHighlightClick,
        handleHighlightDoubleClick,
        handleHighlightMouseEnter,
        handleHighlightMouseLeave,
        handleContextMenu,
        pageNumber,
        selectedHighlightIds
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
                zIndex: 1000,
            }}
            data-highlight-layer={layerClass}
            data-page={pageNumber}
            data-file={fileKey || 'default'}
            data-count={highlights.length}
        >
            {renderedHighlights}

            {hoveredAnnotation && (
                <div
                    className="highlight-tooltip"
                    style={{
                        position: 'fixed',
                        left: (hoveredAnnotation.annotation.originalX ? hoveredAnnotation.annotation.originalX * zoomLevel : hoveredAnnotation.annotation.x * zoomLevel) + 20,
                        top: (hoveredAnnotation.annotation.originalY ? hoveredAnnotation.annotation.originalY * zoomLevel : hoveredAnnotation.annotation.y * zoomLevel) - 5,
                        backgroundColor: 'rgba(0, 0, 0, 1)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 1000,
                    }}
                >
                    {getTooltipContent(hoveredAnnotation.annotation, t)}
                </div>
            )}

            {contextMenuState && (
                <HighlightContextMenu
                    highlight={contextMenuState.annotation}
                    onClose={closeContextMenu}
                    viewport={viewport}
                    zoomLevel={zoomLevel}
                    containerRef={containerRef}
                />
            )}
        </div>
    );
};

// Helper function for tooltip content
function getTooltipContent(
  highlight: HighlightRect,
  t: <T extends TranslationKey, K extends NestedTranslationKey<T>>(
    category: T,
    key: K,
    params?: Record<string, string | number>
  ) => string
): string {
    if (highlight.type === 'ENTITY' && highlight.entity) {
        const { key } = getEntityTranslationKeyAndModel(highlight.entity);
        const translated = key ? t('entityDetection', key as NestedTranslationKey<'entityDetection'>) : highlight.entity;
        const model = highlight.model ? ` (${highlight.model})` : '';
        // Translate 'Entity'
        const entityLabel = t('entityDetection', 'entity' as NestedTranslationKey<'entityDetection'>) || 'Entity';
        return `${entityLabel}: ${translated}${model}`;
    } else if (highlight.type === 'SEARCH' && highlight.text) {
        // Translate 'Search'
        const searchLabel = t('entityDetection', 'search' as NestedTranslationKey<'entityDetection'>) || 'Search';
        return `${searchLabel}: "${highlight.text}"`;
    } else if (highlight.text && highlight.type === HighlightType.MANUAL) {
        // Translate 'Highlight'
        const highlightLabel = t('entityDetection', 'highlight' as NestedTranslationKey<'entityDetection'>) || 'Highlight';
        return `${highlightLabel}: ${highlight.text}`;
    } else {
        // Translate 'Highlight'
        const highlightLabel = t('entityDetection', 'highlight' as NestedTranslationKey<'entityDetection'>) || 'Highlight';
        return highlight.type ? highlightLabel : 'Highlight';
    }
}

export default React.memo(BaseHighlightLayer);
