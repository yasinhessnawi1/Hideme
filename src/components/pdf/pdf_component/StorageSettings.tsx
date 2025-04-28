import React, { useState } from 'react';
import { useFileContext } from '../../../contexts/FileContext';
import '../../../styles/modules/pdf/StorageSettings.css';
import { Database, Trash2, HardDrive, AlertTriangle } from 'lucide-react';
import {useLoading} from "../../../contexts/LoadingContext";
import LoadingWrapper from "../../common/LoadingWrapper";
import { useNotification } from '../../../contexts/NotificationContext';

/**
 * Component for managing PDF storage persistence settings
 * Allows users to enable/disable storage and see storage stats
 */
const StorageSettings: React.FC = () => {
    const {
        isStoragePersistenceEnabled,
        setStoragePersistenceEnabled,
        storageStats,
        clearStoredFiles,
        files
    } = useFileContext();
    const {notify , confirm} = useNotification();

    const { isLoading: globalLoading, startLoading, stopLoading } = useLoading();

    const handleTogglePersistence = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const enabled = e.target.checked;

        // If enabling and we have files, show a message about current files
        if (enabled && files.length > 0) {
            const confirmed = await confirm({
                title: 'Enable PDF storage in your browser?',
                message: 'Current PDFs will be stored and automatically loaded when you return to this page.',
                type: 'info',
                confirmButton: {
                    label: 'Enable',
                },
                cancelButton: {
                    label: 'Cancel',
                }
            });
            if (confirmed) {
                setStoragePersistenceEnabled(enabled);
            }
        } else {
            setStoragePersistenceEnabled(enabled);
        }
    };

    const handleClearStoredFiles = async () => {
        startLoading('file_storage.clean')
        try {
            await clearStoredFiles();
            notify({
                type: 'success',
                message: 'All PDFs have been cleared from your browser.',
                position: 'top-right'
            });
        } catch (error) {
            console.error('Error clearing stored files:', error);
        } finally {
            stopLoading('file_storage.clean');
        }
    };

    return (
        <div className="storage-settings">
            <div className="storage-settings-header">
                <Database size={18} />
                <h4>PDF Storage</h4>
            </div>

            <div className="storage-toggle">
                <label className="storage-toggle-label">
                    <input
                        type="checkbox"
                        checked={isStoragePersistenceEnabled}
                        onChange={handleTogglePersistence}
                    />
                    <span className="toggle-label-text">Store PDFs in browser</span>
                </label>
            </div>

            <div className="storage-description">
                {isStoragePersistenceEnabled ? (
                    <p>PDFs will be stored locally in your browser and automatically loaded when you return.</p>
                ) : (
                    <p>PDFs are not being saved to your browser.</p>
                )}
            </div>

            {isStoragePersistenceEnabled && storageStats && (
                <div className="storage-stats">
                    <div className="storage-stats-header">
                        <HardDrive size={16} />
                        <span>Storage Usage</span>
                    </div>

                    <div className="storage-usage">
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar"
                                style={{ width: `${Math.min(files.length / 100, 100)}%` }}
                            />
                        </div>
                        <div className="usage-text">
                            {storageStats.totalSizeFormatted} used
                            ({files.length} file{files.length !== 1 ? 's' : ''})
                        </div>
                    </div>

                    <button
                        className="clear-storage-button"
                        onClick={handleClearStoredFiles}
                        disabled={files.length === 0 || globalLoading('file_storage.clean')}
                    >

                        <LoadingWrapper isLoading={globalLoading('file_storage.clean')} overlay={true} fallback={'Clearing....'}
                        >
                            <Trash2 size={14} />
                            {globalLoading('file_storage.clean') ? '' :  'Clear All PDFs'}
                        </LoadingWrapper>
                    </button>
                </div>
            )}

            {/* Privacy notice */}
            <div className="privacy-notice">
                <AlertTriangle size={14} />
                <p>PDFs are stored only in your browser and are not sent to any server.</p>
            </div>

        </div>
    );
};

export default StorageSettings;
