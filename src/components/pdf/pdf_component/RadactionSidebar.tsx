import React, { useState, useEffect, useCallback } from 'react';
import { useFileContext } from '../../../contexts/FileContext';
import { useEditContext } from '../../../contexts/EditContext';
import { useHighlightContext } from '../../../contexts/HighlightContext';
import { HighlightType } from '../../../types/pdfTypes';
import { useBatchSearch } from '../../../contexts/SearchContext';
import { usePDFApi } from '../../../hooks/usePDFApi';
import { createFullRedactionMapping, getRedactionStatistics, processRedactedFiles } from '../../../utils/redactionUtils';
import { getFileKey } from '../../../contexts/PDFViewerContext';
import '../../../styles/modules/pdf/SettingsSidebar.css';
import '../../../styles/modules/pdf/RedactionSidebar.css';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

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
        setDetectionMapping,
    } = useEditContext();

    const {
        getAnnotations,
        clearAnnotationsByType
    } = useHighlightContext();

    // Get batch search context
    const { getSearchResultsForPage, getSearchQueries } = useBatchSearch();

    // Use the refactored PDF API hook
    const {
        loading: isApiLoading,
        error: apiError,
        progress: apiProgress,
        runRedactPdf,
        runBatchRedactPdfs
    } = usePDFApi();

    const [isRedacting, setIsRedacting] = useState(false);
    const [redactionScope, setRedactionScope] = useState<'current' | 'selected' | 'all'>('all');
    const [redactionError, setRedactionError] = useState<string | null>(null);
    const [redactionSuccess, setRedactionSuccess] = useState<string | null>(null);
    const [fileErrors, setFileErrors] = useState<Map<string, string>>(new Map());
    const [isDownloading, setIsDownloading] = useState(false);

    const [redactionOptions, setRedactionOptions] = useState({
        includeSearchHighlights: true,
        includeEntityHighlights: true,
        includeManualHighlights: true,
        removeImages: true
    });

    // Map of fileKey -> redaction mapping
    const [redactionMappings, setRedactionMappings] = useState<Map<string, any>>(new Map());

    // Update progress from API
    const progress = apiProgress;

    // Set error from API if available
    useEffect(() => {
        if (apiError) {
            setRedactionError(apiError);
        }
    }, [apiError]);

    // Auto-hide success message after a few seconds
    useEffect(() => {
        if (redactionSuccess) {
            const timer = setTimeout(() => {
                setRedactionSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [redactionSuccess]);

    // Get files to process based on selected scope
    const getFilesToProcess = useCallback((): File[] => {
        if (redactionScope === 'current' && currentFile) {
            return [currentFile];
        } else if (redactionScope === 'selected' && selectedFiles.length > 0) {
            return selectedFiles;
        } else if (redactionScope === 'all') {
            return files;
        }
        return [];
    }, [redactionScope, currentFile, selectedFiles, files]);

    // Generate redaction preview when relevant state changes
    useEffect(() => {
        const filesToProcess = getFilesToProcess();

        // Create a new map to store updated mappings
        const newMappings = new Map<string, any>();

        // Generate mapping for each file
        filesToProcess.forEach(file => {
            const fileKey = getFileKey(file);

            const { includeSearchHighlights, includeEntityHighlights, includeManualHighlights } = redactionOptions;

            // Get annotations for the current file
            // We need to get annotations for all pages, so we collect them in a map
            const fileAnnotations: Record<number, any[]> = {};

            // This is a simplification - you'd need to collect annotations for all pages of the file
            for (let page = 1; page <= 1000; page++) { // Using a large arbitrary number
                const pageAnnotations = getAnnotations(page, fileKey);
                if (pageAnnotations.length > 0) {
                    fileAnnotations[page] = pageAnnotations;
                }
            }

            // Get detection mapping for this file
            const fileDetectionMapping = detectionMapping && currentFile &&
            getFileKey(currentFile) === fileKey ? detectionMapping : null;

            // Collect batch search results for this file
            const searchResults = new Map<number, Map<string, any>>();
            const searchQueries = getSearchQueries();

            // If we want to include search highlights, gather the search results for all pages
            if (includeSearchHighlights && searchQueries.length > 0) {
                // For simplicity, check pages 1-100 (should be configurable based on file info)
                for (let page = 1; page <= 100; page++) {
                    const pageResults = getSearchResultsForPage(page, fileKey);
                    if (pageResults.length > 0) {
                        // Group by search term
                        const termResults = new Map<string, any[]>();
                        pageResults.forEach(result => {
                            const term = result.text || 'unknown';
                            if (!termResults.has(term)) {
                                termResults.set(term, []);
                            }
                            termResults.get(term)!.push(result);
                        });

                        if (termResults.size > 0) {
                            searchResults.set(page, termResults);
                        }
                    }
                }
            }

            // Create full redaction mapping
            const fullMapping = createFullRedactionMapping(
                fileAnnotations,
                searchResults,
                fileDetectionMapping,
                includeSearchHighlights,
                includeEntityHighlights,
                includeManualHighlights
            );

            // Only add if there are items to redact
            if (fullMapping.pages && fullMapping.pages.length > 0) {
                newMappings.set(fileKey, fullMapping);
            }
        });

        // Update the state with new mappings
        setRedactionMappings(newMappings);

    }, [
        getFilesToProcess,
        redactionOptions.includeSearchHighlights,
        redactionOptions.includeEntityHighlights,
        redactionOptions.includeManualHighlights,
        detectionMapping,
        getAnnotations,
        currentFile,
        getSearchResultsForPage,
        getSearchQueries
    ]);

    // Calculate combined redaction statistics across all files
    const getOverallRedactionStats = useCallback(() => {
        let totalItems = 0;
        let totalFiles = 0;
        let totalPages = 0;
        const byType: Record<string, number> = {};
        const byFile: Record<string, number> = {};

        // Process each file's mapping
        redactionMappings.forEach((mapping, fileKey) => {
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
    }, [redactionMappings, getFileByKey]);

    /**
     * Handle redaction for multiple files
     * Uses the generated redaction mappings that include search results
     */
    const handleRedact = async () => {
        const filesToRedact = getFilesToProcess();

        if (filesToRedact.length === 0 || redactionMappings.size === 0) {
            setRedactionError('No files selected for redaction or no content to redact.');
            return;
        }

        // Filter to only files that have redaction mappings
        const filesToProcess = filesToRedact.filter(file => {
            const fileKey = getFileKey(file);
            return redactionMappings.has(fileKey);
        });

        if (filesToProcess.length === 0) {
            setRedactionError('No redaction content found in selected files.');
            return;
        }

        // Confirm with user
        const confirmMessage = filesToProcess.length === 1
            ? `Are you sure you want to redact the highlighted content in ${filesToProcess[0].name}? This will create a new PDF document.`
            : `Are you sure you want to redact the highlighted content in ${filesToProcess.length} files? This will create new PDF documents.`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        setIsRedacting(true);
        setRedactionError(null);
        setFileErrors(new Map());
        setRedactionSuccess(null);

        try {
            // Create a mapping of fileKey -> redaction mapping for the API
            const mappingsObj: Record<string, any> = {};
            filesToProcess.forEach(file => {
                const fileKey = getFileKey(file);
                if (redactionMappings.has(fileKey)) {
                    mappingsObj[fileKey] = redactionMappings.get(fileKey);
                }
            });

            let redactedPdfs: Record<string, Blob>;

            // If only one file, use the single-file API for better compatibility
            if (filesToProcess.length === 1) {
                const file = filesToProcess[0];
                const fileKey = getFileKey(file);
                const mapping = redactionMappings.get(fileKey);

                // Use the hook's runRedactPdf method
                const redactedBlob = await runRedactPdf(file, mapping, redactionOptions.removeImages);
                redactedPdfs = {[fileKey]: redactedBlob};
            } else {
                // For multiple files, use the batch API from the hook
                redactedPdfs = await runBatchRedactPdfs(filesToProcess, mappingsObj, redactionOptions.removeImages);
            }

            setIsDownloading(true);

            try {
                // Process the redacted files and update the application state
                await processRedactedFiles(
                    redactedPdfs,
                    addFiles,
                    files,
                    selectedFiles,
                    redactionScope
                );

                // Clear highlights for processed files
                Object.keys(filesToProcess).forEach(fileKey => {
                    clearAnnotationsByType(HighlightType.MANUAL, undefined, fileKey);
                    clearAnnotationsByType(HighlightType.SEARCH, undefined, fileKey);
                    clearAnnotationsByType(HighlightType.ENTITY, undefined, fileKey);
                });

                // Update success message
                const successMessage = Object.keys(redactedPdfs).length === 1
                    ? `Redaction complete. ${Object.keys(redactedPdfs).length} file has been processed.`
                    : `Redaction complete. ${Object.keys(redactedPdfs).length} files have been processed.`;

                setRedactionSuccess(successMessage);

                // If we redacted the current file, reset its mapping
                if (currentFile && redactedPdfs[getFileKey(currentFile)]) {
                    setDetectionMapping(null);
                }
            } catch (processingError: any) {
                setRedactionError(`Error processing redacted files: ${processingError.message}`);
            }

        } catch (error: any) {
            console.error('Error during redaction:', error);
            setRedactionError(error.message || 'An error occurred during redaction');
        } finally {
            setIsRedacting(false);
            setIsDownloading(false);
        }
    };

    // Reset all redaction settings
    const handleReset = () => {
        setRedactionOptions({
            includeSearchHighlights: true,
            includeEntityHighlights: true,
            includeManualHighlights: true,
            removeImages: true
        });
        setRedactionMappings(new Map());
        setRedactionError(null);
        setRedactionSuccess(null);
        setFileErrors(new Map());
        console.log('[RedactionSidebar] Redaction options reset');
    };

    // Get overall stats
    const stats = getOverallRedactionStats();

    // Combined loading state
    const isCurrentlyRedacting = isRedacting || isApiLoading;

    // Listen for external redaction settings/options
    useEffect(() => {
        const handleApplyRedactionSettings = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { applyToAllFiles, triggerRedaction, source } = customEvent.detail || {};

            console.log(`[RedactionSidebar] Received redaction settings from ${source}`);

            // If applyToAllFiles flag is true, set the scope to 'all'
            if (applyToAllFiles) {
                setRedactionScope('all');

                // Update redaction options for all files by default
                setRedactionOptions(prev => ({
                    ...prev,
                    includeSearchHighlights: true,
                    includeEntityHighlights: true,
                    includeManualHighlights: true
                }));

                console.log('[RedactionSidebar] Set redaction scope to all files');
            }

            // If triggerRedaction flag is true, auto-trigger the redaction process
            if (triggerRedaction) {
                console.log('[RedactionSidebar] Auto-triggering redaction process from external source');
                // Delay slightly to ensure state updates have propagated
                setTimeout(() => {
                    handleRedact();
                }, 100);
            }
        };

        // Event handler for direct redaction trigger
        const handleTriggerRedaction = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { source } = customEvent.detail || {};

            console.log(`[RedactionSidebar] Received direct redaction trigger from ${source}`);
            handleRedact();
        };

        // Listen for settings change events
        window.addEventListener('apply-redaction-settings', handleApplyRedactionSettings);
        window.addEventListener('trigger-redaction-process', handleTriggerRedaction);

        return () => {
            window.removeEventListener('apply-redaction-settings', handleApplyRedactionSettings);
            window.removeEventListener('trigger-redaction-process', handleTriggerRedaction);
        };
    }, [handleRedact]);

    return (
        <div className="redaction-sidebar">
            <div className="sidebar-header redaction-header">
                <h3>Redaction Tools</h3>
                <div className="redaction-mode-badge">Redaction Mode</div>
            </div>

            <div className="sidebar-content">
                <div className="sidebar-section">
                    <h4>Redaction Scope</h4>
                    <div className="scope-options">
                        <button
                            className={`scope-button ${redactionScope === 'current' ? 'active' : ''}`}
                            onClick={() => setRedactionScope('current')}
                            disabled={!currentFile}
                            title="Redact current file only"
                        >
                            Current File
                        </button>
                        <button
                            className={`scope-button ${redactionScope === 'selected' ? 'active' : ''}`}
                            onClick={() => setRedactionScope('selected')}
                            disabled={selectedFiles.length === 0}
                            title={`Redact ${selectedFiles.length} selected files`}
                        >
                            Selected ({selectedFiles.length})
                        </button>
                        <button
                            className={`scope-button ${redactionScope === 'all' ? 'active' : ''}`}
                            onClick={() => setRedactionScope('all')}
                            title={`Redact all ${files.length} files`}
                        >
                            All Files ({files.length})
                        </button>
                    </div>
                </div>

                <div className="sidebar-section">
                    <h4>Redaction Options</h4>
                    <div className="checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={redactionOptions.includeManualHighlights}
                                onChange={() => setRedactionOptions(prev => ({
                                    ...prev,
                                    includeManualHighlights: !prev.includeManualHighlights
                                }))}
                            />
                            <span className="checkmark"></span>
                            Include Manual Highlights
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={redactionOptions.includeSearchHighlights}
                                onChange={() => setRedactionOptions(prev => ({
                                    ...prev,
                                    includeSearchHighlights: !prev.includeSearchHighlights
                                }))}
                            />
                            <span className="checkmark"></span>
                            Include Search Highlights
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={redactionOptions.includeEntityHighlights}
                                onChange={() => setRedactionOptions(prev => ({
                                    ...prev,
                                    includeEntityHighlights: !prev.includeEntityHighlights
                                }))}
                            />
                            <span className="checkmark"></span>
                            Include Detected Entities
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={redactionOptions.removeImages}
                                onChange={() => setRedactionOptions(prev => ({
                                    ...prev,
                                    removeImages: !prev.removeImages
                                }))}
                            />
                            <span className="checkmark"></span>
                            Remove Images
                        </label>
                    </div>
                </div>

                {redactionSuccess && (
                    <div className="sidebar-section success-section">
                        <div className="success-message">
                            <Check size={18} className="success-icon"/>
                            {redactionSuccess}
                        </div>
                    </div>
                )}

                {redactionMappings.size > 0 && stats.totalItems > 0 ? (
                    <div className="sidebar-section">
                        <h4>Redaction Preview</h4>
                        <div className="detection-stats">
                            <div className="stat-item">
                                <span className="stat-label">Total Items</span>
                                <span className="stat-value">{stats.totalItems}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Files</span>
                                <span className="stat-value">{stats.totalFiles}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Pages</span>
                                <span className="stat-value">{stats.totalPages}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Entity Types</span>
                                <span className="stat-value">{Object.keys(stats.byType).length}</span>
                            </div>
                        </div>

                        <h5>By Entity Type</h5>
                        <div className="stat-breakdown">
                            {Object.entries(stats.byType).map(([type, count]) => (
                                <div key={type} className="stat-row">
                                    <span className="entity-type">{type}</span>
                                    <span className="entity-count">{count}</span>
                                </div>
                            ))}
                        </div>

                        {stats.totalFiles > 1 && (
                            <>
                                <h5>By File</h5>
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

                        {redactionError && (
                            <div className="error-message">
                                <AlertCircle size={18} className="error-icon" />
                                {redactionError}
                            </div>
                        )}

                        <div className="sidebar-section button-group">
                            <button
                                className="sidebar-button redact-button"
                                onClick={handleRedact}
                                disabled={isCurrentlyRedacting || redactionMappings.size === 0 || stats.totalItems === 0}
                            >
                                {isCurrentlyRedacting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        {isDownloading ?
                                            `Processing... ${progress}%` :
                                            `Redacting... ${progress}%`}
                                        <div className="progress-container">
                                            <div
                                                className="progress-bar"
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </>
                                ) : 'Redact Content'}
                            </button>

                            <button
                                className="sidebar-button secondary-button"
                                onClick={handleReset}
                                disabled={isCurrentlyRedacting}
                            >
                                Reset Options
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="sidebar-section empty-state">
                        <div className="empty-message">
                            <p>No content selected for redaction.</p>
                            <p>Use the options above to include highlighted content.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RedactionSidebar;
