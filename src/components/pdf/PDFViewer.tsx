import React, { useRef } from 'react';
import { useFileContext } from '../../contexts/FileContext';
import PDFViewerContainer from './PDFViewerContainer';
import { Plus } from 'lucide-react';
import '../../styles/modules/pdf/PdfViewer.css';

/**
 * PDFViewer is the main component for PDF rendering and interaction.
 * It has been refactored to use a more modular architecture with
 * separate concerns managed by dedicated components and hooks.
 */
const PDFViewer: React.FC = () => {
    const { addFiles, currentFile } = useFileContext();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleAddFilesClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            addFiles(newFiles, false); // Don't replace existing files
        }
    };

    return (
        <div className="pdf-viewer-container" >
            {currentFile && (
                <>
                    <button
                        className="pdf-add-file-button"
                        onClick={handleAddFilesClick}
                        title="Add more files"
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
                    />
                </>
            )}

            <PDFViewerContainer/>
        </div>
    );
};

export default PDFViewer;
