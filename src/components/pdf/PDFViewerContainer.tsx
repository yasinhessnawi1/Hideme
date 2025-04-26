import React from 'react';
import { usePDFViewerContext } from '../../contexts/PDFViewerContext';
import MultiPDFRenderer from './MultiPDFRenderer';
import '../../styles/modules/pdf/PdfViewer.css';

/**
 * PDFViewerContainer component
 *
 * This component serves as the main scroll container for all PDF documents.
 * It:
 * - Connects to the PDFViewerContext
 * - Sets up the main scroll container reference
 * - Configures scroll behavior for optimal PDF navigation
 * - Renders the MultiPDFRenderer component which manages PDF file display
 */
const PDFViewerContainer: React.FC = () => {
    const { mainContainerRef } = usePDFViewerContext();

    return (
        <div
            className="pdf-viewer-container"
            ref={mainContainerRef}
            data-testid="pdf-container"
        >
            <MultiPDFRenderer />
        </div>
    );
};

export default PDFViewerContainer;
