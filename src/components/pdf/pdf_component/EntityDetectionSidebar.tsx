import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import { useFileContext } from '../../../contexts/FileContext';
import { useEditContext } from '../../../contexts/EditContext';
import { useHighlightContext, HighlightType } from '../../../contexts/HighlightContext';
import { getFileKey } from '../../../contexts/PDFViewerContext';
import { usePDFApi } from '../../../hooks/usePDFApi';
import { OptionType } from '../../../types/types';
import '../../../styles/modules/pdf/SettingsSidebar.css';
import '../../../styles/modules/pdf/EntityDetctionSidebar.css';
import {handleAllOPtions} from '../../../utils/pdfutils'
import { ChevronUp, ChevronDown, Save, AlertTriangle, ChevronRight } from 'lucide-react';
import { usePDFNavigation } from '../../../hooks/usePDFNavigation';

// Presidio ML entity options
const presidioOptions: OptionType[] = [
    { value: 'ALL_PRESIDIO', label: 'All Presidio Entities' },
    { value: 'PERSON', label: 'Person' },
    { value: 'DATE_TIME', label: 'Date/Time' },
    { value: 'EMAIL_ADDRESS', label: 'Email Address' },
    { value: 'IBAN_CODE', label: 'IBAN' },
    { value: 'IP_ADDRESS', label: 'IP Address' },
    { value: 'NO_COMPANY_NUMBER', label: 'Org number' },
    { value: 'LOCATION', label: 'Location' },
    { value: 'MEDICAL_LICENSE', label: 'Medical License' },
    { value: 'URL', label: 'URL' },
    { value: 'NO_ADDRESS', label: 'Address' },
    { value: 'NO_PHONE_NUMBER', label: 'Phone' },
    { value: 'NO_FODSELSNUMMER', label: 'ID' },
    { value: 'NO_BANK_ACCOUNT', label: 'Bank account' },
    { value: 'NO_LICENSE_PLATE', label: 'License plate' },
    { value: 'ORGANIZATION', label: 'Organization' },
    { value: 'CRYPTO', label: 'Crypto Wallet' },
];

// Gliner ML entity options
const glinerOptions: OptionType[] = [
    { value: 'ALL_GLINER', label: 'All Gliner Entities' },
    { value: 'person', label: 'Person' },
    { value: 'location', label: 'Location' },
    { value: 'date', label: 'Date' },
    { value: 'organization', label: 'Organization' },
    { value: 'phone number', label: 'Phone Number' },
    { value: 'address', label: 'Address' },
    { value: 'passport number', label: 'Passport Number' },
    { value: 'email', label: 'Email' },
    { value: 'credit card number', label: 'Credit Card Number' },
    { value: 'date of birth', label: 'Date of Birth' },
    { value: 'bank account number', label: 'Bank Account Number' },
    { value: 'medication', label: 'Medication' },
    { value: 'tax identification number', label: 'Tax Identification Number' },
    { value: 'medical condition', label: 'Medical Condition' },
    { value: 'identity card number', label: 'Identity Card Number' },
    { value: 'national id number', label: 'National ID Number' },
    { value: 'ip address', label: 'IP Address' },
    { value: 'iban', label: 'IBAN' },
    { value: 'credit card expiration date', label: 'Credit Card Expiration Date' },
    { value: 'username', label: 'Username' },
    { value: 'registration number', label: 'Registration Number' },
    { value: 'student id number', label: 'Student ID Number' },
    { value: 'insurance number', label: 'Insurance Number' },
    { value: 'social media handle', label: 'Social Media Handle' },
    { value: 'license plate number', label: 'License Plate Number' },
    { value: 'postal code', label: 'Postal Code' },
    { value: 'vehicle registration number', label: 'Vehicle Registration Number' },
    { value: 'fax number', label: 'Fax Number' },
    { value: 'visa number', label: 'Visa Number' },
    { value: 'passport_number', label: 'Passport_number' },
];


// Gemini AI entity options
const geminiOptions: OptionType[] = [
    { value: 'ALL_GEMINI', label: 'All Gemini Entities' },
    { value: 'PERSON-G', label: 'Person' },
    { value: 'ORGANIZATION-G', label: 'Organization' },
    { value: 'PHONE-G', label: 'Phone' },
    { value: 'EMAIL-G', label: 'Email' },
    { value: 'ADDRESS-G', label: 'Address' },
    { value: 'LOCATION-G', label: 'Location' },
    { value: 'DATE-G', label: 'Date' },
    { value: 'NATIONAL_ID-G', label: 'National ID' },
    { value: 'FINANCIAL_INFO-G', label: 'Financial' },
    { value: 'AGE-G', label: 'Age' },
    { value: 'HEALTH-G', label: 'Health' },
    { value: 'CRIMINAL-G', label: 'Criminal' },
    { value: 'SEXUAL-G', label: 'Sexual' },
    { value: 'RELIGIOUS_BELIEF-G', label: 'Religious Belief' },
    { value: 'POLITICAL_AFFILIATION-G', label: 'Political Affiliation' },
    { value: 'TRADE_UNION-G', label: 'Trade Union' },
    { value: 'BIOMETRIC_DATA-G', label: 'Biometric Data' },
    { value: 'GENETIC_DATA-G', label: 'Genetic Data' },
    { value: 'CONTEXT-G', label: 'Context' },
];

// Define model colors for dots
export const MODEL_COLORS = {
    presidio: '#f8ca4c', // Yellow
    gliner: '#f67575',   // Red
    gemini: '#7571ff'    // Blue
};

// Define interface for entity summary
interface EntitySummary {
    total: number;
    by_type: Record<string, number>;
    by_page: Record<string, number>;
}

interface PerformanceStats {
    words_count: number;
    pages_count: number;
    entity_density: number;
    sanitize_time: number;
}

interface FileDetectionResult {
    fileKey: string;
    fileName: string;
    entities_detected?: EntitySummary;
    performance?: PerformanceStats;
}

// Custom select styles to match design
const customSelectStyles = {
    control: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: 'var(--background)',
        borderColor: state.isFocused ? 'var(--primary)' : 'var(--border)',
        boxShadow: state.isFocused ? '0 0 0 1px var(--primary)' : null,
        '&:hover': {
            borderColor: 'var(--primary)'
        }
    }),
    menu: (provided: any) => ({
        ...provided,
        backgroundColor: 'var(--background)',
        borderRadius: 'var(--border-radius-md)',
        boxShadow: 'var(--shadow-md)',
        zIndex: 100
    }),
    option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected
            ? 'var(--primary)'
            : state.isFocused
                ? 'var(--button-hover)'
                : 'var(--background)',
        color: state.isSelected ? 'white' : 'var(--foreground)',
        '&:hover': {
            backgroundColor: state.isSelected ? 'var(--primary)' : 'var(--button-hover)'
        }
    })
};

// Component for the colored dot indicator
export const ColorDot: React.FC<{ color: string }> = ({ color }) => (
    <span
        className="color-dot"
        style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: color,
            marginRight: '8px'
        }}
    />
);

const EntityDetectionSidebar: React.FC = () => {
    const {
        currentFile,
        selectedFiles,
        files
    } = useFileContext();

    const pdfNavigation = usePDFNavigation('entity-sidebar');

    const {
        selectedMlEntities,
        setSelectedMlEntities,
        selectedAiEntities,
        setSelectedAiEntities,
        selectedGlinerEntities,
        setSelectedGlinerEntities,
        setDetectionMapping,
        setFileDetectionMapping,
        fileDetectionMappings
    } = useEditContext();

    const {
        clearAnnotationsByType,
    } = useHighlightContext();

    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionScope, setDetectionScope] = useState<'current' | 'selected' | 'all'>('all');
    const [detectionResults, setDetectionResults] = useState<Map<string, any>>(new Map());
    const [detectionError, setDetectionError] = useState<string | null>(null);
    const [fileSummaries, setFileSummaries] = useState<FileDetectionResult[]>([]);
    const [expandedFileSummaries, setExpandedFileSummaries] = useState<Set<string>>(new Set());

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
        }
    }, []);

    // Simple navigation to a page without highlighting
    const navigateToPage = useCallback((fileKey: string, pageNumber: number) => {
        const file = files.find(f => getFileKey(f).includes(fileKey));

        if (!file) {
            return;
        }

        const isChangingFile = currentFile !== file;

        // Use our navigation hook for consistent navigation behavior
        pdfNavigation.navigateToPage(pageNumber, getFileKey(file), {
            // Use auto behavior for better UX when changing files
            behavior: isChangingFile ? 'auto' : 'smooth',
            // Align to top when navigating to entities for better visibility
            alignToTop: true,
            // Always highlight the thumbnail
            highlightThumbnail: true
        });

    }, [pdfNavigation, files, currentFile]);


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

                // Also reset the entity tracking to force fresh processing
                if (typeof window.resetEntityHighlightsForFile === 'function') {
                    window.resetEntityHighlightsForFile(fileKey);
                }

                // Remove any cached highlights for this file
                if (typeof window.removeFileHighlightTracking === 'function') {
                    window.removeFileHighlightTracking(fileKey);
                }
            });
            await new Promise(resolve => setTimeout(resolve, 50));
            const detectionOptions = handleAllOPtions(selectedAiEntities, selectedGlinerEntities, selectedMlEntities);


            // Use the consolidated batch hybrid detection from the hook
            const results = await runBatchHybridDetect(filesToProcess, detectionOptions);

            // Update results state
            setDetectionResults(new Map(Object.entries(results)));

            // Process each file's detection results
            const newFileSummaries: FileDetectionResult[] = [];

            Object.entries(results).forEach(([fileKey, result]) => {
                // The API might return a structure with redaction_mapping inside
                const detectionResult = result;
                // If the result has a redaction_mapping property, use that
                const mappingToSet = detectionResult.redaction_mapping || detectionResult;

                // Store the mapping for this file
                setFileDetectionMapping(fileKey, mappingToSet);

                window.dispatchEvent(new CustomEvent('entity-detection-complete', {
                    detail: {
                        fileKey,
                        source: 'detection-process',
                        timestamp: Date.now(),
                        forceProcess: true
                    }
                }));

                // Reset processed entity pages with slight delay
                setTimeout(() => {
                    resetEntityHighlightsForFile(fileKey);
                }, 100);

                // If this is the current file, also update the current detection mapping
                if (currentFile && getFileKey(currentFile) === fileKey) {
                    setDetectionMapping(mappingToSet);
                }

                // Reset processed entity pages for this file to force re-processing
                setTimeout(() => {
                    resetEntityHighlightsForFile(fileKey);
                }, 100);

                // Extract summary information for this file
                const filename = filesToProcess.find(f => getFileKey(f) === fileKey)?.name ?? fileKey;

                // Create a file summary object
                const fileSummary: FileDetectionResult = {
                    fileKey,
                    fileName: filename,
                    entities_detected: detectionResult.entities_detected,
                    performance: detectionResult.performance
                };

                newFileSummaries.push(fileSummary);
            });

            // Update file summaries state and automatically expand them
            setFileSummaries(newFileSummaries);
            const newExpandedSet = new Set<string>();
            newFileSummaries.forEach(summary => newExpandedSet.add(summary.fileKey));
            setExpandedFileSummaries(newExpandedSet);

        } catch (err: any) {
            setDetectionError(err.message || 'An error occurred during entity detection');
        } finally {
            setIsDetecting(false);
        }
    }, [getFilesToProcess, selectedAiEntities, selectedMlEntities, selectedGlinerEntities, runBatchHybridDetect, clearAnnotationsByType, setDetectionMapping, setFileDetectionMapping, resetErrors, currentFile, resetEntityHighlightsForFile]);

    // Reset selected entities and clear detection results
    const handleReset = useCallback(() => {
        setSelectedAiEntities([]);
        setSelectedMlEntities([]);
        setSelectedGlinerEntities([]);

        // Get files to reset based on current scope
        const filesToReset = getFilesToProcess();

        if (filesToReset.length > 0) {
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
        setFileSummaries([]);
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

    // Save settings placeholder function
    const handleSaveSettings = useCallback(() => {
        // This is a placeholder - would typically save current settings to user preferences
        alert("Settings saved successfully!");
    }, []);

    // Toggle file summary expansion
    const toggleFileSummary = useCallback((fileKey: string) => {
        setExpandedFileSummaries(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fileKey)) {
                newSet.delete(fileKey);
            } else {
                newSet.add(fileKey);
            }
            return newSet;
        });
    }, []);

    // Format entity name for display
    const formatEntityName = useCallback((entityType: string): string => {
        return entityType
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }, []);

    // Helper to determine which model an entity belongs to
    const getEntityModel = useCallback((entityType: string): 'presidio' | 'gliner' | 'gemini' => {
        const presidioEntities = new Set(presidioOptions.map(opt => opt.value));
        const glinerEntities = new Set(glinerOptions.map(opt => opt.value));
        const geminiEntities = new Set(geminiOptions.map(opt => opt.value));

        if (presidioEntities.has(entityType)) return 'presidio';
        if (glinerEntities.has(entityType)) return 'gliner';
        if (geminiEntities.has(entityType)) return 'gemini';

        // Default to presidio if not found
        return 'presidio';
    }, []);

    // Handle dropdown change with "ALL" logic
    const handlePresidioChange = (options: readonly OptionType[]) => {
        const selectedOptions = [...options];
        const hasAll = selectedOptions.some(option => option.value === 'ALL_PRESIDIO');

        // If "ALL" is selected, filter out other options
        if (hasAll) {
            const allOption = selectedOptions.find(option => option.value === 'ALL_PRESIDIO');
            setSelectedMlEntities(allOption ? [allOption] : []);
        } else {
            setSelectedMlEntities(selectedOptions);
        }
    };

    const handleGlinerChange = (options: readonly OptionType[]) => {
        const selectedOptions = [...options];
        const hasAll = selectedOptions.some(option => option.value === 'ALL_GLINER');

        if (hasAll) {
            const allOption = selectedOptions.find(option => option.value === 'ALL_GLINER');
            setSelectedGlinerEntities(allOption ? [allOption] : []);
        } else {
            setSelectedGlinerEntities(selectedOptions);
        }
    };

    const handleGeminiChange = (options: readonly OptionType[]) => {
        const selectedOptions = [...options];
        const hasAll = selectedOptions.some(option => option.value === 'ALL_GEMINI');

        if (hasAll) {
            const allOption = selectedOptions.find(option => option.value === 'ALL_GEMINI');
            setSelectedAiEntities(allOption ? [allOption] : []);
        } else {
            setSelectedAiEntities(selectedOptions);
        }
    };

    // Set error from hook if available
    useEffect(() => {
        if (error) {
            setDetectionError(error);
        }
    }, [error]);

    // Combined loading state
    const isCurrentlyDetecting = isDetecting || loading;
    const currentProgress = progress;

    // Display the number of files with detection mappings
    const filesWithMappings = fileDetectionMappings.size;

    // Format for entity type display
    const formatEntityDisplay = (entityType: string): string => {
        const formatted = formatEntityName(entityType);
        return formatted.length > 15 ? `${formatted.substring(0, 13)}...` : formatted;
    };

    return (
        <div className="entity-detection-sidebar">
            <div className="sidebar-header entity-header">
                <h3>Automatic Detection</h3>
                {filesWithMappings > 0 && (
                    <div className="entity-badge">
                        {filesWithMappings} file{filesWithMappings !== 1 ? 's' : ''} analyzed
                    </div>
                )}
            </div>

            <div className="sidebar-content">
                <div className="sidebar-section scope-section">
                    <h4>Detection Scope</h4>
                    <div className="scope-buttons">
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

                <div className="sidebar-section entity-select-section">
                    <div className="entity-select-header">
                        <ColorDot color={MODEL_COLORS.presidio} />
                        <h4>Presidio Machine Learning</h4>
                    </div>
                    <Select
                        isMulti
                        options={presidioOptions}
                        value={selectedMlEntities}
                        onChange={handlePresidioChange}
                        placeholder="Select entities to dectect..."
                        className="entity-select"
                        classNamePrefix="select"
                        isDisabled={isCurrentlyDetecting}
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                        styles={customSelectStyles}
                    />
                </div>

                <div className="sidebar-section entity-select-section">
                    <div className="entity-select-header">
                        <ColorDot color={MODEL_COLORS.gliner} />
                        <h4>Gliner Machine Learning</h4>
                    </div>
                    <Select
                        isMulti
                        options={glinerOptions}
                        value={selectedGlinerEntities}
                        onChange={handleGlinerChange}
                        placeholder="Select entities to dectect..."
                        className="entity-select"
                        classNamePrefix="select"
                        isDisabled={isCurrentlyDetecting}
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                        styles={customSelectStyles}
                    />
                </div>

                <div className="sidebar-section entity-select-section">
                    <div className="entity-select-header">
                        <ColorDot color={MODEL_COLORS.gemini} />
                        <h4>Gemini AI</h4>
                    </div>
                    <Select
                        isMulti
                        options={geminiOptions}
                        value={selectedAiEntities}
                        onChange={handleGeminiChange}
                        placeholder="Select entities to dectect..."
                        className="entity-select"
                        classNamePrefix="select"
                        isDisabled={isCurrentlyDetecting}
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                        styles={customSelectStyles}
                    />
                </div>

                <div className="sidebar-section action-buttons">
                    <button
                        className="sidebar-button action-button detect-button"
                        onClick={handleDetect}
                        disabled={
                            isCurrentlyDetecting ||
                            getFilesToProcess().length === 0 ||
                            (selectedMlEntities.length === 0 &&
                                selectedAiEntities.length === 0 &&
                                selectedGlinerEntities.length === 0)
                        }
                    >
                        {isCurrentlyDetecting ? (
                            <>
                                <div className="progress-container">
                                    <div
                                        className="progress-bar"
                                        style={{width: `${currentProgress}%`}}
                                    ></div>
                                </div>
                                <span>Detecting... {currentProgress}%</span>
                            </>
                        ) : 'Detect Entities'}
                    </button>

                    <div className="secondary-buttons">
                        <button
                            className="sidebar-button secondary-button"
                            onClick={handleReset}
                            disabled={isCurrentlyDetecting || (selectedMlEntities.length === 0 && selectedAiEntities.length === 0 && selectedGlinerEntities.length === 0 && fileSummaries.length === 0)}
                        >
                            Reset
                        </button>

                        <button
                            className="sidebar-button save-button"
                            onClick={handleSaveSettings}
                            disabled={isCurrentlyDetecting}
                        >
                            <Save size={16} />
                            <span>Save to Settings</span>
                        </button>
                    </div>
                </div>

                {detectionError && (
                    <div className="sidebar-section error-section">
                        <div className="error-message">
                            <AlertTriangle size={18} className="error-icon" />
                            {detectionError}
                        </div>
                    </div>
                )}

                {fileSummaries.length > 0 && (
                    <div className="sidebar-section detection-results-section">
                        <h4>Detection Results</h4>

                        {fileSummaries.map((fileSummary) => {
                            const isExpanded = expandedFileSummaries.has(fileSummary.fileKey);
                            const entitiesDetected = fileSummary.entities_detected;
                            const performance = fileSummary.performance;

                            if (!entitiesDetected) return null;

                            return (
                                <div className="file-summary-card" key={fileSummary.fileKey}>
                                    <div
                                        className="file-summary-header"
                                        onClick={() => toggleFileSummary(fileSummary.fileKey)}
                                    >
                                        <div className="file-summary-title">
                                            <span className="file-name">{fileSummary.fileName}</span>
                                            <span className="entity-count-badge">
                                                {entitiesDetected.total} entities
                                            </span>
                                        </div>
                                        <div className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="file-summary-content">
                                            {/* Performance stats section - matches the design */}
                                            {performance && (
                                                <div className="performance-stats">
                                                    <div className="stat-item">
                                                        <span className="stat-label">Pages</span>
                                                        <span className="stat-value">{performance.pages_count}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Words</span>
                                                        <span className="stat-value">{performance.words_count}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Entity Density</span>
                                                        <span className="stat-value">{performance.entity_density.toFixed(2)}%</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* By entity type section - with color dots */}
                                            <div className="entities-by-section">
                                                <h5>By Entity Type</h5>
                                                <div className="entity-list">
                                                    {Object.entries(entitiesDetected.by_type).map(([entityType, count]) => {
                                                        const model = getEntityModel(entityType);
                                                        return (
                                                            <div className="entity-list-item" key={entityType}>
                                                                <div className="entity-item-left">
                                                                    <ColorDot color={MODEL_COLORS[model]} />
                                                                    <span className="entity-name">
                                                                        {formatEntityDisplay(entityType)}
                                                                    </span>
                                                                </div>
                                                                <div className="entity-item-right">
                                                                    <span className="entity-count">{count}</span>
                                                                    <div className="navigation-buttons">
                                                                        <button
                                                                            className="nav-button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                // Find first page with this entity type
                                                                                const pages = Object.keys(entitiesDetected.by_page);
                                                                                if (pages.length > 0) {
                                                                                    const pageNumber = parseInt(pages[0].split('_')[1], 10);
                                                                                    navigateToPage(fileSummary.fileKey, pageNumber);
                                                                                }
                                                                            }}
                                                                            title="Navigate to entity"
                                                                        >
                                                                            <ChevronRight size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* By page section - matching the design */}
                                            <div className="entities-by-section">
                                                <h5>By Page</h5>
                                                <div className="entity-list">
                                                    {Object.entries(entitiesDetected.by_page)
                                                        .sort((a, b) => {
                                                            // Sort by page number
                                                            const pageNumA = parseInt(a[0].split('_')[1], 10);
                                                            const pageNumB = parseInt(b[0].split('_')[1], 10);
                                                            return pageNumA - pageNumB;
                                                        })
                                                        .map(([page, count]) => {
                                                            const pageNumber = parseInt(page.split('_')[1], 10);

                                                            return (
                                                                <div className="page-list-item" key={page}>
                                                                    <div className="page-item-left">
                                                                        <span className="page-name">
                                                                            Page {pageNumber}
                                                                        </span>
                                                                    </div>
                                                                    <div className="page-item-right">
                                                                        <span className="entity-count">{count} entities</span>
                                                                        <div className="navigation-buttons">
                                                                            <button
                                                                                className="nav-button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    navigateToPage(fileSummary.fileKey, pageNumber);
                                                                                }}
                                                                                title="Navigate to page"
                                                                            >
                                                                                <ChevronRight size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EntityDetectionSidebar;
