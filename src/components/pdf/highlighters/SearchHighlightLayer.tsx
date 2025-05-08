// src/components/pdf/highlighters/SearchHighlightLayer.tsx
import React from 'react';
import BaseHighlightLayer from './BaseHighlightLayer';
import { HighlightRect } from '../../../types/pdfTypes';

interface SearchHighlightLayerProps {
    pageNumber: number;
    highlights: HighlightRect[];
    fileKey?: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

const SearchHighlightLayer: React.FC<SearchHighlightLayerProps> = ({
                                                                       pageNumber,
                                                                       highlights,
                                                                       fileKey,
                                                                       containerRef
                                                                   }) => {
    return (
        <BaseHighlightLayer
            pageNumber={pageNumber}
            highlights={highlights}
            layerClass="search"
            fileKey={fileKey}
            containerRef={containerRef}
        />
    );
};

export default SearchHighlightLayer;
