import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    FaCog,
    FaFileDownload,
    FaHighlighter,
    FaPrint,
    FaRegEye,
    FaRegEyeSlash,
    FaSearchMinus,
    FaSearchPlus,
    FaUpload,
    FaSearch,
    FaMagic,
    FaEraser,
    FaDrawPolygon,
    FaFont
} from 'react-icons/fa';
import { useFileContext } from '../../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../../contexts/PDFViewerContext';
import { useEditContext } from '../../../contexts/EditContext';
import { useHighlightStore } from '../../../contexts/HighlightStoreContext';
import { HighlightType, HighlightCreationMode } from '../../../types';
import pdfUtilityService from '../../../store/PDFUtilityStore';
import '../../../styles/modules/pdf/Toolbar.css';

interface ToolbarProps {
    toggleLeftSidebar: () => void;
    isLeftSidebarCollapsed: boolean;
    toggleRightSidebar: () => void;
    isRightSidebarCollapsed: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
                                             toggleLeftSidebar,
                                             isLeftSidebarCollapsed,
                                             toggleRightSidebar,
                                             isRightSidebarCollapsed
                                         }) => {
    const { currentFile, addFiles, files, selectedFiles } = useFileContext();

    const {
        zoomLevel,
        setZoomLevel,
    } = usePDFViewerContext();

    const {
        isEditingMode,
        setIsEditingMode,
        highlightingMode,
        setHighlightingMode,
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
        setGeminiColor,
        hidemeColor,
        setHidemeColor,
        searchColor,
        setSearchColor,
        getSearchColor,

    } = useEditContext();

    const {
        removeAllHighlights,
        removeAllHighlightsByType,
    } = useHighlightStore();

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const visibilityButtonRef = useRef<HTMLButtonElement | null>(null);
    const visibilityMenuRef = useRef<HTMLDivElement | null>(null);
    const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
    const settingsMenuRef = useRef<HTMLDivElement | null>(null);
    const editButtonRef = useRef<HTMLButtonElement | null>(null);
    const editMenuRef = useRef<HTMLDivElement | null>(null);

    const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);

    // State for redaction status and results
    const [isRedactionInProgress, setIsRedactionInProgress] = useState(false);
    const [redactedFiles, setRedactedFiles] = useState<File[]>([]);

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

            // Check if edit menu should close
            if (isEditMenuOpen) {
                const isClickInsideEditButton = editButtonRef.current?.contains(event.target as Node) || false;
                const isClickInsideEditMenu = editMenuRef.current?.contains(event.target as Node) || false;

                if (!isClickInsideEditButton && !isClickInsideEditMenu) {
                    setIsEditMenuOpen(false);
                }
            }
        };

        // Add the event listener to handle outside clicks
        document.addEventListener('mousedown', handleClickOutside);

        // Clean up the event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisibilityMenuOpen, isSettingsMenuOpen, isEditMenuOpen]);

    // Toggle visibility menu
    const toggleVisibilityMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsVisibilityMenuOpen(!isVisibilityMenuOpen);
        setIsSettingsMenuOpen(false);
        setIsEditMenuOpen(false);
    };

    // Toggle settings menu
    const toggleSettingsMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsSettingsMenuOpen(!isSettingsMenuOpen);
        setIsVisibilityMenuOpen(false);
        setIsEditMenuOpen(false);
    };

    // Toggle edit menu
    const toggleEditMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsEditMenuOpen(!isEditMenuOpen);
        setIsVisibilityMenuOpen(false);
        setIsSettingsMenuOpen(false);
    };

    // Handle file upload - modified to support multiple files
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // Use addFiles to handle multiple files
            const newFiles = Array.from(e.target.files);
            addFiles(newFiles);

            // Show notification about added files
            setShowNotification({
                message: `Added ${newFiles.length} file${newFiles.length > 1 ? 's' : ''}`,
                type: 'success'
            });
            setTimeout(() => setShowNotification(null), 3000);
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

    // Highlighting mode selection
    const setRectangularHighlightingMode = () => {
        setHighlightingMode(HighlightCreationMode.RECTANGULAR);
        setIsEditMenuOpen(false);
    };

    const setTextSelectionHighlightingMode = () => {
        setHighlightingMode(HighlightCreationMode.TEXT_SELECTION);
        setIsEditMenuOpen(false);
    };

    // State for action feedback
    const [showNotification, setShowNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    // Create a promise-based redaction function
    const performRedaction = useCallback((): Promise<File[]> => {
        return new Promise((resolve, reject) => {
            // Only start if we're not already redacting
            if (isRedactionInProgress) {
                reject(new Error("Redaction already in progress"));
                return;
            }

            setIsRedactionInProgress(true);
            setShowNotification({
                message: 'Processing redaction...',
                type: 'success'
            });

            // Determine which files to use for redaction
            const filesToProcess = selectedFiles.length > 0 ? selectedFiles : files;

            if (filesToProcess.length === 0) {
                setIsRedactionInProgress(false);
                setShowNotification({
                    message: 'No files available for redaction',
                    type: 'error'
                });
                reject(new Error("No files for redaction"));
                return;
            }

            // Set up one-time event listener for redaction completion
            const handleRedactionComplete = (event: Event) => {
                const customEvent = event as CustomEvent;
                const { success, redactedFiles: newRedactedFiles, error } = customEvent.detail || {};

                window.removeEventListener('redaction-process-complete', handleRedactionComplete);

                setIsRedactionInProgress(false);

                if (success) {
                    // Store the new redacted files
                    if (Array.isArray(newRedactedFiles) && newRedactedFiles.length > 0) {
                        setRedactedFiles(newRedactedFiles);
                        resolve(newRedactedFiles);
                    } else {
                        // If no redacted files were created, use the original files
                        resolve(filesToProcess);
                    }
                } else {
                    reject(new Error(error || "Redaction failed"));
                }
            };

            // Listen for the redaction complete event
            window.addEventListener('redaction-process-complete', handleRedactionComplete, { once: true });

            // Set a timeout to prevent hanging indefinitely
            const timeoutId = setTimeout(() => {
                window.removeEventListener('redaction-process-complete', handleRedactionComplete);
                setIsRedactionInProgress(false);
                reject(new Error("Redaction timed out"));
            }, 60000); // 1 minute timeout

            // Trigger the redaction process
            window.dispatchEvent(new CustomEvent('trigger-redaction-process', {
                detail: {
                    source: 'toolbar-button',
                    filesToProcess: filesToProcess,
                    callback: () => {
                        clearTimeout(timeoutId);
                    }
                }
            }));
        });
    }, [files, selectedFiles, isRedactionInProgress]);

    // Download/save functions using enhanced utility service
    const handleDownloadPDF = async () => {
        if (files.length === 0) {
            setShowNotification({message: 'No files available for download', type: 'error'});
            setTimeout(() => setShowNotification(null), 3000);
            return;
        }

        try {
            setShowNotification({message: 'Preparing files for download...', type: 'success'});

            // First, perform redaction and wait for it to complete
            const filesForDownload = await performRedaction();

            // Then, download the redacted files
            const success = await pdfUtilityService.downloadMultiplePDFs(filesForDownload);

            if (success) {
                setShowNotification({
                    message: `${filesForDownload.length > 1 ? 'Files' : 'File'} downloaded successfully`,
                    type: 'success'
                });
            } else {
                setShowNotification({
                    message: 'Download failed. Please try again.',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error downloading file(s):', error);
            setShowNotification({
                message: error instanceof Error ? error.message : 'Download failed',
                type: 'error'
            });
        }

        setTimeout(() => setShowNotification(null), 3000);
    };

    const handlePrint = async () => {
        if (files.length === 0) {
            setShowNotification({message: 'No files available for printing', type: 'error'});
            setTimeout(() => setShowNotification(null), 3000);
            return;
        }

        try {
            setShowNotification({message: 'Preparing files for printing...', type: 'success'});

            // First, perform redaction and wait for it to complete
            const filesForPrinting = await performRedaction();

            // Then, print the redacted files
            const success = await pdfUtilityService.printMultiplePDFs(filesForPrinting);

            if (success) {
                setShowNotification({
                    message: 'Print job sent to browser',
                    type: 'success'
                });
            } else {
                setShowNotification({
                    message: 'Print failed. Please check popup blocker settings.',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error printing file(s):', error);
            setShowNotification({
                message: error instanceof Error ? error.message : 'Print failed',
                type: 'error'
            });
        }

        setTimeout(() => setShowNotification(null), 3000);
    };

    // Entity detection shortcut - triggers actual detection process
    const handleEntityDetection = () => {
        const filesToProcess = selectedFiles.length > 0 ? selectedFiles : currentFile ? [currentFile] : [];

        if (filesToProcess.length === 0) {
            setShowNotification({message: 'No files selected for detection', type: 'error'});
            setTimeout(() => setShowNotification(null), 3000);
            return;
        }

        // Also directly trigger the entity detection process in the sidebar
        window.dispatchEvent(new CustomEvent('trigger-entity-detection-process', {
            detail: {
                source: 'toolbar-button',
                filesToProcess: filesToProcess
            }
        }));

        // Show feedback to the user
        setShowNotification({
            message: 'Running entity detection',
            type: 'success'
        });
        setTimeout(() => setShowNotification(null), 2000);
    }

    const handleSearchShortcut = () => {        // Add a slight delay to ensure the sidebar is active
        setTimeout(() => {
            // Trigger search with default terms
            window.dispatchEvent(new CustomEvent('execute-search', {
                detail: {
                    source: 'toolbar-button',
                    applyDefaultTerms: true // Tell the search sidebar to apply all default terms
                }
            }));

            // Alternatively if there's a global function available, use it directly
            if (typeof window.executeSearchWithDefaultTerms === 'function') {
                window.executeSearchWithDefaultTerms();
            }
        }, 300);

        setShowNotification({
            message: 'Searching with default terms',
            type: 'success'
        });
        setTimeout(() => setShowNotification(null), 2000);
    }

    // This function now only triggers the redaction process directly
    const handleRedaction = () => {
        if (files.length === 0) {
            setShowNotification({message: 'No files available for redaction', type: 'error'});
            setTimeout(() => setShowNotification(null), 3000);
            return;
        }

        // Directly trigger the redaction process in the sidebar
        window.dispatchEvent(new CustomEvent('trigger-redaction-process', {
            detail: {
                source: 'toolbar-button',
                filesToProcess: selectedFiles.length > 0 ? selectedFiles : files
            }
        }));

        setShowNotification({
            message: 'Starting redaction process',
            type: 'success'
        });
        setTimeout(() => setShowNotification(null), 2000);
    }

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
            // Remove all highlights
            removeAllHighlights();

            // Update summaries after all highlights are removed
            if (currentFile) {
                const allFiles = selectedFiles.length > 0 ? selectedFiles : files;
                allFiles.forEach(file => {
                    const fileKey = getFileKey(file);
                    window.dispatchEvent(new CustomEvent('highlights-cleared', {
                        detail: {
                            fileKey,
                            allTypes: true,
                            timestamp: Date.now()
                        }
                    }));
                });
            }
        }
    };

    const handleClearManualHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();

        removeAllHighlightsByType(HighlightType.MANUAL);
        const allFiles = selectedFiles.length > 0 ? selectedFiles : files;
        // Dispatch event for manual highlights cleared
        allFiles.forEach(file => {
            const fileKey = getFileKey(file);
            window.dispatchEvent(new CustomEvent('highlights-cleared', {
                detail: {
                    fileKey,
                    allTypes: false,
                    timestamp: Date.now()
                }
            }));
        });
    }

    const handleClearSearchHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        removeAllHighlightsByType(HighlightType.SEARCH);
        const allFiles = selectedFiles.length > 0 ? selectedFiles : files;
        // Dispatch event for search highlights cleared
        allFiles.forEach(file => {
            const fileKey = getFileKey(file);
            window.dispatchEvent(new CustomEvent('search-highlights-cleared', {
                detail: {
                    fileKey,
                    allTypes: false,
                    timestamp: Date.now()
                }
            }));
        });
    };

    const handleClearEntityHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        removeAllHighlightsByType(HighlightType.ENTITY);
        const allFiles = selectedFiles.length > 0 ? selectedFiles : files;
        // Dispatch event for entity highlights cleared
        allFiles.forEach(file => {
            const fileKey = getFileKey(file);
            window.dispatchEvent(new CustomEvent('entity-highlights-cleared', {
                detail: {
                    fileKey,
                    allTypes: false,
                    timestamp: Date.now()
                }
            }));
        });
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
        setHidemeColor('#71ff71'); // Green
    };

    // Custom sidebar toggle icons
    const LeftSidebarOpenIcon = () => (
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

    const LeftSidebarCloseIcon = () => (
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

    // Right sidebar toggle icons (mirrored from left)
    const RightSidebarOpenIcon = () => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
            <g id="SVGRepo_iconCarrier">
                <path
                    d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z"
                    stroke="#292D32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M7.97 2V22" stroke="#292D32" strokeWidth="1.5" strokeLinecap="round"
                      strokeLinejoin="round"></path>
                <path d="M16.97 9.43994L14.41 11.9999L16.97 14.5599" stroke="#292D32" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"></path>
            </g>
        </svg>
    );

    const RightSidebarCloseIcon = () => (
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

    // Get icon and label for current highlighting mode
    const getHighlightIcon = () => {
        switch (highlightingMode) {
            case HighlightCreationMode.RECTANGULAR:
                return <FaDrawPolygon />;
            case HighlightCreationMode.TEXT_SELECTION:
                return <FaFont />;
            default:
                return <FaHighlighter />;
        }
    };

    const getHighlightLabel = () => {
        switch (highlightingMode) {
            case HighlightCreationMode.RECTANGULAR:
                return "Rectangle";
            case HighlightCreationMode.TEXT_SELECTION:
                return "Text";
            default:
                return "Highlight";
        }
    };

    // Listen for redaction completion event
    useEffect(() => {
        const handleRedactionComplete = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { success, redactedFiles } = customEvent.detail || {};

            if (success && Array.isArray(redactedFiles)) {
                setRedactedFiles(redactedFiles);
            }
        };

        window.addEventListener('redaction-process-complete', handleRedactionComplete);

        return () => {
            window.removeEventListener('redaction-process-complete', handleRedactionComplete);
        };
    }, []);

    return (
        <div className="enhanced-toolbar">
            {/* Left sidebar toggle button */}
            <button
                onClick={toggleLeftSidebar}
                className={`toolbar-button sidebar-toggle left ${isLeftSidebarCollapsed ? 'collapsed' : ''}`}
                title={isLeftSidebarCollapsed ? "Show left sidebar" : "Hide left sidebar"}
                style={{backgroundColor: 'transparent', border: 'none'}}
            >
                {isLeftSidebarCollapsed ? <LeftSidebarOpenIcon/> : <LeftSidebarCloseIcon/>}
            </button>

            <div className="toolbar-section">
                <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{display: 'none'}}
                    multiple
                />
                <button
                    onClick={handleUploadClick}
                    className="toolbar-button"
                    title="Open PDF"
                >
                    <FaUpload/>
                    <span className="button-label">Open</span>
                </button>

                <button
                    onClick={handleDownloadPDF}
                    className="toolbar-button"
                    title="Save PDF"
                    disabled={isRedactionInProgress || files.length === 0}
                >
                    <FaFileDownload/>
                    <span className="button-label">Save</span>
                </button>

                <button
                    onClick={handlePrint}
                    className="toolbar-button"
                    title="Print PDF"
                    disabled={isRedactionInProgress || files.length === 0}
                >
                    <FaPrint/>
                    <span className="button-label">Print</span>
                </button>
            </div>

            {/* New buttons for detection and search */}
            <div className="toolbar-section">
                <button
                    onClick={handleSearchShortcut}
                    className={`toolbar-button`}
                    title="Search PDFs"
                    disabled={files.length === 0}
                >
                    <FaSearch/>
                    <span className="button-label">Search</span>
                </button>

                <button
                    onClick={handleEntityDetection}
                    className="toolbar-button"
                    title="Detect Entities"
                    disabled={files.length === 0}
                >
                    <FaMagic/>
                    <span className="button-label">Detect</span>
                </button>

                <button
                    onClick={handleRedaction}
                    className={`toolbar-button ${isRedactionInProgress ? 'processing' : ''}`}
                    title="Redact PDFs"
                    disabled={isRedactionInProgress || files.length === 0}
                >
                    <FaEraser/>
                    <span className="button-label">
                        {isRedactionInProgress ? 'Redacting...' : 'Redact'}
                    </span>
                </button>
            </div>

            <div className="toolbar-section">
                {/* Edit button with dropdown for highlight modes */}
                <div className="toolbar-dropdown">
                    <button
                        ref={editButtonRef}
                        onClick={toggleEditMenu}
                        className={`toolbar-button ${isEditingMode ? 'active' : ''}`}
                        title="Toggle Editing Mode"
                    >
                        {getHighlightIcon()}
                        <span className="button-label">{getHighlightLabel()}</span>
                    </button>

                    {isEditMenuOpen && (
                        <div
                            className="dropdown-menu"
                            ref={editMenuRef}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="dropdown-section">
                                <h5 className="dropdown-title">Highlight Mode</h5>
                                <div
                                    className={`dropdown-item ${highlightingMode === HighlightCreationMode.RECTANGULAR ? 'active' : ''}`}
                                    onClick={setRectangularHighlightingMode}
                                >
                                    <FaDrawPolygon size={16} />
                                    <span>Rectangular Selection</span>
                                </div>
                                <div
                                    className={`dropdown-item ${highlightingMode === HighlightCreationMode.TEXT_SELECTION ? 'active' : ''}`}
                                    onClick={setTextSelectionHighlightingMode}
                                >
                                    <FaFont size={16} />
                                    <span>Text Selection</span>
                                </div>
                                <div className="dropdown-divider"></div>
                                <div className="dropdown-item">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleEditingMode();
                                            setIsEditMenuOpen(false);
                                        }}
                                        className={isEditingMode ? 'active' : ''}
                                    >
                                        {isEditingMode ? 'Disable Editing' : 'Enable Editing'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

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
                                    <label onClick={(e) => e.stopPropagation()}>
                                        HideMe AI
                                        <input
                                            type="color"
                                            value={hidemeColor}
                                            onChange={(e) => setHidemeColor(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </label>
                                </div>
                                <div className="dropdown-item">
                                    <label onClick={(e) => e.stopPropagation()}>
                                        Search
                                        <input
                                            type="color"
                                            value={searchColor}
                                            onChange={(e) => setSearchColor(e.target.value)}
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

            {/* Right sidebar toggle button */}
            <button
                onClick={toggleRightSidebar}
                className={`toolbar-button sidebar-toggle right ${isRightSidebarCollapsed ? 'collapsed' : ''}`}
                title={isRightSidebarCollapsed ? "Show right sidebar" : "Hide right sidebar"}
                style={{backgroundColor: 'transparent', border: 'none'}}
            >
                {isRightSidebarCollapsed ? <RightSidebarOpenIcon/> : <RightSidebarCloseIcon/>}
            </button>

            {/* Notification toast */}
            {showNotification && (
                <div className={`notification-toast ${showNotification.type}`}>
                    <span>{showNotification.message}</span>
                    <button
                        className="notification-toast-close"
                        onClick={() => setShowNotification(null)}
                        aria-label="Close notification"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
};

export default Toolbar;
