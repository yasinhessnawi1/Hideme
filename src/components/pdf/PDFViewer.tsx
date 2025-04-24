import React, { useRef, useCallback, useEffect } from 'react';
import { useFileContext } from '../../contexts/FileContext';
import PDFViewerContainer from './PDFViewerContainer';
import { Plus } from 'lucide-react';
import '../../styles/modules/pdf/PdfViewer.css';
import ProcessingStatus from "./pdf_component/ProcessingStatus";
import ScrollSync from './ScrollSync';
import ViewportNavigationIntegrator from './ViewportNavigationIntegrator';
import { getFileKey } from '../../contexts/PDFViewerContext';
import MultiPDFRenderer from './MultiPDFRenderer';
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
    const { addFiles, currentFile, files } = useFileContext();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Initialize scroll manager when component mounts
    useEffect(() => {
        // Delay initialization to ensure DOM is fully rendered
        const timeoutId = setTimeout(() => {
            scrollManager.initializeObservers();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, []);

    // Handle clicking the add files button
    const handleAddFilesClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Handle file upload from input
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);

            // Add files without replacing existing ones
            addFiles(newFiles, false);

            // Refresh observers after files are added
            setTimeout(() => {
                scrollManager.refreshObservers();
            }, 500);
        }
    }, [addFiles]);

    return (
        <div className="pdf-viewer-wrapper">
            {/* File upload button - only shown when there's at least one file */}
            {currentFile && (
                <>
                    <button
                        className="pdf-add-file-button"
                        onClick={handleAddFilesClick}
                        title="Add more files"
                        aria-label="Add more PDF files"
                    >
                        <Plus size={24} className="pdf-add-file-icon" />
                    </button>
                    <input
                        type="file"
                        accept="application/pdf"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        multiple
                        max={20 - files.length}
                    />
                </>
            )}

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
