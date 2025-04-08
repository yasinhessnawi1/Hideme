import React, {useEffect, useState, useRef} from "react";
import {AlertTriangle, ChevronDown, Loader2, Save} from "lucide-react";
import {useUser} from "../../../hooks/userHook"; // Adjust path if needed
import { ModelEntity } from "../../../services/settingsService";

// Mock entity options
const presidioOptions = [
    {value: 'ALL_PRESIDIO', label: 'All Presidio Entities'},
    {value: 'PERSON', label: 'Person'},
    {value: 'DATE_TIME', label: 'Date/Time'},
    {value: 'EMAIL_ADDRESS', label: 'Email Address'},
    {value: 'IBAN_CODE', label: 'IBAN'},
    {value: 'IP_ADDRESS', label: 'IP Address'},
    {value: 'NO_COMPANY_NUMBER', label: 'Org number'},
    {value: 'LOCATION', label: 'Location'},
    {value: 'MEDICAL_LICENSE', label: 'Medical License'},
    {value: 'URL', label: 'URL'},
    {value: 'NO_ADDRESS', label: 'Address'},
    {value: 'NO_PHONE_NUMBER', label: 'Phone'},
    {value: 'NO_FODSELSNUMMER', label: 'ID'},
    {value: 'NO_BANK_ACCOUNT', label: 'Bank account'},
    {value: 'NO_LICENSE_PLATE', label: 'License plate'},
    {value: 'ORGANIZATION', label: 'Organization'},
    {value: 'CRYPTO', label: 'Crypto Wallet'},
];
const glinerOptions = [
    {value: 'ALL_GLINER', label: 'All Gliner Entities'},
    {value: 'person', label: 'Person'},
    {value: 'location', label: 'Location'},
    {value: 'date', label: 'Date'},
    {value: 'organization', label: 'Organization'},
    {value: 'phone number', label: 'Phone Number'},
    {value: 'address', label: 'Address'},
    {value: 'passport number', label: 'Passport Number'},
    {value: 'email', label: 'Email'},
    {value: 'credit card number', label: 'Credit Card Number'},
    {value: 'date of birth', label: 'Date of Birth'},
    {value: 'bank account number', label: 'Bank Account Number'},
    {value: 'medication', label: 'Medication'},
    {value: 'tax identification number', label: 'Tax Identification Number'},
    {value: 'medical condition', label: 'Medical Condition'},
    {value: 'identity card number', label: 'Identity Card Number'},
    {value: 'national id number', label: 'National ID Number'},
    {value: 'ip address', label: 'IP Address'},
    {value: 'iban', label: 'IBAN'},
    {value: 'credit card expiration date', label: 'Credit Card Expiration Date'},
    {value: 'username', label: 'Username'},
    {value: 'registration number', label: 'Registration Number'},
    {value: 'student id number', label: 'Student ID Number'},
    {value: 'insurance number', label: 'Insurance Number'},
    {value: 'social media handle', label: 'Social Media Handle'},
    {value: 'license plate number', label: 'License Plate Number'},
    {value: 'postal code', label: 'Postal Code'},
    {value: 'vehicle registration number', label: 'Vehicle Registration Number'},
    {value: 'fax number', label: 'Fax Number'},
    {value: 'visa number', label: 'Visa Number'},
    {value: 'passport_number', label: 'Passport_number'},
];
const geminiOptions = [
    {value: 'ALL_GEMINI', label: 'All Gemini Entities'},
    {value: 'PERSON-G', label: 'Person'},
    {value: 'ORGANIZATION-G', label: 'Organization'},
    {value: 'PHONE-G', label: 'Phone'},
    {value: 'EMAIL-G', label: 'Email'},
    {value: 'ADDRESS-G', label: 'Address'},
    {value: 'LOCATION-G', label: 'Location'},
    {value: 'DATE-G', label: 'Date'},
    {value: 'NATIONAL_ID-G', label: 'National ID'},
    {value: 'FINANCIAL_INFO-G', label: 'Financial'},
    {value: 'AGE-G', label: 'Age'},
    {value: 'HEALTH-G', label: 'Health'},
    {value: 'CRIMINAL-G', label: 'Criminal'},
    {value: 'SEXUAL-G', label: 'Sexual'},
    {value: 'RELIGIOUS_BELIEF-G', label: 'Religious Belief'},
    {value: 'POLITICAL_AFFILIATION-G', label: 'Political Affiliation'},
    {value: 'TRADE_UNION-G', label: 'Trade Union'},
    {value: 'BIOMETRIC_DATA-G', label: 'Biometric Data'},
    {value: 'GENETIC_DATA-G', label: 'Genetic Data'},
    {value: 'CONTEXT-G', label: 'Context'},
];

// Map frontend values to backend method IDs
const METHOD_ID_MAP: { [key: string]: number } = {
    presidio: 1,
    gliner: 2,
    gemini: 3,
};
const METHOD_ID_REVERSE_MAP: { [key: number]: string } = {
    1: 'presidio',
    2: 'gliner',
    3: 'gemini',
};

// Define interface for entity options
interface EntityOption {
    value: string;
    label: string;
}

export default function EntitySettings() {
    const {
        settings,
        modelEntities,
        getModelEntities,
        addModelEntities,
        deleteModelEntity,
        updateSettings,
        isLoading: isUserLoading,
        error: userError,
        clearError: clearUserError
    } = useUser();

    // --- Local UI State ---
    const [selectedPresidio, setSelectedPresidio] = useState<string[]>([]);
    const [selectedGliner, setSelectedGliner] = useState<string[]>([]);
    const [selectedGemini, setSelectedGemini] = useState<string[]>([]);
    const [openAccordions, setOpenAccordions] = useState<string[]>(["presidio", "gliner", "gemini"]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Add refs to track initialization
    const initialEntitiesLoadedRef = useRef(false);
    const entityFetchAttemptsRef = useRef<Set<number>>(new Set());

    // --- Effects ---

    // Fetch entities when component mounts or user changes
    useEffect(() => {
        const fetchEntityMethod = async (methodId: number) => {
            if (entityFetchAttemptsRef.current.has(methodId) || isUserLoading) {
                return;
            }

            console.log(`[EntitySettings] Fetching entities for method ${methodId}`);
            entityFetchAttemptsRef.current.add(methodId);

            try {
                await getModelEntities(methodId);
            } catch (error) {
                console.error(`[EntitySettings] Failed to fetch entities for method ${methodId}`, error);
            }
        };

        // Only attempt to fetch if not already loaded
        if (!initialEntitiesLoadedRef.current && !isUserLoading) {
            console.log("[EntitySettings] Starting initial entity fetch");

            // Fetch each method's entities with small delays
            fetchEntityMethod(METHOD_ID_MAP.presidio);

            setTimeout(() => {
                fetchEntityMethod(METHOD_ID_MAP.gliner);
            }, 300);

            setTimeout(() => {
                fetchEntityMethod(METHOD_ID_MAP.gemini);
                initialEntitiesLoadedRef.current = true;
            }, 600);
        }
    }, [getModelEntities, isUserLoading]);

    // Sync local selections with fetched/updated entities from useUser hook
    useEffect(() => {
        if (initialEntitiesLoadedRef.current || entityFetchAttemptsRef.current.size > 0) {
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
        }
    }, [modelEntities]);

    // --- UI Interaction Handlers ---

    const toggleAccordion = (value: string) => {
        setOpenAccordions((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
    };

    // Generic toggle handler for checkboxes
    const createToggleHandler = (
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        options: EntityOption[]
    ) => (value: string) => {
        setter(prevSelected => {
            let newSelection: string[];
            const allValues = options.filter(opt => !opt.value.startsWith('ALL_')).map(opt => opt.value);

            if (value.startsWith('ALL_')) { // Handling the "All" pseudo-option
                const isCurrentlySelected = allValues.length > 0 && allValues.every(val => prevSelected.includes(val));
                newSelection = isCurrentlySelected ? [] : [...allValues];
            } else { // Handling individual options
                if (prevSelected.includes(value)) {
                    newSelection = prevSelected.filter(item => item !== value);
                } else {
                    newSelection = [...prevSelected, value];
                }
            }
            return newSelection;
        });
        setSaveSuccess(false);
        setSaveError(null);
    };

    const togglePresidio = createToggleHandler(setSelectedPresidio, presidioOptions);
    const toggleGliner = createToggleHandler(setSelectedGliner, glinerOptions);
    const toggleGemini = createToggleHandler(setSelectedGemini, geminiOptions);

    // Select/Clear All handlers
    const createSelectAllHandler = (
        options: EntityOption[],
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => () => {
        setter(options.filter(opt => !opt.value.startsWith('ALL_')).map(opt => opt.value));
        setSaveSuccess(false);
        setSaveError(null);
    };

    const createClearAllHandler = (
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => () => {
        setter([]);
        setSaveSuccess(false);
        setSaveError(null);
    };

    const selectAllPresidio = createSelectAllHandler(presidioOptions, setSelectedPresidio);
    const clearAllPresidio = createClearAllHandler(setSelectedPresidio);
    const selectAllGliner = createSelectAllHandler(glinerOptions, setSelectedGliner);
    const clearAllGliner = createClearAllHandler(setSelectedGliner);
    const selectAllGemini = createSelectAllHandler(geminiOptions, setSelectedGemini);
    const clearAllGemini = createClearAllHandler(setSelectedGemini);

    // --- Save Changes ---
    const handleSaveChanges = async () => {
        setIsSaving(true);
        setSaveError(null);
        setSaveSuccess(false);
        clearUserError();

        try {
            // Sync Model Entities (Add new, Delete removed)
            const syncEntities = async (
                methodKey: string,
                localSelection: string[],
            ) => {
                const methodId = METHOD_ID_MAP[methodKey];

                try {
                    // Log the actual value to help debugging
                    console.log(`[EntitySettings] Syncing entities for method ${methodKey}:`, {
                        methodId,
                        localSelection: localSelection.length
                    });

                    // Create empty arrays as fallbacks
                    let currentEntities: ModelEntity[] = [];
                    let currentEntityTexts: string[] = [];

                    // Try to safely extract entity data
                    if (modelEntities[methodId]) {
                        if (Array.isArray(modelEntities[methodId])) {
                            currentEntities = modelEntities[methodId];
                            currentEntityTexts = currentEntities.map(e => e.entity_text || '');
                        } else {
                            console.warn(`[EntitySettings] Expected array but got:`, typeof modelEntities[methodId]);
                        }
                    }

                    // Filter out any potential "ALL_" placeholders
                    const cleanLocalSelection = localSelection.filter(v => !v.startsWith('ALL_'));

                    // Determine what to add (items in local selection not in current texts)
                    const entitiesToAdd = cleanLocalSelection.filter(e => !currentEntityTexts.includes(e));

                    // Determine what to remove (items in current entities not in local selection)
                    const entitiesToRemove = [];
                    for (const entity of currentEntities) {
                        if (entity && entity.entity_text && entity.id && !cleanLocalSelection.includes(entity.entity_text)) {
                            entitiesToRemove.push(entity.id);
                        }
                    }

                    console.log(`[EntitySettings] Syncing ${methodKey}: Add ${entitiesToAdd.length}, Remove ${entitiesToRemove.length}`);

                    // Process additions and deletions
                    const promises = [];
                    if (entitiesToAdd.length > 0) {
                        promises.push(addModelEntities({method_id: methodId, entity_texts: entitiesToAdd}));
                    }

                    for (const id of entitiesToRemove) {
                        promises.push(deleteModelEntity(id));
                    }

                    await Promise.all(promises);
                } catch (error) {
                    console.error(`[EntitySettings] Error syncing entities for ${methodKey}:`, error);
                    throw error; // Re-throw to allow proper error handling
                }
            };

            await Promise.all([
                syncEntities('presidio', selectedPresidio),
                syncEntities('gliner', selectedGliner),
                syncEntities('gemini', selectedGemini),
            ]);

            // Refetch entities after changes to update the main state
            console.log("[EntitySettings] Refetching entities after save...");
            await Promise.all([
                getModelEntities(METHOD_ID_MAP.presidio),
                getModelEntities(METHOD_ID_MAP.gliner),
                getModelEntities(METHOD_ID_MAP.gemini),
            ]);

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);

        } catch (err: any) {
            const message = err.userMessage || err.message || "Failed to save entity settings.";
            setSaveError(message);
            console.error("Error saving entity settings:", err);
        } finally {
            setIsSaving(false);
        }
    };

    // Determine combined loading state
    const isLoading = isUserLoading || !initialEntitiesLoadedRef.current;

    // Helper component for the colored dot indicator
    const ColorDot: React.FC<{ color: string }> = ({color}) => (
        <span
            style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: color,
                marginRight: '8px',
                verticalAlign: 'middle'
            }}
        />
    );

    // Define model colors for dots
    const MODEL_COLORS = {
        presidio: '#ffd771', // Yellow
        gliner: '#ff7171',   // Red
        gemini: '#7171ff'    // Blue
    };

    return (
        <div className="space-y-6">
            {saveError && (
                <div className="alert alert-destructive">
                    <AlertTriangle className="alert-icon" size={16}/>
                    <div>
                        <div className="alert-title">Save Error</div>
                        <div className="alert-description">{saveError}</div>
                    </div>
                </div>
            )}
            {saveSuccess && (
                <div className="alert alert-success">
                    <div>
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
                            <div className="form-group">
                                <label className="form-label" htmlFor="default-model">
                                    Default Detection Model
                                </label>
                            </div>

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
                                        <div className="space-y-4 py-2 px-1"> {/* Added padding */}
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
                                        <div className="space-y-4 py-2 px-1"> {/* Added padding */}
                                            <div className="flex justify-between gap-2">
                                                <button className="button button-outline button-sm"
                                                        onClick={selectAllGliner} disabled={isSaving}>Select All
                                                </button>
                                                <button className="button button-outline button-sm" onClick={clearAllGliner}
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
                                        <div className="space-y-4 py-2 px-1"> {/* Added padding */}
                                            <div className="flex justify-between gap-2">
                                                <button className="button button-outline button-sm"
                                                        onClick={selectAllGemini} disabled={isSaving}>Select All
                                                </button>
                                                <button className="button button-outline button-sm" onClick={clearAllGemini}
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
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4 mt-6"> {/* Added margin-top */}
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
