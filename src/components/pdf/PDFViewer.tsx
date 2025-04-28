import React, { useRef, useCallback, useEffect } from 'react';
import { useFileContext } from '../../contexts/FileContext';
import PDFViewerContainer from './PDFViewerContainer';
import { Plus } from 'lucide-react';
import '../../styles/modules/pdf/PdfViewer.css';
import ProcessingStatus from "./pdf_component/ProcessingStatus";
import ScrollSync from './ScrollSync';
import ViewportNavigationIntegrator from './ViewportNavigationIntegrator';
import scrollManager from '../../services/ScrollManagerService';

/**
 * PDFViewer component
 *
 * Main component that coordinates PDF viewing functionalities:
 * - File upload handling
 * - Processing status display
 * - Scroll synchronization between PDF pages
 * - Navigation through viewport integration
 * - Virtualized PDF rendering for performance
 */
const PDFViewer: React.FC = () => {
 
    // Initialize scroll manager when component mounts
    useEffect(() => {
        // Delay initialization to ensure DOM is fully rendered
        const timeoutId = setTimeout(() => {
            scrollManager.initializeObservers();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, []);

   

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
