import React, {useEffect, useMemo} from 'react';
import { useHighlightStore } from '../../../hooks/general/useHighlightStore';
import { useEditContext } from '../../../contexts/EditContext';
import EntityHighlightLayer from './EntityHighlightLayer';
import ManualHighlightLayer from './ManualHighlightLayer';
import SearchHighlightLayer from './SearchHighlightLayer';
import { PDFPageViewport, TextContent, HighlightType, ViewportSize } from '../../../types/pdfTypes';

interface HighlightLayerFactoryProps {
    pageNumber: number;
    viewport: PDFPageViewport;
    textContent: TextContent;
    pageSize: ViewportSize;
    fileKey?: string; // Optional file key for multi-file support
    containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Factory component that creates and renders all types of highlight layers for a PDF page
 * Simplified to use the new highlight store
 */
const HighlightLayerFactory: React.FC<HighlightLayerFactoryProps> = ({
                                                                         pageNumber,
                                                                         pageSize,
                                                                         fileKey,
                                                                         containerRef
                                                                     }) => {
    const {
        showSearchHighlights,
        showEntityHighlights,
        showManualHighlights
    } = useEditContext();

    // Get highlights from the store
    const { getHighlightsForPage, refreshTrigger } = useHighlightStore();

    // Safe file key
    const safeFileKey = fileKey || '_default';
    // debug

    // Get all highlights for this page
    const allHighlights = useMemo(() =>
            getHighlightsForPage(safeFileKey, pageNumber),
        [safeFileKey, pageNumber, getHighlightsForPage, refreshTrigger]
    );

    // Memoize the container style
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

    // Filter highlights by type
    const searchHighlights = useMemo(() =>
            allHighlights.filter(h => h.type === HighlightType.SEARCH),
        [allHighlights]
    );

    const entityHighlights = useMemo(() =>
            allHighlights.filter(h => h.type === HighlightType.ENTITY),
        [allHighlights]
    );

    const manualHighlights = useMemo(() =>
            allHighlights.filter(h => h.type === HighlightType.MANUAL),
        [allHighlights]
    );

    // Determine which layers to render
    const renderSearchLayer = showSearchHighlights && searchHighlights.length > 0;
    const renderEntityLayer = showEntityHighlights && entityHighlights.length > 0;
    const renderManualLayer = showManualHighlights && manualHighlights.length > 0;

    return (
        <div
            className="highlight-layer-factory"
            style={containerStyle}
            data-page={pageNumber}
            data-file={safeFileKey}
            data-search-count={searchHighlights.length}
            data-entity-count={entityHighlights.length}
            data-manual-count={manualHighlights.length}
            ref={containerRef}
        >
            {/* Only show layer if there are highlights and visibility is enabled */}
            {renderSearchLayer && (
                <SearchHighlightLayer
                    pageNumber={pageNumber}
                    highlights={searchHighlights}
                    fileKey={safeFileKey}
                    containerRef={containerRef}
                />
            )}

            {renderEntityLayer && (
                <EntityHighlightLayer
                    pageNumber={pageNumber}
                    highlights={entityHighlights}
                    fileKey={safeFileKey}
                    containerRef={containerRef}
                />
            )}

            {renderManualLayer && (
                <ManualHighlightLayer
                    pageNumber={pageNumber}
                    highlights={manualHighlights}
                    fileKey={safeFileKey}
                    containerRef={containerRef}
                />
            )}
        </div>
    );
};

// Only re-render when essential props change
const arePropsEqual = (prevProps: HighlightLayerFactoryProps, nextProps: HighlightLayerFactoryProps) => {
    // Always re-render if fileKey changes
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
