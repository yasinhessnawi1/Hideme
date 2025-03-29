import React from 'react';
import BaseHighlightLayer from './BaseHighlightLayer';
import { HighlightRect } from '../../../contexts/HighlightContext';

interface ManualHighlightLayerProps {
    pageNumber: number;
    highlights: HighlightRect[];
    fileKey?: string; // Optional file key for multi-file support
}

const ManualHighlightLayer: React.FC<ManualHighlightLayerProps> = ({
                                                                       pageNumber,
                                                                       highlights,
                                                                       fileKey
                                                                   }) => {
    return (
        <BaseHighlightLayer
            pageNumber={pageNumber}
            highlights={highlights}
            layerClass="manual"
            fileKey={fileKey}
        />
    );
};

export default ManualHighlightLayer;
