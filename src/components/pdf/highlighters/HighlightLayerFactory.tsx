// src/components/pdf/highlighters/HighlightLayerFactory.tsx
import React, { useMemo, useEffect } from 'react';
import { useHighlights } from '../../../hooks/useHighlights';
import EntityHighlightLayer from './EntityHighlightLayer';
import ManualHighlightLayer from './ManualHighlightLayer';
import SearchHighlightLayer from './SearchHighlightLayer';
import { useEditContext } from '../../../contexts/EditContext';
import { PDFPageViewport, TextContent } from '../../../types/pdfTypes';
import { HighlightType } from '../../../contexts/HighlightContext';

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
 * Optimized to reduce unnecessary renders and improve performance
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

    // Listen for file changes to trigger annotation updates
    useEffect(() => {
        if (fileKey) {
            // Force an annotation update when the file changes
            triggerAnnotationUpdate();
        }
    }, [fileKey, triggerAnnotationUpdate]);

    useEffect(() => {
        // List of all events we want to listen for
        const highlightEvents = [
            'force-refresh-highlights',
            'highlights-removed-from-page',
            'highlights-removed-by-text',
            'highlights-batch-removed',
            'highlight-removed',
            'highlight-all-same-text-complete',
            'search-highlights-applied',
            'entity-detection-complete'
        ];

        // Generic event handler for all highlight-related events
        const handleHighlightEvent = (event: Event) => {
            const customEvent = event as CustomEvent;
            const eventDetail = customEvent.detail || {};
            const eventFileKey = eventDetail.fileKey;
            const eventPage = eventDetail.page;

            // Debug logging
            console.log(`[HighlightLayerFactory] Received ${event.type} event:`,
                eventFileKey ? `fileKey: ${eventFileKey}` : '',
                eventPage ? `page: ${eventPage}` : '');

            // Decide whether to update based on fileKey and page
            const shouldUpdate =
                // If no fileKey was specified in the event, update all components
                !eventFileKey ||
                // Or if the event's fileKey matches this component's fileKey
                eventFileKey === fileKey ||
                // Or if either key is a substring of the other (for flexible matching)
                (fileKey && eventFileKey && (fileKey.includes(eventFileKey) || eventFileKey.includes(fileKey)));

            // Additional page-specific check
            const isForThisPage =
                // If no page specified in event, update all pages
                !eventPage ||
                // Or if event is specifically for this page
                eventPage === pageNumber;

            if (shouldUpdate && isForThisPage) {
                console.log(`[HighlightLayerFactory] Updating highlights for ${event.type} event on page ${pageNumber}${fileKey ? ` of file ${fileKey}` : ''}`);
                triggerAnnotationUpdate();
            }
        };

        // Register event listeners for all events
        highlightEvents.forEach(eventName => {
            window.addEventListener(eventName, handleHighlightEvent);
        });

        // Add individual highlight-removed handler for direct ID tracking
        const handleHighlightRemoved = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { id, page, fileKey: eventFileKey } = customEvent.detail || {};

            if (page === pageNumber && (!eventFileKey || eventFileKey === fileKey)) {
                console.log(`[HighlightLayerFactory] Highlight ${id} removed from page ${pageNumber}`);
                triggerAnnotationUpdate();
            }
        };

        window.addEventListener('highlight-removed', handleHighlightRemoved);

        // Clean up event listeners
        return () => {
            highlightEvents.forEach(eventName => {
                window.removeEventListener(eventName, handleHighlightEvent);
            });
            window.removeEventListener('highlight-removed', handleHighlightRemoved);
        };
    }, [fileKey, pageNumber, triggerAnnotationUpdate]);

    const renderSearchLayer = showSearchHighlights && searchHighlights.length > 0;
    const renderEntityLayer = showEntityHighlights && entityHighlights.length > 0;
    const renderManualLayer = showManualHighlights && manualHighlights.length > 0;

    // Only re-render if something actually changed
    return (
        <div
            className="highlight-layer-factory"
            style={containerStyle}
            data-page={pageNumber}
            data-file={fileKey ?? 'default'}
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
