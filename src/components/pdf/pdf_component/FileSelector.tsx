import React, { useState } from 'react';
import { useFileContext } from '../../../contexts/FileContext';
import { File, Trash2, Plus, CheckSquare, Square, Eye, EyeOff, MoreHorizontal } from 'lucide-react';
import '../../../styles/modules/pdf/FileSelector.css';

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
        activeFiles,
        toggleActiveFile,
        isFileActive
    } = useFileContext();

    const [showActions, setShowActions] = useState<number | null>(null);
    const [showDropdown, setShowDropdown] = useState<number | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleFileSelect = (file: File) => {
        setCurrentFile(file);
    };

    const handleFileDelete = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        removeFile(index);
    };

    const handleToggleSelection = (file: File, e: React.MouseEvent) => {
        e.stopPropagation();
        toggleFileSelection(file);
    };

    const handleToggleActive = (file: File, e: React.MouseEvent) => {
        e.stopPropagation();
        toggleActiveFile(file);
    };

    const handleAddFiles = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            addFiles(newFiles, false);
        }
    };

    const handleSelectAll = () => {
        if (selectedFiles.length === files.length) {
            deselectAllFiles();
        } else {
            selectAllFiles();
        }
    };

    const handleDropdownToggle = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (showDropdown === index) {
            setShowDropdown(null);
        } else {
            setShowDropdown(index);
        }
    };

    const handleClickOutside = () => {
        setShowDropdown(null);
    };

    // Track if any files are selected but not all
    const someSelected = selectedFiles.length > 0 && selectedFiles.length < files.length;
    // Track if all files are selected
    const allSelected = selectedFiles.length === files.length && files.length > 0;

    return (
        <div className={`file-selector ${className || ''}`}>
            <div className="file-selector-header">
                <div className="file-selector-title-area">
                    <h3 className="file-selector-title">Files ({files.length})</h3>
                    {files.length > 0 && (
                        <div className="select-all-control">
                            <button
                                className="select-all-button"
                                onClick={handleSelectAll}
                                title={allSelected ? "Deselect all" : "Select all"}
                            >
                                {allSelected ? (
                                    <CheckSquare size={16} className="icon-check-all" />
                                ) : someSelected ? (
                                    <div className="icon-some-selected">
                                        <Square size={16} />
                                        <div className="partial-check"></div>
                                    </div>
                                ) : (
                                    <Square size={16} />
                                )}
                            </button>
                        </div>
                    )}
                </div>
                <button
                    className="add-files-button"
                    onClick={handleAddFiles}
                    title="Add more files"
                >
                    <Plus size={16} />
                    <span className="button-text">Add Files</span>
                </button>
                <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    multiple
                />
            </div>

            {files.length === 0 ? (
                <div className="empty-files-message">
                    <p>No PDF files loaded</p>
                </div>
            ) : (
                <div className="file-list" onClick={handleClickOutside}>
                    {files.map((file, index) => {
                        const isSelected = isFileSelected(file);
                        const isActive = isFileActive(file);

                        return (
                            <div
                                key={`${file.name}-${file.lastModified}`}
                                className={`file-item ${currentFile === file ? 'current' : ''} ${isSelected ? 'selected' : ''} ${isActive ? 'active' : 'inactive'}`}
                                onClick={() => handleFileSelect(file)}
                                onMouseEnter={() => setShowActions(index)}
                                onMouseLeave={() => setShowActions(null)}
                            >
                                <div className="file-controls">
                                    <button
                                        className="file-select-button"
                                        onClick={(e) => handleToggleSelection(file, e)}
                                        title={isSelected ? "Deselect file" : "Select file for batch operations"}
                                    >
                                        {isSelected ? (
                                            <CheckSquare size={16} className="select-icon" />
                                        ) : (
                                            <Square size={16} className="select-icon" />
                                        )}
                                    </button>

                                    <button
                                        className={`file-visibility-button ${isActive ? 'visible' : 'hidden'}`}
                                        onClick={(e) => handleToggleActive(file, e)}
                                        title={isActive ? "Hide file" : "Show file"}
                                    >
                                        {isActive ? (
                                            <Eye size={16} className="visibility-icon" />
                                        ) : (
                                            <EyeOff size={16} className="visibility-icon" />
                                        )}
                                    </button>
                                </div>

                                <div className="file-info">
                                    <File size={18} className="file-icon" />
                                    <div className="file-details">
                                        <span className="file-name">{file.name}</span>
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
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                            <button
                                                className="file-action-button delete-button"
                                                onClick={(e) => handleFileDelete(index, e)}
                                                title="Remove file"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {showDropdown === index && (
                                    <div className="file-dropdown">
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
        </div>
    );
};

export default FileSelector;
