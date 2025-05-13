import React, { useCallback, useRef } from 'react';
import { usePDFViewerContext } from '../../../contexts/PDFViewerContext';
import MultiPDFViewer from './MultiPDFViewer';
import '../../../styles/modules/pdf/PdfViewer.css';
import { useFileContext } from '../../../contexts/FileContext';
import scrollManager from '../../../services/client-services/ScrollManagerService';
import { Plus } from 'lucide-react';
/**
 * PDFViewerContainer component
 *
 * This component serves as the main scroll container for all PDF documents.
 * It:
 * - Connects to the PDFViewerContext
 * - Sets up the main scroll container reference
 * - Configures scroll behavior for optimal PDF navigation
 * - Renders the MultiPDFViewer component which manages PDF file display
 */
const PDFViewerContainer: React.FC = () => {
    const { mainContainerRef, zoomLevel } = usePDFViewerContext();

    // Add class based on zoom level
    const containerClass = `pdf-viewer-container ${zoomLevel > 1 ? 'zoomed-in' : ''}`;

    return (
        <div
            className={containerClass}
            ref={mainContainerRef}
            data-testid="pdf-container"
            data-zoom-level={zoomLevel.toFixed(1)}
        >
            <MultiPDFViewer />
        </div>
    );
};

export default PDFViewerContainer;
