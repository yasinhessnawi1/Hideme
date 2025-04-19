import React, {useCallback, useEffect, useRef, useState} from "react";
import {AlertTriangle, CheckCircle, ChevronDown, Loader2, Save} from "lucide-react";
import {OptionType} from "../../../types";
import {
    createEntityBatch,
    entitiesToOptions,
    geminiOptions,
    getColorDotStyle,
    glinerOptions,
    hidemeOptions,
    METHOD_ID_MAP,
    MODEL_COLORS,
    presidioOptions
} from "../../../utils/EntityUtils";
import useEntityDefinitions from "../../../hooks/settings/useEntityDefinitions";
import useAuth from "../../../hooks/auth/useAuth";
import useSettings from "../../../hooks/settings/useSettings";
import * as repl from "node:repl";

export default function EntitySettings() {
    // Get user and entity settings data
    const {
        modelEntities,
        getModelEntities,
        replaceModelEntities,
        isLoading: isEntityLoading,
        clearError,
        error: saveError,


    } = useEntityDefinitions();
    const {isAuthenticated, isLoading: isUserLoading} = useAuth();


    // --- Local UI State ---
    const [selectedPresidio, setSelectedPresidio] = useState<string[]>([]);
    const [selectedGliner, setSelectedGliner] = useState<string[]>([]);
    const [selectedGemini, setSelectedGemini] = useState<string[]>([]);
    const [selectedHideme, setSelectedHideme] = useState<string[]>([]);
    const [openAccordions, setOpenAccordions] = useState<string[]>(["presidio", "gliner", "gemini", "hideme"]);
    const [isSaving, setIsSaving] = useState(false);
    const [localSaveSuccess, setLocalSaveSuccess] = useState(false);

    // Refs to track which entity types we've already tried to load
    const loadedEntityTypesRef = useRef<Set<string>>(new Set());

    // Load entity data when component mounts - only once per entity type
    useEffect(() => {
        const loadEntities = async () => {
            if (!isAuthenticated || isUserLoading) {
                console.warn('[EntitySettings] User not authenticated or loading, skipping entity load');
                return;
            }
            try {
                // Define methods to load in a structured way
                const methodsToLoad = [
                    {id: METHOD_ID_MAP.presidio, name: 'presidio'},
                    {id: METHOD_ID_MAP.gliner, name: 'gliner'},
                    {id: METHOD_ID_MAP.gemini, name: 'gemini'},
                    {id: METHOD_ID_MAP.hideme, name: 'hideme'},
                ];

                // Load each method only if not already loaded
                for (const method of methodsToLoad) {
                    if (!loadedEntityTypesRef.current.has(method.name)) {
                        console.log(`[EntitySettings] Loading ${method.name} entities (method ID: ${method.id})`);
                        loadedEntityTypesRef.current.add(method.name);
                        await getModelEntities(method.id);
                    }
                }

            } catch (error) {
                console.error('[EntitySettings] Error loading entity data:', error);
            }
        };

        loadEntities();
    }, [modelEntities, isAuthenticated, isUserLoading]);

    // Sync local selections with fetched/updated entities from useUser hook
    useEffect(() => {
        if (modelEntities && Object.keys(modelEntities).length > 0) {
            console.log("[EntitySettings] Syncing local state with modelEntities");

            const syncSelection = (methodKey: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
                const methodId = METHOD_ID_MAP[methodKey];
                const entitiesForMethod = modelEntities[methodId];

                // Check if entitiesForMethod is actually an array before mapping
                if (Array.isArray(entitiesForMethod)) {
                    console.log(`[EntitySettings] Syncing ${methodKey}: Found ${entitiesForMethod.length} entities.`);
                    setter(entitiesForMethod.map(e => e.entity_text));
                } else {
                    // If it's not an array (e.g., undefined or null), keep current selection
                    console.log(`[EntitySettings] No entities found for ${methodKey} (ID: ${methodId})`);
                }
            };

            syncSelection('presidio', setSelectedPresidio);
            syncSelection('gliner', setSelectedGliner);
            syncSelection('gemini', setSelectedGemini);
            syncSelection('hideme', setSelectedHideme);
        }
    }, [modelEntities]);
    // --- UI Interaction Handlers ---
    const toggleAccordion = (value: string) => {
        setOpenAccordions((prev) =>
            prev.includes(value)
                ? prev.filter(item => item !== value)
                : [...prev, value]
        );
    };

    // Generic toggle handler for checkboxes
    const createToggleHandler = (
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        options: OptionType[]
    ) => (value: string) => {
        setter(prevSelected => {
            let newSelection: string[];
            const allValues = options.filter(opt => !opt.value.startsWith('ALL_')).map(opt => opt.value);

            // Handling the "ALL" pseudo-option
            if (value.startsWith('ALL_')) {
                const isCurrentlySelected = allValues.length > 0 &&
                    allValues.every(val => prevSelected.includes(val));
                newSelection = isCurrentlySelected ? [] : [...allValues];
            } else {
                // Handling individual options
                if (prevSelected.includes(value)) {
                    newSelection = prevSelected.filter(item => item !== value);
                } else {
                    newSelection = [...prevSelected, value];
                }
            }
            return newSelection;
        });
        setLocalSaveSuccess(false);
    };

    const togglePresidio = createToggleHandler(setSelectedPresidio, presidioOptions);
    const toggleGliner = createToggleHandler(setSelectedGliner, glinerOptions);
    const toggleGemini = createToggleHandler(setSelectedGemini, geminiOptions);
    const toggleHideme = createToggleHandler(setSelectedHideme, hidemeOptions);

    // Select/Clear All handlers
    const createSelectAllHandler = (
        options: OptionType[],
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => () => {
        setter(options.filter(opt => !opt.value.startsWith('ALL_')).map(opt => opt.value));
        setLocalSaveSuccess(false);
    };

    const createClearAllHandler = (
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => () => {
        setter([]);
        setLocalSaveSuccess(false);
    };

    const selectAllPresidio = createSelectAllHandler(presidioOptions, setSelectedPresidio);
    const clearAllPresidio = createClearAllHandler(setSelectedPresidio);
    const selectAllGliner = createSelectAllHandler(glinerOptions, setSelectedGliner);
    const clearAllGliner = createClearAllHandler(setSelectedGliner);
    const selectAllGemini = createSelectAllHandler(geminiOptions, setSelectedGemini);
    const clearAllGemini = createClearAllHandler(setSelectedGemini);
    const selectAllHideme = createSelectAllHandler(hidemeOptions, setSelectedHideme);
    const clearAllHideme = createClearAllHandler(setSelectedHideme);

    // --- Save Changes ---
    const handleSaveChanges = useCallback(async () => {
        setIsSaving(true);
        setLocalSaveSuccess(false);
        clearError();

        try {
            // Convert string arrays to OptionType arrays for each model

            // Use the shared hook to save entity settings
            await replaceModelEntities(METHOD_ID_MAP.presidio,
                entitiesToOptions(selectedPresidio, presidioOptions)
            );
            await replaceModelEntities(METHOD_ID_MAP.gliner,
                entitiesToOptions(selectedGliner, glinerOptions)
            );
            await replaceModelEntities(METHOD_ID_MAP.gemini,
                entitiesToOptions(selectedGemini, geminiOptions)
            );
            await replaceModelEntities(METHOD_ID_MAP.hideme,
                entitiesToOptions(selectedHideme, hidemeOptions)
            );

            setLocalSaveSuccess(true);
            setTimeout(() => setLocalSaveSuccess(false), 3000);
        } catch (err: any) {
            console.error("Error saving entity settings:", err);
        } finally {
            setIsSaving(false);
        }
    }, [
        entitiesToOptions,
        createClearAllHandler,
        replaceModelEntities,
        selectedPresidio,
        selectedGliner,
        selectedGemini,
        selectedHideme,
        clearError
    ]);

    // UI components
    const ColorDot: React.FC<{ color: string }> = ({color}) => (
        <span
            className="color-dot"
            style={getColorDotStyle(color)}
        />
    );

    const isLoading = isEntityLoading;

    return (
        <div className="space-y-6">
            {(saveError) && (
                <div className="alert alert-destructive">
                    <AlertTriangle className="alert-icon" size={16}/>
                    <div>
                        <div className="alert-title">Save Error</div>
                        <div className="alert-description">{saveError}</div>
                    </div>
                </div>
            )}

            {(localSaveSuccess) && (
                <div className="alert alert-success">
                    <div>
                        <CheckCircle className="alert-icon" size={16}/>
                        <div className="alert-title">Success</div>
                        <div className="alert-description">Entity settings saved successfully!</div>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Entity Detection Settings</h2>
                    <p className="card-description">Configure which entities are detected in your documents</p>
                </div>
                <div className="card-content space-y-6">
                    {isLoading && (
                        <div className="flex justify-center items-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                            <span className="ml-2 text-muted-foreground">Loading entity data...</span>
                        </div>
                    )}

                    {!isLoading && (
                        <>
                            <div className="separator"></div>

                            {/* Accordions for each model */}
                            <div className="accordion">
                                {/* Presidio */}
                                <div className="accordion-item">
                                    <button
                                        className="accordion-trigger"
                                        onClick={() => toggleAccordion("presidio")}
                                        aria-expanded={openAccordions.includes("presidio")}
                                    >
                                        <span><ColorDot color={MODEL_COLORS.presidio}/>Presidio Machine Learning</span>
                                        <ChevronDown
                                            className={`accordion-trigger-icon transition-transform duration-200 ${openAccordions.includes("presidio") ? 'rotate-180' : ''}`}
                                            size={16}
                                        />
                                    </button>
                                    <div
                                        className={`accordion-content ${openAccordions.includes("presidio") ? 'open' : ''}`}
                                    >
                                        <div className="space-y-4 py-2 px-1">
                                            <div className="flex justify-between gap-2">
                                                <button className="button button-outline button-sm"
                                                        onClick={selectAllPresidio} disabled={isSaving}>Select All
                                                </button>
                                                <button className="button button-outline button-sm"
                                                        onClick={clearAllPresidio} disabled={isSaving}>Clear All
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {presidioOptions.filter(opt => !opt.value.startsWith('ALL_')).map((option) => (
                                                    <div key={option.value} className="checkbox-container">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox"
                                                            id={`presidio-${option.value}`}
                                                            checked={selectedPresidio.includes(option.value)}
                                                            onChange={() => togglePresidio(option.value)}
                                                            disabled={isSaving}
                                                        />
                                                        <label className="checkbox-label"
                                                               htmlFor={`presidio-${option.value}`}>
                                                            {option.label}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Gliner */}
                                <div className="accordion-item">
                                    <button
                                        className="accordion-trigger"
                                        onClick={() => toggleAccordion("gliner")}
                                        aria-expanded={openAccordions.includes("gliner")}
                                    >
                                        <span><ColorDot color={MODEL_COLORS.gliner}/>Gliner Machine Learning</span>
                                        <ChevronDown
                                            className={`accordion-trigger-icon transition-transform duration-200 ${openAccordions.includes("gliner") ? 'rotate-180' : ''}`}
                                            size={16}
                                        />
                                    </button>
                                    <div
                                        className={`accordion-content ${openAccordions.includes("gliner") ? 'open' : ''}`}
                                    >
                                        <div className="space-y-4 py-2 px-1">
                                            <div className="flex justify-between gap-2">
                                                <button className="button button-outline button-sm"
                                                        onClick={selectAllGliner} disabled={isSaving}>Select All
                                                </button>
                                                <button className="button button-outline button-sm"
                                                        onClick={clearAllGliner}
                                                        disabled={isSaving}>Clear All
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {glinerOptions.filter(opt => !opt.value.startsWith('ALL_')).map((option) => (
                                                    <div key={option.value} className="checkbox-container">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox"
                                                            id={`gliner-${option.value}`}
                                                            checked={selectedGliner.includes(option.value)}
                                                            onChange={() => toggleGliner(option.value)}
                                                            disabled={isSaving}
                                                        />
                                                        <label className="checkbox-label"
                                                               htmlFor={`gliner-${option.value}`}>
                                                            {option.label}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Gemini */}
                                <div className="accordion-item">
                                    <button
                                        className="accordion-trigger"
                                        onClick={() => toggleAccordion("gemini")}
                                        aria-expanded={openAccordions.includes("gemini")}
                                    >
                                        <span><ColorDot color={MODEL_COLORS.gemini}/>Gemini AI</span>
                                        <ChevronDown
                                            className={`accordion-trigger-icon transition-transform duration-200 ${openAccordions.includes("gemini") ? 'rotate-180' : ''}`}
                                            size={16}
                                        />
                                    </button>
                                    <div
                                        className={`accordion-content ${openAccordions.includes("gemini") ? 'open' : ''}`}
                                    >
                                        <div className="space-y-4 py-2 px-1">
                                            <div className="flex justify-between gap-2">
                                                <button className="button button-outline button-sm"
                                                        onClick={selectAllGemini} disabled={isSaving}>Select All
                                                </button>
                                                <button className="button button-outline button-sm"
                                                        onClick={clearAllGemini}
                                                        disabled={isSaving}>Clear All
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {geminiOptions.filter(opt => !opt.value.startsWith('ALL_')).map((option) => (
                                                    <div key={option.value} className="checkbox-container">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox"
                                                            id={`gemini-${option.value}`}
                                                            checked={selectedGemini.includes(option.value)}
                                                            onChange={() => toggleGemini(option.value)}
                                                            disabled={isSaving}
                                                        />
                                                        <label className="checkbox-label"
                                                               htmlFor={`gemini-${option.value}`}>
                                                            {option.label}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Hide me AI */}
                                <div className="accordion-item">
                                    <button
                                        className="accordion-trigger"
                                        onClick={() => toggleAccordion("hideme")}
                                        aria-expanded={openAccordions.includes("hideme")}
                                    >
                                        <span><ColorDot color={MODEL_COLORS.hideme}/>Hide me AI</span>
                                        <ChevronDown
                                            className={`accordion-trigger-icon transition-transform duration-200 ${openAccordions.includes("hideme") ? 'rotate-180' : ''}`}
                                            size={16}
                                        />
                                    </button>
                                    <div
                                        className={`accordion-content ${openAccordions.includes("hideme") ? 'open' : ''}`}
                                    >
                                        <div className="space-y-4 py-2 px-1">
                                            <div className="flex justify-between gap-2">
                                                <button className="button button-outline button-sm"
                                                        onClick={selectAllHideme} disabled={isSaving}>Select All
                                                </button>
                                                <button className="button button-outline button-sm"
                                                        onClick={clearAllHideme}
                                                        disabled={isSaving}>Clear All
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {hidemeOptions.filter(opt => !opt.value.startsWith('ALL_')).map((option) => (
                                                    <div key={option.value} className="checkbox-container">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox"
                                                            id={`hideme-${option.value}`}
                                                            checked={selectedHideme.includes(option.value)}
                                                            onChange={() => toggleHideme(option.value)}
                                                            disabled={isSaving}
                                                        />
                                                        <label className="checkbox-label"
                                                               htmlFor={`hideme-${option.value}`}>
                                                            {option.label}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4 mt-6">
                <button
                    className="button button-primary"
                    onClick={handleSaveChanges}
                    disabled={isSaving || isLoading}
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin button-icon"/> :
                        <Save size={16} className="button-icon"/>}
                    {isSaving ? 'Saving...' : 'Save Entity Settings'}
                </button>
            </div>
        </div>
    );
}
