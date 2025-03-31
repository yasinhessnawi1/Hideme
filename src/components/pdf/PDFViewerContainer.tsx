// Updated PDFViewerContainer.tsx
import React from 'react';
import { usePDFViewerContext } from '../../contexts/PDFViewerContext';
import MultiPDFRenderer from './MultiPDFRenderer';
import HighlightAllIntegrator from './highlighters/HighlightAllIntegrator';
import '../../styles/modules/pdf/PdfViewer.css';

const PDFViewerContainer: React.FC = () => {
    const { mainContainerRef } = usePDFViewerContext();

    return (
        <div
            className="pdf-viewer-container"
            ref={mainContainerRef}
        >
            <HighlightAllIntegrator />

            <MultiPDFRenderer />
        </div>
    );
};

export default PDFViewerContainer;
