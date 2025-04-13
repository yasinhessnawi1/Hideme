import React, { useRef, useCallback } from 'react';
import { useFileContext } from '../../contexts/FileContext';
import PDFViewerContainer from './PDFViewerContainer';
import { Plus } from 'lucide-react';
import '../../styles/modules/pdf/PdfViewer.css';
import ProcessingStatus from "./pdf_component/ProcessingStatus";
import ScrollSync from './ScrollSync';
import ViewportNavigationIntegrator from './ViewportNavigationIntegrator';
import { getFileKey } from '../../contexts/PDFViewerContext';

/**
 * PDFViewer component
 * 
 * Main component that coordinates PDF viewing functionalities:
 * - File upload handling
 * - Processing status display
 * - Scroll synchronization between PDF pages
 * - Navigation through viewport integration
 * - Container for PDF document rendering
 *
 * This component focuses on composition of specialized components
 * rather than implementing all functionality directly.
 */
const PDFViewer: React.FC = () => {
    const { addFiles, currentFile } = useFileContext();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Handle clicking the add files button
    const handleAddFilesClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Handle file upload from input
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            
            // Add the files without replacing existing ones
            addFiles(newFiles, false);
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
                        aria-hidden="true"
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