import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import PDFDocumentWrapper from './PDFDocumentWrapper';
import { getFileKey, usePDFViewerContext } from '../../contexts/PDFViewerContext';
import { useEditContext } from '../../contexts/EditContext';
import MinimalToolbar from '../common/MinimalToolbar';
import { HighlightCreationMode } from '../../types';
import '../../styles/modules/pdf/PdfViewer.css';
import '../../styles/modules/pdf/Toolbar.css';

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

    const {
        isEditingMode,
        setIsEditingMode,
        highlightingMode,
        setHighlightingMode,
        showManualHighlights,
        showSearchHighlights,
        showEntityHighlights,
        // Colors are handled by ToolbarSettingsMenu
    } = useEditContext();

    // --- State and Refs for Toolbar Dropdowns --- //
    const visibilityButtonRef = useRef<HTMLButtonElement | null>(null);
    const visibilityMenuRef = useRef<HTMLDivElement | null>(null);
    const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
    const settingsMenuRef = useRef<HTMLDivElement | null>(null);
    const editButtonRef = useRef<HTMLButtonElement | null>(null);
    const editMenuRef = useRef<HTMLDivElement | null>(null);

    const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);

    // --- Dropdown Toggle Handlers --- //
    const toggleVisibilityMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsVisibilityMenuOpen(prev => !prev);
        setIsSettingsMenuOpen(false);
        setIsEditMenuOpen(false);
    }, []);

    const toggleSettingsMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsSettingsMenuOpen(prev => !prev);
        setIsVisibilityMenuOpen(false);
        setIsEditMenuOpen(false);
    }, []);

    const handleEditModeToggle = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsEditingMode(!isEditingMode);
        setIsEditMenuOpen(prev => !prev);
        setIsVisibilityMenuOpen(false);
        setIsSettingsMenuOpen(false);
    }, [isEditingMode, setIsEditingMode]);

    const setRectangularHighlightingMode = useCallback(() => {
        setHighlightingMode(HighlightCreationMode.RECTANGULAR);
        setIsEditingMode(true);
        setIsEditMenuOpen(false);
    }, [setHighlightingMode, setIsEditingMode]);

    const setTextSelectionHighlightingMode = useCallback(() => {
        setHighlightingMode(HighlightCreationMode.TEXT_SELECTION);
        setIsEditingMode(true);
        setIsEditMenuOpen(false);
    }, [setHighlightingMode, setIsEditingMode]);

    // --- Zoom Handlers --- //
    const handleZoomIn = useCallback(() => {
        setZoomLevel(prev => Math.min(prev + 0.2, 3.0));
    }, [setZoomLevel]);

    const handleZoomOut = useCallback(() => {
        setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
    }, [setZoomLevel]);

    const handleZoomReset = useCallback(() => {
        setZoomLevel(1.0);
    }, [setZoomLevel]);

    // --- Effects --- //
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

    // Handle clicks outside dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isVisibilityMenuOpen && visibilityMenuRef.current && !visibilityMenuRef.current.contains(event.target as Node) && !visibilityButtonRef.current?.contains(event.target as Node)) {
                setIsVisibilityMenuOpen(false);
            }
            if (isSettingsMenuOpen && settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node) && !settingsButtonRef.current?.contains(event.target as Node)) {
                setIsSettingsMenuOpen(false);
            }
            if (isEditMenuOpen && editMenuRef.current && !editMenuRef.current.contains(event.target as Node) && !editButtonRef.current?.contains(event.target as Node)) {
                setIsEditMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisibilityMenuOpen, isSettingsMenuOpen, isEditMenuOpen]);

    return (
        <div className="fullscreen-overlay">
            <div className="fullscreen-toolbar enhanced-toolbar">
                <MinimalToolbar
                    zoomLevel={zoomLevel}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onZoomReset={handleZoomReset}
                    isEditingMode={isEditingMode}
                    highlightingMode={highlightingMode}
                    onEditModeToggle={handleEditModeToggle}
                    onSetRectangularHighlightingMode={setRectangularHighlightingMode}
                    onSetTextSelectionHighlightingMode={setTextSelectionHighlightingMode}
                    isEditMenuOpen={isEditMenuOpen}
                    editButtonRef={editButtonRef}
                    editMenuRef={editMenuRef}
                    showManualHighlights={showManualHighlights}
                    showSearchHighlights={showSearchHighlights}
                    showEntityHighlights={showEntityHighlights}
                    onVisibilityToggle={toggleVisibilityMenu}
                    isVisibilityMenuOpen={isVisibilityMenuOpen}
                    visibilityButtonRef={visibilityButtonRef}
                    visibilityMenuRef={visibilityMenuRef}
                    onSettingsToggle={toggleSettingsMenu}
                    isSettingsMenuOpen={isSettingsMenuOpen}
                    settingsButtonRef={settingsButtonRef}
                    settingsMenuRef={settingsMenuRef}
                />

                <div className="toolbar-section">
                    <div className="fullscreen-title">
                        {file.name}
                    </div>
                    <button
                        className="toolbar-button fullscreen-close-button"
                        onClick={onClose}
                        aria-label="Exit fullscreen"
                        title="Exit Fullscreen (Esc)"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="fullscreen-content">
                <PDFDocumentWrapper file={file} fileKey={fileKey} forceOpen={true} pageWidth={800} />
            </div>
        </div>
    );
};

export default FullScreenOverlay;
