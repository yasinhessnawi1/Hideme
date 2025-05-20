import React, {useCallback, useEffect, useRef, useState} from "react";
import {AlertTriangle, CheckCircle, ChevronDown, Loader2, Save} from "lucide-react";
import {OptionType} from "../../../types";
import {
    entitiesToOptions,
    getGeminiOptions,
    getColorDotStyle,
    getGlinerOptions,
    getHidemeOptions,
    METHOD_ID_MAP,
    MODEL_COLORS,
    getPresidioOptions
} from "../../../utils/EntityUtils";
import useEntityDefinitions from "../../../hooks/settings/useEntityDefinitions";
import useAuth from "../../../hooks/auth/useAuth";
import { useLoading } from "../../../contexts/LoadingContext";
import LoadingWrapper from "../../common/LoadingWrapper";
import { useNotification } from "../../../contexts/NotificationContext";
import { useLanguage } from '../../../contexts/LanguageContext';
import { mapBackendErrorToMessage } from '../../../utils/errorUtils';


export default function EntitySettings() {
    const { t } = useLanguage();
    // Wrap t to match (ns: string, key: string) => string
    const tSimple = (ns: string, key: string) => t(ns as any, key as any);
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
    const { isLoading: globalLoading, startLoading, stopLoading } = useLoading();
    const { notify, confirm } = useNotification();
    // Refs to track which entity types we've already tried to load
    const loadedEntityTypesRef = useRef<Set<string>>(new Set());

    // Initialize options using translation function
    const presidioOptions = getPresidioOptions(tSimple);
    const glinerOptions = getGlinerOptions(tSimple);
    const geminiOptions = getGeminiOptions(tSimple);
    const hidemeOptions = getHidemeOptions(tSimple);

    // Load entity data when component mounts - only once per entity type
    useEffect(() => {
        const loadEntities = async () => {
            if (!isAuthenticated || isUserLoading) {
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
                        loadedEntityTypesRef.current.add(method.name);
                        try {
                            await getModelEntities(method.id);
                        } catch (error) {
                            notify({
                                message: mapBackendErrorToMessage(error) || t('entityDetection', 'detectionError') + (method.name ? ` (${method.name})` : ''),
                                type: 'error',
                                duration: 3000
                            });
                        }
                    }
                }

            } catch (error) {
                console.error('[EntitySettings] Error loading entity data:', error);
                notify({
                    message: mapBackendErrorToMessage(error) || t('errors', 'failedToLoadSettings'),
                    type: 'error',
                    duration: 3000
                });
            }
        };

        loadEntities();
    }, [isAuthenticated, isUserLoading]);

    // Sync local selections with fetched/updated entities from useUser hook
    useEffect(() => {
        if (modelEntities && Object.keys(modelEntities).length > 0) {

            const syncSelection = (methodKey: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
                const methodId = METHOD_ID_MAP[methodKey];
                const entitiesForMethod = modelEntities[methodId];

                // Check if entitiesForMethod is actually an array before mapping
                if (Array.isArray(entitiesForMethod)) {
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
        setter(
            options.filter(opt => !opt.value.startsWith('ALL_')).map(opt => opt.value)
        );
        notify({
            message: t('settings', 'allSearchTermsCleared'),
            type: 'success',
            duration: 3000
        });
    };

    const createClearAllHandler = (
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => () => {
        setter([]);
        notify({
            message: t('settings', 'clearAllSearchTermsMessage').replace('{count}', ''),
            type: 'success',
            duration: 3000
        });
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
            startLoading('setting.entity');
        notify({
            message: t('settings', 'saving'),
            type: 'info',
            duration: 3000
        });
        clearError();

        try {
            // Convert string arrays to OptionType arrays for each model
            const presidioEntitiesToSave = entitiesToOptions(selectedPresidio, presidioOptions);
            const glinerEntitiesToSave = entitiesToOptions(selectedGliner, glinerOptions);
            const geminiEntitiesToSave = entitiesToOptions(selectedGemini, geminiOptions);
            const hidemeEntitiesToSave = entitiesToOptions(selectedHideme, hidemeOptions);

            // Use the shared hook to save entity settings
            await replaceModelEntities(METHOD_ID_MAP.presidio, presidioEntitiesToSave);
            await replaceModelEntities(METHOD_ID_MAP.gliner, glinerEntitiesToSave);
            await replaceModelEntities(METHOD_ID_MAP.gemini, geminiEntitiesToSave);
            await replaceModelEntities(METHOD_ID_MAP.hideme, hidemeEntitiesToSave);

            // --- Add this event dispatch ---
            window.dispatchEvent(new CustomEvent('settings-changed', {
                detail: {
                    type: 'entity', // Specify the type
                    settings: {
                        // Send the updated entity selections in the payload
                        presidio: presidioEntitiesToSave,
                        gliner: glinerEntitiesToSave,
                        gemini: geminiEntitiesToSave,
                        hideme: hidemeEntitiesToSave,
                    }
                }
            }));

            notify({
                message: t('entityDetection', 'settingsSaved'),
                type: 'success',
                duration: 3000
            });
        } catch (err: any) {
            notify({
                message: t('entityDetection', 'errorSavingSettings') + (err?.message ? `: ${mapBackendErrorToMessage(err)}` : ''),
                type: 'error',
                duration: 3000
            });
            console.error("Error saving entity settings:", err);
        } finally {
            stopLoading('setting.entity');
        }
    }, [
        replaceModelEntities,
        selectedPresidio,
        selectedGliner,
        selectedGemini,
        selectedHideme,
        clearError,
        startLoading,
        stopLoading,
        entitiesToOptions
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
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">{t('entityDetection', 'detectionSettings')}</h2>
                    <p className="card-description">{t('settings', 'configureProcessingAndStorage')}</p>
                </div>
                <div className="card-content space-y-6">
                    {isLoading && (
                        <div className="flex justify-center items-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                            <span className="ml-2 text-muted-foreground">{t('settings', 'loadingSettings')}</span>
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
                                        <span><ColorDot color={MODEL_COLORS.presidio}/>{t('entityDetection', 'presidioML')}</span>
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
                                                        onClick={selectAllPresidio} disabled={isLoading}>{t('pdf', 'selectAll')}
                                                </button>
                                                <button className="button button-outline button-sm"
                                                        onClick={clearAllPresidio} disabled={isLoading}>{t('pdf', 'deselectAll')}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {presidioOptions.filter((opt: OptionType) => !opt.value.startsWith('ALL_')).map((option: OptionType) => (
                                                    <div key={option.value} className="checkbox-container">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox"
                                                            id={`presidio-${option.value}`}
                                                            checked={selectedPresidio.includes(option.value)}
                                                            onChange={() => togglePresidio(option.value)}
                                                            disabled={isLoading}
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
                                        <span><ColorDot color={MODEL_COLORS.gliner}/>{t('entityDetection', 'glinerML')}</span>
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
                                                        onClick={selectAllGliner} disabled={isLoading}>{t('pdf', 'selectAll')}
                                                </button>
                                                <button className="button button-outline button-sm"
                                                        onClick={clearAllGliner}
                                                        disabled={isLoading}>{t('pdf', 'deselectAll')}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {glinerOptions.filter((opt: OptionType) => !opt.value.startsWith('ALL_')).map((option: OptionType) => (
                                                    <div key={option.value} className="checkbox-container">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox"
                                                            id={`gliner-${option.value}`}
                                                            checked={selectedGliner.includes(option.value)}
                                                            onChange={() => toggleGliner(option.value)}
                                                            disabled={isLoading}
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
                                        <span><ColorDot color={MODEL_COLORS.gemini}/>{t('entityDetection', 'geminiAI')}</span>
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
                                                        onClick={selectAllGemini} disabled={isLoading}>{t('pdf', 'selectAll')}
                                                </button>
                                                <button className="button button-outline button-sm"
                                                        onClick={clearAllGemini}
                                                        disabled={isLoading}>{t('pdf', 'deselectAll')}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {geminiOptions.filter((opt: OptionType) => !opt.value.startsWith('ALL_')).map((option: OptionType) => (
                                                    <div key={option.value} className="checkbox-container">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox"
                                                            id={`gemini-${option.value}`}
                                                            checked={selectedGemini.includes(option.value)}
                                                            onChange={() => toggleGemini(option.value)}
                                                            disabled={isLoading}
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
                                        <span><ColorDot color={MODEL_COLORS.hideme}/>{t('entityDetection', 'hidemeAI')}</span>
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
                                                        onClick={selectAllHideme} disabled={isLoading}>{t('pdf', 'selectAll')}
                                                </button>
                                                <button className="button button-outline button-sm"
                                                        onClick={clearAllHideme}
                                                        disabled={isLoading}>{t('pdf', 'deselectAll')}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {hidemeOptions.filter((opt: OptionType) => !opt.value.startsWith('ALL_')).map((option: OptionType) => (
                                                    <div key={option.value} className="checkbox-container">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox"
                                                            id={`hideme-${option.value}`}
                                                            checked={selectedHideme.includes(option.value)}
                                                            onChange={() => toggleHideme(option.value)}
                                                            disabled={isLoading}
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
                    disabled={isLoading}
                >
                    <LoadingWrapper isLoading={isLoading} fallback={t('settings', 'saving')}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin button-icon"/> :
                            <Save size={16} className="button-icon"/>}
                        {isLoading ? t('settings', 'saving') : t('settings', 'saveChanges')}
                    </LoadingWrapper>
                </button>
            </div>
        </div>
    );
}
