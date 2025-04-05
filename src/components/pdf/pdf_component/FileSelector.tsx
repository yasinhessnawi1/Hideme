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
    MoreHorizontal,
    Download,
    Printer,
    X
} from 'lucide-react';
import '../../../styles/modules/pdf/FileSelector.css';
import { useHighlightContext } from "../../../contexts/HighlightContext";
import AutoProcessControls from "./AutoProcessControls";
import { usePDFNavigation } from '../../../hooks/usePDFNavigation';
import { getFileKey } from "../../../contexts/PDFViewerContext";

interface FileSelectorProps {
    className?: string;
}

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
        isFileActive
    } = useFileContext();
    const { clearAnnotations } = useHighlightContext();

    const [showActions, setShowActions] = useState<number | null>(null);
    const [showDropdown, setShowDropdown] = useState<number | null>(null);
    const [showTooltip, setShowTooltip] = useState<number | null>(null);
    const [showNotification, setShowNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const pdfNavigation = usePDFNavigation('file-selector');

    // For handling the file selection
    const handleFileSelect = useCallback((file: File) => {
        const fileKey = getFileKey(file);

        // Navigate to the first page of the selected file
        pdfNavigation.navigateToPage(1, fileKey, {
            // Use auto for immediate feedback
            behavior: 'auto',
            // Always align to top for consistency
            alignToTop: true,
            // Always highlight the thumbnail
            highlightThumbnail: true
        });

        setCurrentFile(file);
    }, [pdfNavigation, setCurrentFile]);

    // For handling file deletion
    const handleFileDelete = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        removeFile(index, clearAnnotations);
        setShowNotification({message: 'File removed successfully', type: 'success'});
        setTimeout(() => setShowNotification(null), 3000);
    };

    // Toggle file selection
    const handleToggleSelection = (file: File, e: React.MouseEvent) => {
        e.stopPropagation();
        toggleFileSelection(file);
    };

    // Toggle file visibility
    const handleToggleActive = (file: File, e: React.MouseEvent) => {
        e.stopPropagation();
        toggleActiveFile(file);
    };

    // For adding new files
    const handleAddFiles = () => {
        fileInputRef.current?.click();
    };

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            addFiles(newFiles, false);
            setShowNotification({message: `${newFiles.length} file(s) added successfully`, type: 'success'});
            setTimeout(() => setShowNotification(null), 3000);
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
    const handleDeleteSelected = () => {
        if (selectedFiles.length === 0) {
            setShowNotification({message: 'No files selected for deletion', type: 'error'});
            setTimeout(() => setShowNotification(null), 3000);
            return;
        }

        const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedFiles.length} selected file(s)?`);
        if (confirmDelete) {
            // Delete files in reverse order to avoid index issues
            const selectedIndexes = selectedFiles.map(selectedFile =>
                files.findIndex(file => getFileKey(file) === getFileKey(selectedFile))
            ).sort((a, b) => b - a); // Sort in descending order

            selectedIndexes.forEach(index => {
                if (index !== -1) {
                    removeFile(index, clearAnnotations);
                }
            });

            setShowNotification({message: `${selectedFiles.length} file(s) deleted successfully`, type: 'success'});
            setTimeout(() => setShowNotification(null), 3000);
        }
    };

    // Download selected files
    const handleDownloadFiles = async () => {
        const filesToDownload = selectedFiles.length > 0 ? selectedFiles : currentFile ? [currentFile] : [];

        if (filesToDownload.length === 0) {
            setShowNotification({message: 'No files selected for download', type: 'error'});
            setTimeout(() => setShowNotification(null), 3000);
            return;
        }

        try {
            setShowNotification({message: 'Preparing download...', type: 'success'});

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

                        setShowNotification({message: 'Files downloaded successfully', type: 'success'});
                    } catch (error) {
                        setShowNotification({message: 'Error creating ZIP file. JSZip library may not be available.', type: 'error'});
                    }
                };

                await loadJSZip();
            }
        } catch (error) {
            setShowNotification({message: 'Error downloading files', type: 'error'});
        } finally {
            setTimeout(() => setShowNotification(null), 3000);
        }
    };

    // Print selected files
    const handlePrintFiles = () => {
        const filesToPrint = selectedFiles.length > 0 ? selectedFiles : currentFile ? [currentFile] : [];

        if (filesToPrint.length === 0) {
            setShowNotification({message: 'No files selected for printing', type: 'error'});
            setTimeout(() => setShowNotification(null), 3000);
            return;
        }

        try {
            setShowNotification({message: 'Preparing print...', type: 'success'});

            // For each file, create a new window and print it
            filesToPrint.forEach(file => {
                const url = URL.createObjectURL(file);
                const printWindow = window.open(url, '_blank');

                if (printWindow) {
                    printWindow.onload = () => {
                        printWindow.print();
                        // Clean up after printing
                        setTimeout(() => URL.revokeObjectURL(url), 100);
                    };
                } else {
                    // If popup blocked, show instructions
                    setShowNotification({message: 'Please allow popups to print files', type: 'error'});
                }
            });
        } catch (error) {
            setShowNotification({message: 'Error printing files', type: 'error'});
        } finally {
            setTimeout(() => setShowNotification(null), 3000);
        }
    };

    // Handle dropdown toggle
    const handleDropdownToggle = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (showDropdown === index) {
            setShowDropdown(null);
        } else {
            setShowDropdown(index);
        }
    };

    // Handle click outside to close dropdown
    const handleClickOutside = () => {
        setShowDropdown(null);
    };

    // Track if any files are selected but not all
    const someSelected = selectedFiles.length > 0 && selectedFiles.length < files.length;
    // Track if all files are selected
    const allSelected = selectedFiles.length === files.length && files.length > 0;

    return (
        <>
            <div className="dropdown-section">
                <AutoProcessControls/>
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
                    <div className="file-list" onClick={handleClickOutside}>
                        {files.map((file, index) => {
                            const isSelected = isFileSelected(file);
                            const isActive = isFileActive(file);
                            const fileKey = getFileKey(file);

                            return (
                                <div
                                    key={fileKey}
                                    className={`file-item ${currentFile === file ? 'current' : ''} ${isSelected ? 'selected' : ''} ${isActive ? 'active' : 'inactive'}`}
                                    onClick={() => handleFileSelect(file)}
                                    onMouseEnter={() => {
                                        setShowActions(index);
                                        setShowTooltip(index);
                                    }}
                                    onMouseLeave={() => {
                                        setShowActions(null);
                                        setShowTooltip(null);
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
                                                    {file.name}
                                                </span>
                                                {showTooltip === index && (
                                                    <div className="file-name-tooltip">
                                                        {file.name}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    </div>

                                    <div className="file-actions">
                                        {(showActions === index || window.innerWidth > 768) && (
                                            <>
                                                <button
                                                    className="file-action-button more-button"
                                                    onClick={(e) => handleDropdownToggle(index, e)}
                                                    title="More options"
                                                    aria-label="More options"
                                                >
                                                    <MoreHorizontal size={16}/>
                                                </button>
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

                                    {showDropdown === index && (
                                        <div className="file-dropdown">
                                            <div className="dropdown-header">
                                                <span className="dropdown-title">File Options</span>
                                                <button
                                                    className="dropdown-close"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowDropdown(null);
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <div className="dropdown-item" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="dropdown-button"
                                                    onClick={(e) => handleToggleActive(file, e)}
                                                >
                                                    {isActive ? "Hide file" : "Show file"}
                                                </button>
                                            </div>
                                            <div className="dropdown-item" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="dropdown-button"
                                                    onClick={(e) => handleToggleSelection(file, e)}
                                                >
                                                    {isSelected ? "Deselect file" : "Select file"}
                                                </button>
                                            </div>
                                            <div className="dropdown-item" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="dropdown-button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownloadFiles();
                                                    }}
                                                >
                                                    Download file
                                                </button>
                                            </div>
                                            <div className="dropdown-item" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="dropdown-button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const filesToPrint = [file];
                                                        const url = URL.createObjectURL(file);
                                                        const printWindow = window.open(url, '_blank');
                                                        if (printWindow) {
                                                            printWindow.onload = () => {
                                                                printWindow.print();
                                                                setTimeout(() => URL.revokeObjectURL(url), 100);
                                                            };
                                                        }
                                                    }}
                                                >
                                                    Print file
                                                </button>
                                            </div>
                                            <div className="dropdown-divider"></div>
                                            <div className="dropdown-item" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="dropdown-button delete"
                                                    onClick={(e) => handleFileDelete(index, e)}
                                                >
                                                    Remove file
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Notification toast */}
                {showNotification && (
                    <div className={`notification-toast ${showNotification.type}`}>
                        <span>{showNotification.message}</span>
                        <button
                            className="notification-close"
                            onClick={() => setShowNotification(null)}
                            aria-label="Close notification"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default FileSelector;
