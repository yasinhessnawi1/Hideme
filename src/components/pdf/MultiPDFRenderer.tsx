import React, { useEffect } from 'react';
import { useFileContext } from '../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../contexts/PDFViewerContext';
import { useHighlightContext } from '../../contexts/HighlightContext';
import PDFDocumentWrapper from './PDFDocumentWrapper';
import MultiFileUploader from './MultiFileUploader';
import { X } from 'lucide-react';
import '../../styles/modules/pdf/PdfViewer.css';

const MultiPDFRenderer: React.FC = () => {
    const {
        activeFiles,
        currentFile,
        setCurrentFile,
        removeFromActiveFiles,
        files,
        removeFile
    } = useFileContext();

    const { resetProcessedEntityPages } = useHighlightContext();

    // Track when files change for debugging
    useEffect(() => {
        console.log(`[MultiPDFRenderer] Rendering ${activeFiles.length} active PDF files`);
        if (activeFiles.length > 0) {
            activeFiles.forEach(file => {
                console.log(`[MultiPDFRenderer] Active file: ${file.name} (${getFileKey(file)})`);
            });
        }
        if (currentFile) {
            console.log(`[MultiPDFRenderer] Current file: ${currentFile.name} (${getFileKey(currentFile)})`);
        }
    }, [activeFiles, currentFile]);

    // Reset processed entity pages when active files change to force re-processing
    useEffect(() => {
        resetProcessedEntityPages();
    }, [activeFiles, resetProcessedEntityPages]);

    if (activeFiles.length === 0) {
        return <MultiFileUploader mode="replace" buttonType="full" />;
    }

    // Function to find file index in the files array
    const getFileIndex = (file: File) => {
        return files.findIndex(f =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );
    };

    // Enhanced file change handling with better cleanup
    const handleFileSelection = (file: File) => {
        if (currentFile === file) return; // Don't reselect the same file

        // Force reset processed entity pages to ensure fresh processing
        resetProcessedEntityPages();

        console.log(`[MultiPDFRenderer] Switching to file: ${file.name} (${getFileKey(file)})`);
        setCurrentFile(file);
    };

    const handleRemoveFile = (file: File, e: React.MouseEvent) => {
        e.stopPropagation();
        const index = getFileIndex(file);
        if (index !== -1) {
            removeFile(index);
        }
    };

    return (
        <div className="multi-pdf-container">
            {activeFiles.map((file) => {
                const fileKey = getFileKey(file);

                return (
                    <div
                        key={fileKey}
                        className={`pdf-file-container ${currentFile === file ? 'current' : ''}`}
                        onClick={() => handleFileSelection(file)}
                        data-file-key={fileKey}
                        data-file-name={file.name}
                    >
                        <div className="pdf-file-header">
                            <h3 className="pdf-file-title">{file.name}</h3>
                            <div className="pdf-file-actions">
                                <button
                                    className="pdf-file-action-button"
                                    onClick={(e) => handleRemoveFile(file, e)}
                                    title="Remove file"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <PDFDocumentWrapper file={file} fileKey={fileKey} />
                    </div>
                );
            })}
        </div>
    );
};

export default MultiPDFRenderer;
