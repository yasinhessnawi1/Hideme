import React, { useRef, useState, useCallback } from 'react';
import {
    FaFileDownload,
    FaPrint,
    FaUpload,
    FaSearch,
    FaMagic,
    FaEraser,
} from 'react-icons/fa';
import { useFileContext } from '../../../contexts/FileContext';
import { usePDFViewerContext } from '../../../contexts/PDFViewerContext';
import pdfUtilityService from '../../../store/PDFUtilityStore';
import MinimalToolbar from '../../common/MinimalToolbar';
import '../../../styles/modules/pdf/Toolbar.css';
import {useLoading} from "../../../contexts/LoadingContext";
import LoadingWrapper from "../../common/LoadingWrapper";

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
    const { addFiles, files, selectedFiles } = useFileContext();

    const {
        zoomLevel,
        setZoomLevel,
    } = usePDFViewerContext();

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const { isLoading: globalLoading, startLoading, stopLoading } = useLoading();

    // State for notification toast
    const [showNotification, setShowNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Toggle handlers


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

    // Create a promise-based redaction function
    const performRedaction = useCallback((): Promise<File[]> => {
        return new Promise((resolve, reject) => {
            // Only start if we're not already redacting
            if (globalLoading('toolbar.redact')) {
                reject(new Error("Redaction already in progress"));
                return;
            }

            startLoading('toolbar.redact');
            setShowNotification({
                message: 'Processing redaction...',
                type: 'success'
            });

            // Determine which files to use for redaction

            const filesToHandle =  selectedFiles.length > 0 ? selectedFiles : files

            if (filesToHandle.length === 0) {
                stopLoading('toolbar.redact');
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

                stopLoading('toolbar.redact');

                if (success) {
                    // Resolve with the redacted files received from the event (ensuring it's an array)
                    const resultingFiles = Array.isArray(newRedactedFiles) ? newRedactedFiles : [];
                    resolve(resultingFiles);
                } else {
                    reject(new Error(error ?? "Redaction failed"));
                }
            };

            // Listen for the redaction complete event
            window.addEventListener('redaction-process-complete', handleRedactionComplete, { once: true });

            // Set a timeout to prevent hanging indefinitely
            const timeoutId = setTimeout(() => {
                window.removeEventListener('redaction-process-complete', handleRedactionComplete);
                stopLoading('toolbar.redact');
                reject(new Error("Redaction timed out"));
            }, 60000); // 1 minute timeout

            // Trigger the redaction process
            window.dispatchEvent(new CustomEvent('trigger-redaction-process', {
                detail: {
                    source: 'toolbar-button',
                    filesToProcess: filesToHandle,
                    callback: () => {
                        clearTimeout(timeoutId);
                    }
                }
            }));
        });
    }, [files, selectedFiles, stopLoading, startLoading]);

    // Download/save functions using enhanced utility service
    const handleDownloadPDF = async () => {
        if (files.length === 0) {
            setShowNotification({message: 'No files available for download', type: 'error'});
            setTimeout(() => setShowNotification(null), 3000);
            return;
        }

        try {
            setShowNotification({message: 'Preparing files for download...', type: 'success'});
            startLoading('toolbar.save');
            // First, perform redaction and wait for it to complete
            const filesForDownload = await performRedaction();

            // Then, download the redacted files
            const success = await pdfUtilityService.downloadMultiplePDFs(filesForDownload);
            stopLoading('toolbar.save');
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
            stopLoading('toolbar.save');
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
            startLoading('toolbar.print');
            // First, perform redaction and wait for it to complete
            const filesForPrinting = await performRedaction();

            // Then, print the redacted files
            const success = await pdfUtilityService.printMultiplePDFs(filesForPrinting);
            stopLoading('toolbar.print');
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
            stopLoading('toolbar.print');
        }

        setTimeout(() => setShowNotification(null), 3000);
    };

    // Entity detection shortcut - triggers actual detection process
    const handleEntityDetection = () => {
        const filesToHandle =  selectedFiles.length > 0 ? selectedFiles : files

        if (filesToHandle.length === 0) {
            setShowNotification({message: 'No files selected for detection', type: 'error'});
            setTimeout(() => setShowNotification(null), 3000);
            return;
        }
        startLoading('toolbar.detect');
        // Also directly trigger the entity detection process in the sidebar
        window.dispatchEvent(new CustomEvent('trigger-entity-detection-process', {
            detail: {
                source: 'toolbar-button',
                filesToProcess: filesToHandle
            }
        }));
        stopLoading('toolbar.detect');
        // Show feedback to the user
        setShowNotification({
            message: 'Running entity detection',
            type: 'success'
        });
        setTimeout(() => setShowNotification(null), 2000);
    }

    const handleSearchShortcut = () => {
        startLoading('toolbar.search');
// Add a slight delay to ensure the sidebar is active
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
        stopLoading('toolbar.search');
        setShowNotification({
            message: 'Searching with default terms',
            type: 'success'
        });
        setTimeout(() => setShowNotification(null), 2000);
    }

    // This function now only triggers the redaction process directly
    const handleRedaction = () => {
        const filesToHandle =  selectedFiles.length > 0 ? selectedFiles : files
        if (filesToHandle.length === 0) {
            setShowNotification({message: 'No files available for redaction', type: 'error'});
            setTimeout(() => setShowNotification(null), 3000);
            return;
        }
        startLoading('toolbar.redact');

        // Directly trigger the redaction process in the sidebar
        window.dispatchEvent(new CustomEvent('trigger-redaction-process', {
            detail: {
                source: 'toolbar-button',
                filesToProcess: filesToHandle
            }
        }));
        stopLoading('toolbar.redact');

        setShowNotification({
            message: 'Starting redaction process',
            type: 'success'
        });
        setTimeout(() => setShowNotification(null), 2000);
    }

    // Custom sidebar toggle icons
    const LeftSidebarOpenIcon = () => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
            <g id="SVGRepo_iconCarrier">
                <path
                    d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z"
                    stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M14.97 2V22" stroke='var(--primary)' strokeWidth="1.5" strokeLinecap="round"
                      strokeLinejoin="round"></path>
                <path d="M7.96997 9.43994L10.53 11.9999L7.96997 14.5599" stroke="var(--muted-foreground)" strokeWidth="1.5"
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
                    stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M7.96997 2V22" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"
                      strokeLinejoin="round"></path>
                <path d="M14.97 9.43994L12.41 11.9999L14.97 14.5599" stroke="var(--muted-foreground)" strokeWidth="1.5"
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
                    stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M7.97 2V22" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"
                      strokeLinejoin="round"></path>
                <path d="M16.97 9.43994L14.41 11.9999L16.97 14.5599" stroke="var(--muted-foreground)" strokeWidth="1.5"
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
                    stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M14.97 2V22" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"
                      strokeLinejoin="round"></path>
                <path d="M7.96997 9.43994L10.53 11.9999L7.96997 14.5599" stroke="var(--muted-foreground)" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"></path>
            </g>
        </svg>
    );


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
                    disabled={globalLoading('toolbar.save') || files.length === 0}
                >
                    <FaFileDownload/>
                    <span className="button-label">Save</span>
                </button>

                <button
                    onClick={handlePrint}
                    className="toolbar-button"
                    title="Print PDF"
                    disabled={globalLoading('toolbar.print') || files.length === 0}
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
                    disabled={ globalLoading('toolbar.search') || files.length === 0 }
                >

                    <LoadingWrapper isLoading={globalLoading('toolbar.search')} overlay={true} fallback={'Searching...'}
                    >
                        {globalLoading('toolbar.search') ? '' :
                            <>
                                <FaSearch/>
                                <span className="button-label">Search</span>
                            </>
                        }

                    </LoadingWrapper>
                </button>

                <button
                    onClick={handleEntityDetection}
                    className="toolbar-button"
                    title="Detect Entities"
                    disabled={globalLoading('toolbar.search') ||files.length === 0  }
                >

                    <LoadingWrapper isLoading={globalLoading('toolbar.detect')} overlay={false} fallback={'Detecting...'}
                    >
                            {globalLoading('toolbar.detect') ? '' :
                            <>
                                <FaMagic/>
                                <span className="button-label">Detect</span>
                            </>
                        }
                    </LoadingWrapper>
                </button>

                <button
                    onClick={handleRedaction}
                    className={`toolbar-button ${globalLoading('toolbar.redact') ? 'processing' : ''}`}
                    title="Redact PDFs"
                    disabled={globalLoading('toolbar.redact') || files.length === 0}
                >

                    <LoadingWrapper isLoading={globalLoading('toolbar.redact')} overlay={true} fallback={'Redacting...'}
                    >
                            {globalLoading('toolbar.redact') ? '' :
                            <>
                                <FaEraser/>
                                <span className="button-label">
                                Redact
                            </span>
                            </>
                        }
                    </LoadingWrapper>
                </button>
            </div>

            {/* Use MinimalToolbar for common controls */}
            <MinimalToolbar
                zoomLevel={zoomLevel}
                setZoomLevel={setZoomLevel}

            />

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
