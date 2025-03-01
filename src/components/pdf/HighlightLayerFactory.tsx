import React, { useEffect, useRef } from 'react';
import SearchHighlightLayer from './SearchHighlightLayer';
import EntityHighlightLayer from './EntityHighlightLayer';
import ManualHighlightLayer from './ManualHighlightLayer';

interface HighlightLayerFactoryProps {
    pageNumber: number;
    showSearch: boolean;
    showEntity: boolean;
    showManual: boolean;
    debug?: boolean;
    pageSize?: {
        width: number;
        height: number;
        offsetX?: number;
        offsetY?: number;
    };
}

/**
 * A composite component that manages all three types of highlight layers
 * with proper positioning
 */
const HighlightLayerFactory: React.FC<HighlightLayerFactoryProps> = ({
                                                                         pageNumber,
                                                                         showSearch,
                                                                         showEntity,
                                                                         showManual,
                                                                         debug = false,
                                                                         pageSize,
                                                                     }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Ensure container size exactly matches the real page dimensions
    useEffect(() => {
        if (!containerRef.current || !pageSize) return;
        const container = containerRef.current;

        // Using the values from PDFViewer’s alignment
        container.style.width = `${pageSize.width}px`;
        container.style.height = `${pageSize.height}px`;
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.zIndex = '1000';

        if (pageSize.offsetX !== undefined || pageSize.offsetY !== undefined) {
            container.style.transform = `translate(${pageSize.offsetX || 0}px, ${pageSize.offsetY || 0}px)`;
        }

        container.style.transformOrigin = 'top left';

        if (debug) {
            console.log(`[HighlightLayerFactory] Page ${pageNumber} dimensions:`, {
                width: pageSize.width,
                height: pageSize.height,
                offsetX: pageSize.offsetX,
                offsetY: pageSize.offsetY
            });
        }
    }, [pageNumber, pageSize, debug]);

    return (
        <div
            ref={containerRef}
            className="highlight-layer-factory"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible',
                pointerEvents: 'none',
                backgroundColor: debug ? 'rgba(0, 0, 255, 0.1)' : 'transparent',
                border: debug ? '2px solid blue' : 'none',
                boxSizing: 'border-box',
                zIndex: 2000,
                transformOrigin: 'top left',
            }}
        >
            {showSearch && (
                <SearchHighlightLayer
                    pageNumber={pageNumber}
                    debug={debug}
                    pageSize={pageSize}
                />
            )}

            {showEntity && (
                <EntityHighlightLayer
                    pageNumber={pageNumber}
                    debug={debug}
                    pageSize={pageSize}
                />
            )}

            {showManual && (
                <ManualHighlightLayer
                    pageNumber={pageNumber}
                    debug={debug}
                    pageSize={pageSize}
                />
            )}
        </div>
    );
};

export default HighlightLayerFactory;
