// src/components/pdf/highlighters/SearchHighlightLayer.tsx
import React from 'react';
import BaseHighlightLayer from './BaseHighlightLayer';
import { HighlightRect } from '../../../contexts/HighlightContext';

interface SearchHighlightLayerProps {
    pageNumber: number;
    highlights: HighlightRect[]; // Now we receive the highlights directly
    fileKey?: string; // Optional file key for multi-file support
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
