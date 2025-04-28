import React, { useCallback, useRef } from 'react';
import { usePDFViewerContext } from '../../contexts/PDFViewerContext';
import MultiPDFRenderer from './MultiPDFRenderer';
import '../../styles/modules/pdf/PdfViewer.css';
import { useFileContext } from '../../contexts/FileContext';
import scrollManager from '../../services/ScrollManagerService';
import { Plus } from 'lucide-react';
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
    const { addFiles, currentFile, files } = useFileContext();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
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
        <div
            className="pdf-viewer-container"
            ref={mainContainerRef}
            data-testid="pdf-container"
        >
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
            <MultiPDFRenderer />

        </div>
    );
};

export default PDFViewerContainer;
