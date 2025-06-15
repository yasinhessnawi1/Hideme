import React, {useEffect, useState} from 'react';
import {X, ZoomIn, ZoomOut, RotateCcw} from 'lucide-react';
import {
    FaFileDownload,
    FaPrint,
    FaUpload,
    FaSearch,
    FaMagic,
    FaEraser,
} from 'react-icons/fa';
import {CiEdit} from 'react-icons/ci';
import PDFDocumentWrapper from './PDFWrapper';
import { getFileKey, usePDFViewerContext } from '../../../contexts/PDFViewerContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import {useFileContext} from '../../../contexts/FileContext';
import {useNotification} from '../../../contexts/NotificationContext';
import {useLoading} from '../../../contexts/LoadingContext';
import LoadingWrapper from '../../common/LoadingWrapper';

interface FullScreenOverlayProps {
    file: File;
    onClose: () => void;
}

/**
 * Modern FullScreenOverlay component for immersive PDF editing
 */
const FullScreenOverlay: React.FC<FullScreenOverlayProps> = ({ file, onClose }) => {
    const fileKey = getFileKey(file);
    const [isHovered, setIsHovered] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [isEditMode, setIsEditMode] = useState(false);

    // Context Hooks
    const {zoomLevel, setZoomLevel} = usePDFViewerContext();
    const {addFiles, files, selectedFiles} = useFileContext();
    const {notify} = useNotification();
    const {isLoading: globalLoading, startLoading, stopLoading} = useLoading();
    const { t } = useLanguage();

    // Auto-hide controls after inactivity
    useEffect(() => {
        const handleActivity = () => {
            setLastActivity(Date.now());
            setShowControls(true);
        };

        const hideTimer = setInterval(() => {
            if (Date.now() - lastActivity > 3000 && !isHovered) {
                setShowControls(false);
            }
        }, 1000);

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            clearInterval(hideTimer);
        };
    }, [lastActivity, isHovered]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    // Toolbar action handlers
    const handleUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.multiple = true;
        input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                const newFiles = Array.from(target.files);
                addFiles(newFiles);
                notify({
                    message: t('pdf', 'file_added_successfully'),
                    type: 'success',
                    duration: 3000
                });
            }
        };
        input.click();
    };

    const handleDownload = () => {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notify({
            message: t('pdf', 'files_downloaded_successfully'),
            type: 'success',
            duration: 3000
        });
    };

    const handlePrint = () => {
        const url = URL.createObjectURL(file);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
                setTimeout(() => URL.revokeObjectURL(url), 100);
            };
        }
    };

    const handleSearch = () => {
        window.dispatchEvent(new CustomEvent('execute-search', {
            detail: {source: 'fullscreen-toolbar', applyDefaultTerms: true}
        }));
        notify({
            message: t('toolbar', 'searchingWithDefaultTerms'),
            type: 'success',
            duration: 3000
        });
    };

    const handleEntityDetection = () => {
        window.dispatchEvent(new CustomEvent('trigger-entity-detection-process', {
            detail: {source: 'fullscreen-toolbar', filesToProcess: [file]}
        }));
        notify({
            message: t('toolbar', 'startingEntityDetection'),
            type: 'success',
            duration: 3000
        });
    };

    const handleRedaction = () => {
        window.dispatchEvent(new CustomEvent('trigger-redaction-process', {
            detail: {source: 'fullscreen-toolbar', filesToProcess: [file]}
        }));
        notify({
            message: t('toolbar', 'startingRedactionProcess'),
            type: 'success',
            duration: 3000
        });
    };

    const handleZoomIn = () => setZoomLevel(Math.min(zoomLevel + 0.25, 3));
    const handleZoomOut = () => setZoomLevel(Math.max(zoomLevel - 0.25, 0.25));
    const handleZoomReset = () => setZoomLevel(1);

    const handleEdit = () => {
        const newEditMode = !isEditMode;
        setIsEditMode(newEditMode);

        // Trigger edit mode or open edit sidebar
        window.dispatchEvent(new CustomEvent('toggle-edit-mode', {
            detail: {source: 'fullscreen-toolbar', file: file, enabled: newEditMode}
        }));
        notify({
            message: newEditMode ? t('toolbar', 'enteringEditMode') : t('toolbar', 'exitingEditMode'),
            type: 'success',
            duration: 3000
        });
    };

    return (
        <div
            className="modern-fullscreen-overlay"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Floating File Name - Left */}
            <div className={`floating-file-name ${showControls ? 'visible' : 'hidden'}`}>
                <div className="file-name-content">
                    <div className="file-icon">
                        <FaFileDownload size={16}/>
                    </div>
                    <span className="file-name-text">{file.name}</span>
                </div>
            </div>

            {/* Floating Exit Button - Right */}
            <div className={`floating-exit-button ${showControls ? 'visible' : 'hidden'}`}>
                <button
                    className="exit-button"
                    onClick={onClose}
                    aria-label={t('pdf', 'exitFullscreen')}
                    title={t('pdf', 'exitFullscreenWithEsc')}
                >
                    <X size={20}/>
                </button>
            </div>

            {/* Main PDF Content */}
            <div className="fullscreen-pdf-content">
                <PDFDocumentWrapper file={file} fileKey={fileKey} forceOpen={true} />
            </div>

            {/* Floating Toolbar - Bottom Center */}
            <div className={`floating-toolbar ${showControls ? 'visible' : 'hidden'}`}>
                <div className="toolbar-content">
                    {/* File Actions */}
                    <div className="toolbar-group">
                        <button
                            className="toolbar-icon-button"
                            onClick={handleUpload}
                            title={t('toolbar', 'openPDF')}
                        >
                            <FaUpload size={18}/>
                        </button>
                        <button
                            className="toolbar-icon-button"
                            onClick={handleDownload}
                            title={t('toolbar', 'savePDF')}
                        >
                            <FaFileDownload size={18}/>
                        </button>
                        <button
                            className="toolbar-icon-button"
                            onClick={handlePrint}
                            title={t('toolbar', 'printPDF')}
                        >
                            <FaPrint size={18}/>
                        </button>
                    </div>

                    <div className="toolbar-divider"/>

                    {/* Processing Actions */}
                    <div className="toolbar-group">
                        <LoadingWrapper isLoading={globalLoading('toolbar.search')} overlay={false} fallback="">
                            <button
                                className="toolbar-icon-button"
                                onClick={handleSearch}
                                title={t('toolbar', 'searchPDFs')}
                                disabled={globalLoading('toolbar.search')}
                            >
                                <FaSearch size={18}/>
                            </button>
                        </LoadingWrapper>

                        <LoadingWrapper isLoading={globalLoading('toolbar.detect')} overlay={false} fallback="">
                            <button
                                className="toolbar-icon-button"
                                onClick={handleEntityDetection}
                                title={t('toolbar', 'detectEntities')}
                                disabled={globalLoading('toolbar.detect')}
                            >
                                <FaMagic size={18}/>
                            </button>
                        </LoadingWrapper>

                        <LoadingWrapper isLoading={globalLoading('toolbar.redact')} overlay={false} fallback="">
                            <button
                                className="toolbar-icon-button"
                                onClick={handleRedaction}
                                title={t('toolbar', 'redactPDFs')}
                                disabled={globalLoading('toolbar.redact')}
                            >
                                <FaEraser size={18}/>
                            </button>
                        </LoadingWrapper>
                    </div>

                    <div className="toolbar-divider"/>

                    {/* Edit Actions */}
                    <div className="toolbar-group">
                        <button
                            className={`toolbar-icon-button ${isEditMode ? 'active' : ''}`}
                            onClick={handleEdit}
                            title={t('toolbar', 'editPDF')}
                        >
                            <CiEdit size={18}/>
                        </button>
                    </div>

                    {/* Zoom Controls */}
                    <div className="toolbar-group">
                        <button
                            className="toolbar-icon-button"
                            onClick={handleZoomOut}
                            title={t('toolbar', 'zoomOut')}
                            disabled={zoomLevel <= 0.25}
                        >
                            <ZoomOut size={18}/>
                        </button>
                        <div className="zoom-indicator">
                            {Math.round(zoomLevel * 100)}%
                        </div>
                        <button
                            className="toolbar-icon-button"
                            onClick={handleZoomIn}
                            title={t('toolbar', 'zoomIn')}
                            disabled={zoomLevel >= 3}
                        >
                            <ZoomIn size={18}/>
                        </button>
                        <button
                            className="toolbar-icon-button"
                            onClick={handleZoomReset}
                            title={t('toolbar', 'resetZoom')}
                        >
                            <RotateCcw size={18}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FullScreenOverlay;
