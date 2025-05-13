import React, { useState } from 'react';
import { useFileContext } from '../../../contexts/FileContext';
import '../../../styles/modules/pdf/StorageSettings.css';
import { Database, Trash2, HardDrive, AlertTriangle } from 'lucide-react';
import {useLoading} from "../../../contexts/LoadingContext";
import LoadingWrapper from "../../common/LoadingWrapper";
import { useNotification } from '../../../contexts/NotificationContext';
import { useLanguage } from '../../../contexts/LanguageContext';

/**
 * Component for managing PDF storage persistence settings
 * Allows users to enable/disable storage and see storage stats
 */
const FileStorageSettings: React.FC = () => {
    const {
        isStoragePersistenceEnabled,
        setStoragePersistenceEnabled,
        storageStats,
        clearStoredFiles,
        files
    } = useFileContext();
    const {notify , confirm} = useNotification();
    const { t } = useLanguage();

    const { isLoading: globalLoading, startLoading, stopLoading } = useLoading();

    const handleTogglePersistence = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const enabled = e.target.checked;

        // If enabling and we have files, show a message about current files
        if (enabled && files.length > 0) {
            const confirmed = await confirm({
                title: t('pdf', 'enablePdfStorageTitle'),
                message: t('pdf', 'enablePdfStorageMessage'),
                type: 'info',
                confirmButton: {
                    label: t('common', 'enable'),
                },
                cancelButton: {
                    label: t('common', 'cancel'),
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
                message: t('pdf', 'allPdfsCleared'),
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
                <h4>{t('pdf', 'pdfStorage')}</h4>
            </div>

            <div className="storage-toggle">
                <label className="storage-toggle-label">
                    <input
                        type="checkbox"
                        checked={isStoragePersistenceEnabled}
                        onChange={handleTogglePersistence}
                    />
                    <span className="toggle-label-text">{t('pdf', 'storePdfsInBrowser')}</span>
                </label>
            </div>

            <div className="storage-description">
                {isStoragePersistenceEnabled ? (
                    <p>{t('pdf', 'pdfsStoredLocally')}</p>
                ) : (
                    <p>{t('pdf', 'pdfsNotSaved')}</p>
                )}
            </div>

            {isStoragePersistenceEnabled && storageStats && (
                <div className="storage-stats">
                    <div className="storage-stats-header">
                        <HardDrive size={16} />
                        <span>{t('pdf', 'storageUsage')}</span>
                    </div>

                    <div className="storage-usage">
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar"
                                style={{ width: `${Math.min(files.length / 100, 100)}%` }}
                            />
                        </div>
                        <div className="usage-text">
                            {storageStats.totalSizeFormatted} {t('pdf', 'used')}
                            ({files.length} {t('pdf', 'files')})
                        </div>
                    </div>

                    <button
                        className="clear-storage-button"
                        onClick={handleClearStoredFiles}
                        disabled={files.length === 0 || globalLoading('file_storage.clean')}
                    >

                        <LoadingWrapper isLoading={globalLoading('file_storage.clean')} overlay={true} fallback={t('pdf', 'clearing')}>
                            <Trash2 size={14} />
                            {globalLoading('file_storage.clean') ? '' :  t('pdf', 'clearAllPdfs')}
                        </LoadingWrapper>
                    </button>
                </div>
            )}

            {/* Privacy notice */}
            <div className="privacy-notice">
                <AlertTriangle size={14} />
                <p>{t('settings', 'pdfsStoredOnlyInBrowser')}</p>
            </div>

        </div>
    );
};

export default FileStorageSettings;
