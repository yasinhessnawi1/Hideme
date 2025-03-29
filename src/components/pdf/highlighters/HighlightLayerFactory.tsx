// src/components/pdf/highlighters/HighlightLayerFactory.tsx
import React, { useMemo, useEffect } from 'react';
import { useHighlights } from '../../../hooks/useHighlights';
import EntityHighlightLayer from './EntityHighlightLayer';
import ManualHighlightLayer from './ManualHighlightLayer';
import SearchHighlightLayer from './SearchHighlightLayer';
import { useEditContext } from '../../../contexts/EditContext';
import { PDFPageViewport, TextContent } from '../../../types/pdfTypes';
import { HighlightType, useHighlightContext } from '../../../contexts/HighlightContext';

interface HighlightLayerFactoryProps {
    pageNumber: number;
    viewport: PDFPageViewport;
    textContent: TextContent;
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
 * Factory component that creates and renders all types of highlight layers for a PDF page
 * Optimized to reduce unnecessary rerenders and improve performance
 * Updated to work with the new highlight context structure
 */
const HighlightLayerFactory: React.FC<HighlightLayerFactoryProps> = ({
                                                                         pageNumber,
                                                                         viewport,
                                                                         textContent,
                                                                         pageSize,
                                                                         fileKey
                                                                     }) => {
    const {
        showSearchHighlights,
        showEntityHighlights,
        showManualHighlights
    } = useEditContext();

    const { getAnnotations } = useHighlightContext();

    // Get all highlights through the useHighlights hook - optimized with efficient caching
    const { annotations, triggerAnnotationUpdate } = useHighlights({
        pageNumber,
        viewport,
        textContent,
        fileKey
    });

    // Memoize the container style to prevent unnecessary re-renders
    const containerStyle = useMemo(() => ({
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: `${pageSize.cssWidth}px`,
        height: `${pageSize.cssHeight}px`,
        transform: `translate(${pageSize.offsetX}px, ${pageSize.offsetY}px)`,
        pointerEvents: 'none' as const,
        overflow: 'visible' as const,
        zIndex: 10,
        transformOrigin: 'top left',
    }), [pageSize.cssWidth, pageSize.cssHeight, pageSize.offsetX, pageSize.offsetY]);

    // Filter annotations by type with strict file key filtering
    const searchHighlights = useMemo(() => {
        return annotations.filter(h =>
            h.type === HighlightType.SEARCH &&
            (!h.fileKey || h.fileKey === fileKey)
        );
    }, [annotations, fileKey]);

    const entityHighlights = useMemo(() => {
        return annotations.filter(h =>
            h.type === HighlightType.ENTITY &&
            (!h.fileKey || h.fileKey === fileKey)
        );
    }, [annotations, fileKey]);

    const manualHighlights = useMemo(() => {
        return annotations.filter(h =>
            h.type === HighlightType.MANUAL &&
            (!h.fileKey || h.fileKey === fileKey)
        );
    }, [annotations, fileKey]);

    // Logging for debugging highlight issues
    const highlightCounts = useMemo(() => ({
        search: searchHighlights.length,
        entity: entityHighlights.length,
        manual: manualHighlights.length
    }), [
        searchHighlights.length,
        entityHighlights.length,
        manualHighlights.length
    ]);

    // Log only when highlight counts change
    useEffect(() => {
        if (highlightCounts.entity > 0 || highlightCounts.manual > 0 || highlightCounts.search > 0) {
            console.log(`[HighlightLayer] Page ${pageNumber}${fileKey ? ` in file ${fileKey}` : ''} has ${highlightCounts.search} search, ${highlightCounts.entity} entity, and ${highlightCounts.manual} manual highlights`);
        }
    }, [highlightCounts, pageNumber, fileKey]);

    // Listen for file changes to trigger annotation updates
    useEffect(() => {
        if (fileKey) {
            // Force an annotation update when the file changes
            triggerAnnotationUpdate();
        }
    }, [fileKey, triggerAnnotationUpdate]);

    // Optimize by conditionally rendering only necessary highlight layers
    const renderSearchLayer = showSearchHighlights && searchHighlights.length > 0;
    const renderEntityLayer = showEntityHighlights && entityHighlights.length > 0;
    const renderManualLayer = showManualHighlights && manualHighlights.length > 0;

    // Only re-render if something actually changed
    return (
        <div
            className="highlight-layer-factory"
            style={containerStyle}
            data-page={pageNumber}
            data-file={fileKey || 'default'}
            data-search-count={searchHighlights.length}
            data-entity-count={entityHighlights.length}
            data-manual-count={manualHighlights.length}
        >
            {/* Only show layer if there are highlights and visibility is enabled */}
            {renderSearchLayer && (
                <SearchHighlightLayer
                    pageNumber={pageNumber}
                    highlights={searchHighlights}
                    fileKey={fileKey}
                />
            )}

            {renderEntityLayer && (
                <EntityHighlightLayer
                    pageNumber={pageNumber}
                    highlights={entityHighlights}
                    fileKey={fileKey}
                />
            )}

            {renderManualLayer && (
                <ManualHighlightLayer
                    pageNumber={pageNumber}
                    highlights={manualHighlights}
                    fileKey={fileKey}
                />
            )}
        </div>
    );
};

// Enhanced memo comparison function to prevent unnecessary re-renders
// Only re-render when essential props change
const arePropsEqual = (prevProps: HighlightLayerFactoryProps, nextProps: HighlightLayerFactoryProps) => {
    // Always re-render if fileKey changes to ensure proper file-specific rendering
    if (prevProps.fileKey !== nextProps.fileKey) {
        return false;
    }

    // Re-render if page number changes
    if (prevProps.pageNumber !== nextProps.pageNumber) {
        return false;
    }

    // Re-render if page size/position changes
    if (
        prevProps.pageSize.cssWidth !== nextProps.pageSize.cssWidth ||
        prevProps.pageSize.cssHeight !== nextProps.pageSize.cssHeight ||
        prevProps.pageSize.offsetX !== nextProps.pageSize.offsetX ||
        prevProps.pageSize.offsetY !== nextProps.pageSize.offsetY
    ) {
        return false;
    }

    // Re-render if viewport changes
    if (prevProps.viewport !== nextProps.viewport) {
        return false;
    }

    // Consider props equal otherwise (will not re-render)
    return true;
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(HighlightLayerFactory, arePropsEqual);
