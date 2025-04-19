import React, { useState, useEffect, useCallback, useRef } from 'react';
import Select from 'react-select';
import { useFileContext } from '../../../contexts/FileContext';
import { useEditContext } from '../../../contexts/EditContext';
import { useHighlightContext } from '../../../contexts/HighlightContext';
import { HighlightType } from '../../../types/pdfTypes';
import { getFileKey } from '../../../contexts/PDFViewerContext';
import { usePDFApi } from '../../../hooks/usePDFApi';
import {FileDetectionResult, OptionType} from '../../../types';
import '../../../styles/modules/pdf/SettingsSidebar.css';
import '../../../styles/modules/pdf/EntityDetectionSidebar.css';
import { handleAllOPtions } from '../../../utils/pdfutils';
import {ChevronUp, ChevronDown, Save, AlertTriangle, ChevronRight, Sliders, CheckCircle} from 'lucide-react';
import { usePDFNavigation } from '../../../hooks/usePDFNavigation';
import useBanList from '../../../hooks/settings/useBanList';
import {
    MODEL_COLORS,
    presidioOptions,
    glinerOptions,
    geminiOptions,
    hidemeOptions,
    getColorDotStyle,
    createEntityBatch,
    METHOD_ID_MAP, entitiesToOptions
} from '../../../utils/EntityUtils';
import useSettings from "../../../hooks/settings/useSettings";
import useEntityDefinitions from "../../../hooks/settings/useEntityDefinitions";
import useAuth from "../../../hooks/auth/useAuth";

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
        selectedHideMeEntities,
        setSelectedHideMeEntities,
        setDetectionMapping,
        setFileDetectionMapping,
        fileDetectionMappings
    } = useEditContext();

    const {
        isLoading: isUserLoading,
        isAuthenticated,
        error: userError,
        clearError: clearUserError
    } = useAuth();

    const {
        modelEntities,
        getModelEntities,
        replaceModelEntities,
        isLoading: entitiesLoading,
    } = useEntityDefinitions();

    const {settings, updateSettings, isLoading: isSettingsLoading} = useSettings();
    const {banList, isLoading: isBanListLoading} = useBanList();

    const {
        clearAnnotationsByType,
    } = useHighlightContext();

    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionScope, setDetectionScope] = useState<'current' | 'selected' | 'all'>('all');
    const [detectionResults, setDetectionResults] = useState<Map<string, any>>(new Map());
    const [detectionError, setDetectionError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [fileSummaries, setFileSummaries] = useState<FileDetectionResult[]>([]);
    const [expandedFileSummaries, setExpandedFileSummaries] = useState<Set<string>>(new Set());
    const [detectionThreshold, setDetectionThreshold] = useState(() =>
        settings?.detection_threshold !== undefined ? settings.detection_threshold : 0.5
    );
    const [useBanlist, setUseBanlist] = useState(() =>
        settings?.use_banlist_for_detection !== undefined ? settings.use_banlist_for_detection : false
    );

    // Add initialization status tracking
    const [entitiesInitialized, setEntitiesInitialized] = useState(false);
    // Track which method IDs we've attempted to load
    const loadAttemptedRef = useRef<Set<number>>(new Set());

    const {
        loading,
        error,
        progress,
        runBatchHybridDetect,
        resetErrors
    } = usePDFApi();

    // Custom select styles to match design
    const customSelectStyles = {
        control: (provided: any, state: { isFocused: any; }) => ({
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
        option: (provided: any, state: { isSelected: any; isFocused: any; }) => ({
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
        }),
        multiValue: (provided: any) => ({
            ...provided,
            backgroundColor: 'var(--active-bg)',
            borderRadius: '4px',
        }),
        multiValueLabel: (provided: any) => ({
            ...provided,
            color: 'var(--foreground)',
        }),
        multiValueRemove: (provided: any) => ({
            ...provided,
            color: 'var(--muted-foreground)',
            '&:hover': {
                backgroundColor: 'var(--destructive)',
                color: 'white',
            },
        }),
        container: (provided: any) => ({
            ...provided,
            zIndex: 10
        }),
        menuPortal: (provided: any) => ({
            ...provided,
            zIndex: 9999
        })
    };

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

    // Reset entity highlights for a specific file
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

    // Handle batch entity detection across multiple files
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

            // First prepare the entity options - ensure we're passing arrays of values
            const presidioOptions = selectedMlEntities
                .filter(opt => !opt.value.startsWith('ALL_'))
                .map(opt => opt.value);

            const glinerOptions = selectedGlinerEntities
                .filter(opt => !opt.value.startsWith('ALL_'))
                .map(opt => opt.value);

            const geminiOptions = selectedAiEntities
                .filter(opt => !opt.value.startsWith('ALL_'))
                .map(opt => opt.value);

            const hidemeOptions = selectedHideMeEntities
                .filter(opt => !opt.value.startsWith('ALL_'))
                .map(opt => opt.value);

            // Prepare detection options with proper entity arrays
            const detectionOptions = {
                presidio: presidioOptions.length > 0 ? presidioOptions : null,
                gliner: glinerOptions.length > 0 ? glinerOptions : null,
                gemini: geminiOptions.length > 0 ? geminiOptions : null,
                hideme: hidemeOptions.length > 0 ? hidemeOptions : null,
                threshold: detectionThreshold,
                banlist: useBanlist && banList?.words ? banList.words : null
            };

            // Log for debugging
            console.log('[EntityDetectionSidebar] Detection options:', {
                filesCount: filesToProcess.length,
                presidioCount: presidioOptions.length,
                glinerCount: glinerOptions.length,
                geminiCount: geminiOptions.length,
                hidemeCount: hidemeOptions.length,
                threshold: detectionThreshold,
                useBanlist
            });

            // Use the consolidated batch hybrid detection from the hook
            const results = await runBatchHybridDetect(filesToProcess, detectionOptions);

            // Update results state
            setDetectionResults(new Map(Object.entries(results)));

            // Process each file's detection results
            const newFileSummaries: any[] = [];

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

            setSuccessMessage("Entity detection completed successfully");
            setTimeout(() => setSuccessMessage(null), 3000);

        } catch (err: any) {
            setDetectionError(err.message || 'An error occurred during entity detection');
        } finally {
            setIsDetecting(false);
        }
    }, [
        getFilesToProcess,
        resetErrors,
        clearAnnotationsByType,
        selectedMlEntities,
        selectedGlinerEntities,
        selectedAiEntities,
        selectedHideMeEntities,
        detectionThreshold,
        useBanlist,
        banList,
        runBatchHybridDetect,
        setFileDetectionMapping,
        setDetectionMapping,
        currentFile,
        resetEntityHighlightsForFile
    ]);

    // Listen for external detection triggers (e.g., from toolbar button)
    useEffect(() => {
        const handleExternalDetectionTrigger = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { source, filesToProcess } = customEvent.detail || {};

            console.log(`[EntityDetectionSidebar] Received external detection trigger from ${source}`);

            // Run detection process
            handleDetect();
        };

        // Add event listener
        window.addEventListener('trigger-entity-detection-process', handleExternalDetectionTrigger);

        // Clean up
        return () => {
            window.removeEventListener('trigger-entity-detection-process', handleExternalDetectionTrigger);
        };
    }, [handleDetect]);

    // Improved entity loading with better error handling and retry mechanism
    useEffect(() => {
        // Skip if not authenticated or still loading authentication
        if (!isAuthenticated || isUserLoading) {
            return;
        }

        // Skip if already initialized
        if (entitiesInitialized) {
            return;
        }

        // Load entities for all methods in parallel
        const loadAllEntities = async () => {
            try {
                console.log("[EntityDetectionSidebar] Loading all entity types");

                // Define methods to load
                const methodsToLoad = [
                    { id: METHOD_ID_MAP.presidio, name: 'presidio' },
                    { id: METHOD_ID_MAP.gliner, name: 'gliner' },
                    { id: METHOD_ID_MAP.gemini, name: 'gemini' },
                    { id: METHOD_ID_MAP.hideme, name: 'hideme' }
                ];

                // Create parallel load promises
                const loadPromises = methodsToLoad.map(async (method) => {
                    try {
                        // Skip if already attempted
                        if (loadAttemptedRef.current.has(method.id)) {
                            return;
                        }

                        // Mark as attempted
                        loadAttemptedRef.current.add(method.id);

                        console.log(`[EntityDetectionSidebar] Loading ${method.name} entities (Method ID: ${method.id})`);
                        return await getModelEntities(method.id);
                    } catch (err) {
                        console.error(`[EntityDetectionSidebar] Error loading ${method.name} entities:`, err);
                        return null;
                    }
                });

                // Wait for all loads to complete
                await Promise.all(loadPromises);

                // Mark initialization as complete
                setEntitiesInitialized(true);
                console.log("[EntityDetectionSidebar] All entity types loaded successfully");
            } catch (err) {
                console.error("[EntityDetectionSidebar] Error loading entities:", err);
            }
        };

        loadAllEntities();
    }, [isAuthenticated, isUserLoading, getModelEntities, entitiesInitialized]);

    // Apply model entities to selections when model entities change
    useEffect(() => {
        if (!entitiesInitialized) return;

        const applyModelEntities = () => {
            console.log("[EntityDetectionSidebar] Applying model entities to selections");

            // Helper to safely map entities to option types
            const getEntityOptions = (methodId: number, optionsArray: OptionType[]) => {
                const entities = modelEntities[methodId];
                if (!entities || !Array.isArray(entities) || entities.length === 0) {
                    return [];
                }

                // Create a set of entity texts for faster lookup
                const entityTexts = new Set(entities.map(e => e.entity_text));

                // Find matching options
                return optionsArray.filter(option =>
                    entityTexts.has(option.value)
                );
            };

            // Apply entities for each method
            const presOptions = getEntityOptions(METHOD_ID_MAP.presidio, presidioOptions);
            if (presOptions.length > 0) {
                console.log(`[EntityDetectionSidebar] Setting ${presOptions.length} Presidio entities`);
                setSelectedMlEntities(presOptions);
            }

            const glinerOpts = getEntityOptions(METHOD_ID_MAP.gliner, glinerOptions);
            if (glinerOpts.length > 0) {
                console.log(`[EntityDetectionSidebar] Setting ${glinerOpts.length} Gliner entities`);
                setSelectedGlinerEntities(glinerOpts);
            }

            const geminiOpts = getEntityOptions(METHOD_ID_MAP.gemini, geminiOptions);
            if (geminiOpts.length > 0) {
                console.log(`[EntityDetectionSidebar] Setting ${geminiOpts.length} Gemini entities`);
                setSelectedAiEntities(geminiOpts);
            }

            const hidemeOpts = getEntityOptions(METHOD_ID_MAP.hideme, hidemeOptions);
            if (hidemeOpts.length > 0) {
                console.log(`[EntityDetectionSidebar] Setting ${hidemeOpts.length} Hideme entities`);
                setSelectedHideMeEntities(hidemeOpts);
            }
        };

        applyModelEntities();
    }, [
        modelEntities,
        entitiesInitialized,
        setSelectedMlEntities,
        setSelectedGlinerEntities,
        setSelectedAiEntities,
        setSelectedHideMeEntities
    ]);

    // Synchronize with settings when they change
    useEffect(() => {
        if (!settings) return;

        // Update detection threshold
        if (settings.detection_threshold !== undefined) {
            setDetectionThreshold(settings.detection_threshold);
        }

        // Update ban list usage setting
        if (settings.use_banlist_for_detection !== undefined) {
            setUseBanlist(settings.use_banlist_for_detection);
        }
    }, [settings]);

    // Listen for settings changes through events
    useEffect(() => {
        const handleSettingsChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { type, settings } = customEvent.detail || {};

            // Only apply entity settings
            if (type === 'entity' && settings) {
                console.log('[EntityDetectionSidebar] Received entity settings change event');

                // Apply appropriate entity settings if provided
                if (settings.presidio) {
                    setSelectedMlEntities(settings.presidio);
                }

                if (settings.gliner) {
                    setSelectedGlinerEntities(settings.gliner);
                }

                if (settings.gemini) {
                    setSelectedAiEntities(settings.gemini);
                }

                if (settings.hideme) {
                    setSelectedHideMeEntities(settings.hideme);
                }

                // Apply detection threshold if provided
                if (settings.detectionThreshold !== undefined) {
                    setDetectionThreshold(settings.detectionThreshold);
                }

                // Apply ban list setting if provided
                if (settings.useBanlist !== undefined) {
                    setUseBanlist(settings.useBanlist);
                }
            }
        };

        window.addEventListener('settings-changed', handleSettingsChange as EventListener);

        return () => {
            window.removeEventListener('settings-changed', handleSettingsChange as EventListener);
        };
    }, [
        setSelectedMlEntities,
        setSelectedGlinerEntities,
        setSelectedAiEntities,
        setSelectedHideMeEntities
    ]);

    // Reset selected entities and clear detection results
    const handleReset = useCallback(() => {
        setSelectedAiEntities([]);
        setSelectedMlEntities([]);
        setSelectedGlinerEntities([]);
        setSelectedHideMeEntities([]);

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
        setSelectedHideMeEntities,
        setDetectionMapping,
        clearAnnotationsByType,
        getFilesToProcess,
        currentFile
    ]);

    // Save detection settings to user preferences
    const handleSaveSettings = useCallback(async () => {
        try {
            setIsDetecting(true);
            clearUserError();
            setDetectionError(null);

            // Add entities for each method
            await replaceModelEntities(METHOD_ID_MAP.presidio,
                selectedMlEntities
            );
            await replaceModelEntities(METHOD_ID_MAP.gliner,
                selectedGlinerEntities
            );
            await replaceModelEntities(METHOD_ID_MAP.gemini,
               selectedAiEntities
            );
            await replaceModelEntities(METHOD_ID_MAP.hideme,
                selectedHideMeEntities
            );
            // Update app settings
            await updateSettings({
                detection_threshold: detectionThreshold,
                use_banlist_for_detection: useBanlist
            });

            // Show success message
            setSuccessMessage("Settings saved successfully");
            setTimeout(() => setSuccessMessage(null), 3000);

            // Notify other components
            window.dispatchEvent(new CustomEvent('settings-changed', {
                detail: {
                    type: 'entity',
                    settings: {
                        presidio: selectedMlEntities,
                        gliner: selectedGlinerEntities,
                        gemini: selectedAiEntities,
                        hideme: selectedHideMeEntities,
                        detectionThreshold,
                        useBanlist
                    }
                }
            }));

        } catch (error) {
            console.error("[EntityDetectionSidebar] Error saving settings:", error);
            setDetectionError("Failed to save settings");
        } finally {
            setIsDetecting(false);
        }
    }, [
        replaceModelEntities,
        updateSettings,
        selectedMlEntities,
        selectedGlinerEntities,
        selectedAiEntities,
        selectedHideMeEntities,
        detectionThreshold,
        useBanlist,
        clearUserError
    ]);

    const ColorDot: React.FC<{ color: string }> = ({ color }) => (
        <span
            className="color-dot"
            style={getColorDotStyle(color)}
        />
    );

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
    const getEntityModel = useCallback((entityType: string): 'presidio' | 'gliner' | 'gemini' | 'hideme' => {
        const presidioEntities = new Set(presidioOptions.map(opt => opt.value));
        const glinerEntities = new Set(glinerOptions.map(opt => opt.value));
        const geminiEntities = new Set(geminiOptions.map(opt => opt.value));
        const hidemeEntities = new Set(hidemeOptions.map(opt => opt.value));

        if (presidioEntities.has(entityType)) return 'presidio';
        if (glinerEntities.has(entityType)) return 'gliner';
        if (geminiEntities.has(entityType)) return 'gemini';
        if (hidemeEntities.has(entityType)) return 'hideme';

        // Default to presidio if not found
        return 'presidio';
    }, []);

    // Handle dropdown change with "ALL" logic
    const handlePresidioChange = (options: readonly OptionType[]) => {
        const selectedOptions = [...options];
        const hasAll = selectedOptions.some(option => option.value === 'ALL_PRESIDIO_P');

        // If "ALL" is selected, filter out other options
        if (hasAll) {
            const allOption = selectedOptions.find(option => option.value === 'ALL_PRESIDIO_P');
            setSelectedMlEntities(allOption ? [allOption] : []);
        } else {
            setSelectedMlEntities(selectedOptions);
        }
    };

    const handleHidemeChange = (options: readonly OptionType[]) => {
        const selectedOptions = [...options];
        const hasAll = selectedOptions.some(option => option.value === 'ALL_HIDEME');

        if (hasAll) {
            const allOption = selectedOptions.find(option => option.value === 'ALL_HIDEME');
            setSelectedHideMeEntities(allOption ? [allOption] : []);
        } else {
            setSelectedHideMeEntities(selectedOptions);
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

    // Combined loading state
    const isLoading = isUserLoading || isDetecting || loading || isSettingsLoading || isBanListLoading || entitiesLoading;
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
                        <ColorDot color={MODEL_COLORS.presidio}/>
                        <h4>Presidio Machine Learning</h4>
                    </div>
                    {/* Added key prop for forcing re-render and increased z-index */}
                    <Select
                        key="presidio-select"
                        isMulti
                        options={presidioOptions}
                        value={selectedMlEntities}
                        onChange={handlePresidioChange}
                        placeholder="Select entities to detect..."
                        className="entity-select"
                        classNamePrefix="entity-select"
                        isDisabled={isDetecting }
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                        styles={customSelectStyles}
                    />
                </div>

                <div className="sidebar-section entity-select-section">
                    <div className="entity-select-header">
                        <ColorDot color={MODEL_COLORS.gliner}/>
                        <h4>Gliner Machine Learning</h4>
                    </div>
                    {/* Added key prop for forcing re-render and increased z-index */}
                    <Select
                        key="gliner-select"
                        isMulti
                        options={glinerOptions}
                        value={selectedGlinerEntities}
                        onChange={handleGlinerChange}
                        placeholder="Select entities to detect..."
                        className="entity-select"
                        classNamePrefix="entity-select"
                        isDisabled={isDetecting }
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                        styles={customSelectStyles}
                    />
                </div>

                <div className="sidebar-section entity-select-section">
                    <div className="entity-select-header">
                        <ColorDot color={MODEL_COLORS.gemini}/>
                        <h4>Gemini AI</h4>
                    </div>
                    <Select
                        key="gemini-select"
                        isMulti
                        options={geminiOptions}
                        value={selectedAiEntities}
                        onChange={handleGeminiChange}
                        placeholder="Select entities to detect..."
                        className="entity-select"
                        classNamePrefix="entity-select"
                        isDisabled={isDetecting }
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                        styles={customSelectStyles}
                    />
                </div>
                <div className="sidebar-section entity-select-section">
                    <div className="entity-select-header">
                        <ColorDot color={MODEL_COLORS.hideme}/>
                        <h4>Hide me AI</h4>
                    </div>
                    <Select
                        key="hideme-select"
                        isMulti
                        options={hidemeOptions}
                        value={selectedHideMeEntities}
                        onChange={handleHidemeChange}
                        placeholder="Select entities to detect..."
                        className="entity-select"
                        classNamePrefix="entity-select"
                        isDisabled={isDetecting}
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                        styles={customSelectStyles}
                    />
                </div>

                {/* Detection Threshold Slider */}
                <div className="sidebar-section entity-select-section">
                    <div className="entity-select-header">
                        <Sliders size={18}/>
                        <h4>Detection Settings</h4>
                    </div>
                    <div className="form-group mt-2">
                        <label className="text-sm font-medium mb-2 block">
                            Detection Threshold ({Math.round(detectionThreshold * 100)}%)
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                            Higher values reduce false positives but may miss some entities
                        </p>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">Low</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={detectionThreshold}
                                onChange={(e) => setDetectionThreshold(parseFloat(e.target.value))}
                                className="flex-1 accent-primary"
                                disabled={isDetecting}
                            />
                            <span className="text-xs text-muted-foreground">High</span>
                        </div>
                    </div>

                    <div className="form-group mt-4">
                        <div className="switch-container">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Use Ban List</label>
                                <p className="text-xs text-muted-foreground">
                                    {useBanlist ? "Applying ban list to detection" : "Ban list ignored"}
                                </p>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={useBanlist}
                                    onChange={(e) => setUseBanlist(e.target.checked)}
                                    disabled={isDetecting}
                                />
                                <span className="switch-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                {detectionError && (
                    <div className="sidebar-section error-section">
                        <div className="error-message">
                            <AlertTriangle size={18} className="error-icon"/>
                            {detectionError}
                        </div>
                    </div>
                )}

                {successMessage && (
                    <div className="sidebar-section success-section">
                        <div className="success-message">
                            <CheckCircle size={18} className="success-icon"/>
                            {successMessage}
                        </div>
                    </div>
                )}

                <div className="sidebar-section action-buttons">
                    <button
                        className="sidebar-button action-button detect-button"
                        onClick={handleDetect}
                        disabled={
                            isDetecting ||
                            getFilesToProcess().length === 0 ||
                            (selectedMlEntities.length === 0 &&
                                selectedAiEntities.length === 0 &&
                                selectedGlinerEntities.length === 0 &&
                                selectedHideMeEntities.length === 0)
                        }
                    >
                        {isDetecting ? (
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
                            disabled={isDetecting|| (selectedMlEntities.length === 0 && selectedAiEntities.length === 0 && selectedGlinerEntities.length === 0 && selectedHideMeEntities.length === 0 && fileSummaries.length === 0)}
                        >
                            Reset
                        </button>

                        <button
                            className="sidebar-button save-button"
                            onClick={handleSaveSettings}
                            disabled={isDetecting || !isAuthenticated}
                        >
                            <Save size={16}/>
                            <span>{ 'Save to Settings'}</span>
                        </button>
                    </div>
                </div>

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
                                            {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
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
                                                        <span
                                                            className="stat-value">{performance.entity_density.toFixed(2)}%</span>
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
                                                                    <ColorDot color={MODEL_COLORS[model]}/>
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
                                                                                // Find the first page with this entity type
                                                                                const pages = Object.keys(entitiesDetected.by_page);
                                                                                if (pages.length > 0) {
                                                                                    const pageNumber = parseInt(pages[0].split('_')[1], 10);
                                                                                    navigateToPage(fileSummary.fileKey, pageNumber);
                                                                                }
                                                                            }}
                                                                            title="Navigate to entity"
                                                                        >
                                                                            <ChevronRight size={14}/>
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
                                                                                <ChevronRight size={14}/>
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
