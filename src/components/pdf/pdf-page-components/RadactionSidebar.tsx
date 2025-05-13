import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFileContext } from '../../../contexts/FileContext';
import { useEditContext } from '../../../contexts/EditContext';
import { useHighlightStore } from '../../../contexts/HighlightStoreContext';
import { usePDFApi } from '../../../hooks/general/usePDFApi';
import { useDocumentHistory } from '../../../hooks/general/useDocumentHistory';
import { createFullRedactionMapping, getRedactionStatistics, processRedactedFiles } from '../../../utils/redactionUtils';
import { getFileKey } from '../../../contexts/PDFViewerContext';
import '../../../styles/modules/pdf/SettingsSidebar.css';
import '../../../styles/modules/pdf/RedactionSidebar.css';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import {useLoading} from "../../../contexts/LoadingContext";
import LoadingWrapper from '../../common/LoadingWrapper';
import { useNotification } from '../../../contexts/NotificationContext';
import { ConfirmationType } from '../../../contexts/NotificationContext';
import { HighlightType } from '../../../types';
import { highlightStore } from '../../../store/HighlightStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getEntityTranslationKeyAndModel } from '../../../utils/EntityUtils';

const RedactionSidebar: React.FC = () => {
    const {
        currentFile,
        selectedFiles,
        files,
        addFiles,
        getFileByKey
    } = useFileContext();

    const {
        detectionMapping,
        fileDetectionMappings,
        getFileDetectionMapping,
        setFileDetectionMapping,
        setDetectionMapping
    } = useEditContext();

    const {
        getHighlightsForFile,
        refreshTrigger
    } = useHighlightStore();
    const {notify, confirm} = useNotification();

    // Use the refactored PDF API hook
    const {
        loading: isApiLoading,
        error: apiError,
        runRedactPdf,
        runBatchRedactPdfs
    } = usePDFApi();

    // Use document history hook for saving redaction mappings
    const { saveDocument } = useDocumentHistory();

    const [redactionScope, setRedactionScope] = useState<'current' | 'selected' | 'all'>('all');
    const { isLoading: globalLoading, startLoading, stopLoading } = useLoading();

    const [redactionOptions, setRedactionOptions] = useState({
        includeSearchHighlights: true,
        includeEntityHighlights: true,
        includeManualHighlights: true,
        removeImages: true
    });

    // Map of fileKey -> redaction mapping
    const [localRedactionMappings, setLocalRedactionMappings] = useState<Map<string, any>>(new Map());

    const { t } = useLanguage();

    // Get files to process based on selected scope
    const getFilesToProcess = useCallback((): File[] => {
        if (redactionScope === 'current' && currentFile) {
            return [currentFile];
        } else if (redactionScope === 'selected' || selectedFiles.length > 0) {
            return selectedFiles;
        } else if (redactionScope === 'all') {
            return files;
        }
        return [];
    }, [redactionScope, currentFile, selectedFiles, files]);

    /**
     * Collects all annotations for a specific file
     * Using a more efficient approach with direct file highlighting retrieval
     */
    const collectFileAnnotations = useCallback((file: File) => {
        const fileKey = getFileKey(file);
        const fileAnnotations: Record<number, any[]> = {};

        // Get all annotations for this file in one call - more efficient than querying page by page
        const allHighlights = getHighlightsForFile(fileKey);

        // Group them by page
        allHighlights.forEach(highlight => {
            const page = highlight.page || 1;
            if (!fileAnnotations[page]) {
                fileAnnotations[page] = [];
            }
            fileAnnotations[page].push(highlight);
        });

        return fileAnnotations;
    }, [getHighlightsForFile]);

    /**
     * Updates global detection mapping for a file based on current highlights
     */
    const updateDetectionMappingFromHighlights = useCallback((file: File) => {
        const fileKey = getFileKey(file);

        // Get annotations for the file
        const fileAnnotations = collectFileAnnotations(file);

        // Create full redaction mapping using current options
        const { includeSearchHighlights, includeEntityHighlights, includeManualHighlights } = redactionOptions;
        const updatedMapping = createFullRedactionMapping(
            fileAnnotations,
            includeSearchHighlights,
            includeEntityHighlights,
            includeManualHighlights
        );

        // Update the global detection mapping
        if (updatedMapping.pages && updatedMapping.pages.length > 0) {
            console.log(`[RedactionSidebar] Updating global detection mapping for ${fileKey} after highlight change`);
            setFileDetectionMapping(fileKey, updatedMapping);

            // If this is the current file, also update the current detection mapping
            if (currentFile && getFileKey(currentFile) === fileKey) {
                setDetectionMapping(updatedMapping);
            }
        } else {
            // If no highlights left, set empty mapping
            const emptyMapping = { pages: [] };
            setFileDetectionMapping(fileKey, emptyMapping);

            if (currentFile && getFileKey(currentFile) === fileKey) {
                setDetectionMapping(emptyMapping);
            }
        }
    }, [collectFileAnnotations, currentFile, redactionOptions, setDetectionMapping, setFileDetectionMapping]);

    // Listen for highlight removal events
    useEffect(() => {
        const handleHighlightRemoved = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey } = customEvent.detail || {};

            if (fileKey) {
                // Find the file by key
                const file = getFileByKey(fileKey);
                if (file) {
                    // Update the detection mapping for this file
                    updateDetectionMappingFromHighlights(file);
                }
            }
        };

        // Listen for the highlight-removed event from the HighlightStore
        window.addEventListener('highlight-removed', handleHighlightRemoved);

        return () => {
            window.removeEventListener('highlight-removed', handleHighlightRemoved);
        };
    }, [getFileByKey, updateDetectionMappingFromHighlights]);

    // Listen for highlight addition events
    useEffect(() => {
        // Create a custom event handler for highlight additions
        const handleHighlightAdded = () => {
            // If there's a current file, update its detection mapping
            if (currentFile) {
                console.log(`[RedactionSidebar] Updating mapping after highlight addition for ${currentFile.name}`);
                updateDetectionMappingFromHighlights(currentFile);
            }
        };

        // Listen for refreshTrigger changes which happen when highlights are added
        // Create a subscription to the highlight store for more direct notification
        let subscription: { unsubscribe: () => void } = {
            unsubscribe: () => {}
        };

        try {
            // Subscribe to highlight store changes
            const storeSubscription = highlightStore.subscribe((fileKey) => {
                if (fileKey) {
                    const file = getFileByKey(fileKey);
                    if (file) {
                        console.log(`[RedactionSidebar] Highlight store changed for file: ${fileKey}`);
                        updateDetectionMappingFromHighlights(file);
                    }
                }
            });

            // Store the unsubscribe function
            subscription = storeSubscription;
        } catch (error) {
            console.error("[RedactionSidebar] Error subscribing to highlight store:", error);
        }

        return () => {
            // Clean up subscription when component unmounts
            subscription.unsubscribe();
        };
    }, [currentFile, updateDetectionMappingFromHighlights, getFileByKey]);

    // Generate redaction preview when relevant state changes
    useEffect(() => {
        const filesToProcess = getFilesToProcess();

        // Create a new map to store updated mappings
        const newMappings = new Map<string, any>();

        // Generate mapping for each file
        filesToProcess.forEach(file => {
            const fileKey = getFileKey(file);

            // First check if there's a global detection mapping for this file
            const globalMapping = getFileDetectionMapping(fileKey);

            if (globalMapping) {
                // Use the global mapping from EditContext
                newMappings.set(fileKey, globalMapping);
            } else {
                // Generate mapping from highlights if no global mapping exists
                const { includeSearchHighlights, includeEntityHighlights, includeManualHighlights } = redactionOptions;

                // Get annotations for the current file using the new collection method
                const fileAnnotations = collectFileAnnotations(file);

                // Create full redaction mapping
                const fullMapping = createFullRedactionMapping(
                    fileAnnotations,
                    includeSearchHighlights,
                    includeEntityHighlights,
                    includeManualHighlights
                );

                // Only add if there are items to redact
                if (fullMapping.pages && fullMapping.pages.length > 0) {
                    newMappings.set(fileKey, fullMapping);
                }
            }
        });

        // Update the state with new mappings
        setLocalRedactionMappings(newMappings);

    }, [
        getFilesToProcess,
        redactionOptions.includeSearchHighlights,
        redactionOptions.includeEntityHighlights,
        redactionOptions.includeManualHighlights,
        collectFileAnnotations,
        currentFile,
        refreshTrigger,
        getFileDetectionMapping,
        fileDetectionMappings // Important: ensures updates when global detection mappings change
    ]);

    // Calculate combined redaction statistics across all files
    const getOverallRedactionStats = useCallback(() => {
        let totalItems = 0;
        let totalFiles = 0;
        let totalPages = 0;
        const byType: Record<string, number> = {};
        const byFile: Record<string, number> = {};

        // Process each file's mapping
        localRedactionMappings.forEach((mapping, fileKey) => {
            if (!mapping.pages) return;

            const file = getFileByKey(fileKey);
            const fileName = file ? file.name : fileKey;

            // Get stats for this mapping
            const stats = getRedactionStatistics(mapping);

            totalItems += stats.totalItems;
            totalPages += Object.keys(stats.byPage).length;
            totalFiles++;

            // Combine counts by type
            Object.entries(stats.byType).forEach(([type, count]) => {
                byType[type] = (byType[type] || 0) + count;
            });

            // Track counts by file
            byFile[fileName] = stats.totalItems;
        });

        return {
            totalItems,
            totalFiles,
            totalPages,
            byType,
            byFile
        };
    }, [localRedactionMappings, getFileByKey]);

    /**
     * Save redaction mapping to the backend for document history
     */
    const saveRedactionToHistory = useCallback(async (file: File, mapping: any) => {
        if (!mapping || !mapping.pages || mapping.pages.length === 0) {
            console.log('[RedactionSidebar] No mapping to save for file:', file.name);
            return false;
        }

        try {
            const result = await saveDocument(file, mapping);
            console.log(`[RedactionSidebar] Saved redaction mapping for file ${file.name} to history:`, result);
            return true;
        } catch (error) {
            console.error(`[RedactionSidebar] Failed to save redaction mapping for ${file.name}:`, error);
            return false;
        }
    }, [saveDocument]);

    /**
     * Handle redaction for multiple files
     * Uses the generated redaction mappings that include search results
     */
    const handleRedact = useCallback(async (filesToRedact : File[] = [] ,callbackFn?: (result: { success: boolean, redactedFiles: File[], error?: string }) => void) => {
        if(filesToRedact?.length ===0){
             filesToRedact = getFilesToProcess();
        }

        if (filesToRedact.length === 0 || localRedactionMappings.size === 0) {
            const errorMessage = t('redaction', 'noFilesSelectedOrNoContentToRedact');
            notify({
                message: errorMessage,
                type: 'error'
            });
            // Notify callback of failure
            if (callbackFn) {
                callbackFn({
                    success: false,
                    redactedFiles: [],
                    error: errorMessage
                });
            }

            // Also dispatch event for external components
            window.dispatchEvent(new CustomEvent('redaction-process-complete', {
                detail: {
                    success: false,
                    redactedFiles: [],
                    error: errorMessage
                }
            }));

            return;
        }

        // Filter to only files that have redaction mappings
        const filesToProcess = filesToRedact.filter(file => {
            const fileKey = getFileKey(file);
            return localRedactionMappings.has(fileKey);
        });

        if (filesToProcess.length === 0) {
            const errorMessage = t('redaction', 'noRedactionContentFound');
            notify({
                message: errorMessage,
                type: 'error'
            });

            // Notify callback of failure
            if (callbackFn) {
                callbackFn({
                    success: false,
                    redactedFiles: [],
                    error: errorMessage
                });
            }

            // Also dispatch event for external components
            window.dispatchEvent(new CustomEvent('redaction-process-complete', {
                detail: {
                    success: false,
                    redactedFiles: [],
                    error: errorMessage
                }
            }));

            return;
        }

        // For automated/programmatic redactions, skip the confirmation prompt
        const shouldConfirm = !callbackFn;

        if (shouldConfirm) {
            // Confirm with user for manual interactions
            const confirmMessage = filesToProcess.length === 1
                ? t('redaction', 'confirmRedactionSingle').replace('{fileName}', filesToProcess[0].name)
                : t('redaction', 'confirmRedactionMultiple').replace('{fileCount}', String(filesToProcess.length));

           const confirmed = await confirm({
                message: confirmMessage,
                title: t('redaction', 'confirmRedactionTitle'),
                type: 'confirm',
                confirmButton: {
                    label: t('common', 'confirm'),
                    variant: 'primary',

                },
                cancelButton: {
                    label: t('common', 'cancel'),
                    variant: 'secondary',
                }
            });

            if (!confirmed) {
                return;
            }
        }

        startLoading('redaction.redact');

        try {
            // Create a mapping of fileKey -> redaction mapping for the API
            const mappingsObj: Record<string, any> = {};
            filesToProcess.forEach(file => {
                const fileKey = getFileKey(file);
                if (localRedactionMappings.has(fileKey)) {
                    mappingsObj[fileKey] = localRedactionMappings.get(fileKey);
                }
            });

            let redactedPdfs: Record<string, Blob>;

            // If only one file, use the single-file API for better compatibility
            if (filesToProcess.length === 1) {
                const file = filesToProcess[0];
                const fileKey = getFileKey(file);
                const mapping = localRedactionMappings.get(fileKey);
                //remove the file key and the last updated form the mapping
                const cleanMapping = { ...mapping };
                if (cleanMapping) {
                    // Remove fileKey and lastUpdated properties
                    delete cleanMapping.fileKey;
                    delete cleanMapping.lastUpdated;
                }

                // Use the hook's runRedactPdf method
                const redactedBlob = await runRedactPdf(file, cleanMapping, redactionOptions.removeImages);
                redactedPdfs = {[fileKey]: redactedBlob};

                // Save redaction mapping to backend for history
                await saveRedactionToHistory(file, cleanMapping);
            } else {
                // For multiple files, use the batch API from the hook
                // Create clean mapping objects without fileKey and lastUpdated
                const cleanMappings: Record<string, any> = {};
                filesToProcess.forEach(file => {
                    const fileKey = getFileKey(file);
                    if (localRedactionMappings.has(fileKey)) {
                        const originalMapping = localRedactionMappings.get(fileKey);
                        const cleanMapping = { ...originalMapping };

                        // Remove fileKey and lastUpdated properties
                        if (cleanMapping) {
                            delete cleanMapping.fileKey;
                            delete cleanMapping.lastUpdated;
                            cleanMappings[fileKey] = cleanMapping;
                        }
                    }
                });

                // Use the clean mappings for the batch API
                redactedPdfs = await runBatchRedactPdfs(filesToProcess, cleanMappings, redactionOptions.removeImages);

                // Save all redaction mappings to backend for history
                for (const file of filesToProcess) {
                    const fileKey = getFileKey(file);
                    const cleanMapping = cleanMappings[fileKey];
                    if (cleanMapping) {
                        await saveRedactionToHistory(file, cleanMapping);
                    }
                }
            }

            try {
                // Process the redacted files and update the application state
                const newRedactedFiles =  await processRedactedFiles(
                    redactedPdfs,
                    addFiles,
                    files,
                );

                // Update success message
                const successMessage = Object.keys(redactedPdfs).length === 1
                    ? t('redaction', 'redactionCompleteOne')
                    : t('redaction', 'redactionCompleteMultiple').replace('{count}', String(Object.keys(redactedPdfs).length));

                notify({
                    message: successMessage,
                    type: 'success'
                });

                // Notify callback of success with the processed files
                if (callbackFn) {
                    callbackFn({
                        success: true,
                        redactedFiles: newRedactedFiles
                    });
                }

                // Dispatch success event with redacted files
                window.dispatchEvent(new CustomEvent('redaction-process-complete', {
                    detail: {
                        success: true,
                        redactedFiles: newRedactedFiles
                    }
                }));

                // Also notify the history tab to refresh
                window.dispatchEvent(new CustomEvent('redaction-history-updated', {
                    detail: {
                        timestamp: Date.now()
                    }
                }));

                // Suggest user to check history
                setTimeout(() => {
                    notify({
                        message: t('redaction', 'historySavedInfo'),
                        type: 'info',
                        duration: 5000
                    });
                }, 1000);

            } catch (processingError: any) {
                const errorMessage = t('redaction', 'errorProcessingRedactedFiles').replace('{error}', processingError.message);
                notify({
                    message: errorMessage,
                    type: 'error'
                });
                // Notify callback of failure
                if (callbackFn) {
                    callbackFn({
                        success: false,
                        redactedFiles: [],
                        error: errorMessage
                    });
                }

                // Dispatch failure event
                window.dispatchEvent(new CustomEvent('redaction-process-complete', {
                    detail: {
                        success: false,
                        redactedFiles: [],
                        error: errorMessage
                    }
                }));
            }

        } catch (error: any) {
            const errorMessage = error.message || t('redaction', 'genericRedactionError');
            notify({
                message: errorMessage,
                type: 'error'
            });

            // Notify callback of failure
            if (callbackFn) {
                callbackFn({
                    success: false,
                    redactedFiles: [],
                    error: errorMessage
                });
            }

            // Dispatch failure event
            window.dispatchEvent(new CustomEvent('redaction-process-complete', {
                detail: {
                    success: false,
                    redactedFiles: [],
                    error: errorMessage
                }
            }));

        } finally {
            stopLoading('redaction.redact');
        }
    }, [
        getFilesToProcess,
        localRedactionMappings,
        redactionOptions.removeImages,
        redactionScope,
        addFiles,
        files,
        selectedFiles,
        currentFile,
        runRedactPdf,
        runBatchRedactPdfs,
        saveRedactionToHistory,
        startLoading,
        stopLoading,
        notify,
        confirm,
        t
    ]);

    // Reset all redaction settings
    const handleReset = useCallback(() => {
        setRedactionOptions({
            includeSearchHighlights: true,
            includeEntityHighlights: true,
            includeManualHighlights: true,
            removeImages: true
        });
        setRedactionScope('all');
        notify({
            message: t('redaction', 'redactionSettingsReset'),
            type: 'info'
        });
    }, [notify, t]);

    // Get overall stats - memoize for better performance
    const stats = useMemo(() => getOverallRedactionStats(), [getOverallRedactionStats]);

    // Combined loading state
    const isCurrentlyRedacting = globalLoading('redaction.redact') || isApiLoading;

    // Listen for external redaction settings/options
    useEffect(() => {
        const handleApplyRedactionSettings = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { applyToAllFiles, triggerRedaction, source , filesToProcess} = customEvent.detail || {};


            // If applyToAllFiles flag is true, set the scope to 'all'
            if (applyToAllFiles) {
                setRedactionScope('all');

                // Update redaction options for all files by default
                setRedactionOptions(prev => ({
                    ...prev,
                    includeSearchHighlights: true,
                    includeEntityHighlights: true,
                    includeManualHighlights: true,

                }));

            }

            // If triggerRedaction flag is true, auto-trigger the redaction process
            if (triggerRedaction) {
                // Delay slightly to ensure state updates have propagated
                setTimeout(() => {
                    handleRedact(filesToProcess);
                }, 100);
            }
        };

        // Event handler for direct redaction trigger
        const handleTriggerRedaction = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { source, callback , filesToProcess} = customEvent.detail || {};

            if (typeof callback === 'function') {
                // Pass the callback to handleRedact
                handleRedact(filesToProcess, callback);
            } else {
                // No callback provided, just redact
                handleRedact();
            }
        };

        // Listen for settings change events
        window.addEventListener('apply-redaction-settings', handleApplyRedactionSettings);
        window.addEventListener('trigger-redaction-process', handleTriggerRedaction);

        return () => {
            window.removeEventListener('apply-redaction-settings', handleApplyRedactionSettings);
            window.removeEventListener('trigger-redaction-process', handleTriggerRedaction);
        };
    }, [handleRedact]);

    // Listen for redaction history updates to refresh the document history panel
    useEffect(() => {
        const handleHistoryUpdate = () => {
            // Dispatch an event to navigate to the history tab
            window.dispatchEvent(new CustomEvent('activate-left-panel', {
                detail: { navigateToTab: 'history' }
            }));
        };

        window.addEventListener('redaction-history-view', handleHistoryUpdate);

        return () => {
            window.removeEventListener('redaction-history-view', handleHistoryUpdate);
        };
    }, []);

    return (
        <div className="redaction-sidebar">
            <div className="sidebar-header redaction-header">
                <h3>{t('redaction', 'redactionTools')}</h3>
                <div className="redaction-mode-badge">{t('redaction', 'redactionMode')}</div>
            </div>

            <div className="sidebar-content">
                <div className="sidebar-section">
                    <h4>{t('redaction', 'redactionScope')}</h4>
                    <div className="scope-options">
                        <button
                            className={`scope-button ${redactionScope === 'current' ? 'active' : ''}`}
                            onClick={() => setRedactionScope('current')}
                            disabled={!currentFile || isCurrentlyRedacting}
                            title={t('redaction', 'redactCurrentFileOnly')}
                        >
                            {t('redaction', 'currentFile')}
                        </button>
                        <button
                            className={`scope-button ${redactionScope === 'selected' ? 'active' : ''}`}
                            onClick={() => setRedactionScope('selected')}
                            disabled={selectedFiles.length === 0 || isCurrentlyRedacting}
                            title={t('redaction', 'redactSelectedFiles').replace('{count}', String(selectedFiles.length))}
                        >
                            {t('redaction', 'selectedFiles').replace('{count}', String(selectedFiles.length))}
                        </button>
                        <button
                            className={`scope-button ${redactionScope === 'all' ? 'active' : ''}`}
                            onClick={() => setRedactionScope('all')}
                            disabled={isCurrentlyRedacting}
                            title={t('redaction', 'redactAllFiles').replace('{count}', String(files.length))}
                        >
                            {t('redaction', 'allFiles').replace('{count}', String(files.length))}
                        </button>
                    </div>
                </div>

                <div className="sidebar-section">
                    <h4>{t('redaction', 'redactionOptions')}</h4>
                    <div className="checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={redactionOptions.includeManualHighlights}
                                onChange={() => setRedactionOptions(prev => ({
                                    ...prev,
                                    includeManualHighlights: !prev.includeManualHighlights
                                }))}
                                disabled={isCurrentlyRedacting}
                            />
                            <span className="checkmark"></span>
                            {t('redaction', 'includeManualHighlights')}
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={redactionOptions.includeSearchHighlights}
                                onChange={() => setRedactionOptions(prev => ({
                                    ...prev,
                                    includeSearchHighlights: !prev.includeSearchHighlights
                                }))}
                                disabled={isCurrentlyRedacting}
                            />
                            <span className="checkmark"></span>
                            {t('redaction', 'includeSearchHighlights')}
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={redactionOptions.includeEntityHighlights}
                                onChange={() => setRedactionOptions(prev => ({
                                    ...prev,
                                    includeEntityHighlights: !prev.includeEntityHighlights
                                }))}
                                disabled={isCurrentlyRedacting}
                            />
                            <span className="checkmark"></span>
                            {t('redaction', 'includeDetectedEntities')}
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={redactionOptions.removeImages}
                                onChange={() => setRedactionOptions(prev => ({
                                    ...prev,
                                    removeImages: !prev.removeImages
                                }))}
                                disabled={isCurrentlyRedacting}
                            />
                            <span className="checkmark"></span>
                            {t('redaction', 'removeImages')}
                        </label>
                    </div>
                </div>

                {localRedactionMappings.size > 0 && stats.totalItems > 0 ? (
                    <div className="sidebar-section">
                        <h4>{t('redaction', 'redactionPreview')}</h4>
                        <div className="detection-stats">
                            <div className="stat-item">
                                <span className="stat-label">{t('redaction', 'totalItems')}</span>
                                <span className="stat-value">{stats.totalItems}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">{t('redaction', 'files')}</span>
                                <span className="stat-value">{stats.totalFiles}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">{t('redaction', 'pages')}</span>
                                <span className="stat-value">{stats.totalPages}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">{t('redaction', 'entityTypes')}</span>
                                <span className="stat-value">{Object.keys(stats.byType).length}</span>
                            </div>
                        </div>

                        <h5>{t('redaction', 'byEntityType')}</h5>
                        <div className="stat-breakdown">
                            {Object.entries(stats.byType).map(([type, count]) => {
                                let translated: string;
                                if (type === HighlightType.SEARCH) {
                                    translated = t('entityDetection', 'search');
                                } else if (type === HighlightType.MANUAL) {
                                    translated = t('entityDetection', 'highlight');
                                } else {
                                    const { key } = getEntityTranslationKeyAndModel(type);
                                    translated = key ? t('entityDetection', key as any) : type;
                                }
                                return (
                                    <div key={type} className="stat-row">
                                        <span className="entity-type">{translated}</span>
                                        <span className="entity-count">{count}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {stats.totalFiles > 1 && (
                            <>
                                <h5>{t('redaction', 'byFile')}</h5>
                                <div className="stat-breakdown">
                                    {Object.entries(stats.byFile).map(([fileName, count]) => (
                                        <div key={fileName} className="stat-row">
                                            <span className="file-name" title={fileName}>
                                                {fileName.length > 25 ? fileName.substring(0, 22) + '...' : fileName}
                                            </span>
                                            <span className="entity-count">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        <div className="sidebar-section button-group">

                                <button
                                    className="sidebar-button redact-button action-button"
                                    onClick={() => handleRedact()}
                                    disabled={isCurrentlyRedacting || localRedactionMappings.size === 0 || stats.totalItems === 0}
                            >
                                    <LoadingWrapper
                                        isLoading={isCurrentlyRedacting}
                                        overlay={true}
                                        fallback={t('redaction', 'redacting')}
                                    >
                                        {isCurrentlyRedacting ? '' : t('redaction', 'redactContent')}
                            </LoadingWrapper>
                            </button>


                            <button
                                className="sidebar-button secondary-button"
                                onClick={handleReset}
                                disabled={isCurrentlyRedacting}
                            >
                                {t('redaction', 'resetOptions')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="sidebar-section empty-state">
                        <div className="empty-message">
                            <p>{t('redaction', 'noContentSelectedForRedaction')}</p>
                            <p>{t('redaction', 'useOptionsAbove')}</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default RedactionSidebar;
