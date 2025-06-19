import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useFileContext} from '../../../contexts/FileContext';
import {getFileKey} from '../../../contexts/PDFViewerContext';
import processingStateService, {ProcessingInfo} from '../../../services/client-services/ProcessingStateService';
import {AlertTriangle, CheckCircle, FileText, StopCircle, X, Zap} from 'lucide-react';
import {useLanguage} from '../../../contexts/LanguageContext';
import Tooltip from '../../common/Tooltip';

/**
 * EntityDetectionStatusViewer component
 *
 * Displays the current processing status for files being analyzed through
 * auto-processing or manual detection. Subscribes to the centralized
 * ProcessingStateService to receive real-time updates.
 */

const EntityDetectionStatusViewer: React.FC = () => {
    const { files } = useFileContext();
    const { t } = useLanguage();
    const [processingFiles, setProcessingFiles] = useState<Record<string, ProcessingInfo>>({});

    // Keep track of AbortController for the entire processing batch
    const abortControllerRef = useRef<AbortController | null>(null);
    const [isAborting, setIsAborting] = useState(false);

    // Load initial state and subscribe to updates
    useEffect(() => {
        // Subscribe to processing state updates
        const subscription = processingStateService.subscribe((fileKey, info) => {
            setProcessingFiles(prevState => {
                const newState = { ...prevState };

                if (info === null) {
                    // File was removed, delete from state
                    delete newState[fileKey];
                } else if (info.status === 'processing' || info.status === 'queued') {
                    // Add or update processing file
                    newState[fileKey] = info;
                } else if (newState[fileKey]) {
                    // For completed/failed statuses, keep them for a while
                    newState[fileKey] = info;

                    // Schedule removal after delay
                    setTimeout(() => {
                        setProcessingFiles(currentState => {
                            const updatedState = { ...currentState };
                            delete updatedState[fileKey];
                            return updatedState;
                        });
                    }, 5000); // Keep completed/failed statuses visible for 5 seconds
                }

                return newState;
            });
        });

        // Cleanup subscription on unmount
        return () => {
            subscription.unsubscribe();
            // Abort pending request when component unmounts
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Function to abort the entire processing batch
    const abortAllProcessing = useCallback(async () => {
        if (abortControllerRef.current) {
            setIsAborting(true);

            try {
                // Abort the request
                abortControllerRef.current.abort();

                // Update all processing files to indicate cancellation
                Object.keys(processingFiles).forEach(fileKey => {
                    if (processingFiles[fileKey].status === 'processing') {
                        processingStateService.updateProcessingInfo(fileKey, {
                            status: 'failed',
                            progress: 0,
                            error: t('pdf', 'processingCancelled') || 'Processing cancelled by user'
                        });
                    }
                });

                // Clean up the controller reference
                abortControllerRef.current = null;

                console.log('[EntityDetectionStatusViewer] Aborted all processing');
            } catch (error) {
                console.error('[EntityDetectionStatusViewer] Error aborting processing:', error);
            } finally {
                // Remove aborting state after a short delay
                setTimeout(() => {
                    setIsAborting(false);
                }, 500);
            }
        }
    }, [t, processingFiles]);

    // Function to clear processing status (also aborts if needed)
    const clearProcessingStatus = useCallback(() => {
        // Abort active request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // Clear all processing files
        setProcessingFiles({});
        setIsAborting(false);

        console.log('[EntityDetectionStatusViewer] Cleared all processing status');
    }, []);

    // Find file object by key
    const getFileByKey = useCallback((fileKey: string) => {
        return files.find(file => getFileKey(file) === fileKey);
    }, [files]);

    // Function to register the main AbortController for batch processing
    const registerAbortController = useCallback((controller: AbortController) => {
        abortControllerRef.current = controller;
        console.log('[EntityDetectionStatusViewer] Registered batch AbortController');
    }, []);

    // Function to unregister the AbortController
    const unregisterAbortController = useCallback(() => {
        abortControllerRef.current = null;
        console.log('[EntityDetectionStatusViewer] Unregistered batch AbortController');
    }, []);

    // Handle dismissing a status manually
    const handleDismiss = useCallback((fileKey: string) => {
        setProcessingFiles(prevState => {
            const newState = { ...prevState };
            delete newState[fileKey];
            return newState;
        });
    }, []);

    // Expose functions globally for other components to use
    React.useEffect(() => {
        // Make these functions available globally
        (window as any).registerProcessingAbortController = registerAbortController;
        (window as any).unregisterProcessingAbortController = unregisterAbortController;

        return () => {
            delete (window as any).registerProcessingAbortController;
            delete (window as any).unregisterProcessingAbortController;
        };
    }, [registerAbortController, unregisterAbortController]);

    // Return null if no files are being processed
    if (Object.keys(processingFiles).length === 0) {
        return null;
    }

    // Render the modern processing status overlay
    return (
        <div className="modern-processing-overlay">
            <div className="processing-header">
                <div className="processing-title">
                    <Zap size={18} className="processing-icon"/>
                    <span>{t('pdf', 'processing')}</span>
                </div>
                <div className="processing-header-actions">
                    {/* Show abort button if there are processing files */}
                    {Object.values(processingFiles).some(info => info.status === 'processing') && (
                        <Tooltip content={t('pdf', 'abortProcessing') || 'Abort Processing'}>
                            <button
                                className={`abort-all-processing-button ${isAborting ? 'aborting' : ''}`}
                                onClick={abortAllProcessing}
                                disabled={isAborting}
                                aria-label={t('pdf', 'abortProcessing') || 'Abort Processing'}
                            >
                                {isAborting ? (
                                    <div className="aborting-spinner"></div>
                                ) : (
                                    <StopCircle size={16}/>
                                )}
                            </button>
                        </Tooltip>
                    )}
                    <button
                        className="close-processing-button"
                        onClick={() => clearProcessingStatus()}
                        aria-label={t('pdf', 'dismissAll')}
                    >
                        <X size={18}/>
                    </button>
                </div>
            </div>

            <div className="processing-items-container">
                {Object.entries(processingFiles).map(([fileKey, info]) => {
                    const file = getFileByKey(fileKey);
                    const fileName = file?.name || fileKey;
                    const truncatedName = fileName.length > 28 ? fileName.substring(0, 25) + '...' : fileName;

                    return (
                        <div key={fileKey} className={`modern-processing-item ${info.status}`}>
                            <div className="processing-item-content">
                                <div className="file-info-section">
                                    <div className="file-icon-wrapper">
                                        <FileText size={20} className="file-icon"/>
                                        {info.status === 'processing' && (
                                            <div className="processing-spinner-overlay">
                                                <div className="modern-spinner"></div>
                                            </div>
                                        )}
                                        {info.status === 'completed' && (
                                            <div className="status-badge success">
                                                <CheckCircle size={12}/>
                                            </div>
                                        )}
                                        {info.status === 'failed' && (
                                            <div className="status-badge error">
                                                <AlertTriangle size={12}/>
                                            </div>
                                        )}
                                    </div>

                                    <div className="file-details-section">
                                        <Tooltip content={fileName}>
                                            <div className="file-name-modern">{truncatedName}</div>
                                        </Tooltip>
                                        <div className="status-text">
                                            {info.status === 'processing' && (
                                                <span className="status-processing">
                                                    {t('pdf', 'processing')}... {Math.round(info.progress)}%
                                                </span>
                                            )}
                                            {info.status === 'completed' && (
                                                <span className="status-success">
                                                    {t('pdf', 'processingCompleted')}
                                                </span>
                                            )}
                                            {info.status === 'failed' && (
                                                <span className="status-error">
                                                    {t('pdf', 'processingFailed')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className="dismiss-item-button"
                                    onClick={() => handleDismiss(fileKey)}
                                    aria-label={t('pdf', 'dismissStatus')}
                                >
                                    <X size={14}/>
                                </button>
                            </div>

                            {/* Modern progress bar */}
                            {info.status === 'processing' && (
                                <div className="modern-progress-container">
                                    <div className="modern-progress-track">
                                        <div
                                            className="modern-progress-fill"
                                            style={{width: `${info.progress}%`}}
                                        />
                                        <div className="progress-shimmer"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default EntityDetectionStatusViewer;
