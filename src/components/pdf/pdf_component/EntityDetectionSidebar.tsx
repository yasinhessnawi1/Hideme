// src/components/pdf/pdf_component/EntityDetectionSidebar.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import { useFileContext } from '../../../contexts/FileContext';
import { useEditContext } from '../../../contexts/EditContext';
import { useHighlightContext, HighlightType } from '../../../contexts/HighlightContext';
import { usePDFApi } from '../../../hooks/usePDFApi';
import { OptionType } from '../../../types/types';
import { getFileKey } from '../../../contexts/PDFViewerContext';
import '../../../styles/modules/pdf/SettingsSidebar.css';

// Presidio ML entity options
const presidioOptions: OptionType[] = [
    { value: 'CRYPTO', label: 'Crypto Wallet' },
    { value: 'DATE_TIME', label: 'Date/Time' },
    { value: 'EMAIL_ADDRESS', label: 'Email Address' },
    { value: 'IBAN_CODE', label: 'IBAN' },
    { value: 'IP_ADDRESS', label: 'IP Address' },
    { value: 'NO_COMPANY_NUMBER', label: 'Org number' },
    { value: 'LOCATION', label: 'Location' },
    { value: 'PERSON', label: 'Person' },
    { value: 'MEDICAL_LICENSE', label: 'Medical License' },
    { value: 'URL', label: 'URL' },
    { value: 'NO_ADDRESS', label: 'Address' },
    { value: 'NO_PHONE_NUMBER', label: 'Phone' },
    { value: 'NO_FODSELSNUMMER', label: 'ID' },
    { value: 'NO_BANK_ACCOUNT', label: 'Bank account' },
    { value: 'NO_LICENSE_PLATE', label: 'License plate' },
    { value: 'ORGANIZATION', label: 'Organization' },
];

// Gliner ML entity options
const glinerOptions: OptionType[] = [
    { value: 'PERSON', label: 'Person' },
    { value: 'BOOK', label: 'Book' },
    { value: 'LOCATION', label: 'Location' },
    { value: 'DATE', label: 'Date' },
    { value: 'ACTOR', label: 'Actor' },
    { value: 'CHARACTER', label: 'Character' },
    { value: 'ORGANIZATION', label: 'Organization' },
    { value: 'PHONE_NUMBER', label: 'Phone Number' },
    { value: 'ADDRESS', label: 'Address' },
    { value: 'PASSPORT_NUMBER', label: 'Passport Number' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'CREDIT_CARD_NUMBER', label: 'Credit Card Number' },
    { value: 'SOCIAL_SECURITY_NUMBER', label: 'Social Security Number' },
    { value: 'HEALTH_INSURANCE_ID_NUMBER', label: 'Health Insurance ID number' },
    { value: 'DATE_OF_BIRTH', label: 'Date of Birth' },
    { value: 'MOBILE_PHONE_NUMBER', label: 'Mobile Phone Number' },
    { value: 'BANK_ACCOUNT_NUMBER', label: 'Bank Account Number' },
    { value: 'MEDICATION', label: 'Medication' },
    { value: 'CPF', label: 'CPF' },
    { value: 'TAX_IDENTIFICATION_NUMBER', label: 'tax identification number' },
    { value: 'MEDICAL_CONDITION', label: 'Medical Condition' },
    { value: 'IDENTITY_CARD_NUMBER', label: 'Identity Card Number' },
    { value: 'NATIONAL_ID_NUMBER', label: 'National ID Number' },
    { value: 'IP_ADDRESS', label: 'IP Address' },
    { value: 'EMAIL_ADDRESS', label: 'Email Address' },
    { value: 'IBAN', label: 'IBAN' },
    { value: 'CREDIT_CARD_EXPIRATION_DATE', label: 'Credit Card Expiration Date' },
    { value: 'USERNAME', label: 'Username' },
    { value: 'BLOOD_TYPE', label: 'Blood Type' },
    { value: 'CVV', label: 'CVV' },
    { value: 'CVC', label: 'CVC' },
];

// Gemini AI entity options
const geminiOptions: OptionType[] = [
    { value: 'PHONE', label: 'Phone' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'ADDRESS', label: 'Address' },
    { value: 'DATE', label: 'Date' },
    { value: 'GOVID', label: 'Gov ID' },
    { value: 'FINANCIAL', label: 'Financial' },
    { value: 'EMPLOYMENT', label: 'Employment' },
    { value: 'HEALTH', label: 'Health' },
    { value: 'SEXUAL', label: 'Sexual' },
    { value: 'CRIMINAL', label: 'Criminal' },
    { value: 'CONTEXT', label: 'Context' },
    { value: 'INFO', label: 'Info' },
    { value: 'FAMILY', label: 'Family' },
    { value: 'BEHAVIORAL_PATTERN', label: 'Behavioral Pattern' },
    { value: 'POLITICAL_CASE', label: 'Political Case' },
    { value: 'ECONOMIC_STATUS', label: 'Economic Status' },
];

const EntityDetectionSidebar: React.FC = () => {
    const {
        currentFile,
        selectedFiles,
        files
    } = useFileContext();

    const {
        selectedMlEntities,
        setSelectedMlEntities,
        selectedAiEntities,
        setSelectedAiEntities,
        selectedGlinerEntities,
        setSelectedGlinerEntities,
        detectionMapping,
        setDetectionMapping,
        setFileDetectionMapping,
        fileDetectionMappings
    } = useEditContext();

    const {
        clearAnnotationsByType,
        resetProcessedEntityPages
    } = useHighlightContext();

    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionScope, setDetectionScope] = useState<'current' | 'selected' | 'all'>('current');
    const [detectionResults, setDetectionResults] = useState<Map<string, any>>(new Map());
    const [detectionError, setDetectionError] = useState<string | null>(null);

    // Use the refactored PDF API hook
    const {
        loading,
        error,
        progress,
        runBatchHybridDetect,
        resetErrors
    } = usePDFApi();

    // Get files to process based on selected scope
    const getFilesToProcess = useCallback((): File[] => {
        if (detectionScope === 'current' && currentFile) {
            return [currentFile];
        } else if (detectionScope === 'selected' && selectedFiles.length > 0) {
            return selectedFiles;
        } else if (detectionScope === 'all') {
            return files;
        }
        return [];
    }, [detectionScope, currentFile, selectedFiles, files]);

    // Function to reset entity highlights for a specific file
    const resetEntityHighlightsForFile = useCallback((fileKey: string) => {
        // Reset processed entity pages for this file
        window.dispatchEvent(new CustomEvent('reset-entity-highlights', {
            detail: { fileKey, resetType: 'detection-update', forceProcess: true }
        }));

        // Also reset the static processed entities map in EntityHighlightManager
        if (typeof window.resetEntityHighlightsForFile === 'function') {
            window.resetEntityHighlightsForFile(fileKey);
            console.log(`[EntityDetectionSidebar] Reset entity highlights for file ${fileKey}`);
        }
    }, []);

    // Batch entity detection across multiple files
    const handleDetect = useCallback(async () => {
        const filesToProcess = getFilesToProcess();

        if (filesToProcess.length === 0) {
            setDetectionError("No files selected for detection.");
            return;
        }

        setIsDetecting(true);
        setDetectionError(null);
        resetErrors();

        try {
            // Clear existing entity highlights for files that will be processed
            filesToProcess.forEach(file => {
                const fileKey = getFileKey(file);
                clearAnnotationsByType(HighlightType.ENTITY, undefined, fileKey);
            });

            // Prepare entity selections for each model
            const detectionOptions = {
                presidio: selectedMlEntities.length > 0 ? selectedMlEntities.map(e => e.value) : undefined,
                gliner: selectedGlinerEntities.length > 0 ? selectedGlinerEntities.map(e => e.value) : undefined,
                gemini: selectedAiEntities.length > 0 ? selectedAiEntities.map(e => e.value) : undefined
            };

            // Check if any entities are selected
            if (!detectionOptions.presidio && !detectionOptions.gliner && !detectionOptions.gemini) {
                setDetectionError("No entity types selected for detection.");
                setIsDetecting(false);
                return;
            }

            console.log('[EntityDebug] Starting batch hybrid detection with options:', detectionOptions);
            console.log(`[EntityDebug] Processing ${filesToProcess.length} files with scope: ${detectionScope}`);

            // Use the consolidated batch hybrid detection from the hook
            const results = await runBatchHybridDetect(filesToProcess, detectionOptions);

            console.log('[EntityDebug] Detection results:', results);

            // Update results state
            setDetectionResults(new Map(Object.entries(results)));

            // Process each file's detection results
            Object.entries(results).forEach(([fileKey, result]) => {
                // The API might return a structure with redaction_mapping inside
                const detectionResult = result;

                // If the result has a redaction_mapping property, use that
                const mappingToSet = detectionResult.redaction_mapping || detectionResult;

                console.log(`[EntityDebug] Setting detection mapping for file: ${fileKey}`);

                // Store the mapping for this file
                setFileDetectionMapping(fileKey, mappingToSet);

                // If this is the current file, also update the current detection mapping
                if (currentFile && getFileKey(currentFile) === fileKey) {
                    console.log(`[EntityDebug] Setting current detection mapping for file: ${fileKey}`);
                    setDetectionMapping(mappingToSet);
                }

                // Reset processed entity pages for this file to force re-processing
                resetEntityHighlightsForFile(fileKey);
            });

            // Show summary
            console.log(`[EntityDebug] Detected entities in ${Object.keys(results).length} files`);
        } catch (err: any) {
            console.error('[EntityDebug] Error during entity detection:', err);
            setDetectionError(err.message || 'An error occurred during entity detection');
        } finally {
            setIsDetecting(false);
        }
    }, [
        getFilesToProcess,
        selectedAiEntities,
        selectedMlEntities,
        selectedGlinerEntities,
        runBatchHybridDetect,
        clearAnnotationsByType,
        setDetectionMapping,
        setFileDetectionMapping,
        resetErrors,
        currentFile,
        resetEntityHighlightsForFile,
        detectionScope
    ]);

    // Reset selected entities and clear detection results
    const handleReset = useCallback(() => {
        setSelectedAiEntities([]);
        setSelectedMlEntities([]);
        setSelectedGlinerEntities([]);

        // Get files to reset based on current scope
        const filesToReset = getFilesToProcess();

        if (filesToReset.length > 0) {
            console.log(`[EntityDebug] Resetting entity highlights for ${filesToReset.length} files`);

            // Clear entity highlights for all files in current scope
            filesToReset.forEach(file => {
                const fileKey = getFileKey(file);
                clearAnnotationsByType(HighlightType.ENTITY, undefined, fileKey);

                // If this is the current file, also update the current detection mapping
                if (currentFile && getFileKey(currentFile) === fileKey) {
                    setDetectionMapping(null);
                }
            });
        } else {
            // If no files to process, just reset the current detection mapping
            setDetectionMapping(null);
        }

        setDetectionResults(new Map());
        setDetectionError(null);
    }, [
        setSelectedAiEntities,
        setSelectedMlEntities,
        setSelectedGlinerEntities,
        setDetectionMapping,
        clearAnnotationsByType,
        getFilesToProcess,
        currentFile
    ]);

    // Calculate combined detection statistics across all files
    const getDetectionStats = useCallback(() => {
        let totalEntities = 0;
        let totalPages = 0;
        let entityTypes = new Set<string>();
        let entitiesByType: Record<string, number> = {};
        let entitiesByModel: Record<string, number> = {
            'presidio': 0,
            'gliner': 0,
            'gemini': 0
        };

        // Process each file's results
        detectionResults.forEach((result, fileKey) => {
            if (!result.pages) return;

            // Count pages with entities
            const pagesWithEntities = result.pages.filter((page: any) =>
                page.sensitive && page.sensitive.length > 0
            ).length;

            totalPages += pagesWithEntities;

            // Process entities on each page
            result.pages.forEach((page: any) => {
                if (!page.sensitive) return;

                page.sensitive.forEach((entity: any) => {
                    totalEntities++;

                    // Track entity type
                    const entityType = entity.entity_type || 'UNKNOWN';
                    entityTypes.add(entityType);
                    entitiesByType[entityType] = (entitiesByType[entityType] || 0) + 1;

                    // Track model
                    const model = entity.model || 'presidio';
                    entitiesByModel[model] = (entitiesByModel[model] || 0) + 1;
                });
            });
        });

        return {
            totalEntities,
            totalFiles: detectionResults.size,
            totalPages,
            entityTypes: entityTypes.size,
            byType: entitiesByType,
            byModel: entitiesByModel
        };
    }, [detectionResults]);

    // Get detection stats
    const stats = getDetectionStats();

    // Use loading and progress from the hook
    const isCurrentlyDetecting = isDetecting || loading;
    const currentProgress = progress;

    // Set error from hook if available
    useEffect(() => {
        if (error) {
            setDetectionError(error);
        }
    }, [error]);

    // Display the number of files with detection mappings
    const filesWithMappings = fileDetectionMappings.size;

    return (
        <div className="entity-detection-sidebar">
            <div className="sidebar-header">
                <h3>Entity Detection</h3>
                {filesWithMappings > 0 && (
                    <div className="file-mappings-info">
                        {filesWithMappings} file{filesWithMappings !== 1 ? 's' : ''} with detection mappings
                    </div>
                )}
            </div>

            <div className="sidebar-content">
                <div className="sidebar-section">
                    <h4>Detection Scope</h4>
                    <div className="scope-options">
                        <button
                            className={`scope-button ${detectionScope === 'current' ? 'active' : ''}`}
                            onClick={() => setDetectionScope('current')}
                            disabled={!currentFile}
                            title="Detect in current file only"
                        >
                            Current File
                        </button>
                        <button
                            className={`scope-button ${detectionScope === 'selected' ? 'active' : ''}`}
                            onClick={() => setDetectionScope('selected')}
                            disabled={selectedFiles.length === 0}
                            title={`Detect in ${selectedFiles.length} selected files`}
                        >
                            Selected ({selectedFiles.length})
                        </button>
                        <button
                            className={`scope-button ${detectionScope === 'all' ? 'active' : ''}`}
                            onClick={() => setDetectionScope('all')}
                            title={`Detect in all ${files.length} files`}
                        >
                            All Files ({files.length})
                        </button>
                    </div>
                </div>

                <div className="sidebar-section">
                    <h4>Presidio ML Entity Types</h4>
                    <Select
                        isMulti
                        options={presidioOptions}
                        value={selectedMlEntities}
                        onChange={(options) => setSelectedMlEntities(options as OptionType[])}
                        placeholder="Select Presidio entities..."
                        className="entity-select"
                        classNamePrefix="select"
                        isDisabled={isCurrentlyDetecting}
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                    />
                </div>

                <div className="sidebar-section">
                    <h4>Gliner ML Entity Types</h4>
                    <Select
                        isMulti
                        options={glinerOptions}
                        value={selectedGlinerEntities}
                        onChange={(options) => setSelectedGlinerEntities(options as OptionType[])}
                        placeholder="Select Gliner entities..."
                        className="entity-select"
                        classNamePrefix="select"
                        isDisabled={isCurrentlyDetecting}
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                    />
                </div>

                <div className="sidebar-section">
                    <h4>Gemini AI Entity Types</h4>
                    <Select
                        isMulti
                        options={geminiOptions}
                        value={selectedAiEntities}
                        onChange={(options) => setSelectedAiEntities(options as OptionType[])}
                        placeholder="Select Gemini entities..."
                        className="entity-select"
                        classNamePrefix="select"
                        isDisabled={isCurrentlyDetecting}
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                    />
                </div>

                <div className="sidebar-section button-group">
                    <button
                        className="sidebar-button primary-button"
                        onClick={handleDetect}
                        disabled={
                            isCurrentlyDetecting ||
                            getFilesToProcess().length === 0 ||
                            (selectedMlEntities.length === 0 &&
                                selectedAiEntities.length === 0 &&
                                selectedGlinerEntities.length === 0)
                        }
                    >
                        {isCurrentlyDetecting ? `Detecting... ${currentProgress}%` : 'Detect Entities'}
                    </button>

                    <button
                        className="sidebar-button secondary-button"
                        onClick={handleReset}
                        disabled={isCurrentlyDetecting || (selectedMlEntities.length === 0 && selectedAiEntities.length === 0 && selectedGlinerEntities.length === 0 && detectionResults.size === 0)}
                    >
                        Reset
                    </button>
                </div>

                {detectionError && (
                    <div className="sidebar-section error-section">
                        <div className="error-message">
                            {detectionError}
                        </div>
                    </div>
                )}

                {detectionResults.size > 0 && stats.totalEntities > 0 && (
                    <div className="sidebar-section">
                        <h4>Detection Results</h4>
                        <div className="detection-stats">
                            <div className="stat-item">
                                <span className="stat-label">Total Entities</span>
                                <span className="stat-value">{stats.totalEntities}</span>
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
                                <span className="stat-value">{stats.entityTypes}</span>
                            </div>
                        </div>

                        {/* Show entities by type */}
                        <h5>By Entity Type</h5>
                        <div className="stat-breakdown">
                            {Object.entries(stats.byType).map(([type, count]) => (
                                <div key={type} className="stat-row">
                                    <span className="entity-type">{type}</span>
                                    <span className="entity-count">{count}</span>
                                </div>
                            ))}
                        </div>

                        {/* Show entities by model */}
                        <h5>By Model</h5>
                        <div className="stat-breakdown">
                            {Object.entries(stats.byModel)
                                .filter(([_, count]) => count > 0)
                                .map(([model, count]) => (
                                    <div key={model} className="stat-row">
                                        <span className="entity-type">{model}</span>
                                        <span className="entity-count">{count}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EntityDetectionSidebar;
