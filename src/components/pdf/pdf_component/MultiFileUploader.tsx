import React, { useRef, useState } from 'react';
import { Upload, Plus } from 'lucide-react';
import { useFileContext } from '../../../contexts/FileContext';
import '../../../styles/modules/pdf/PDFViewerPage.css';

interface MultiFileUploaderProps {
    mode?: 'replace' | 'add';
    buttonType?: 'full' | 'icon'; // full shows the full upload area, icon only shows a + button
}

const MultiFileUploader: React.FC<MultiFileUploaderProps> = ({
                                                                 mode = 'replace',
                                                                 buttonType = 'full'
                                                             }) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { addFiles } = useFileContext();
    const [dragActive, setDragActive] = useState<boolean>(false);

    // Handle file selection
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            addFiles(newFiles, mode === 'replace');
        }
    };

    // Handle drag events
    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    // Handle drop event
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files);
            addFiles(newFiles, mode === 'replace');
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    if (buttonType === 'icon') {
        return (
            <div className="add-file-button-container">
                <input
                    id="pdf-upload-add"
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    multiple
                />
                <button
                    className="add-file-button"
                    onClick={handleClick}
                    title="Add more files"
                >
                    <Plus className="add-file-icon" size={24} />
                </button>
            </div>
        );
    }

    return (
        <div className="file-upload-container">
            <h2 className="file-upload-title">Upload Files</h2>
            <input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                multiple
            />
            <div
                className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
                onClick={handleClick}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <Upload className="file-upload-icon" size={32} />
                <span className="file-upload-text">
                    Drag & Drop or Select PDFs to {mode === 'replace' ? 'Upload' : 'Add'}
                </span>
                <span className="file-upload-subtitle">
                    Multiple files are supported
                </span>
            </div>
        </div>
    );
};

export default MultiFileUploader;
