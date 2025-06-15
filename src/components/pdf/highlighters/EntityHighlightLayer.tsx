import React from 'react';
import BaseHighlightLayer from './BaseHighlightLayer';
import {HighlightRect} from '../../../types';

interface EntityHighlightLayerProps {
    pageNumber: number;
    highlights: HighlightRect[];
    fileKey?: string; // Optional file key for multi-file support
    containerRef: React.RefObject<HTMLDivElement | null>;
}

const EntityHighlightLayer: React.FC<EntityHighlightLayerProps> = ({
                                                                       pageNumber,
                                                                       highlights,
                                                                       fileKey,
                                                                       containerRef
                                                                   }) => {
    return (
        <BaseHighlightLayer
            pageNumber={pageNumber}
            highlights={highlights}
            layerClass="entity"
            fileKey={fileKey}
            containerRef={containerRef}
        />
    );
};

export default EntityHighlightLayer;
