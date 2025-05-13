import React, { useEffect} from 'react';
import { X } from 'lucide-react';
import PDFDocumentWrapper from './PDFWrapper';
import { getFileKey, usePDFViewerContext } from '../../../contexts/PDFViewerContext';
import MinimalToolbar from '../../common/MinimalToolbar';
import '../../../styles/modules/pdf/PdfViewer.css';
import '../../../styles/modules/pdf/Toolbar.css';
import { useLanguage } from '../../../contexts/LanguageContext';

interface FullScreenOverlayProps {
    file: File;
    onClose: () => void;
}

/**
 * FullScreenOverlay component for displaying a single PDF in fullscreen mode
 */
const FullScreenOverlay: React.FC<FullScreenOverlayProps> = ({ file, onClose }) => {
    const fileKey = getFileKey(file);

    // --- Context Hooks --- //
    const {
        zoomLevel,
        setZoomLevel
    } = usePDFViewerContext();

    const { t } = useLanguage();

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden'; // Lock scroll
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = ''; // Unlock scroll
        };
    }, [onClose]);

    return (
        <div className="fullscreen-overlay">
            <div className="fullscreen-toolbar enhanced-toolbar">
                <MinimalToolbar
                    zoomLevel={zoomLevel}
                    setZoomLevel={setZoomLevel}
                />

                <div className="toolbar-section">
                    <div className="fullscreen-title">
                        {file.name}
                    </div>
                    <button
                        className="toolbar-button fullscreen-close-button"
                        onClick={onClose}
                        aria-label={t('pdf', 'exitFullscreen')}
                        title={t('pdf', 'exitFullscreenWithEsc')}
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="fullscreen-content">
                <PDFDocumentWrapper file={file} fileKey={fileKey} forceOpen={true} />
            </div>
        </div>
    );
};

export default FullScreenOverlay;
