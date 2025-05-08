import React, {createContext, useContext, useState, useCallback, useRef, useEffect, useMemo} from 'react';
import { OptionType, RedactionMapping ,  HighlightCreationMode } from '../types';
import { useFileContext } from './FileContext';
import { getFileKey } from './PDFViewerContext';
import { useNotification } from './NotificationContext';
interface EditContextProps {
    isEditingMode: boolean;
    setIsEditingMode: React.Dispatch<React.SetStateAction<boolean>>;
    highlightingMode: HighlightCreationMode;
    setHighlightingMode: React.Dispatch<React.SetStateAction<HighlightCreationMode>>;
    searchQueries: string[];
    setSearchQueries: React.Dispatch<React.SetStateAction<string[]>>;
    isRegexSearch: boolean;
    setIsRegexSearch: React.Dispatch<React.SetStateAction<boolean>>;
    isCaseSensitive: boolean;
    setIsCaseSensitive: React.Dispatch<React.SetStateAction<boolean>>;
    selectedMlEntities: OptionType[];
    setSelectedMlEntities: React.Dispatch<React.SetStateAction<OptionType[]>>;
    selectedAiEntities: OptionType[];
    setSelectedAiEntities: React.Dispatch<React.SetStateAction<OptionType[]>>;
    selectedGlinerEntities: OptionType[];
    setSelectedGlinerEntities: React.Dispatch<React.SetStateAction<OptionType[]>>;
    selectedHideMeEntities: OptionType[];
    setSelectedHideMeEntities: React.Dispatch<React.SetStateAction<OptionType[]>>;
    detectionMapping: RedactionMapping | null;
    setDetectionMapping: React.Dispatch<React.SetStateAction<RedactionMapping | null>>;
    fileDetectionMappings: Map<string, RedactionMapping>;
    setFileDetectionMapping: (fileKey: string, mapping: RedactionMapping) => void;
    getFileDetectionMapping: (fileKey: string) => RedactionMapping | null;
    showSearchHighlights: boolean;
    setShowSearchHighlights: React.Dispatch<React.SetStateAction<boolean>>;
    showEntityHighlights: boolean;
    setShowEntityHighlights: React.Dispatch<React.SetStateAction<boolean>>;
    showManualHighlights: boolean;
    setShowManualHighlights: React.Dispatch<React.SetStateAction<boolean>>;
    presidioColor: string;
    setPresidioColor: React.Dispatch<React.SetStateAction<string>>;
    glinerColor: string;
    setGlinerColor: React.Dispatch<React.SetStateAction<string>>;
    geminiColor: string;
    setGeminiColor: React.Dispatch<React.SetStateAction<string>>;
    hidemeColor: string;
    setHidemeColor: React.Dispatch<React.SetStateAction<string>>;
    searchColor: string;
    setSearchColor: React.Dispatch<React.SetStateAction<string>>;
    manualColor: string;
    setManualColor: React.Dispatch<React.SetStateAction<string>>;
    resetEditState: () => void;
    getColorForModel: (model: string) => string;
    getSearchColor: () => string;
    getManualColor: () => string;
    selectedHighlightId: string | null;
    setSelectedHighlightId: React.Dispatch<React.SetStateAction<string | null>>;
    selectedHighlightIds: string[];
    setSelectedHighlightIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const EditContext = createContext<EditContextProps | undefined>(undefined);

export const useEditContext = () => {
    const context = useContext(EditContext);
    if (!context) {
        throw new Error('useEditContext must be used within an EditProvider');
    }
    return context;
};

export const EditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentFile } = useFileContext();

    const [isEditingMode, setIsEditingMode] = useState(false);
    // New state for highlighting mode
    const [highlightingMode, setHighlightingMode] = useState<HighlightCreationMode>(HighlightCreationMode.TEXT_SELECTION);
    const [searchQueries, setSearchQueries] = useState<string[]>([]);
    const [isRegexSearch, setIsRegexSearch] = useState(false);
    const [isCaseSensitive, setIsCaseSensitive] = useState(false);
    const [selectedMlEntities, setSelectedMlEntities] = useState<OptionType[]>([]);
    const [selectedAiEntities, setSelectedAiEntities] = useState<OptionType[]>([]);
    const [selectedGlinerEntities, setSelectedGlinerEntities] = useState<OptionType[]>([]);
    const [selectedHideMeEntities, setSelectedHideMeEntities] = useState<OptionType[]>([]);
    const [detectionMapping, setDetectionMapping] = useState<RedactionMapping | null>(null);
    const [showSearchHighlights, setShowSearchHighlights] = useState(true);
    const [showEntityHighlights, setShowEntityHighlights] = useState(true);
    const [showManualHighlights, setShowManualHighlights] = useState(true);
    const [searchColor, setSearchColor] = useState('#71c4ff');
    const [manualColor, setManualColor] = useState('#00ff15');
    const [presidioColor, setPresidioColor] = useState('#ffd771'); // Yellow
    const [glinerColor, setGlinerColor] = useState('#ff7171'); // Red
    const [geminiColor, setGeminiColor] = useState('#7171ff'); // Blue
    const [hidemeColor, setHidemeColor] = useState('#71ffa0'); // Green
    const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
    const [selectedHighlightIds, setSelectedHighlightIds] = useState<string[]>([]);
    const { notify } = useNotification();
    // Set up a listener for double-click to toggle edit mode
    useEffect(() => {
        const handleDoubleClick = (e: MouseEvent) => {
            // Only trigger if double-clicking on PDF pages or viewers
            const target = e.target as HTMLElement;
            const isPdfArea =
                target.closest('.pdf-viewer-container') ||
                target.closest('.page-container') ||
                target.closest('.pdf-page');

            if (isPdfArea) {
                setIsEditingMode(prev => !prev);
                // Prevent default behavior and stop propagation
                e.preventDefault();
                e.stopPropagation();
                if (!isEditingMode) { //logically this should be true but it actually shows off.
                    notify({
                        message: 'Edit mode is on.',
                        type: 'info',
                        duration: 3000
                    });
                } else {
                    notify({
                        message: 'Edit mode is off.',
                        type: 'info',
                        duration: 3000
                    });
                }
            }
        };

        // Add the event listener
        document.addEventListener('dblclick', handleDoubleClick);

        // Clean up
        return () => {
            document.removeEventListener('dblclick', handleDoubleClick);
        };
    }, [isEditingMode]);

    // Store detection mappings for each file
    const [fileDetectionMappings, setFileDetectionMappings] = useState<Map<string, RedactionMapping>>(new Map());

    // Track the last processed file to prevent unnecessary resets
    const lastFileKeyRef = useRef<string | null>(null);

    // Set detection mapping for a specific file
    const setFileDetectionMapping = useCallback((fileKey: string, mapping: RedactionMapping) => {
        // Create a deep copy of the mapping using structuredClone for best isolation
        const mappingCopy = structuredClone(mapping);

        // Add file key and timestamp to the mapping for better tracking
        if (mappingCopy && typeof mappingCopy === 'object') {
            (mappingCopy as any).fileKey = fileKey;
            (mappingCopy as any).lastUpdated = Date.now();
        }

        setFileDetectionMappings(prev => {
            const newMap = new Map(prev);
            newMap.set(fileKey, mappingCopy);
            console.log(`[EditContext] Set detection mapping for file: ${fileKey}`);
            return newMap;
        });

        // If this is the current file, also update the current detection mapping
        if (currentFile && getFileKey(currentFile) === fileKey) {
            console.log(`[EditContext] Setting current detection mapping for file: ${fileKey}`);
            setDetectionMapping(mappingCopy);
        }

        // Dispatch a notification event with small delay to guarantee proper sequencing
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('apply-detection-mapping-completed', {
                detail: {
                    fileKey,
                    timestamp: Date.now()
                }
            }));
        }, 50);
    }, [currentFile]);

    // Get detection mapping for a specific file
    const getFileDetectionMapping = useCallback((fileKey: string): RedactionMapping | null => {
        return fileDetectionMappings.get(fileKey) || null;
    }, [fileDetectionMappings]);
    useEffect(() => {
        const handleEntityDetectionComplete = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, source } = customEvent.detail ?? {};

            if (!fileKey) return;

            // Only process auto-processing events specifically
            if (source === 'auto-process') {
                console.log(`[EditContext] Entity detection completed from auto-processing for file: ${fileKey}`);

                // Get the mapping for this file
                const mapping = fileDetectionMappings.get(fileKey);

                if (mapping) {
                    console.log(`[EditContext] Found detection mapping for auto-processed file: ${fileKey}`);

                    // Force an update of the detection mapping
                    const mappingCopy = JSON.parse(JSON.stringify(mapping));

                    // Update the file's detection mapping
                    setFileDetectionMapping(fileKey, mappingCopy);

                    // If this is the current file, also update current detection mapping
                    if (currentFile && getFileKey(currentFile) === fileKey) {
                        console.log(`[EditContext] Updating current detection mapping from auto-process for file: ${fileKey}`);
                        setDetectionMapping(mappingCopy);
                    }

                    // Dispatch a notification that mapping update is completed
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('apply-detection-mapping-completed', {
                            detail: {
                                fileKey,
                                source: 'auto-process',
                                timestamp: Date.now(),
                                forceProcess: true
                            }
                        }));
                    }, 50);
                } else {
                    console.log(`[EditContext] No detection mapping found for auto-processed file: ${fileKey}`);
                }
            }
        };

        window.addEventListener('entity-detection-complete',
            handleEntityDetectionComplete as EventListener);

        return () => {
            window.removeEventListener('entity-detection-complete',
                handleEntityDetectionComplete as EventListener);
        };
    }, [currentFile, fileDetectionMappings, setFileDetectionMapping, setDetectionMapping]);
    // Update current detection mapping when current file changes
    useEffect(() => {
        if (currentFile) {
            const fileKey = getFileKey(currentFile);

            // Only update if the file actually changed
            if (lastFileKeyRef.current !== fileKey) {
                lastFileKeyRef.current = fileKey;

                const mapping = fileDetectionMappings.get(fileKey);
                if (mapping) {
                    // FIXED: Create a new reference to prevent shared state
                    const mappingCopy = JSON.parse(JSON.stringify(mapping));
                    console.log(`[EditContext] Updating current detection mapping for file: ${fileKey}`);
                    setDetectionMapping(mappingCopy);
                } else {
                    console.log(`[EditContext] No detection mapping found for current file: ${fileKey}`);
                    setDetectionMapping(null);
                }
            }
        }
    }, [currentFile, fileDetectionMappings]);

    // Listen for apply-detection-mapping events
    useEffect(() => {
        const handleApplyDetectionMapping = (event: CustomEvent) => {
            const { fileKey, mapping } = event.detail;
            if (fileKey && mapping) {
                console.log(`[EditContext] Receiving detection mapping for file: ${fileKey} from event`);

                // FIXED: Create a deep copy of the mapping to ensure complete isolation
                const mappingCopy = JSON.parse(JSON.stringify(mapping));

                // Set the mapping for this file
                setFileDetectionMapping(fileKey, mappingCopy);
            }
        };

        // Add event listener
        window.addEventListener('apply-detection-mapping', handleApplyDetectionMapping as EventListener);

        // Cleanup
        return () => {
            window.removeEventListener('apply-detection-mapping', handleApplyDetectionMapping as EventListener);
        };
    }, [setFileDetectionMapping]);

    // Reset state when needed
    const resetEditState = useCallback(() => {
        setSearchQueries([]);
        setSelectedMlEntities([]);
        setSelectedGlinerEntities([]);
        setSelectedAiEntities([]);
        setSelectedHideMeEntities([]);
        setDetectionMapping(null);
        setFileDetectionMappings(new Map());
        setShowSearchHighlights(true);
        setShowEntityHighlights(true);
        setShowManualHighlights(true);
        // Reset highlighting mode to default
        setHighlightingMode(HighlightCreationMode.RECTANGULAR);
    }, []);

    // Function to get color based on model
    const getColorForModel = useCallback((model: string): string => {
        switch (model.toLowerCase()) {
            case 'presidio':
                return presidioColor;
            case 'gliner':
                return glinerColor;
            case 'gemini':
                return geminiColor;
            case 'hideme':
                return hidemeColor;
            default:
                return '#757575'; // Default gray
        }
    }, [presidioColor, glinerColor, geminiColor, hidemeColor]);

    const getSearchColor  = useCallback((): string => {
        return searchColor;
    }, [searchColor]);

    const getManualColor = useCallback((): string => {
        return manualColor;
    }, [manualColor]);

    const contextValue = useMemo(() => ({
        isEditingMode,
        setIsEditingMode,
        highlightingMode,
        setHighlightingMode,
        searchQueries,
        setSearchQueries,
        isRegexSearch,
        setIsRegexSearch,
        isCaseSensitive,
        setIsCaseSensitive,
        selectedMlEntities,
        setSelectedMlEntities,
        selectedAiEntities,
        setSelectedAiEntities,
        selectedGlinerEntities,
        setSelectedGlinerEntities,
        selectedHideMeEntities,
        setSelectedHideMeEntities,
        detectionMapping,
        setDetectionMapping,
        fileDetectionMappings,
        setFileDetectionMapping,
        getFileDetectionMapping,
        showSearchHighlights,
        setShowSearchHighlights,
        showEntityHighlights,
        setShowEntityHighlights,
        showManualHighlights,
        setShowManualHighlights,
        presidioColor,
        setPresidioColor,
        searchColor,
        setSearchColor,
        getSearchColor,
        manualColor,
        getManualColor,
        setManualColor,
        glinerColor,
        setGlinerColor,
        geminiColor,
        setGeminiColor,
        hidemeColor,
        setHidemeColor,
        resetEditState,
        getColorForModel,
        selectedHighlightId,
        setSelectedHighlightId,
        selectedHighlightIds,
        setSelectedHighlightIds
    }), [
        isEditingMode,
        setIsEditingMode,
        highlightingMode,
        setHighlightingMode,
        searchQueries,
        setSearchQueries,
        isRegexSearch,
        setIsRegexSearch,
        isCaseSensitive,
        setIsCaseSensitive,
        selectedMlEntities,
        setSelectedMlEntities,
        selectedAiEntities,
        setSelectedAiEntities,
        selectedGlinerEntities,
        setSelectedGlinerEntities,
        selectedHideMeEntities,
        setSelectedHideMeEntities,
        detectionMapping,
        setDetectionMapping,
        fileDetectionMappings,
        setFileDetectionMapping,
        getFileDetectionMapping,
        showSearchHighlights,
        setShowSearchHighlights,
        showEntityHighlights,
        setShowEntityHighlights,
        showManualHighlights,
        setShowManualHighlights,
        presidioColor,
        setPresidioColor,
        searchColor,
        setSearchColor,
        getSearchColor,
        manualColor,
        getManualColor,
        setManualColor,
        glinerColor,
        setGlinerColor,
        geminiColor,
        setGeminiColor,
        hidemeColor,
        setHidemeColor,
        resetEditState,
        getColorForModel,
        selectedHighlightId,
        setSelectedHighlightId,
        selectedHighlightIds,
        setSelectedHighlightIds
    ]);

    return (
        <EditContext.Provider value={contextValue}>
            {children}
        </EditContext.Provider>
    );

};
