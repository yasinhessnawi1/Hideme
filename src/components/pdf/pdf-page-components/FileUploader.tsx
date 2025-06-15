import React, { useRef, useState } from 'react';
import { Upload, Plus } from 'lucide-react';
import { useFileContext } from '../../../contexts/FileContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useLanguage } from '../../../contexts/LanguageContext';

interface MultiFileUploaderProps {
    mode?: 'replace' | 'add';
    buttonType?: 'full' | 'icon'; // full shows the full upload area, icon only shows a + button
}

const FileUploader: React.FC<MultiFileUploaderProps> = ({
                                                                 mode = 'replace',
                                                                 buttonType = 'full'
                                                             }) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { addFiles , files} = useFileContext();
    const [dragActive, setDragActive] = useState<boolean>(false);
    const {notify} = useNotification();
    const { t } = useLanguage();

    // Handle file selection
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 ) {
            const newFiles = Array.from(e.target.files);
            addFiles(newFiles, mode === 'replace');
            notify({message: t('pdf', 'filesAddedSuccessfully').replace('{count}', String(newFiles.length)), type: 'success', position: 'top-right', duration: 3000});
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
            notify({message: t('pdf', 'filesAddedByDropSuccessfully').replace('{count}', String(newFiles.length)), type: 'success', position: 'top-right', duration: 3000});
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
                    max={ 20 - files.length}
                />
                <button
                    className="add-file-button"
                    onClick={handleClick}
                    title={t('pdf', 'addMoreFiles')}
                >
                    <Plus className="add-file-icon" size={24} />
                </button>
            </div>
        );
    }

    return (
        <div className="file-upload-container">
            <h2 className="file-upload-title">{t('pdf', 'uploadFiles')}</h2>
            <input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                multiple
                max={ 20 - files.length}
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
                    {t('pdf', 'dragDropOrSelect').replace('{action}', mode === 'replace' ? t('pdf', 'upload') : t('pdf', 'add'))}
                </span>
                <span className="file-upload-subtitle">
                    {t('pdf', 'multipleFilesSupported')}
                </span>
            </div>
        </div>
    );
};

export default FileUploader;
