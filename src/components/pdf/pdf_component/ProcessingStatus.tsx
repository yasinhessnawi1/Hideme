import React, { useEffect, useState, useCallback } from 'react';
import { useFileContext } from '../../../contexts/FileContext';
import { getFileKey } from '../../../contexts/PDFViewerContext';
import processingStateService, { ProcessingInfo } from '../../../services/ProcessingStateService';
import '../../../styles/modules/pdf/AutoProcessingStatus.css';
import { XCircle, Loader, CheckCircle, AlertTriangle } from 'lucide-react';

/**
 * ProcessingStatus component
 *
 * Displays the current processing status for files being analyzed through
 * auto-processing or manual detection. Subscribes to the centralized
 * ProcessingStateService to receive real-time updates.
 */
const ProcessingStatus: React.FC = () => {
    const { files } = useFileContext();
    const [processingFiles, setProcessingFiles] = useState<Record<string, ProcessingInfo>>({});

    // Load initial state and subscribe to updates
    useEffect(() => {
        console.log('[ProcessingStatus] Component mounted, setting up subscription');

        // Subscribe to processing state updates
        const subscription = processingStateService.subscribe((fileKey, info) => {
            console.log(`[ProcessingStatus] Received update for ${fileKey}:`, info);

            setProcessingFiles(prevState => {
                const newState = { ...prevState };

                if (info === null) {
                    // File was removed, delete from state
                    delete newState[fileKey];
                    console.log(`[ProcessingStatus] Removed file ${fileKey} from display`);
                } else if (info.status === 'processing' || info.status === 'queued') {
                    // Add or update processing file
                    newState[fileKey] = info;
                    console.log(`[ProcessingStatus] Added/updated processing file ${fileKey}`);
                } else if (newState[fileKey]) {
                    // For completed/failed statuses, keep them for a while
                    newState[fileKey] = info;
                    console.log(`[ProcessingStatus] Updated file ${fileKey} status to ${info.status}`);

                    // Schedule removal after delay
                    setTimeout(() => {
                        setProcessingFiles(currentState => {
                            const updatedState = { ...currentState };
                            delete updatedState[fileKey];
                            console.log(`[ProcessingStatus] Auto-removing completed/failed file ${fileKey}`);
                            return updatedState;
                        });
                    }, 5000); // Keep completed/failed statuses visible for 5 seconds
                }

                return newState;
            });
        });

        // Debug log current state
        const interval = setInterval(() => {
            const processingCount = processingStateService.getProcessingFilesCount();
            if (processingCount > 0) {
                console.log(`[ProcessingStatus] Currently processing ${processingCount} files`);
            }
        }, 2000);

        // Cleanup subscription on unmount
        return () => {
            subscription.unsubscribe();
            clearInterval(interval);
            console.log('[ProcessingStatus] Component unmounted, subscription cleaned up');
        };
    }, []);

    // Find file object by key
    const getFileByKey = useCallback((fileKey: string) => {
        return files.find(file => getFileKey(file) === fileKey);
    }, [files]);

    // Handle dismissing a status manually
    const handleDismiss = useCallback((fileKey: string) => {
        setProcessingFiles(prevState => {
            const newState = { ...prevState };
            delete newState[fileKey];
            return newState;
        });
    }, []);

    // Return null if no files are being processed
    if (Object.keys(processingFiles).length === 0) {
        return null;
    }

    // Render the processing status overlay
    return (
        <div className="processing-status-container entering">
            {Object.entries(processingFiles).map(([fileKey, info]) => {
                const file = getFileByKey(fileKey);
                const fileName = file?.name || fileKey;

                // Determine icon based on status
                let StatusIcon = Loader;
                let statusClass = 'processing';

                if (info.status === 'completed') {
                    StatusIcon = CheckCircle;
                    statusClass = 'success';
                } else if (info.status === 'failed') {
                    StatusIcon = AlertTriangle;
                    statusClass = 'error';
                }

                return (
                    <div key={fileKey} className={`processing-status-item ${statusClass}`}>
                        <div className="processing-status-header">
                            <div className="processing-file-name" title={fileName}>
                                <StatusIcon
                                    size={16}
                                    className={`processing-status-icon ${statusClass}`}
                                />
                                {fileName}
                            </div>
                            {(info.status === 'completed' || info.status === 'failed') && (
                                <button
                                    className="dismiss-status-button"
                                    onClick={() => handleDismiss(fileKey)}
                                    aria-label="Dismiss status"
                                >
                                    <XCircle size={16} />
                                </button>
                            )}
                        </div>

                        {/* Progress bar */}
                        {info.status === 'processing' && (
                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${info.progress}%` }}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={info.progress}
                                    role="progressbar"
                                />
                            </div>
                        )}

                        {/* Status message */}
                        <div className="processing-status-message">
                            {info.status === 'processing'
                                ? `Processing... ${info.progress}%`
                                : info.status === 'completed'
                                    ? 'Processing completed'
                                    : `Processing failed: ${info.error || 'Unknown error'}`
                            }
                        </div>
                        {info.status === 'processing' && (
                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${info.progress}%` }}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={info.progress}
                                    role="progressbar"
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ProcessingStatus;
