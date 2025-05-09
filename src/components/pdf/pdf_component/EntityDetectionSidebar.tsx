import React, { useCallback, useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import { useFileContext } from '../../../contexts/FileContext';
import { useEditContext } from '../../../contexts/EditContext';
import { useHighlightStore } from '../../../contexts/HighlightStoreContext';
import { getFileKey } from '../../../contexts/PDFViewerContext';
import { usePDFApi } from '../../../hooks/usePDFApi';
import { EntityFileSummary, HighlightType, ModelEntity, OptionType } from '../../../types';
import '../../../styles/modules/pdf/SettingsSidebar.css';
import '../../../styles/modules/pdf/EntityDetectionSidebar.css';
import { ChevronDown, ChevronRight, ChevronUp, Save, Sliders } from 'lucide-react';
import { usePDFNavigation } from '../../../hooks/usePDFNavigation';
import {
    geminiOptions,
    getColorDotStyle,
    glinerOptions,
    handleAllOptions,
    hidemeOptions,
    METHOD_ID_MAP,
    MODEL_COLORS,
    prepareEntitiesForApi,
    presidioOptions, entitiesToOptions
} from '../../../utils/EntityUtils';
import { EntityHighlightProcessor } from "../../../managers/EntityHighlightProcessor";
import processingStateService from '../../../services/ProcessingStateService';
import summaryPersistenceStore from '../../../store/SummaryPersistenceStore';
import { useUserContext } from "../../../contexts/UserContext";
import { useLoading } from "../../../contexts/LoadingContext";
import { LoadingWrapper } from '../../common/LoadingWrapper';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../hooks/auth/useAuth';

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
        files,
        openFile
    } = useFileContext();

    // Use our improved navigation hook
    const pdfNavigation = usePDFNavigation('entity-sidebar');

    const { isLoading: isUserLoading,
        error: userError,
        clearError: clearUserError,
        modelEntities,
        getModelEntities,
        replaceModelEntities,
        modelLoading: entitiesLoading,
        settings, updateSettings,
        getSettings,
        settingsLoading: isSettingsLoading,
        banList, getBanList,
        banListLoading: isBanListLoading
    } = useUserContext();
    const { isAuthenticated } = useAuth();

    const { selectedMlEntities,
        setSelectedMlEntities,
        selectedAiEntities,
        setSelectedAiEntities,
        selectedGlinerEntities,
        setSelectedGlinerEntities,
        selectedHideMeEntities,
        setSelectedHideMeEntities,
        setDetectionMapping,
        setFileDetectionMapping,
        setSelectedHighlightId,
        setSelectedHighlightIds
    } = useEditContext();


    const {
        removeHighlightsByType,
        getHighlightsForPage,
        getHighlightsByType
    } = useHighlightStore();

    // Component state
    const { startLoading, stopLoading, isLoading: isGlobalLoading } = useLoading();
    const { notify, confirm } = useNotification();
    const [detectionScope, setDetectionScope] = useState<'current' | 'selected' | 'all'>('all');
    const [fileSummaries, setFileSummaries] = useState<EntityFileSummary[]>([]);
    const [expandedFileSummaries, setExpandedFileSummaries] = useState<Set<string>>(new Set());
    const [detectionThreshold, setDetectionThreshold] = useState(() =>
        settings?.detection_threshold ?? 0.5
    );
    const [useBanlist, setUseBanlist] = useState(() =>
        settings?.use_banlist_for_detection ?? false
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
        const file = files.find(f => getFileKey(f) === fileKey);
        if (file) {
            openFile(file);
            pdfNavigation.navigateToPage(pageNumber, fileKey, {
                // Use smooth scrolling for better user experience
                behavior: 'smooth',
                // Align to top for better visibility
                alignToTop: true,
                // Always highlight the thumbnail
                highlightThumbnail: true
            });
        }
    }, [pdfNavigation, openFile, files]);


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
                setFileSummaries(savedSummaries);
            }
        } catch (error) {
            notify({
                type: 'error',
                message: 'Error loading saved detection data: ' + error.message,
                position: 'top-right'
            });
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

    //  Listen for auto-processing completion events
    useEffect(() => {
        const handleAutoProcessingComplete = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, hasEntityResults, detectionResult } = customEvent.detail || {};

            if (fileKey && hasEntityResults) {

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
            const { fileKey } = customEvent.detail || {};

            if (fileKey) {

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
    const handleDetect = useCallback(async (filesToProcess: File[] = []) => {
        if (filesToProcess?.length === 0) {
            filesToProcess = getFilesToProcess();
        }

        if (filesToProcess.length === 0) {
            notify({
                type: 'info',
                message: 'No files selected for detection. Upload or select files to detect entities.',
                position: 'top-right'
            });
            return;
        }

        startLoading('detection_sidebar.detect')
        resetErrors();

        try {
            // Initialize processing state for all files
            filesToProcess.forEach(file => {
                processingStateService.startProcessing(file, {
                    method: 'manual',
                    pageCount: 1, // Will be updated after detection
                    expectedTotalTimeMs: 15000 // Default estimate
                });
            });

            // Prepare detection options
            const presidioEntities = prepareEntitiesForApi(
                selectedMlEntities,
                'ALL_PRESIDIO'
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
            const banListWords = await getBanList();
            // Prepare detection options
            const detectionOptions = {
                presidio: presidioEntities.length > 0 ? presidioEntities : null,
                gliner: glinerEntities.length > 0 ? glinerEntities : null,
                gemini: geminiEntities.length > 0 ? geminiEntities : null,
                hideme: hidemeEntities.length > 0 ? hidemeEntities : null,
                threshold: detectionThreshold,
                banlist: useBanlist && banListWords ? banListWords.words : null
            };

            // Use the consolidated batch hybrid detection from the hook
            const results = await runBatchHybridDetect(filesToProcess, detectionOptions);


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
                    notify({
                        type: 'error',
                        message: 'Error processing highlights for file ' + fileKey + ': ' + error.message,
                        position: 'bottom-left'
                    });
                    processingStateService.completeProcessing(fileKey, false);
                }
            }

            // Update expanded summaries set
            setExpandedFileSummaries(new Set(Object.keys(results)));

            // Update analyzed files count
            setAnalyzedFilesCount(analyzedFilesRef.current.size);

            notify({
                type: 'success',
                message: 'Entity detection completed successfully',
                position: 'top-right'
            });
        } catch (err: any) {
            notify({
                type: 'error',
                message: 'An error occurred during entity detection: ' + err.message,
                position: 'top-right'
            });

            // Mark all files as failed
            filesToProcess.forEach(file => {
                const fileKey = getFileKey(file);
                processingStateService.completeProcessing(fileKey, false);
            });
        } finally {
            stopLoading('detection_sidebar.detect');
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
        updateFileSummary,
        startLoading,
        stopLoading,
    ]);
    // Listen for external detection triggers (e.g., from toolbar button)
    useEffect(() => {
        const handleExternalDetectionTrigger = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { source, filesToProcess } = customEvent.detail || {};

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
            const { fileKey, allTypes, type } = customEvent.detail ?? {};

            // Skip if not related to entity highlights
            if (type && type !== HighlightType.ENTITY && !allTypes) return;

            if (fileKey) {
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
        if (!isAuthenticated || entitiesLoading || isSettingsLoading) {
            return;
        }

        // Load entities for all methods in parallel
        const loadAllEntities = async () => {
            try {
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

                        return await getModelEntities(method.id);
                    } catch (err) {
                        console.warn(`[EntityDetectionSidebar] Failed to load entities for ${method.name}:`, err);
                        return null;
                    }
                });

                const [presidio, gliner, gemini, hideme] = await Promise.all(loadPromises);

                // Handle the results
                if (presidio) {
                    handlePresidioChange(handleAllOptions(entitiesToOptions(presidio.map(e => e.entity_text), presidioOptions), presidioOptions, 'ALL_PRESIDIO'));
                }
                if (gliner) {
                    handleGlinerChange(handleAllOptions(entitiesToOptions(gliner.map(e => e.entity_text), glinerOptions), glinerOptions, 'ALL_GLINER'));
                }
                if (gemini) {
                    handleGeminiChange(handleAllOptions(entitiesToOptions(gemini.map(e => e.entity_text), geminiOptions), geminiOptions, 'ALL_GEMINI'));
                }
                if (hideme) {
                    handleHidemeChange(handleAllOptions(entitiesToOptions(hideme.map(e => e.entity_text), hidemeOptions), hidemeOptions, 'ALL_HIDEME'));
                }


            } catch (err) {
                notify({
                    type: 'error',
                    message: 'Error loading entities: ' + err.message,
                    position: 'top-right'
                });
            }
        };
        if (isUserLoading) {
            return;
        }

        const loadOptions = async () => {
            try {
                const settings = await getSettings();
                if (settings) {
                    setDetectionThreshold(settings.detection_threshold ?? 0.5);
                    setUseBanlist(settings.use_banlist_for_detection ?? false);
                }
            } catch (error) {
                notify({
                    type: 'error',
                    message: 'Error loading settings: ' + error.message,
                    position: 'top-right'
                });
            }
        };

        // Load both in parallel
        Promise.all([loadOptions(), loadAllEntities()]);

    }, [isAuthenticated, isUserLoading, getModelEntities, setDetectionThreshold, setUseBanlist, getSettings, entitiesLoading, isSettingsLoading]);

    useEffect(() => {
        if (!entitiesInitialized) return;

        const applyModelEntities = () => {

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
            const presOptions = getEntityOptions(METHOD_ID_MAP.presidio, presidioOptions, 'ALL_PRESIDIO');
            if (presOptions.length > 0) {
                setSelectedMlEntities(presOptions);
            }

            const glinerOpts = getEntityOptions(METHOD_ID_MAP.gliner, glinerOptions, 'ALL_GLINER');
            if (glinerOpts.length > 0) {
                setSelectedGlinerEntities(glinerOpts);
            }

            const geminiOpts = getEntityOptions(METHOD_ID_MAP.gemini, geminiOptions, 'ALL_GEMINI');
            if (geminiOpts.length > 0) {
                setSelectedAiEntities(geminiOpts);
            }

            const hidemeOpts = getEntityOptions(METHOD_ID_MAP.hideme, hidemeOptions, 'ALL_HIDEME');
            if (hidemeOpts.length > 0) {
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

        // Update a detection threshold
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
        setSelectedMlEntities(handleAllOptions(selectedOptions, presidioOptions, 'ALL_PRESIDIO'));
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
    const handleReset = useCallback(async () => {

        const confirmReset = await confirm({
            title: 'Reset Entity Detection',
            message: 'Are you sure you want to reset the entity detection settings?',
            type: 'warning',
            confirmButton: {
                label: 'Reset',
            }
        });

        if (confirmReset) {
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

            setExpandedFileSummaries(new Set());

            // Update the analyzed files count
            analyzedFilesRef.current = summaryPersistenceStore.getAnalyzedFiles('entity');
            setAnalyzedFilesCount(analyzedFilesRef.current.size);
            notify({
                type: 'info',
                message: 'Entity Settings reset successfully',
                position: 'top-right'
            });
        }
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
        if (!isAuthenticated || isUserLoading || entitiesLoading || isSettingsLoading) {
            notify({
                type: 'error',
                message: 'Please wait for authentication to complete',
                position: 'top-right'
            });
            return;
        }

        try {
            startLoading('detection_sidebar.save');
            clearUserError();

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
            const expandedPresidio = expandAllOptions(selectedMlEntities, presidioOptions, 'ALL_PRESIDIO');
            const expandedGliner = expandAllOptions(selectedGlinerEntities, glinerOptions, 'ALL_GLINER');
            const expandedGemini = expandAllOptions(selectedAiEntities, geminiOptions, 'ALL_GEMINI');
            const expandedHideme = expandAllOptions(selectedHideMeEntities, hidemeOptions, 'ALL_HIDEME');

            // Add a small delay to ensure auth state is fully ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Double check authentication before proceeding
            if (!isAuthenticated) {
                throw new Error('Authentication lost before save operation');
            }

            // Save entities for each method sequentially to avoid race conditions
            for (const [methodId, entities] of [
                [METHOD_ID_MAP.presidio, expandedPresidio] as [number, OptionType[]],
                [METHOD_ID_MAP.gliner, expandedGliner] as [number, OptionType[]],
                [METHOD_ID_MAP.gemini, expandedGemini] as [number, OptionType[]],
                [METHOD_ID_MAP.hideme, expandedHideme] as [number, OptionType[]]
            ]) {
                if (!isAuthenticated) {
                    throw new Error('Authentication lost during save operation');
                }
                await replaceModelEntities(methodId, entities);
                // Add a small delay between operations
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Update app settings
            if (!isAuthenticated) {
                throw new Error('Authentication lost during save operation');
            }
            await updateSettings({
                detection_threshold: detectionThreshold,
                use_banlist_for_detection: useBanlist
            });

            // Show success message
            notify({
                type: 'success',
                message: 'Entity Settings saved successfully',
                position: 'top-right'
            });

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
            notify({
                type: 'error',
                message: 'Error saving settings: ' + error.message,
                position: 'top-right'
            });
        } finally {
            stopLoading('detection_sidebar.save');
        }
    }, [
        isAuthenticated,
        isUserLoading,
        replaceModelEntities,
        updateSettings,
        selectedMlEntities,
        selectedGlinerEntities,
        selectedAiEntities,
        selectedHideMeEntities,
        detectionThreshold,
        useBanlist,
        clearUserError,
        startLoading,
        stopLoading,
    ]);

    const ColorDot: React.FC<{ color: string }> = ({ color }) => (
        <span
            className="color-dot"
            style={getColorDotStyle(color)}
        />
    );

    // Combined loading state
    const isLoading = isUserLoading || isGlobalLoading('detection_sidebar.save') || loading || isSettingsLoading || isBanListLoading || entitiesLoading;

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
                        <ColorDot color={MODEL_COLORS.presidio} />
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
                        isDisabled={isLoading}
                        isLoading={isLoading}
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
                        key="gliner-select"
                        isMulti
                        options={glinerOptions}
                        value={selectedGlinerEntities}
                        onChange={handleGlinerChange}
                        placeholder="Select entities to detect..."
                        className="entity-select"
                        classNamePrefix="entity-select"
                        isDisabled={isLoading}
                        isLoading={isLoading}
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
                        key="gemini-select"
                        isMulti
                        options={geminiOptions}
                        value={selectedAiEntities}
                        onChange={handleGeminiChange}
                        placeholder="Select entities to detect..."
                        className="entity-select"
                        classNamePrefix="entity-select"
                        isDisabled={isLoading}
                        isLoading={isLoading}
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                        styles={customSelectStyles}
                    />
                </div>
                <div className="sidebar-section entity-select-section">
                    <div className="entity-select-header">
                        <ColorDot color={MODEL_COLORS.hideme} />
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
                        isDisabled={isLoading}
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                        styles={customSelectStyles}
                    />
                </div>

                {/* Detection Threshold Slider */}
                <div className="sidebar-section entity-select-section">
                    <div className="entity-select-header">
                        <Sliders size={18} />
                        <h4>Detection Settings</h4>
                    </div>
                    <div className="form-group mt-2">
                        <label className="text-sm font-medium mb-2 block">
                            Accuracy ({Math.round(detectionThreshold * 100)}%)
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
                                disabled={isLoading}
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
                                    disabled={isLoading}
                                />
                                <span className="switch-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="sidebar-section action-buttons">

                    <button
                        className="sidebar-button action-button detect-button"
                        onClick={() => handleDetect()}
                        disabled={
                            isLoading ||
                            getFilesToProcess().length === 0 ||
                            (selectedMlEntities.length === 0 &&
                                selectedAiEntities.length === 0 &&
                                selectedGlinerEntities.length === 0 &&
                                selectedHideMeEntities.length === 0)
                        }
                    >
                        <LoadingWrapper
                            isLoading={isLoading}
                            overlay={true}
                        >
                            <span > {'Detect Sensitive information'}</span>
                        </LoadingWrapper>
                    </button>


                    <div className="secondary-buttons">
                        <button
                            className="sidebar-button  secondary-button"
                            onClick={handleReset}
                            disabled={isLoading || (selectedMlEntities.length === 0 && selectedAiEntities.length === 0 && selectedGlinerEntities.length === 0 && selectedHideMeEntities.length === 0 && fileSummaries.length === 0)}
                        >
                            Reset
                        </button>

                        <button
                            className="sidebar-button save-button"
                            onClick={handleSaveSettings}
                            disabled={isLoading || !isAuthenticated || isUserLoading}
                        >
                            <Save size={16} />
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
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
                                                                <div className="entity-item-left" >
                                                                    <ColorDot color={MODEL_COLORS[model]} />
                                                                    <span className="entity-name">
                                                                        {formatEntityDisplay(entityType)}
                                                                    </span>
                                                                </div>
                                                                <div className="entity-item-right">
                                                                    <span className="entity-count">{count}</span>
                                                                    <div className="navigation-buttons" >
                                                                        <button
                                                                            className="nav-button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const file = files.find(f => f.name === fileSummary.fileKey);
                                                                                if (file) {
                                                                                    openFile(file);
                                                                                }
                                                                                // Find the first page with this entity type
                                                                                const pages = Object.keys(entitiesDetected.by_page);
                                                                                setSelectedHighlightIds([]);
                                                                                setSelectedHighlightId(null);
                                                                                if (pages.length > 0) {
                                                                                    const pageNumber = parseInt(pages[0].split('_')[1], 10);
                                                                                    const highlights = getHighlightsForPage(fileSummary.fileKey, pageNumber);
                                                                                    // Filter to only get entity highlights and set both selection states
                                                                                    let entityHighlights = highlights.filter(h => h.type === 'ENTITY');
                                                                                    if (entityType) {
                                                                                        entityHighlights = entityHighlights.filter(h => h.text === entityType);
                                                                                    }
                                                                                    if (entityHighlights.length > 0) {
                                                                                        setSelectedHighlightIds(entityHighlights.map(h => h.id));
                                                                                        // Set the first highlight as the selected one
                                                                                        setSelectedHighlightId(entityHighlights[0].id);
                                                                                    }
                                                                                    else {
                                                                                        setSelectedHighlightIds([]);
                                                                                        setSelectedHighlightId(null);
                                                                                    }
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
                                                                                    const file = files.find(f => f.name === fileSummary.fileKey);
                                                                                    if (file) {
                                                                                        openFile(file);
                                                                                    }
                                                                                    setSelectedHighlightIds([]);
                                                                                    setSelectedHighlightId(null);
                                                                                    navigateToPage(fileSummary.fileKey, pageNumber);
                                                                                    const highlights = getHighlightsForPage(fileSummary.fileKey, pageNumber);
                                                                                    // Filter to only get entity highlights and set both selection states
                                                                                    let entityHighlights = highlights.filter(h => h.type === 'ENTITY');
                                                                                    if (entityHighlights.length > 0) {
                                                                                        setSelectedHighlightIds(entityHighlights.map(h => h.id));
                                                                                        // Set the first highlight as the selected one
                                                                                        setSelectedHighlightId(entityHighlights[0].id);
                                                                                    }
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
