// src/components/pdf/highlighters/SearchHighlightLayer.tsx
import React from 'react';
import BaseHighlightLayer from './BaseHighlightLayer';
import { HighlightRect } from '../../../types/pdfTypes';

interface SearchHighlightLayerProps {
    pageNumber: number;
    highlights: HighlightRect[];
    fileKey?: string;
}

const SearchHighlightLayer: React.FC<SearchHighlightLayerProps> = ({
                                                                       pageNumber,
                                                                       highlights,
                                                                       fileKey
                                                                   }) => {
    return (
        <BaseHighlightLayer
            pageNumber={pageNumber}
            highlights={highlights}
            layerClass="search"
            fileKey={fileKey}
        />
    );
};

export default SearchHighlightLayer;
