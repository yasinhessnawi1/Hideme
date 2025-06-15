import React, {useRef, useCallback} from 'react';
import {
    FaFileDownload,
    FaPrint,
    FaUpload,
    FaSearch,
    FaMagic,
    FaEraser,
} from 'react-icons/fa';
import { useFileContext } from '../../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../../contexts/PDFViewerContext';
import pdfUtilityService from '../../../store/PDFUtilityStore';
import MinimalToolbar from '../../common/MinimalToolbar';
import { useLoading } from "../../../contexts/LoadingContext";
import LoadingWrapper from "../../common/LoadingWrapper";
import { useNotification } from '../../../contexts/NotificationContext';
import { useLanguage } from '../../../contexts/LanguageContext';

interface ToolbarProps {
}

const Toolbar: React.FC<ToolbarProps> = ({
}) => {
    const { addFiles, files, selectedFiles } = useFileContext();

    const {
        zoomLevel,
        setZoomLevel,
    } = usePDFViewerContext();

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const { isLoading: globalLoading, startLoading, stopLoading } = useLoading();

    const { notify } = useNotification();
    const { t } = useLanguage();

    // Toggle handlers


    // Handle file upload - modified to support multiple files
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // Use addFiles to handle multiple files
            const newFiles = Array.from(e.target.files);
            addFiles(newFiles);

            // Show notification about added files
            notify({
                message: t('pdf', 'file_added_successfully').replace('{{count}}', String(newFiles.length)),
                type: 'success',
                duration: 3000
            });
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
                reject(new Error(t('pdf', 'redacting')));
                return;
            }

            startLoading('toolbar.redact');
            notify({
                message: t('pdf', 'redacting'),
                type: 'success',
                duration: 3000
            });

            // Determine which files to use for redaction

            const filesToHandle = selectedFiles.length > 0 ? selectedFiles : files

            if (filesToHandle.length === 0) {
                stopLoading('toolbar.redact');
                notify({
                    message: t('pdf', 'noFilesSelectedOrNoContentToRedact'),
                    type: 'error',
                    duration: 3000
                });
                reject(new Error(t('pdf', 'noFilesSelectedOrNoContentToRedact')));
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
                    reject(new Error(error ?? t('pdf', 'redaction_failed')));
                }
            };

            // Listen for the redaction complete event
            window.addEventListener('redaction-process-complete', handleRedactionComplete, { once: true });

            // Set a timeout to prevent hanging indefinitely
            const timeoutId = setTimeout(() => {
                window.removeEventListener('redaction-process-complete', handleRedactionComplete);
                stopLoading('toolbar.redact');
                reject(new Error(t('pdf', 'redaction_timed_out')));
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
    }, [files, selectedFiles, stopLoading, startLoading, globalLoading, t, notify]);

    // Download/save functions using enhanced utility service
    const handleDownloadPDF = async () => {
        if (files.length === 0) {
            notify({ message: t('pdf', 'no_files_selected_for_download'), type: 'error' });
            return;
        }

        try {
            notify({ message: t('pdf', 'preparing_download'), type: 'success' });
            startLoading('toolbar.save');
            //check if the files are already redacted
            let filesForDownload = files.filter(file => getFileKey(file).includes('redacted'));
            if (filesForDownload.length === 0) {
                // First, perform redaction and wait for it to complete
                filesForDownload = await performRedaction();
            }

            // Then, download the redacted files
            const success = await pdfUtilityService.downloadMultiplePDFs(filesForDownload);
            stopLoading('toolbar.save');
            if (success) {
                notify({
                    message: t('pdf', 'files_downloaded_successfully'),
                    type: 'success'
                });
            } else {
                notify({
                    message: t('pdf', 'error_downloading_files'),
                    type: 'error',
                    duration: 3000
                });
            }
        } catch (error) {
            console.error('Error downloading file(s):', error);
            notify({
                message: error instanceof Error ? error.message : t('pdf', 'error_downloading_files'),
                type: 'error',
                duration: 3000
            });
            stopLoading('toolbar.save');
        }

    };

    const handlePrint = async () => {
        if (files.length === 0) {
            notify({ message: t('pdf', 'no_files_to_print'), type: 'error' });
            return;
        }


        try {
            notify({ message: t('pdf', 'preparing_print'), type: 'success' });
            startLoading('toolbar.print');
            let filesForPrinting = files.filter(file => getFileKey(file).includes('redacted'));
            if (filesForPrinting.length === 0) {
                // First, perform redaction and wait for it to complete
                filesForPrinting = await performRedaction();
            }
            // Then, print the redacted files
            const success = await pdfUtilityService.printMultiplePDFs(filesForPrinting);
            stopLoading('toolbar.print');
            if (success) {
                notify({ message: t('toolbar', 'printJobSent'), type: 'success' });
            } else {
                notify({
                    message: t('toolbar', 'printFailedPopup'),
                    type: 'error',
                    duration: 3000
                });
            }
        } catch (error) {
            console.error('Error printing file(s):', error);
            notify({
                message: error instanceof Error ? error.message : t('toolbar', 'printFailed'),
                type: 'error',
                duration: 3000
            });
            stopLoading('toolbar.print');
        }

    };

    // Entity detection shortcut - triggers actual detection process
    const handleEntityDetection = () => {
        const filesToHandle = selectedFiles.length > 0 ? selectedFiles : files

        if (filesToHandle.length === 0) {
            notify({ message: t('toolbar', 'noFilesSelectedForDetection'), type: 'error' });
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
        notify({
            message: t('toolbar', 'searchingWithDefaultTerms'),
            type: 'success',
            duration: 3000
        });
    }

    // This function now only triggers the redaction process directly
    const handleRedaction = () => {
        const filesToHandle = selectedFiles.length > 0 ? selectedFiles : files
        if (filesToHandle.length === 0) {
            notify({ message: t('toolbar', 'noFilesAvailableForRedaction'), type: 'error' });
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

        notify({
            message: t('toolbar', 'startingRedactionProcess'),
            type: 'success',
            duration: 3000
        });
    }

    return (
        <div className="enhanced-toolbar">
            <div className="toolbar-section">
                <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    multiple
                />
                <button
                    onClick={handleUploadClick}
                    className="toolbar-button"
                    title={t('toolbar', 'openPDF')}
                >
                    <FaUpload />
                    <span className="button-label">{t('toolbar', 'open')}</span>
                </button>

                <button
                    onClick={handleDownloadPDF}
                    className="toolbar-button"
                    title={t('toolbar', 'savePDF')}
                    disabled={globalLoading('toolbar.save') || files.length === 0}
                >
                    <FaFileDownload />
                    <span className="button-label">{t('toolbar', 'save')}</span>
                </button>

                <button
                    onClick={handlePrint}
                    className="toolbar-button"
                    title={t('toolbar', 'printPDF')}
                    disabled={globalLoading('toolbar.print') || files.length === 0}
                >
                    <FaPrint />
                    <span className="button-label">{t('toolbar', 'print')}</span>
                </button>
            </div>

            {/* New buttons for detection and search */}
            <div className="toolbar-section">
                <button
                    onClick={handleSearchShortcut}
                    className={`toolbar-button`}
                    title={t('toolbar', 'searchPDFs')}
                    disabled={globalLoading('toolbar.search') || files.length === 0}
                >

                    <LoadingWrapper isLoading={globalLoading('toolbar.search')} overlay={true} fallback={t('toolbar', 'searching')}
                    >
                        {globalLoading('toolbar.search') ? '' :
                            <>
                                <FaSearch />
                                <span className="button-label">{t('toolbar', 'search')}</span>
                            </>
                        }

                    </LoadingWrapper>
                </button>

                <button
                    onClick={handleEntityDetection}
                    className="toolbar-button"
                    title={t('toolbar', 'detectEntities')}
                    disabled={globalLoading('toolbar.search') || files.length === 0}
                >

                    <LoadingWrapper isLoading={globalLoading('toolbar.detect')} overlay={false} fallback={t('toolbar', 'detecting')}
                    >
                        {globalLoading('toolbar.detect') ? '' :
                            <>
                                <FaMagic />
                                <span className="button-label">{t('toolbar', 'detect')}</span>
                            </>
                        }
                    </LoadingWrapper>
                </button>

                <button
                    onClick={handleRedaction}
                    className={`toolbar-button ${globalLoading('toolbar.redact') ? 'processing' : ''}`}
                    title={t('toolbar', 'redactPDFs')}
                    disabled={globalLoading('toolbar.redact') || files.length === 0}
                >

                    <LoadingWrapper isLoading={globalLoading('toolbar.redact')} overlay={true} fallback={t('toolbar', 'redacting')}
                    >
                        {globalLoading('toolbar.redact') ? '' :
                            <>
                                <FaEraser />
                                <span className="button-label">
                                    {t('toolbar', 'redact')}
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


        </div>
    );
};

export default Toolbar;
