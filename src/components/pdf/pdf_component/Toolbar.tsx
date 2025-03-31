import React, { useEffect, useRef, useState } from 'react';
import {
    FaCog,
    FaFileDownload,
    FaHighlighter,
    FaPrint,
    FaRegEye,
    FaRegEyeSlash,
    FaSearchMinus,
    FaSearchPlus,
    FaUpload
} from 'react-icons/fa';
import { useFileContext } from '../../../contexts/FileContext';
import { usePDFViewerContext } from '../../../contexts/PDFViewerContext';
import { useEditContext } from '../../../contexts/EditContext';
import { HighlightType, useHighlightContext } from '../../../contexts/HighlightContext';
import '../../../styles/modules/pdf/Toolbar.css';

interface ToolbarProps {
    toggleSidebar: () => void;
    isSidebarCollapsed: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ toggleSidebar, isSidebarCollapsed }) => {
    const { currentFile, addFile, isAutoProcessingEnabled, setAutoProcessingEnabled } = useFileContext();

    const {
        zoomLevel,
        setZoomLevel,
    } = usePDFViewerContext();

    const {
        isEditingMode,
        setIsEditingMode,
        highlightColor,
        setHighlightColor,
        showSearchHighlights,
        setShowSearchHighlights,
        showEntityHighlights,
        setShowEntityHighlights,
        showManualHighlights,
        setShowManualHighlights,

        presidioColor,
        setPresidioColor,
        glinerColor,
        setGlinerColor,
        geminiColor,
        setGeminiColor
    } = useEditContext();

    const {
        clearAnnotations,
        clearAnnotationsByType,
    } = useHighlightContext();

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const visibilityButtonRef = useRef<HTMLButtonElement | null>(null);
    const visibilityMenuRef = useRef<HTMLDivElement | null>(null);
    const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
    const settingsMenuRef = useRef<HTMLDivElement | null>(null);

    const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

    // Handle clicks outside our dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if visibility menu should close
            if (isVisibilityMenuOpen) {
                const isClickInsideVisibilityButton = visibilityButtonRef.current?.contains(event.target as Node) || false;
                const isClickInsideVisibilityMenu = visibilityMenuRef.current?.contains(event.target as Node) || false;

                if (!isClickInsideVisibilityButton && !isClickInsideVisibilityMenu) {
                    setIsVisibilityMenuOpen(false);
                }
            }

            // Check if settings menu should close
            if (isSettingsMenuOpen) {
                const isClickInsideSettingsButton = settingsButtonRef.current?.contains(event.target as Node) || false;
                const isClickInsideSettingsMenu = settingsMenuRef.current?.contains(event.target as Node) || false;

                if (!isClickInsideSettingsButton && !isClickInsideSettingsMenu) {
                    setIsSettingsMenuOpen(false);
                }
            }
        };

        // Add the event listener to handle outside clicks
        document.addEventListener('mousedown', handleClickOutside);

        // Clean up the event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisibilityMenuOpen, isSettingsMenuOpen]);

    // Toggle visibility menu
    const toggleVisibilityMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsVisibilityMenuOpen(!isVisibilityMenuOpen);
        setIsSettingsMenuOpen(false);
    };

    // Toggle settings menu
    const toggleSettingsMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsSettingsMenuOpen(!isSettingsMenuOpen);
        setIsVisibilityMenuOpen(false);
    };

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFile(e.target.files[0]);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // Zoom controls
    const handleZoomIn = () => {
        setZoomLevel(Math.min(zoomLevel + 0.2, 3.0));
    };

    const handleZoomOut = () => {
        setZoomLevel(Math.max(zoomLevel - 0.2, 0.5));
    };

    const handleZoomReset = () => {
        setZoomLevel(1.0);
    };

    // Mode toggles
    const toggleEditingMode = () => {
        setIsEditingMode(!isEditingMode);
    };

    // Download/save functions
    const handleDownloadPDF = () => {
        if (!currentFile) return;

        // Create a download link for the current file
        const url = URL.createObjectURL(currentFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFile.name || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        if (!currentFile) return;

        // Create a temporary URL for the file
        const url = URL.createObjectURL(currentFile);

        // Open in a new window for printing
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
            printWindow.addEventListener('load', () => {
                printWindow.print();
            });
        }

        // Cleanup URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    // Visibility toggle handlers
    const handleToggleManualHighlights = (e: React.MouseEvent<HTMLInputElement>) => {
        // Don't let the click close the menu
        e.stopPropagation();
        setShowManualHighlights(!showManualHighlights);
    };

    const handleToggleSearchHighlights = (e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setShowSearchHighlights(!showSearchHighlights);
    };

    const handleToggleEntityHighlights = (e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setShowEntityHighlights(!showEntityHighlights);
    };

    // Clear function handlers
    const handleClearAllHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to clear all highlights?')) {
            clearAnnotations();
        }
    };

    const handleClearManualHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        clearAnnotationsByType(HighlightType.MANUAL);
    };

    const handleClearSearchHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        clearAnnotationsByType(HighlightType.SEARCH);
    };

    const handleClearEntityHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        clearAnnotationsByType(HighlightType.ENTITY);
    };

    // Handle color change
    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setHighlightColor(e.target.value);
    };
    const handleResetEntityColors = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPresidioColor('#ffd771'); // Yellow
        setGlinerColor('#ff7171'); // Red
        setGeminiColor('#7171ff'); // Blue
    };

    // Custom sidebar toggle icons
    const SidebarOpenIcon = () => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
            <g id="SVGRepo_iconCarrier">
                <path
                    d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z"
                    stroke="#292D32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M14.97 2V22" stroke="#292D32" strokeWidth="1.5" strokeLinecap="round"
                      strokeLinejoin="round"></path>
                <path d="M7.96997 9.43994L10.53 11.9999L7.96997 14.5599" stroke="#292D32" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"></path>
            </g>
        </svg>
    );

    const SidebarCloseIcon = () => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
            <g id="SVGRepo_iconCarrier">
                <path
                    d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z"
                    stroke="#292D32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M7.96997 2V22" stroke="#292D32" strokeWidth="1.5" strokeLinecap="round"
                      strokeLinejoin="round"></path>
                <path d="M14.97 9.43994L12.41 11.9999L14.97 14.5599" stroke="#292D32" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"></path>
            </g>
        </svg>
    );

    return (
        <div className="enhanced-toolbar">
            {/* Custom sidebar toggle button */}
            <button
                onClick={toggleSidebar}
                className={`toolbar-button sidebar-toggle ${isSidebarCollapsed ? 'collapsed' : ''}`}
                title={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                style={{backgroundColor: 'transparent', border: 'none'}} // Add margin to the right
            >
                {isSidebarCollapsed ? <SidebarOpenIcon/> : <SidebarCloseIcon/>}
            </button>

            <div className="toolbar-section">
                <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{display: 'none'}}
                />
                <button
                    onClick={handleUploadClick}
                    className="toolbar-button"
                    title="Upload PDF"
                >
                    <FaUpload/>
                    <span className="button-label">Open</span>
                </button>

                <button
                    onClick={handleDownloadPDF}
                    className="toolbar-button"
                    title="Download PDF"
                    disabled={!currentFile}
                >
                    <FaFileDownload/>
                    <span className="button-label">Save</span>
                </button>

                <button
                    onClick={handlePrint}
                    className="toolbar-button"
                    title="Print PDF"
                    disabled={!currentFile}
                >
                    <FaPrint/>
                    <span className="button-label">Print</span>
                </button>
            </div>

            <div className="toolbar-section">
                <button
                    onClick={toggleEditingMode}
                    className={`toolbar-button ${isEditingMode ? 'active' : ''}`}
                    title="Toggle Editing Mode"
                >
                    <FaHighlighter/>
                    <span className="button-label">Edit</span>
                </button>

                <div className="toolbar-dropdown">
                    <button
                        ref={visibilityButtonRef}
                        onClick={toggleVisibilityMenu}
                        className="toolbar-button visibility-toggle"
                        title="Highlight Visibility"
                    >
                        {showManualHighlights && showSearchHighlights && showEntityHighlights ? (
                            <FaRegEye/>
                        ) : (
                            <FaRegEyeSlash/>
                        )}
                        <span className="button-label">Show</span>
                    </button>

                    {isVisibilityMenuOpen && (
                        <div
                            className="dropdown-menu"
                            ref={visibilityMenuRef}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="dropdown-item">
                                <label onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={showManualHighlights}
                                        onClick={handleToggleManualHighlights}
                                        readOnly
                                    />
                                    Manual Highlights
                                </label>
                            </div>
                            <div className="dropdown-item">
                                <label onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={showSearchHighlights}
                                        onClick={handleToggleSearchHighlights}
                                        readOnly
                                    />
                                    Search Highlights
                                </label>
                            </div>
                            <div className="dropdown-item">
                                <label onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={showEntityHighlights}
                                        onClick={handleToggleEntityHighlights}
                                        readOnly
                                    />
                                    Entity Highlights
                                </label>
                            </div>
                            <div className="dropdown-divider"></div>
                            <div className="dropdown-item">
                                <button onClick={handleClearAllHighlights}>Clear All</button>
                            </div>
                            <div className="dropdown-item">
                                <button onClick={handleClearManualHighlights}>Clear Manual</button>
                            </div>
                            <div className="dropdown-item">
                                <button onClick={handleClearSearchHighlights}>Clear Search</button>
                            </div>
                            <div className="dropdown-item">
                                <button onClick={handleClearEntityHighlights}>Clear Entity</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="toolbar-dropdown">
                    <button
                        ref={settingsButtonRef}
                        onClick={toggleSettingsMenu}
                        className="toolbar-button settings-toggle"
                        title="Settings"
                    >
                        <FaCog/>
                        <span className="button-label">Settings</span>
                    </button>

                    {isSettingsMenuOpen && (
                        <div
                            className="dropdown-menu"
                            ref={settingsMenuRef}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="dropdown-section">
                                <h5 className="dropdown-title">Manual Highlight</h5>
                                <div className="dropdown-item">
                                    <label onClick={(e) => e.stopPropagation()}>
                                        Color
                                        <input
                                            type="color"
                                            value={highlightColor}
                                            onChange={handleColorChange}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="dropdown-section">
                                <h5 className="dropdown-title">Entity Model Colors</h5>
                                <div className="dropdown-item">
                                    <label onClick={(e) => e.stopPropagation()}>
                                        Presidio
                                        <input
                                            type="color"
                                            value={presidioColor}
                                            onChange={(e) => setPresidioColor(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </label>
                                </div>
                                <div className="dropdown-item">
                                    <label onClick={(e) => e.stopPropagation()}>
                                        Gliner
                                        <input
                                            type="color"
                                            value={glinerColor}
                                            onChange={(e) => setGlinerColor(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </label>
                                </div>
                                <div className="dropdown-item">
                                    <label onClick={(e) => e.stopPropagation()}>
                                        Gemini
                                        <input
                                            type="color"
                                            value={geminiColor}
                                            onChange={(e) => setGeminiColor(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </label>
                                </div>
                                <div className="dropdown-item">
                                    <button onClick={handleResetEntityColors}>Reset Entity Colors</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="dropdown-section">
                <h5 className="dropdown-title">Auto Processing</h5>
                <div className="dropdown-item">
                    <label onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={isAutoProcessingEnabled}
                            onChange={(e) => setAutoProcessingEnabled(e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                        />
                        Auto-process new files
                    </label>
                    <div className="setting-description">
                        {isAutoProcessingEnabled ?
                            "New files will inherit current entity and search settings" :
                            "New files will not be automatically processed"}
                    </div>
                </div>
            </div>

            <div className="toolbar-section">
                <button
                    onClick={handleZoomOut}
                    className="toolbar-button"
                    title="Zoom Out"
                    disabled={zoomLevel <= 0.5}
                >
                    <FaSearchMinus/>
                </button>

                <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>

                <button
                    onClick={handleZoomIn}
                    className="toolbar-button"
                    title="Zoom In"
                    disabled={zoomLevel >= 3.0}
                >
                    <FaSearchPlus/>
                </button>

                <button
                    onClick={handleZoomReset}
                    className="toolbar-button"
                    title="Reset Zoom"
                >
                    <span className="button-label">Reset</span>
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
