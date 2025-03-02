import React, {useEffect, useRef, useState} from 'react';
import {
    FaChevronLeft,
    FaChevronRight,
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
import {usePDFContext} from '../../contexts/PDFContext';
import {HighlightType, useHighlightContext} from '../../contexts/HighlightContext';
import '../../styles/pdf/Toolbar.css';

interface ToolbarProps {
    toggleSidebar: () => void;
    isSidebarCollapsed: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({toggleSidebar, isSidebarCollapsed}) => {
    const {
        file,
        setFile,
        zoomLevel,
        setZoomLevel,
        isEditingMode,
        setIsEditingMode,
        highlightColor,
        setHighlightColor,
        numPages,
        currentPage,
        setCurrentPage,
        scrollToPage
    } = usePDFContext();

    const {
        clearAnnotations,
        clearAnnotationsByType,
        showSearchHighlights,
        setShowSearchHighlights,
        showEntityHighlights,
        setShowEntityHighlights,
        showManualHighlights,
        setShowManualHighlights
    } = useHighlightContext();

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const visibilityButtonRef = useRef<HTMLButtonElement | null>(null);
    const visibilityMenuRef = useRef<HTMLDivElement | null>(null);
    const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
    const settingsMenuRef = useRef<HTMLDivElement | null>(null);

    const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const [pageInputValue, setPageInputValue] = useState<string>(currentPage.toString());

    // Update page input when current page changes
    useEffect(() => {
        setPageInputValue(currentPage.toString());
    }, [currentPage]);

    // Handle clicks outside our dropdowns - more robust implementation
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
            setFile(e.target.files[0]);
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

    // Navigation
    const handleGoToPage = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const pageNumber = parseInt(pageInputValue);

        if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= numPages) {
            scrollToPage(pageNumber);
        } else {
            // Reset to current page if invalid input
            setPageInputValue(currentPage.toString());
        }
    };

    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPageInputValue(e.target.value);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            scrollToPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < numPages) {
            scrollToPage(currentPage + 1);
        }
    };

    // Download/save functions
    const handleDownloadPDF = () => {
        if (!file) return;

        // Create a download link for the current file
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        if (!file) return;

        // Create a temporary URL for the file
        const url = URL.createObjectURL(file);

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
            // Don't close the menu automatically - let the user decide
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

    // Custom sidebar toggle icons
    const SidebarOpenIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
             strokeLinecap="round" strokeLinejoin="round">
            <path
                d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z"/>
            <path d="M14.97 2V22"/>
            <path d="M7.96997 9.43994L10.53 11.9999L7.96997 14.5599"/>
        </svg>
    );

    const SidebarCloseIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
             strokeLinecap="round" strokeLinejoin="round">
            <path
                d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z"/>
            <path d="M7.96997 2V22"/>
            <path d="M14.97 9.43994L12.41 11.9999L14.97 14.5599"/>
        </svg>
    );

    return (
        <div className="enhanced-toolbar">
            {/* Custom sidebar toggle button */}
            <button
                onClick={toggleSidebar}
                className={`toolbar-button sidebar-toggle ${isSidebarCollapsed ? 'collapsed' : ''}`}
                title={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
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
                    disabled={!file}
                >
                    <FaFileDownload/>
                    <span className="button-label">Save</span>
                </button>

                <button
                    onClick={handlePrint}
                    className="toolbar-button"
                    title="Print PDF"
                    disabled={!file}
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
                            <div className="dropdown-item">
                                <label onClick={(e) => e.stopPropagation()}>
                                    Highlight Color
                                    <input
                                        type="color"
                                        value={highlightColor}
                                        onChange={handleColorChange}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="toolbar-section">
                <button
                    onClick={handleZoomOut}
                    className="toolbar-button"
                    title="Zoom Out (zooming desterbes teh highlitng!)"
                    disabled={zoomLevel <= 0.5}
                >
                    <FaSearchMinus/>
                </button>

                <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>

                <button
                    onClick={handleZoomIn}
                    className="toolbar-button"
                    title="Zoom In (zooming desterbes teh highlitng!)"
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

            <div className="toolbar-section">
                <button
                    onClick={handlePreviousPage}
                    className="toolbar-button"
                    title="Previous Page"
                    disabled={currentPage <= 1 || !file}
                >
                    <FaChevronLeft/>
                </button>

                <form onSubmit={handleGoToPage} className="page-navigation-form">
                    <input
                        type="number"
                        name="page-number"
                        min="1"
                        max={numPages}
                        value={pageInputValue}
                        onChange={handlePageInputChange}
                        disabled={!file}
                    />
                    <span> / {numPages || 0}</span>
                </form>

                <button
                    onClick={handleNextPage}
                    className="toolbar-button"
                    title="Next Page"
                    disabled={currentPage >= numPages || !file}
                >
                    <FaChevronRight/>
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
