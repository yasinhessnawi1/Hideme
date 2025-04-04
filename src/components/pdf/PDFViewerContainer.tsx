import React from 'react';
import { usePDFViewerContext } from '../../contexts/PDFViewerContext';
import MultiPDFRenderer from './MultiPDFRenderer';
import '../../styles/modules/pdf/PdfViewer.css';

const PDFViewerContainer: React.FC = () => {
    const { mainContainerRef } = usePDFViewerContext();

    return (
        <div
            className="pdf-viewer-container"
            ref={mainContainerRef}
        >

            <MultiPDFRenderer />
        </div>
    );
};

export default PDFViewerContainer;
