import React, { useState, useEffect, useCallback } from "react";
import { Save, ChevronDown, ChevronUp, AlertTriangle, Database, HardDrive, Trash2, Loader2, Sliders } from "lucide-react";
import { useFileContext } from "../../../contexts/FileContext"; // Adjust path if needed
import { useAutoProcess } from "../../../hooks/useAutoProcess"; // Adjust path if needed
import { ThemePreference } from "../../../hooks/useTheme";
import { useThemeContext } from "../../../contexts/ThemeContext";
import useSettings from "../../../hooks/settings/useSettings"; // Adjust path if needed
import { useLoading } from "../../../contexts/LoadingContext";
import LoadingWrapper from "../../common/LoadingWrapper";
import { useNotification } from "../../../contexts/NotificationContext";

export default function GeneralSettings() {
    const { settings, updateSettings, isLoading: isUserLoading, error: userError, clearError: clearUserError } = useSettings();
    const {
        isStoragePersistenceEnabled,
        setStoragePersistenceEnabled,
        storageStats,
        clearStoredFiles
    } = useFileContext();
    const { setAutoProcessingEnabled: setAutoProcessHookEnabled, getConfig } = useAutoProcess();
    const { preference: currentThemePreference, setPreference: setThemePreference } = useThemeContext();
    const { notify, confirm } = useNotification();
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
    const { isLoading: globalLoading, startLoading, stopLoading } = useLoading();
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

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

    // Update storage context when local toggle changes it
    useEffect(() => {
        if(isStoragePersistenceEnabled !== isStorageEnabled) {
            setStoragePersistenceEnabled(isStorageEnabled);
        }
    }, [isStorageEnabled, isStoragePersistenceEnabled, setStoragePersistenceEnabled]);

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
                message: "Settings saved successfully.",
                type: "success",
                duration: 3000
            });
        } catch (err: any) {
            const message = err.userMessage || err.message || "Failed to save settings.";
            notify({
                message: message,
                type: "error",
                duration: 3000
            });
        } finally {
            stopLoading('setting.general.save');
        }
    };

    const handleClearStoredFilesClick = async () => {
        // ... (Clear logic remains the same) ...
        startLoading('setting.general.clear');
        try {
            await clearStoredFiles();
        } catch (error) {
            console.error('Error clearing stored files:', error);
            notify({
                message: "Failed to clear stored files.",
                type: "error",
                duration: 3000
            });
        } finally {
            stopLoading('setting.general.clear');
        }
    };
    const isLoading = isUserLoading;

    const effectiveStorageStats = storageStats || { percentUsed: 0, totalSize: "0 MB", fileCount: 0 };

    // --- JSX ---
    return (
        <div className="space-y-6">
            {/* Appearance Card */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Appearance</h2>
                    <p className="card-description">Customize how the application looks</p>
                </div>
                <div className="card-content space-y-4">
                    <div className="form-group">
                        <label className="form-label" htmlFor="theme-select">Theme</label>
                        <div className="select-container">
                            <select
                                className="select"
                                id="theme-select"
                                value={currentThemePreference}
                                onChange={(e) => handleThemeChange(e.target.value as ThemePreference)}
                                disabled={isLoading}
                            >
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="system">System Default</option>
                            </select>
                            <ChevronDown className="select-icon" size={16} />
                        </div>
                        <p className="form-helper">Choose your preferred interface theme.</p>
                    </div>
                </div>
            </div>

            {/* Processing & Storage Card */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Processing & Storage</h2>
                    <p className="card-description">Configure file processing and browser storage</p>
                </div>
                <div className="card-content space-y-4">
                    {/* Auto Processing Toggle */}
                    <div className="switch-container">
                        <div className="space-y-0.5">
                            <label className="form-label" htmlFor="auto-process">Auto-process new files</label>
                            <p className="text-sm text-muted-foreground">
                                {isAutoProcessing ? "New files inherit current settings" : "Manual processing required"}
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
                                Detection Threshold ({Math.round(detectionThreshold * 100)}%)
                            </label>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                            Higher values reduce false positives but may miss some entities
                        </p>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">Low</span>
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
                            <span className="text-xs text-muted-foreground">High</span>
                        </div>
                    </div>

                    {/* Ban List Usage Toggle */}
                    <div className="switch-container">
                        <div className="space-y-0.5">
                            <label className="form-label" htmlFor="use-banlist">Use ban list for detection</label>
                            <p className="text-sm text-muted-foreground">
                                {useBanlist ? "Ban list words will be flagged in documents" : "Ban list will be ignored during detection"}
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
                            <label className="form-label" htmlFor="storage-persistence">Store PDFs in browser</label>
                            <p className="text-sm text-muted-foreground">
                                {isStorageEnabled ? "PDFs stored locally" : "PDFs not saved"}
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
                        <span>{showAdvancedSettings ? "Hide Storage Details" : "Show Storage Details"}</span>
                        {showAdvancedSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showAdvancedSettings && isStorageEnabled && (
                        <div className="mt-4 space-y-6 rounded-md border p-4">
                            <div className="flex items-center gap-2"><HardDrive size={18} /><h3 className="text-lg font-medium">Storage Usage</h3></div>
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <div className="progress">
                                        <div className="progress-value" style={{ width: `${Math.min(effectiveStorageStats.percentUsed, 100)}%` }}></div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {effectiveStorageStats.percentUsed} used ({effectiveStorageStats.fileCount} file{effectiveStorageStats.fileCount !== 1 ? "s" : ""})
                                    </div>
                                </div>
                                <button
                                    className="button button-outline button-sm w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={() => confirm({
                                        title: "Clear Stored PDFs",
                                        message: "This will permanently delete all PDFs stored in your browser. This action cannot be undone.",
                                        confirmButton: {
                                            label: "Clear All PDFs",
                                            onClick: handleClearStoredFilesClick,
                                        },
                                        cancelButton: {
                                            label: "Cancel",
                                        },
                                        type: "info"
                                    })}
                                    disabled={effectiveStorageStats.fileCount === 0 || isLoading}
                                >
                                    <Trash2 size={14} className="mr-2" />
                                    <span>Clear Stored PDFs</span>
                                    {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                </button>
                            </div>
                            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                <p className="text-xs">PDFs are stored only in your browser and are not sent to any server.</p>
                            </div>
                        </div>
                    )}
                    {showAdvancedSettings && !isStorageEnabled && (
                        <div className="mt-4 rounded-md border p-4 text-center text-muted-foreground">
                            Enable storage persistence to see usage details.
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
                    <LoadingWrapper isLoading={globalLoading('setting.general.save')} fallback="Saving...">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <Save size={16} className="button-icon" />}
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </LoadingWrapper>
                </button>
            </div>
        </div>
    );
}
