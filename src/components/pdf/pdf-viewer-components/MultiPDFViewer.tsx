import React, { useCallback, useState } from 'react';
import { useFileContext } from '../../../contexts/FileContext';
import { getFileKey } from '../../../contexts/PDFViewerContext';
import PDFDocumentWrapper from './PDFWrapper';
import FullScreenOverlay from './FullScreenOverlay';
import FileUploader from "../pdf-page-components/FileUploader";
import { ChevronDown, ChevronUp, Maximize, Check, X } from 'lucide-react';
import { useNotification } from '../../../contexts/NotificationContext';
import { useLanguage } from '../../../contexts/LanguageContext';

/**
 * Component that renders a list of PDF files with open/close functionality
 */
const MultiPDFViewer: React.FC = () => {
    const {
        files,
        currentFile,
        setCurrentFile,
        removeFile,
        isFileOpen,
        openFile,
        toggleFileOpen,
        selectedFiles,
        setSelectedFiles
    } = useFileContext();
    // State for fullscreen mode
    const [fullscreenFile, setFullscreenFile] = useState<File | null>(null);
    const { notify } = useNotification();
    const { t } = useLanguage();
    // Find file index by key
    const getFileIndex = useCallback((file: File) => {
        return files.findIndex(f =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );
    }, [files]);

    // Handle file selection with throttling
    const handleFileSelection = useCallback((file: File) => {
        // Don't reselect the same file
        if (currentFile === file) return;

        // Set new current file
        setCurrentFile(file);

        // Ensure the file is open when selected as current
        if (!isFileOpen(file)) {
            openFile(file);
        }
    }, [currentFile, setCurrentFile, isFileOpen, openFile]);

    // Handle file removal
    const handleRemoveFile = useCallback((file: File, e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            const index = getFileIndex(file);
            if (index !== -1) {
                // Get fileKey before removing
                const fileKey = getFileKey(file);

                // Remove file
                removeFile(index);

                // Dispatch event to notify all components
                window.dispatchEvent(new CustomEvent('file-removed', {
                    detail: {
                        fileKey,
                        fileName: file.name,
                        timestamp: Date.now()
                    }
                }));
            }
            notify({
                message: t('pdf', 'fileAndHighlightsRemoved').replace('{file}', file.name),
                type: 'success',
                duration: 3000
            });
        } catch (error) {
            notify({
                message: t('pdf', 'errorRemovingFile').replace('{error}', String(error)),
                type: 'error',
                duration: 3000
            });
        }
    }, [getFileIndex, removeFile]);

    // Handle entering fullscreen mode for a file
    const handleEnterFullScreen = useCallback((file: File, e: React.MouseEvent) => {
        e.stopPropagation();

        // Set as current file and ensure it's open
        setCurrentFile(file);
        openFile(file);

        // Set the file for fullscreen display
        setFullscreenFile(file);
        notify({
            message: t('pdf', 'exitFullScreenInfo'),
            type: 'info',
            duration: 3000
        });
    }, [setCurrentFile, openFile]);

    // Handle exiting fullscreen mode
    const handleExitFullScreen = useCallback(() => {
        setFullscreenFile(null);
    }, []);

    // Toggle file open/close state
    const handleToggleOpen = useCallback((file: File, e: React.MouseEvent) => {
        e.stopPropagation();
        toggleFileOpen(file);
    }, [toggleFileOpen]);

    // Toggle file selection for batch operations
    const handleToggleSelection = useCallback((file: File, e: React.MouseEvent) => {
        e.stopPropagation();

        // Check if file is already selected
        const isAlreadySelected = selectedFiles.some(f =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );

        // Toggle selection state directly based on current state
        if (isAlreadySelected) {
            // Deselect the file
            setSelectedFiles(prev => prev.filter(f =>
                f.name !== file.name ||
                f.size !== file.size ||
                f.lastModified !== file.lastModified
            ));
        } else {
            // Select the file
            setSelectedFiles(prev => [...prev, file]);
        }
    }, [selectedFiles, setSelectedFiles]);

    // Check if a file is selected
    const isFileSelected = useCallback((file: File) => {
        return selectedFiles.some(f =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );
    }, [selectedFiles]);

    // If no files, show message
    if (files.length === 0) {
        return (
            <div className="pdf-error-container">
                <div className="fallback-uploader">
                    <FileUploader mode="replace" buttonType="full" />
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Fullscreen overlay */}
            {fullscreenFile && (
                <FullScreenOverlay
                    file={fullscreenFile}
                    onClose={handleExitFullScreen}
                />
            )}

            {/* Regular PDF file list */}
            <div className="multi-pdf-container">
                {files.map((file) => {
                    const isCurrentFileMatch = currentFile === file;
                    const fileKey = getFileKey(file);
                    const isOpen = isFileOpen(file);
                    const isSelected = isFileSelected(file);

                    return (
                        <div
                            key={fileKey}
                            className="pdf-file-wrapper"
                        >
                            <div
                                className={`pdf-file-container ${isCurrentFileMatch ? 'current' : ''} ${isOpen ? 'open' : 'closed'} ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleFileSelection(file)}
                                data-file-key={fileKey}
                                data-file-name={file.name}
                            >
                                <div className="pdf-file-header" onClick={(e)=> handleToggleOpen(file, e)}>
                                    <div className="pdf-file-header-left">
                                        <button
                                            className="pdf-file-toggle-button"
                                            onClick={(e) => handleToggleOpen(file, e)}
                                            title={isOpen ? t('pdf', 'collapseFile') : t('pdf', 'expandFile')}
                                        >
                                            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                        <h3 className="pdf-file-title">{file.name}</h3>
                                    </div>

                                    {/* Ensure all action buttons are in the same container */}
                                    <div className="pdf-file-actions">
                                        <button
                                            className={`pdf-file-action-button ${isSelected ? 'selected' : ''}`}
                                            onClick={(e) => handleToggleSelection(file, e)}
                                            title={isSelected ? t('pdf', 'deselectFile') : t('pdf', 'selectFile')}
                                            aria-pressed={isSelected}
                                        >
                                            {isSelected ? <Check size={18} /> : <span className="select-icon"></span>}
                                        </button>
                                        <button
                                            className="pdf-file-action-button"
                                            onClick={(e) => handleEnterFullScreen(file, e)}
                                            title={t('pdf', 'viewInFullScreen')}
                                        >
                                            <Maximize size={18} />
                                        </button>
                                        <button
                                            className="pdf-file-action-button"
                                            onClick={(e) => handleRemoveFile(file, e)}
                                            title={t('pdf', 'removeFile')}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Only render the PDF content if the file is open */}
                                {isOpen && (
                                    <PDFDocumentWrapper file={file} fileKey={fileKey}/>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
};

export default MultiPDFViewer;
