import React, { useRef, useCallback, useEffect } from 'react';
import { useFileContext } from '../../contexts/FileContext';
import PDFViewerContainer from './PDFViewerContainer';
import { Plus } from 'lucide-react';
import '../../styles/modules/pdf/PdfViewer.css';
import ProcessingStatus from "./pdf_component/ProcessingStatus";
import ScrollSync from './ScrollSync';
import ViewportNavigationIntegrator from './ViewportNavigationIntegrator';
import scrollManager from '../../services/ScrollManagerService';
import { usePDFViewerContext } from '../../contexts/PDFViewerContext';

/**
 * PDFViewer component
 *
 * Main component that coordinates PDF viewing functionalities:
 * - File upload handling
 * - Processing status display
 * - Scroll synchronization between PDF pages
 * - Navigation through viewport integration
 * - Virtualized PDF rendering for performance
 * - Support for dragging pages when zoomed
 */
const PDFViewer: React.FC = () => {
    const { zoomLevel } = usePDFViewerContext();
 
    // Initialize scroll manager when component mounts
    useEffect(() => {
        // Delay initialization to ensure DOM is fully rendered
        const timeoutId = setTimeout(() => {
            scrollManager.initializeObservers();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, []);

    // Reset drag offsets when zoom level changes
    useEffect(() => {
        // Dispatch event to notify all components about zoom change
        window.dispatchEvent(new CustomEvent('pdf-zoom-changed', {
            detail: {
                zoomLevel,
                timestamp: Date.now()
            }
        }));
    }, [zoomLevel]);

    return (
        <div className="pdf-viewer-wrapper">
            
            {/* Processing status indicator */}
            <ProcessingStatus />

            {/* Scroll synchronization component */}
            <ScrollSync />

            {/* Viewport navigation integration */}
            <ViewportNavigationIntegrator />

            {/* Main PDF viewer container */}
            <PDFViewerContainer />
        </div>
    );
};

export default PDFViewer;
