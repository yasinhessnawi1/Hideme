import React, { useState, useEffect, useCallback, useRef } from "react";
import { Save, ChevronDown, ChevronUp, AlertTriangle, Database, HardDrive, Trash2, Loader2, Sliders, Upload, Download, FileWarning } from "lucide-react";
import { useFileContext } from "../../../contexts/FileContext"; // Adjust path if needed
import { useAutoProcess } from "../../../hooks/general/useAutoProcess"; // Adjust path if needed
import { ThemePreference } from "../../../hooks/general/useTheme";
import { useThemeContext } from "../../../contexts/ThemeContext";
import { useUserContext } from "../../../contexts/UserContext";
import useDocument from "../../../hooks/settings/useDocument";
import LoadingWrapper from "../../common/LoadingWrapper";
import { useNotification } from "../../../contexts/NotificationContext";
import { useLoading } from "../../../contexts/LoadingContext";
import { useLanguage } from "../../../contexts/LanguageContext";
import { AVAILABLE_LANGUAGES, Language } from "../../../utils/i18n"; // Import Language type and AVAILABLE_LANGUAGES
import { mapBackendErrorToMessage } from '../../../utils/errorUtils';

export default function GeneralSettings() {
    const {
        settings,
        updateSettings,
        exportSettings,
        importSettings,
        settingsLoading: isUserLoading,
        settingsError: userError,
        clearSettingsError: clearUserError
    } = useUserContext();
    const {
        isStoragePersistenceEnabled,
        setStoragePersistenceEnabled,
        storageStats,
        clearStoredFiles
    } = useFileContext();
    const { setAutoProcessingEnabled: setAutoProcessHookEnabled, getConfig } = useAutoProcess();
    const { preference: currentThemePreference, setPreference: setThemePreference } = useThemeContext();
    const { notify, confirm } = useNotification();
    const {
        validateSettingsFile,
        sanitizeSettingsFile,
        downloadJsonFile,
        parseJsonFile,
        error: documentError,
        isLoading: documentLoading,
        clearError: clearDocumentError
    } = useDocument();

    // Initialize the loading context hook
    const { isLoading: globalLoading, startLoading, stopLoading } = useLoading();

    // Reference to the file input element
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Import/Export state
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState<boolean>(false);

    // --- Local State ---
    const [isAutoProcessing, setIsAutoProcessing] = useState(() => {
        if (settings?.auto_processing !== undefined) return settings.auto_processing;
        const autoProcessConfig = getConfig();
        return autoProcessConfig.isActive ?? true;
    });
    const [isStorageEnabled, setIsStorageEnabled] = useState(isStoragePersistenceEnabled);

    // Default threshold value: 0.5 (50%)
    const [detectionThreshold, setDetectionThreshold] = useState<number>(() => {
        if (settings?.detection_threshold !== undefined) return settings.detection_threshold;
        return 0.5; // Default threshold
    });

    // Ban list usage setting
    const [useBanlist, setUseBanlist] = useState<boolean>(() => {
        if (settings?.use_banlist_for_detection !== undefined) return settings.use_banlist_for_detection;
        return false; // Default to not using ban list
    });
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    const { t, language, setLanguage } = useLanguage();

    // Clear import status messages after a delay
    useEffect(() => {
        if (importError || importSuccess) {
            const timer = setTimeout(() => {
                setImportError(null);
                setImportSuccess(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [importError, importSuccess]);

    // Effect to sync local state when EXTERNAL settings data changes
    useEffect(() => {
        console.log("[GeneralSettings] Settings from hook updated:", settings);
        if (settings) {
            if (settings.auto_processing !== undefined && settings.auto_processing !== isAutoProcessing) {
                setIsAutoProcessing(settings.auto_processing);
            }

            // Sync detection threshold from settings
            if (settings.detection_threshold !== undefined && settings.detection_threshold !== detectionThreshold) {
                setDetectionThreshold(settings.detection_threshold);
            }

            // Sync ban list usage setting from settings
            if (settings.use_banlist_for_detection !== undefined && settings.use_banlist_for_detection !== useBanlist) {
                setUseBanlist(settings.use_banlist_for_detection);
            }
        }
        if (isStoragePersistenceEnabled !== isStorageEnabled) {
            setIsStorageEnabled(isStoragePersistenceEnabled);
        }
    }, [settings, isStoragePersistenceEnabled]); // Keep dependencies minimal

    // Add an effect to listen for settings import completion
    useEffect(() => {
        const handleSettingsImportCompleted = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { success } = customEvent.detail || {};

            if (success) {
                // Update UI after the settings have been refreshed
                // This will happen automatically when the settings state updates
                console.log("[GeneralSettings] Settings import completed");
            }
        };

        window.addEventListener('settings-import-completed', handleSettingsImportCompleted);

        return () => {
            window.removeEventListener('settings-import-completed', handleSettingsImportCompleted);
        };
    }, []);

    // Update storage context when local toggle changes it
    useEffect(() => {
        if(isStoragePersistenceEnabled !== isStorageEnabled) {
            setStoragePersistenceEnabled(isStorageEnabled);
        }
    }, [isStorageEnabled, isStoragePersistenceEnabled, setStoragePersistenceEnabled]);

    // Handle document errors
    useEffect(() => {
        if (documentError) {
            setImportError(documentError);
            clearDocumentError();
        }
    }, [documentError, clearDocumentError]);

    // --- Handlers ---
    const handleThemeChange = (newTheme: ThemePreference) => {
        setThemePreference(newTheme);
    };

    const handleAutoProcessToggle = (enabled: boolean) => {
        console.log("[GeneralSettings] handleAutoProcessToggle called, setting local state to:", enabled);
        setIsAutoProcessing(enabled);
    };

    const handleStorageToggle = (enabled: boolean) => {
        console.log("[GeneralSettings] handleStorageToggle called, setting local state to:", enabled);
        setIsStorageEnabled(enabled);
    };

    const handleSaveChanges = async () => {
        startLoading('setting.general.save');
        clearUserError();

        try {
            await updateSettings({
                theme: currentThemePreference,
                auto_processing: isAutoProcessing,
                detection_threshold: detectionThreshold,
                use_banlist_for_detection: useBanlist
            });

            // Update auto-processing hook
            setAutoProcessHookEnabled(isAutoProcessing);

            // Notify other components about detection settings change
            window.dispatchEvent(new CustomEvent('settings-changed', {
                detail: {
                    type: 'entity',
                    settings: {
                        detectionThreshold: detectionThreshold,
                        useBanlist: useBanlist
                    }
                }
            }));

            notify({
                message: t('notifications', 'settingsSaved'),
                type: "success",
                duration: 3000
            });
        } catch (err: any) {
            const message = mapBackendErrorToMessage(err) || t('errors', 'failedToUpdateSettings');
            notify({
                message: message,
                type: "error",
                duration: 5000
            });
        } finally {
            stopLoading('setting.general.save');
        }
    };

    const handleClearStoredFilesClick = async () => {
        startLoading('setting.general.clear');
        try {
            await clearStoredFiles();
            notify({
                message: t('notifications', 'storedFilesCleared'),
                type: "success",
                duration: 3000
            });
        } catch (error) {
            console.error('Error clearing stored files:', error);
            notify({
                message: t('notifications', 'failedToClearFiles'),
                type: "error",
                duration: 5000
            });
        } finally {
            stopLoading('setting.general.clear');
        }
    };

    // --- Import/Export Handlers ---
    const handleExportSettings = async () => {
        startLoading('settings.export');
        try {
            // The exportSettings function now handles the file download directly
            await exportSettings();

            notify({
                message: t('notifications', 'settingsExported'),
                type: "success",
                duration: 3000
            });
        } catch (error: any) {
            console.error('Error exporting settings:', error);
            notify({
                message: mapBackendErrorToMessage(error) || t('notifications', 'exportFailed'),
                type: "error",
                duration: 5000
            });
        } finally {
            stopLoading('settings.export');
        }
    };

    const handleImportClick = () => {
        // Clear previous status
        setImportError(null);
        setImportSuccess(false);

        // Trigger file input click
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        startLoading('settings.import');
        setImportError(null);
        setImportSuccess(false);

        try {
            // Import the file directly without parsing
            const result = await importSettings(file);

            if (result) {
                setImportSuccess(true);
                notify({
                    message: t('notifications', 'settingsImported'),
                    type: "success",
                    duration: 3000
                });

                // Note: Settings states will be refreshed automatically by UserContext
                // via the settings-import-completed event
            } else {
                setImportError("Failed to import settings.");
            }
        } catch (error: any) {
            console.error('Error importing settings:', error);
            setImportError(error.message || "Error importing settings file.");
        } finally {
            // Reset the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            // Keep loading state active for a short period while settings refresh
            setTimeout(() => {
                stopLoading('settings.import');
            }, 1000);
        }
    };

    const isLoading = isUserLoading || documentLoading;

    const effectiveStorageStats = storageStats || { percentUsed: 0, totalSize: "0 MB", fileCount: 0 };

    // --- JSX ---
    return (
        <div className="space-y-6">
            {/* Appearance Card */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">{t('settings', 'appearance')}</h2>
                    <p className="card-description">{t('settings', 'customizeAppearance')}</p>
                </div>
                <div className="card-content space-y-4">
                    <div className="setting-row">
                        <div className="setting-label">
                            <label className="form-label" htmlFor="theme-select">{t('settings', 'theme')}</label>
                        </div>
                        <div className="setting-control">
                            <select
                                id="theme-select"
                                name="theme"
                                className="select"
                                value={settings?.theme || 'system'}
                                onChange={(e) => handleThemeChange(e.target.value as ThemePreference)}
                            >
                                <option value="light">{t('settings', 'light')}</option>
                                <option value="dark">{t('settings', 'dark')}</option>
                                <option value="system">{t('settings', 'system')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Language selector */}
                    <div className="setting-row">
                        <div className="setting-label">
                            <label className="form-label" htmlFor="language-select">{t('settings', 'language')}</label>
                        </div>
                        <div className="setting-control">
                            <select
                                id="language-select"
                                className="select"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as Language)}
                            >
                                {Object.entries(AVAILABLE_LANGUAGES).map(([code, name]) => (
                                    <option key={code} value={code}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Processing & Storage Card */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">{t('settings', 'processingAndStorage')}</h2>
                    <p className="card-description">{t('settings', 'configureProcessingAndStorage')}</p>
                </div>
                <div className="card-content space-y-4">
                    {/* Auto Processing Toggle */}
                    <div className="switch-container">
                        <div className="space-y-0.5">
                            <label className="form-label" htmlFor="auto-process">{t('settings', 'autoProcessNewFiles')}</label>
                            <p className="text-sm text-muted-foreground">
                                {isAutoProcessing ? t('settings', 'newFilesInheritSettings') : t('settings', 'manualProcessingRequired')}
                            </p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                id="auto-process"
                                checked={isAutoProcessing}
                                onChange={(e) => handleAutoProcessToggle(e.target.checked)}
                                disabled={isLoading}
                            />
                            <span className="switch-slider"></span>
                        </label>
                    </div>

                    {/* Detection Threshold Slider */}
                    <div className="form-group">
                        <div className="form-header-with-icon">
                            <Sliders size={18} className="text-primary" />
                            <label className="form-label" htmlFor="detection-threshold">
                                {t('settings', 'detectionThreshold')} ({Math.round(detectionThreshold * 100)}%)
                            </label>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                            {t('settings', 'detectionThresholdDescription')}
                        </p>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">{t('settings', 'low')}</span>
                            <input
                                type="range"
                                id="detection-threshold"
                                min="0"
                                max="1"
                                step="0.01"
                                value={detectionThreshold}
                                onChange={(e) => setDetectionThreshold(parseFloat(e.target.value))}
                                className="flex-1 accent-primary"
                                disabled={isLoading}
                            />
                            <span className="text-xs text-muted-foreground">{t('settings', 'high')}</span>
                        </div>
                    </div>

                    {/* Ban List Usage Toggle */}
                    <div className="switch-container">
                        <div className="space-y-0.5">
                            <label className="form-label" htmlFor="use-banlist">{t('settings', 'useBanListForDetection')}</label>
                            <p className="text-sm text-muted-foreground">
                                {useBanlist ? t('settings', 'banListWillBeFlagged') : t('settings', 'banListIgnored')}
                            </p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                id="use-banlist"
                                checked={useBanlist}
                                onChange={(e) => setUseBanlist(e.target.checked)}
                                disabled={isLoading}
                            />
                            <span className="switch-slider"></span>
                        </label>
                    </div>

                    {/* Storage Persistence Toggle */}
                    <div className="switch-container">
                        <div className="space-y-0.5">
                            <label className="form-label" htmlFor="storage-persistence">{t('settings', 'storePDFsInBrowser')}</label>
                            <p className="text-sm text-muted-foreground">
                                {isStorageEnabled ? t('settings', 'pdfsStoredLocally') : t('settings', 'pdfsNotSaved')}
                            </p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                id="storage-persistence"
                                checked={isStorageEnabled}
                                onChange={(e) => handleStorageToggle(e.target.checked)}
                                disabled={isLoading}
                            />
                            <span className="switch-slider"></span>
                        </label>
                    </div>

                    {/* Advanced Storage Settings */}
                    <button
                        className="button button-outline w-full flex justify-between"
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    >
                        <span>{showAdvancedSettings ? t('settings', 'hideStorageDetails') : t('settings', 'showStorageDetails')}</span>
                        {showAdvancedSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showAdvancedSettings && isStorageEnabled && (
                        <div className="mt-4 space-y-6 rounded-md border p-4">
                            <div className="flex items-center gap-2"><HardDrive size={18} /><h3 className="text-lg font-medium">{t('settings', 'storageUsage')}</h3></div>
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <div className="progress">
                                        <div className="progress-value" style={{ width: `${Math.min(effectiveStorageStats.percentUsed, 100)}%` }}></div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {effectiveStorageStats.percentUsed} {t('settings', 'used')} ({effectiveStorageStats.fileCount} {effectiveStorageStats.fileCount === 1 ? t('settings', 'file') : t('settings', 'files')})
                                    </div>
                                </div>
                                <button
                                    className="button button-outline button-sm w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={() => confirm({
                                        title: t('settings', 'clearStoredPDFsTitle'),
                                        message: t('settings', 'clearStoredPDFsMessage'),
                                        confirmButton: {
                                            label: t('settings', 'clearAllPDFs'),
                                            onClick: handleClearStoredFilesClick,
                                        },
                                        cancelButton: {
                                            label: t('common', 'cancel'),
                                        },
                                        type: "info"
                                    })}
                                    disabled={effectiveStorageStats.fileCount === 0 || isLoading}
                                >
                                    <Trash2 size={14} className="mr-2" />
                                    <span>{t('settings', 'clearStoredPDFs')}</span>
                                    {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                </button>
                            </div>
                            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                <p className="text-xs">{t('settings', 'pdfsStoredOnlyInBrowser')}</p>
                            </div>
                        </div>
                    )}
                    {showAdvancedSettings && !isStorageEnabled && (
                        <div className="mt-4 rounded-md border p-4 text-center text-muted-foreground">
                            {t('settings', 'enableStoragePersistenceToSeeUsageDetails')}
                        </div>
                    )}
                </div>
            </div>

            {/* Settings Import/Export Card */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">{t('settings', 'settingsManagement')}</h2>
                    <p className="card-description">{t('settings', 'importOrExportSettings')}</p>
                </div>
                <div className="card-content space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        {t('settings', 'exportImportSettingsDescription')}
                    </p>

                    {/* Import/Export Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            className="button button-outline flex items-center justify-center"
                            onClick={handleImportClick}
                            disabled={isLoading}
                        >
                            <LoadingWrapper isLoading={globalLoading('settings.import')} fallback={<Loader2 size={16} className="mr-2 animate-spin" />}>
                                <Upload size={16} className="mr-2" />
                            </LoadingWrapper>
                            <span>{t('settings', 'importSettings')}</span>
                        </button>

                        <button
                            className="button button-outline flex items-center justify-center"
                            onClick={handleExportSettings}
                            disabled={isLoading}
                        >
                            <LoadingWrapper isLoading={globalLoading('settings.export')} fallback={<Loader2 size={16} className="mr-2 animate-spin" />}>
                                <Download size={16} className="mr-2" />
                            </LoadingWrapper>
                            <span>{t('settings', 'exportSettings')}</span>
                        </button>

                        {/* Hidden file input for importing */}
                        <input
                            type="file"
                            accept=".json"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Import Status Messages */}
                    {importError && (
                        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-300 mt-3">
                            <FileWarning size={16} className="mt-0.5 flex-shrink-0" />
                            <p className="text-xs">{importError}</p>
                        </div>
                    )}

                    {importSuccess && (
                        <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-green-800 dark:bg-green-950 dark:text-green-300 mt-3">
                            <Database size={16} className="mt-0.5 flex-shrink-0" />
                            <p className="text-xs">{t('settings', 'settingsImportedSuccessfully')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4 mt-6">
                <button
                    className="button button-primary"
                    onClick={handleSaveChanges}
                    disabled={isLoading}
                >
                    <LoadingWrapper isLoading={globalLoading('setting.general.save')} fallback={t('settings', 'saving')}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <Save size={16} className="button-icon" />}
                        {isLoading ? t('settings', 'saving') : t('settings', 'saveChanges')}
                    </LoadingWrapper>
                </button>
            </div>
        </div>
    );
}
