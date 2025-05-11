import React, { useCallback, useState, useRef } from 'react';
import { useFileContext } from '../../../contexts/FileContext';
import {
    File as FileIcon,
    Trash2,
    Plus,
    CheckSquare,
    Square,
    Eye,
    EyeOff,
    Download,
    Printer,
    X
} from 'lucide-react';
import '../../../styles/modules/pdf/FileSelector.css';
import { usePDFNavigation } from '../../../hooks/usePDFNavigation';
import { getFileKey } from "../../../contexts/PDFViewerContext";
import scrollManager from '../../../services/ScrollManagerService';
import StorageSettings from './StorageSettings';
import { useNotification } from '../../../contexts/NotificationContext';

interface FileSelectorProps {
    className?: string;
}

/**
 * FileSelector component
 *
 * Provides UI for managing PDF files with improved navigation
 */
const FileSelector: React.FC<FileSelectorProps> = ({ className }) => {
    const {
        files,
        currentFile,
        setCurrentFile,
        removeFile,
        selectedFiles,
        toggleFileSelection,
        isFileSelected,
        selectAllFiles,
        deselectAllFiles,
        addFiles,
        toggleActiveFile,
        isFileActive,
        openFile,
        closeFile,
        isFileOpen
    } = useFileContext();

    const [showActions, setShowActions] = useState<number | null>(null);
    const {notify, confirm} = useNotification();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const pdfNavigation = usePDFNavigation('file-selector');

    // For handling the file selection with improved navigation
    const handleFileSelect = useCallback((file: File) => {
        const fileKey = getFileKey(file);

        // Skip if already the current file
        if (currentFile === file) return;

        // Mark file change in progress
        scrollManager.setFileChanging(true);

        // Update the current file
        setCurrentFile(file);

        // Navigate to the first page of the selected file
        pdfNavigation.navigateToPage(1, fileKey, {
            // Use auto behavior for immediate feedback
            behavior: 'auto',
            // Always align to top for consistency
            alignToTop: true,
            // Always highlight the thumbnail
            highlightThumbnail: true
        });

    }, [pdfNavigation, setCurrentFile, currentFile]);

    // For handling file deletion
    const handleFileDelete = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();

        // Get file and fileKey before removing
        const fileToRemove = files[index];
        const fileKey = fileToRemove ? getFileKey(fileToRemove) : null;

        // Remove the file
        removeFile(index);

        // Explicitly dispatch event to notify all components
        if (fileKey) {
            window.dispatchEvent(new CustomEvent('file-removed', {
                detail: {
                    fileKey,
                    fileName: fileToRemove.name,
                    timestamp: Date.now()
                }
            }));
        }

        notify({
            message: 'File removed successfully'
            , type: 'success'
            , position: 'top-right'
            ,duration: 3000
        });
    };

    // Toggle file selection
    const handleToggleSelection = (file: File, e: React.MouseEvent) => {
        e.stopPropagation();
        toggleFileSelection(file);
    };

    // Toggle file visibility
    const handleToggleActive = (file: File, e: React.MouseEvent) => {
        e.stopPropagation();
        if (isFileOpen(file)) {
            closeFile(file);
        } else {
            openFile(file);
        }
    };

    // For adding new files
    const handleAddFiles = () => {
        fileInputRef.current?.click();
    };

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);

            // Add files to the top of the list instead of the bottom
            addFiles(newFiles, false);

            notify({message: `${newFiles.length} file(s) added successfully`, type: 'success', position: 'top-right', duration: 3000});

            // Refresh observers to detect the new content
            setTimeout(() => {
                scrollManager.refreshObservers();
            }, 500);
        }
    };

    // Select all files
    const handleSelectAll = () => {
        if (selectedFiles.length === files.length) {
            deselectAllFiles();
        } else {
            selectAllFiles();
        }
    };

    // Delete all selected files
    const handleDeleteSelected = async () => {
        if (selectedFiles.length === 0) {
            notify({message: 'No files selected for deletion', type: 'error' ,position: 'top-right', duration: 3000});
            return;
        }

        const confirmDelete = await confirm({
            title: 'Delete Files',
            message: `Are you sure you want to delete ${selectedFiles.length} selected file(s)?`,
            type: 'delete',
            confirmButton: {
                label: 'Delete',
            }
        });

        if (confirmDelete) {
                    // Delete files in reverse order to avoid index issues
            const selectedIndexes = selectedFiles.map(selectedFile =>
                files.findIndex(file => getFileKey(file) === getFileKey(selectedFile))
            ).sort((a, b) => b - a); // Sort in descending order

            selectedIndexes.forEach(index => {
                if (index !== -1) {
                    removeFile(index);
                }
            });


            notify({message: `${selectedFiles.length} file(s) deleted successfully`, type: 'success', position: 'top-right', duration: 3000});

        }
    };

    // Function to print specific files - handles both single and multiple files
    const printFiles = async (filesToPrint: File[]) => {
        if (filesToPrint.length === 0) {
            notify({message: 'No files to print', type: 'error', position: 'top-right', duration: 3000});
            return;
        }

        try {
            notify({message: 'Preparing print...', type: 'success', position: 'top-right', duration: 3000});

            // If only one file, use simple approach
            if (filesToPrint.length === 1) {
                const url = URL.createObjectURL(filesToPrint[0]);
                const printWindow = window.open(url, '_blank');

                if (printWindow) {
                    printWindow.onload = () => {
                        printWindow.print();
                        // Clean up after printing
                        setTimeout(() => URL.revokeObjectURL(url), 100);
                    };
                } else {
                    // If popup blocked, show instructions
                    notify({message: 'Please allow popups to print files', type: 'error', position: 'top-right', duration: 3000});
                }
            }
            // If multiple files, merge them before printing
            else {
                try {
                    // Dynamic import of pdf-lib
                    const { PDFDocument } = await import('pdf-lib');

                    // Create a new PDF document
                    const mergedPdf = await PDFDocument.create();

                    // Process each file
                    for (const file of filesToPrint) {
                        // Convert File to ArrayBuffer
                        const fileArrayBuffer = await file.arrayBuffer();

                        // Load the PDF
                        const pdf = await PDFDocument.load(fileArrayBuffer);

                        // Get all pages
                        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

                        // Add pages to the merged PDF
                        pages.forEach(page => mergedPdf.addPage(page));
                    }

                    // Save the merged PDF
                    const mergedPdfBytes = await mergedPdf.save();

                    // Convert to Blob and create URL
                    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);

                    // Open in new window and print
                    const printWindow = window.open(url, '_blank');

                    if (printWindow) {
                        printWindow.onload = () => {
                            printWindow.print();
                            // Clean up after printing
                            setTimeout(() => URL.revokeObjectURL(url), 100);
                        };
                    } else {
                        // If popup blocked, show instructions
                        notify({message: 'Please allow popups to print files', type: 'error', position: 'top-right', duration: 3000});
                    }
                } catch (error) {
                    console.error('Error merging PDFs:', error);
                    notify({message: 'Error merging PDFs for printing.', type: 'error', position: 'top-right', duration: 3000});
                }
            }
        } catch (error) {
            console.error('Error printing files:', error);
            notify({message: 'Error printing files', type: 'error', position: 'top-right', duration: 3000});
        }
    };

    // Print selected files using the common print function
    const handlePrintFiles = () => {
        const filesToPrint = selectedFiles.length > 0 ? selectedFiles : currentFile ? [currentFile] : [];
        printFiles(filesToPrint);
    };

    // Download selected files
    const handleDownloadFiles = async () => {
        const filesToDownload = selectedFiles.length > 0 ? selectedFiles : currentFile ? [currentFile] : [];

        if (filesToDownload.length === 0) {
            notify({message: 'No files selected for download', type: 'error', position: 'top-right', duration: 3000});
            return;
        }

        try {
            notify({message: 'Preparing download...', type: 'success', position: 'top-right', duration: 3000});

            // If only one file, download it directly
            if (filesToDownload.length === 1) {
                const url = URL.createObjectURL(filesToDownload[0]);
                const a = document.createElement('a');
                a.href = url;
                a.download = filesToDownload[0].name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            // If multiple files, create a ZIP archive
            else {
                const loadJSZip = async () => {
                    try {
                        // Dynamic import of JSZip (needs to be installed)
                        const JSZip = await import('jszip').then(module => module.default);
                        const zip = new JSZip();

                        // Add each file to the zip
                        filesToDownload.forEach(file => {
                            zip.file(file.name, file);
                        });

                        // Generate the zip file
                        const content = await zip.generateAsync({type: 'blob'});

                        // Create download link
                        const url = URL.createObjectURL(content);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = "pdf_files.zip";
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        notify({message: 'Files downloaded successfully', type: 'success', position: 'top-right', duration: 3000});
                    } catch (error) {
                        notify({message: 'Error creating ZIP file. JSZip library may not be available.', type: 'error', position: 'top-right', duration: 3000});
                    }
                };

                await loadJSZip();
            }
        } catch (error) {
            notify({message: 'Error downloading files', type: 'error', position: 'top-right', duration: 3000});
        }
    };

    // Track if any files are selected but not all
    const someSelected = selectedFiles.length > 0 && selectedFiles.length < files.length;
    // Track if all files are selected
    const allSelected = selectedFiles.length === files.length && files.length > 0;

    return (
        <div className={`file-selector-container ${className ?? ''}`}>
            <div className="advanced-settings">
                    <StorageSettings />
                </div>
            <div className={`file-selector ${className ?? ''}`}>
                <div className="file-selector-header">
                    <div className="file-selector-title-area">
                        <h3 className="file-selector-title">Files ({files.length})</h3>
                        {files.length > 0 && (
                            <div className="select-all-control">
                                <button
                                    className="select-all-button"
                                    onClick={handleSelectAll}
                                    title={allSelected ? "Deselect all" : "Select all"}
                                    aria-label={allSelected ? "Deselect all files" : "Select all files"}
                                >
                                    {allSelected ? (
                                        <CheckSquare size={16} className="icon-check-all"/>
                                    ) : someSelected ? (
                                        <div className="icon-some-selected">
                                            <Square size={16}/>
                                            <div className="partial-check"></div>
                                        </div>
                                    ) : (
                                        <Square size={16}/>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="file-actions-toolbar">
                        {selectedFiles.length > 0 && (
                            <>
                                <button
                                    className="file-action-toolbar-button delete-button"
                                    onClick={handleDeleteSelected}
                                    title="Delete selected files"
                                    aria-label="Delete selected files"
                                >
                                    <Trash2 size={16}/>
                                </button>
                                <button
                                    className="file-action-toolbar-button download-button"
                                    onClick={handleDownloadFiles}
                                    title="Download selected files"
                                    aria-label="Download selected files"
                                >
                                    <Download size={16}/>
                                </button>
                                <button
                                    className="file-action-toolbar-button print-button"
                                    onClick={handlePrintFiles}
                                    title="Print selected files"
                                    aria-label="Print selected files"
                                >
                                    <Printer size={16}/>
                                </button>
                            </>
                        )}
                        <button
                            className="add-files-button"
                            onClick={handleAddFiles}
                            title="Add more files"
                            aria-label="Add more files"
                        >
                            <Plus size={16}/>
                        </button>
                    </div>

                    <input
                        type="file"
                        accept="application/pdf"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        style={{display: 'none'}}
                        multiple
                    />
                </div>

                {files.length === 0 ? (
                    <div className="empty-files-message">
                        <FileIcon size={32} className="empty-icon" />
                        <p>No PDF files loaded</p>
                        <button className="add-files-empty-button" onClick={handleAddFiles}>
                            <Plus size={16}/>
                            <span>Add PDF Files</span>
                        </button>
                    </div>
                ) : (
                    <div className="file-list" >
                        {files.map((file, index) => {
                            const isSelected = isFileSelected(file);
                            const isActive = isFileActive(file);
                            const fileKey = getFileKey(file);
                            const isLastFile = index === files.length - 1;

                            return (
                                <div
                                    key={fileKey}
                                    className={`file-item ${currentFile === file ? 'current' : ''} ${isSelected ? 'selected' : ''} ${isActive ? 'active' : 'inactive'} ${isLastFile ? 'last-file' : ''}`}
                                    onClick={() => handleFileSelect(file)}
                                    onContextMenu={(e) => handleContextMenu(e, fileKey)}
                                    onMouseEnter={() => {
                                        setShowActions(fileKey);
                                    }}
                                    onMouseLeave={() => {
                                        setShowActions(null);
                                    }}
                                >
                                    <div className="file-controls">
                                        <button
                                            className="file-select-button"
                                            onClick={(e) => handleToggleSelection(file, e)}
                                            title={isSelected ? "Deselect file" : "Select file for batch operations"}
                                            aria-label={isSelected ? "Deselect file" : "Select file"}
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={16} className="select-file-icon"/>
                                            ) : (
                                                <Square size={16} className="select-file-icon"/>
                                            )}
                                        </button>

                                        <button
                                            className={`file-visibility-button ${isActive ? 'visible' : 'hidden'}`}
                                            onClick={(e) => handleToggleActive(file, e)}
                                            title={isActive ? "Hide file" : "Show file"}
                                            aria-label={isActive ? "Hide file" : "Show file"}
                                        >
                                            {isActive ? (
                                                <Eye size={16} className="visibility-icon"/>
                                            ) : (
                                                <EyeOff size={16} className="visibility-icon"/>
                                            )}
                                        </button>
                                    </div>

                                    <div className="file-info">
                                        <FileIcon size={18} className="file-icon"/>
                                        <div className="file-details">
                                            <div className="file-name-container">
                                                <span className="file-name">
                                                    {file.name.length > 10 ? file.name.substring(0, 10) + '...' : file.name}
                                                </span>
                                            </div>
                                            <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    </div>

                                    <div className="file-actions">
                                        {(showActions === fileKey || window.innerWidth > 768) && (
                                            <>
                                                <button
                                                    className="file-action-button delete-button"
                                                    onClick={(e) => handleFileDelete(index, e)}
                                                    title="Remove file"
                                                    aria-label="Remove file"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div className="tooltip">{file.name}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileSelector;
