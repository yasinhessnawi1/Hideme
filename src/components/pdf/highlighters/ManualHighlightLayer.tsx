import React from 'react';
import BaseHighlightLayer from './BaseHighlightLayer';
import { HighlightRect } from '../../../types/pdfTypes';

interface ManualHighlightLayerProps {
    pageNumber: number;
    highlights: HighlightRect[];
    fileKey?: string; // Optional file key for multi-file support
    containerRef: React.RefObject<HTMLDivElement | null>;
}

const ManualHighlightLayer: React.FC<ManualHighlightLayerProps> = ({
                                                                       pageNumber,
                                                                       highlights,
                                                                       fileKey,
                                                                       containerRef
                                                                   }) => {
    return (
        <BaseHighlightLayer
            pageNumber={pageNumber}
            highlights={highlights}
            layerClass="manual"
            fileKey={fileKey}
            containerRef={containerRef}
        />
    );
};

export default ManualHighlightLayer;
