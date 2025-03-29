import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { OptionType, RedactionMapping } from '../types/types';
import { useFileContext } from './FileContext';
import { getFileKey } from './PDFViewerContext';

interface EditContextProps {
    isEditingMode: boolean;
    setIsEditingMode: React.Dispatch<React.SetStateAction<boolean>>;
    highlightColor: string;
    setHighlightColor: React.Dispatch<React.SetStateAction<string>>;
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

    resetEditState: () => void;
    getColorForModel: (model: string) => string;
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
    const { currentFile, files } = useFileContext();

    const [isEditingMode, setIsEditingMode] = useState(true);
    const [highlightColor, setHighlightColor] = useState('#00ff15');
    const [searchQueries, setSearchQueries] = useState<string[]>([]);
    const [isRegexSearch, setIsRegexSearch] = useState(false);
    const [isCaseSensitive, setIsCaseSensitive] = useState(false);
    const [selectedMlEntities, setSelectedMlEntities] = useState<OptionType[]>([]);
    const [selectedAiEntities, setSelectedAiEntities] = useState<OptionType[]>([]);
    const [selectedGlinerEntities, setSelectedGlinerEntities] = useState<OptionType[]>([]);
    const [detectionMapping, setDetectionMapping] = useState<RedactionMapping | null>(null);
    const [showSearchHighlights, setShowSearchHighlights] = useState(true);
    const [showEntityHighlights, setShowEntityHighlights] = useState(true);
    const [showManualHighlights, setShowManualHighlights] = useState(true);

    const [presidioColor, setPresidioColor] = useState('#ffd771'); // Yellow
    const [glinerColor, setGlinerColor] = useState('#ff7171'); // Red
    const [geminiColor, setGeminiColor] = useState('#7171ff'); // Blue

    // Store detection mappings for each file
    const [fileDetectionMappings, setFileDetectionMappings] = useState<Map<string, RedactionMapping>>(new Map());

    // Set detection mapping for a specific file
    const setFileDetectionMapping = useCallback((fileKey: string, mapping: RedactionMapping) => {
        setFileDetectionMappings(prev => {
            const newMap = new Map(prev);
            newMap.set(fileKey, mapping);
            console.log(`[EditContext] Set detection mapping for file: ${fileKey}`);
            return newMap;
        });

        // If this is the current file, also update the current detection mapping
        if (currentFile && getFileKey(currentFile) === fileKey) {
            setDetectionMapping(mapping);
        }
    }, [currentFile]);

    // Get detection mapping for a specific file
    const getFileDetectionMapping = useCallback((fileKey: string): RedactionMapping | null => {
        return fileDetectionMappings.get(fileKey) || null;
    }, [fileDetectionMappings]);

    // Update current detection mapping when current file changes
    useEffect(() => {
        if (currentFile) {
            const fileKey = getFileKey(currentFile);
            const mapping = fileDetectionMappings.get(fileKey);
            if (mapping) {
                console.log(`[EditContext] Updating current detection mapping for file: ${fileKey}`);
                setDetectionMapping(mapping);
            } else {
                console.log(`[EditContext] No detection mapping found for current file: ${fileKey}`);
                setDetectionMapping(null);
            }
        }
    }, [currentFile, fileDetectionMappings]);

    // Reset state when needed
    const resetEditState = useCallback(() => {
        setSearchQueries([]);
        setSelectedMlEntities([]);
        setSelectedGlinerEntities([]);
        setSelectedAiEntities([]);
        setDetectionMapping(null);
        setFileDetectionMappings(new Map());
        setShowSearchHighlights(true);
        setShowEntityHighlights(true);
        setShowManualHighlights(true);
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
            default:
                return '#757575'; // Default gray
        }
    }, [presidioColor, glinerColor, geminiColor]);

    return (
        <EditContext.Provider
            value={{
                isEditingMode,
                setIsEditingMode,
                highlightColor,
                setHighlightColor,
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
                glinerColor,
                setGlinerColor,
                geminiColor,
                setGeminiColor,
                resetEditState,
                getColorForModel
            }}
        >
            {children}
        </EditContext.Provider>
    );
};
