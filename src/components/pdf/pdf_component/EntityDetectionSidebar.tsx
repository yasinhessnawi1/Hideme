import React, {useCallback, useEffect, useRef, useState} from 'react';
import Select from 'react-select';
import {useFileContext} from '../../../contexts/FileContext';
import {useEditContext} from '../../../contexts/EditContext';
import {useHighlightStore} from '../../../contexts/HighlightStoreContext';
import {getFileKey} from '../../../contexts/PDFViewerContext';
import {usePDFApi} from '../../../hooks/usePDFApi';
import {EntityFileSummary, HighlightType, OptionType} from '../../../types';
import '../../../styles/modules/pdf/SettingsSidebar.css';
import '../../../styles/modules/pdf/EntityDetectionSidebar.css';
import {AlertTriangle, CheckCircle, ChevronDown, ChevronRight, ChevronUp, Save, Sliders} from 'lucide-react';
import {usePDFNavigation} from '../../../hooks/usePDFNavigation';
import useBanList from '../../../hooks/settings/useBanList';
import {
    geminiOptions,
    getColorDotStyle,
    glinerOptions,
    handleAllOptions,
    hidemeOptions,
    METHOD_ID_MAP,
    MODEL_COLORS,
    prepareEntitiesForApi,
    presidioOptions
} from '../../../utils/EntityUtils';
import useSettings from "../../../hooks/settings/useSettings";
import useEntityDefinitions from "../../../hooks/settings/useEntityDefinitions";
import useAuth from "../../../hooks/auth/useAuth";
import {EntityHighlightProcessor} from "../../../managers/EntityHighlightProcessor";
import processingStateService, {ProcessingInfo} from '../../../services/ProcessingStateService';
import summaryPersistenceStore from '../../../store/SummaryPersistenceStore';

/**
 * EntityDetectionSidebar component
 *
 * Provides UI for entity detection in PDF files with improved navigation
 * to detected entities.
 */
const EntityDetectionSidebar: React.FC = () => {
    const {
        currentFile,
        selectedFiles,
        files
    } = useFileContext();

    // Use our improved navigation hook
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
        removeHighlightsByType,
    } = useHighlightStore();

    // Component state
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionScope, setDetectionScope] = useState<'current' | 'selected' | 'all'>('all');
    const [detectionResults, setDetectionResults] = useState<Map<string, any>>(new Map());
    const [detectionError, setDetectionError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [fileSummaries, setFileSummaries] = useState<EntityFileSummary[]>([]);
    const [expandedFileSummaries, setExpandedFileSummaries] = useState<Set<string>>(new Set());
    const [detectionThreshold, setDetectionThreshold] = useState(() =>
        settings?.detection_threshold !== undefined ? settings.detection_threshold : 0.5
    );
    const [useBanlist, setUseBanlist] = useState(() =>
        settings?.use_banlist_for_detection !== undefined ? settings.use_banlist_for_detection : false
    );

    // Add state for tracking processed files
    const [analyzedFilesCount, setAnalyzedFilesCount] = useState<number>(0);

    // Add initialization status tracking
    const [entitiesInitialized, setEntitiesInitialized] = useState(false);
    // Track which method IDs we've attempted to load
    const loadAttemptedRef = useRef<Set<number>>(new Set());
    const analyzedFilesRef = useRef<Set<string>>(new Set());

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
        } else if (detectionScope === 'selected' || selectedFiles.length > 0) {
            return selectedFiles;
        } else if (detectionScope === 'all') {
            return files;
        }
        return [];
    }, [detectionScope, currentFile, selectedFiles, files]);


    // Simple navigation to a page using our improved navigation system
    const navigateToPage = useCallback((fileKey: string, pageNumber: number) => {
        // Use our improved navigation hook to navigate to the page
        pdfNavigation.navigateToPage(pageNumber, fileKey, {
            // Use smooth scrolling for better user experience
            behavior: 'smooth',
            // Align to top for better visibility
            alignToTop: true,
            // Always highlight the thumbnail
            highlightThumbnail: true
        });

    }, [pdfNavigation]);


    // Load saved file data from summaryPersistenceStore on component mount
    useEffect(() => {
        try {
            // Load analyzed files from persistence service
            const savedAnalyzedFiles = summaryPersistenceStore.getAnalyzedFiles('entity');

            // Update our local state
            analyzedFilesRef.current = savedAnalyzedFiles;
            setAnalyzedFilesCount(savedAnalyzedFiles.size);

            // Load file summaries from persistence service
            const savedSummaries = summaryPersistenceStore.getFileSummaries<EntityFileSummary>('entity');

            if (savedSummaries.length > 0) {
                console.log(`[EntityDetectionSidebar] Loaded ${savedSummaries.length} file summaries from persistence store`);
                setFileSummaries(savedSummaries);
            }
        } catch (error) {
            console.error('[EntityDetectionSidebar] Error loading persisted detection data:', error);
        }
    }, []);

    // Helper function to update file summaries
    const updateFileSummary = useCallback((newSummary: EntityFileSummary) => {
        setFileSummaries(prev => {
            // Remove any existing summary for this file
            const filteredSummaries = prev.filter(summary => summary.fileKey !== newSummary.fileKey);

            // Add the new summary
            const updatedSummaries = [...filteredSummaries, newSummary];

            // Save to persistence store
            summaryPersistenceStore.saveFileSummaries('entity', updatedSummaries);

            return updatedSummaries;
        });
    }, []);
    useEffect(() => {
        // Skip if no files or no summaries
        if (files.length === 0) {
            return;
        }

        // Reconcile our data with the SummaryPersistenceStore
        const validFiles = files.map(getFileKey);
        const validSearchedFiles = summaryPersistenceStore.reconcileAnalyzedFiles('entity', validFiles);

        // Update local state if needed
        if (analyzedFilesRef.current.size !== validSearchedFiles.size) {
            analyzedFilesRef.current = validSearchedFiles;
            setAnalyzedFilesCount(validSearchedFiles.size);
        }

        // Reconcile file summaries
        const validSummaries = summaryPersistenceStore.reconcileFileSummaries<EntityFileSummary>('entity', files);

        // Update local state if needed
        if (validSummaries.length !== fileSummaries.length) {
            setFileSummaries(validSummaries);
        }
    }, [files, fileSummaries.length]);

    //  Listen forauto-processing completion events
    useEffect(() => {
        const handleAutoProcessingComplete = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, hasEntityResults, detectionResult } = customEvent.detail || {};

            if (fileKey && hasEntityResults) {
                console.log(`[EntityDetectionSidebar] Auto-processing completed for file: ${fileKey}`);

                // Add to our tracked files through the persistence store
                summaryPersistenceStore.addAnalyzedFile('entity', fileKey);

                // Update local reference
                analyzedFilesRef.current = summaryPersistenceStore.getAnalyzedFiles('entity');
                setAnalyzedFilesCount(analyzedFilesRef.current.size);

                // Add file summary if detection result is provided
                if (detectionResult) {
                    const file = files.find(f => getFileKey(f) === fileKey);
                    if (file) {
                        const newSummary: EntityFileSummary = {
                            fileKey,
                            fileName: file.name,
                            entities_detected: detectionResult.entities_detected,
                            performance: detectionResult.performance
                        };

                        // Use the persistence store to update file summaries
                        summaryPersistenceStore.updateFileSummary('entity', newSummary);

                        // Update our local state
                        updateFileSummary(newSummary);
                    }
                }
            }
        };

        window.addEventListener('auto-processing-complete', handleAutoProcessingComplete);

        return () => {
            window.removeEventListener('auto-processing-complete', handleAutoProcessingComplete);
        };
    }, [files, updateFileSummary]);

    // Listen for file removal events
    useEffect(() => {
        const handleFileRemoved = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, fileName } = customEvent.detail || {};

            if (fileKey) {
                console.log(`[EntityDetectionSidebar] File removed: ${fileKey}`);

                // Update our tracked files set
                if (analyzedFilesRef.current.has(fileKey)) {
                    analyzedFilesRef.current.delete(fileKey);
                    setAnalyzedFilesCount(analyzedFilesRef.current.size);

                    // Save the updated set to persistence store
                    summaryPersistenceStore.saveAnalyzedFiles('entity', analyzedFilesRef.current);
                }

                // Update file summaries
                setFileSummaries(prev => {
                    const updatedSummaries = prev.filter(summary => summary.fileKey !== fileKey);

                    // Save the updated summaries if they changed
                    if (updatedSummaries.length !== prev.length) {
                        summaryPersistenceStore.saveFileSummaries('entity', updatedSummaries);
                    }

                    return updatedSummaries;
                });

                // Remove from expanded summaries if present
                if (expandedFileSummaries.has(fileKey)) {
                    setExpandedFileSummaries(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(fileKey);
                        return newSet;
                    });
                }

                // If this was the current file, update detection mapping
                if (currentFile && getFileKey(currentFile) === fileKey) {
                    setDetectionMapping(null);
                }
            }
        };

        window.addEventListener('file-removed', handleFileRemoved);

        return () => {
            window.removeEventListener('file-removed', handleFileRemoved);
        };
    }, [currentFile, setDetectionMapping, expandedFileSummaries]);


    // Handle batch entity detection across multiple files
    const handleDetect = useCallback(async (filesToProcess : File[] = []) => {
        if(filesToProcess?.length === 0){
             filesToProcess = getFilesToProcess();
        }

        if (filesToProcess.length === 0) {
            setDetectionError("No files selected for detection.");
            return;
        }

        setIsDetecting(true);
        setDetectionError(null);
        resetErrors();

        try {
            // Initialize processing state for all files
            filesToProcess.forEach(file => {
                const fileKey = getFileKey(file);

                processingStateService.startProcessing(file, {
                    method: 'manual',
                    pageCount: 1, // Will be updated after detection
                    expectedTotalTimeMs: 30000 // Default estimate
                });
            });

            // Prepare detection options
            const presidioEntities = prepareEntitiesForApi(
                selectedMlEntities,
                'ALL_PRESIDIO_P'
            );

            const glinerEntities = prepareEntitiesForApi(
                selectedGlinerEntities,
                'ALL_GLINER'
            );

            const geminiEntities = prepareEntitiesForApi(
                selectedAiEntities,
                'ALL_GEMINI'
            );

            const hidemeEntities = prepareEntitiesForApi(
                selectedHideMeEntities,
                'ALL_HIDEME'
            );

            // Prepare detection options
            const detectionOptions = {
                presidio: presidioEntities.length > 0 ? presidioEntities : null,
                gliner: glinerEntities.length > 0 ? glinerEntities : null,
                gemini: geminiEntities.length > 0 ? geminiEntities : null,
                hideme: hidemeEntities.length > 0 ? hidemeEntities : null,
                threshold: detectionThreshold,
                banlist: useBanlist && banList?.words ? banList.words : null
            };

            // Use the consolidated batch hybrid detection from the hook
            const results = await runBatchHybridDetect(filesToProcess, detectionOptions);

            // Update results state
            setDetectionResults(new Map(Object.entries(results)));

            // Process detection for each file using the EntityHighlightProcessor
            for (const [fileKey, result] of Object.entries(results)) {
                try {
                    // Process the detection results into highlights
                    await EntityHighlightProcessor.processDetectionResults(fileKey, result);

                    // Store the mapping for this file
                    setFileDetectionMapping(fileKey, result.redaction_mapping || result);

                    // If this is the current file, also update the current detection mapping
                    if (currentFile && getFileKey(currentFile) === fileKey) {
                        setDetectionMapping(result.redaction_mapping || result);
                    }

                    // Mark processing as complete in the shared service
                    processingStateService.completeProcessing(fileKey, true);

                    // Extract summary information for this file
                    const filename = filesToProcess.find(f => getFileKey(f) === fileKey)?.name ?? fileKey;

                    // Create a file summary object
                    const fileSummary: EntityFileSummary = {
                        fileKey,
                        fileName: filename,
                        entities_detected: result.entities_detected,
                        performance: result.performance
                    };

                    // Add to persistence store
                    summaryPersistenceStore.updateFileSummary('entity', fileSummary);

                    // Update local state
                    updateFileSummary(fileSummary);

                    // Add to analyzed files in persistence store
                    summaryPersistenceStore.addAnalyzedFile('entity', fileKey);

                    // Update local ref
                    analyzedFilesRef.current = summaryPersistenceStore.getAnalyzedFiles('entity');
                } catch (error) {
                    console.error(`[EntityDetectionSidebar] Error processing highlights for file ${fileKey}:`, error);
                    processingStateService.completeProcessing(fileKey, false);
                }
            }

            // Update expanded summaries set
            setExpandedFileSummaries(new Set(Object.keys(results)));

            // Update analyzed files count
            setAnalyzedFilesCount(analyzedFilesRef.current.size);

            setSuccessMessage("Entity detection completed successfully");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setDetectionError(err.message || 'An error occurred during entity detection');

            // Mark all files as failed
            filesToProcess.forEach(file => {
                const fileKey = getFileKey(file);
                processingStateService.completeProcessing(fileKey, false);
            });
        } finally {
            setIsDetecting(false);
        }
    }, [
        getFilesToProcess,
        resetErrors,
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
        updateFileSummary
    ]);
    // Listen for external detection triggers (e.g., from toolbar button)
    useEffect(() => {
        const handleExternalDetectionTrigger = (event: Event) => {
            const customEvent = event as CustomEvent;
            const {source, filesToProcess} = customEvent.detail || {};

            console.log(`[EntityDetectionSidebar] Received external detection trigger from ${source}`);

            // Run detection process
            handleDetect(filesToProcess);
        };

        // Add event listener
        window.addEventListener('trigger-entity-detection-process', handleExternalDetectionTrigger);

        // Clean up
        return () => {
            window.removeEventListener('trigger-entity-detection-process', handleExternalDetectionTrigger);
        };
    }, [handleDetect]);

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


    //subscribe to the Summary processor to be notified of file summary changes and apply them
    useEffect(() => {
        const handleHighlightsCleared = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, allTypes, type } = customEvent.detail || {};

            // Skip if not related to entity highlights
            if (type && type !== HighlightType.ENTITY && !allTypes) return;

            if (fileKey) {
                console.log(`[EntityDetectionSidebar] Entity highlights cleared for file: ${fileKey}`);

                // Update file summaries to reflect cleared highlights
                setFileSummaries(prev => {
                    // Remove summary for this file
                    const updatedSummaries = prev.filter(summary => summary.fileKey !== fileKey);

                    // Save the updated summaries
                    summaryPersistenceStore.saveFileSummaries('entity', updatedSummaries);

                    return updatedSummaries;
                });

                // Update the analyzed files count
                if (analyzedFilesRef.current.has(fileKey)) {
                    analyzedFilesRef.current.delete(fileKey);
                    setAnalyzedFilesCount(analyzedFilesRef.current.size);

                    // Update the persistence store
                    summaryPersistenceStore.removeAnalyzedFile('entity', fileKey);
                }

                // Remove from expanded summaries if present
                if (expandedFileSummaries.has(fileKey)) {
                    setExpandedFileSummaries(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(fileKey);
                        return newSet;
                    });
                }

                // If this is the current file, also update the current detection mapping
                if (currentFile && getFileKey(currentFile) === fileKey) {
                    setDetectionMapping(null);
                }

            }
        };

        // Listen for both general highlights cleared and entity-specific events
        window.addEventListener('highlights-cleared', handleHighlightsCleared);
        window.addEventListener('entity-highlights-cleared', handleHighlightsCleared);

        return () => {
            window.removeEventListener('highlights-cleared', handleHighlightsCleared);
            window.removeEventListener('entity-highlights-cleared', handleHighlightsCleared);
        };
    }, [currentFile, setDetectionMapping]);

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
                    {id: METHOD_ID_MAP.presidio, name: 'presidio'},
                    {id: METHOD_ID_MAP.gliner, name: 'gliner'},
                    {id: METHOD_ID_MAP.gemini, name: 'gemini'},
                    {id: METHOD_ID_MAP.hideme, name: 'hideme'}
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

    useEffect(() => {
        if (!entitiesInitialized) return;

        const applyModelEntities = () => {
            console.log("[EntityDetectionSidebar] Applying model entities to selections");

            // Helper to safely map entities to option types and handle ALL options
            const getEntityOptions = (methodId: number, allOptions: OptionType[], allOptionValue: string) => {
                const entities = modelEntities[methodId];
                if (!entities || !Array.isArray(entities) || entities.length === 0) {
                    return [];
                }

                // Create a set of entity texts for faster lookup
                const entityTexts = new Set(entities.map(e => e.entity_text));

                // Find matching options
                const matchedOptions = allOptions.filter(option =>
                    !option.value.startsWith('ALL_') && entityTexts.has(option.value)
                );

                // Check if all non-ALL options are selected
                const nonAllOptions = allOptions.filter(option => !option.value.startsWith('ALL_'));

                if (matchedOptions.length === nonAllOptions.length) {
                    // If all options are selected, return just the ALL option
                    const allOption = allOptions.find(option => option.value === allOptionValue);
                    return allOption ? [allOption] : [];
                }

                return matchedOptions;
            };

            // Apply entities for each method
            const presOptions = getEntityOptions(METHOD_ID_MAP.presidio, presidioOptions, 'ALL_PRESIDIO_P');
            if (presOptions.length > 0) {
                console.log(`[EntityDetectionSidebar] Setting ${presOptions.length} Presidio entities`);
                setSelectedMlEntities(presOptions);
            }

            const glinerOpts = getEntityOptions(METHOD_ID_MAP.gliner, glinerOptions, 'ALL_GLINER');
            if (glinerOpts.length > 0) {
                console.log(`[EntityDetectionSidebar] Setting ${glinerOpts.length} Gliner entities`);
                setSelectedGlinerEntities(glinerOpts);
            }

            const geminiOpts = getEntityOptions(METHOD_ID_MAP.gemini, geminiOptions, 'ALL_GEMINI');
            if (geminiOpts.length > 0) {
                console.log(`[EntityDetectionSidebar] Setting ${geminiOpts.length} Gemini entities`);
                setSelectedAiEntities(geminiOpts);
            }

            const hidemeOpts = getEntityOptions(METHOD_ID_MAP.hideme, hidemeOptions, 'ALL_HIDEME');
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
            const {type, settings} = customEvent.detail || {};

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
    // Format for entity type display (shortens if too long)
    const formatEntityDisplay = (entityType: string): string => {
        const formatted = formatEntityName(entityType);
        return formatted.length > 15 ? `${formatted.substring(0, 13)}...` : formatted;
    };

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
        setSelectedMlEntities(handleAllOptions(selectedOptions, presidioOptions, 'ALL_PRESIDIO_P'));
    };

    const handleGlinerChange = (options: readonly OptionType[]) => {
        const selectedOptions = [...options];
        setSelectedGlinerEntities(handleAllOptions(selectedOptions, glinerOptions, 'ALL_GLINER'));
    };

    const handleGeminiChange = (options: readonly OptionType[]) => {
        const selectedOptions = [...options];
        setSelectedAiEntities(handleAllOptions(selectedOptions, geminiOptions, 'ALL_GEMINI'));
    };

    const handleHidemeChange = (options: readonly OptionType[]) => {
        const selectedOptions = [...options];
        setSelectedHideMeEntities(handleAllOptions(selectedOptions, hidemeOptions, 'ALL_HIDEME'));
    };

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
                removeHighlightsByType(fileKey, HighlightType.ENTITY);

                // Remove from processing state tracking
                processingStateService.removeFile(fileKey);

                // Remove from persistence store
                summaryPersistenceStore.removeFileFromSummaries('entity', fileKey);

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
        setExpandedFileSummaries(new Set());
        setDetectionError(null);

        // Update the analyzed files count
        analyzedFilesRef.current = summaryPersistenceStore.getAnalyzedFiles('entity');
        setAnalyzedFilesCount(analyzedFilesRef.current.size);
    }, [
        setSelectedAiEntities,
        setSelectedMlEntities,
        setSelectedGlinerEntities,
        setSelectedHideMeEntities,
        setDetectionMapping,
        removeHighlightsByType,
        getFilesToProcess,
        currentFile
    ]);

    // Save detection settings to user preferences
    const handleSaveSettings = useCallback(async () => {
        try {
            setIsDetecting(true);
            clearUserError();
            setDetectionError(null);

            // Helper function to convert ALL options to individual entities for saving
            const expandAllOptions = (
                selectedOptions: OptionType[],
                allOptions: OptionType[],
                allOptionValue: string
            ): OptionType[] => {
                // Check if ALL option is selected
                const hasAllOption = selectedOptions.some(option => option.value === allOptionValue);

                if (hasAllOption) {
                    // If ALL is selected, return all individual options
                    return allOptions.filter(option => !option.value.startsWith('ALL_'));
                }

                // Otherwise return the original selection
                return selectedOptions;
            };

            // Expand ALL options for each model before saving
            const expandedPresidio = expandAllOptions(selectedMlEntities, presidioOptions, 'ALL_PRESIDIO_P');
            const expandedGliner = expandAllOptions(selectedGlinerEntities, glinerOptions, 'ALL_GLINER');
            const expandedGemini = expandAllOptions(selectedAiEntities, geminiOptions, 'ALL_GEMINI');
            const expandedHideme = expandAllOptions(selectedHideMeEntities, hidemeOptions, 'ALL_HIDEME');

            // Add entities for each method
            await replaceModelEntities(METHOD_ID_MAP.presidio, expandedPresidio);
            await replaceModelEntities(METHOD_ID_MAP.gliner, expandedGliner);
            await replaceModelEntities(METHOD_ID_MAP.gemini, expandedGemini);
            await replaceModelEntities(METHOD_ID_MAP.hideme, expandedHideme);

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

    const ColorDot: React.FC<{ color: string }> = ({color}) => (
        <span
            className="color-dot"
            style={getColorDotStyle(color)}
        />
    );

    // Combined loading state
    const isLoading = isUserLoading || isDetecting || loading || isSettingsLoading || isBanListLoading || entitiesLoading;

    return (
        <div className="entity-detection-sidebar">
            <div className="sidebar-header entity-header">
                <h3>Automatic Detection</h3>
                {analyzedFilesCount > 0 && (
                    <div className="entity-badge">
                        {analyzedFilesCount} file{analyzedFilesCount !== 1 ? 's' : ''} analyzed
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
                    <Select
                        key="presidio-select"
                        isMulti
                        options={presidioOptions}
                        value={selectedMlEntities}
                        onChange={handlePresidioChange}
                        placeholder="Select entities to detect..."
                        className="entity-select"
                        classNamePrefix="entity-select"
                        isDisabled={isDetecting}
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
                    <Select
                        key="gliner-select"
                        isMulti
                        options={glinerOptions}
                        value={selectedGlinerEntities}
                        onChange={handleGlinerChange}
                        placeholder="Select entities to detect..."
                        className="entity-select"
                        classNamePrefix="entity-select"
                        isDisabled={isDetecting}
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
                        isDisabled={isDetecting}
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
                        onClick={() => handleDetect()}
                        disabled={
                            isDetecting ||
                            getFilesToProcess().length === 0 ||
                            (selectedMlEntities.length === 0 &&
                                selectedAiEntities.length === 0 &&
                                selectedGlinerEntities.length === 0 &&
                                selectedHideMeEntities.length === 0)
                        }
                    >
                        {isDetecting ? 'Detecting...' : 'Detect Entities'}
                    </button>

                    <div className="secondary-buttons">
                        <button
                            className="sidebar-buFscopetton secondary-button"
                            onClick={handleReset}
                            disabled={isDetecting || (selectedMlEntities.length === 0 && selectedAiEntities.length === 0 && selectedGlinerEntities.length === 0 && selectedHideMeEntities.length === 0 && fileSummaries.length === 0)}
                        >
                            Reset
                        </button>

                        <button
                            className="sidebar-button save-button"
                            onClick={handleSaveSettings}
                            disabled={isDetecting || !isAuthenticated}
                        >
                            <Save size={16}/>
                            <span>{'Save to Settings'}</span>
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
                                            {/* Performance stats section */}
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

                                            {/* By entity type section */}
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

                                            {/* By page section */}
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
                                                                        <span
                                                                            className="entity-count">{count} entities</span>
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
