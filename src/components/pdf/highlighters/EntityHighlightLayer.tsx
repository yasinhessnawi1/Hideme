import React from 'react';
import BaseHighlightLayer from './BaseHighlightLayer';
import { HighlightRect } from '../../../types/pdfTypes';

interface EntityHighlightLayerProps {
    pageNumber: number;
    highlights: HighlightRect[];
    fileKey?: string; // Optional file key for multi-file support
}

const EntityHighlightLayer: React.FC<EntityHighlightLayerProps> = ({
                                                                       pageNumber,
                                                                       highlights,
                                                                       fileKey
                                                                   }) => {
    return (
        <BaseHighlightLayer
            pageNumber={pageNumber}
            highlights={highlights}
            layerClass="entity"
            fileKey={fileKey}
        />
    );
};

export default EntityHighlightLayer;
