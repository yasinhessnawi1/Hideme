import React, {useEffect, useState} from 'react';
import Select from 'react-select';
import { usePDFContext, OptionType } from '../../contexts/PDFContext';
import { useHighlightContext, HighlightType, HighlightRect } from '../../contexts/HighlightContext';
import { usePDFApi } from '../../hooks/usePDFApi';
import '../../styles/pdf/SettingsSidebar.css';



// Presidio ML entity options (renamed from mlOptions)
const presidioOptions: OptionType[] = [
    { value: 'CRYPTO', label: 'Crypto Wallet' },
    { value: 'DATE_TIME', label: 'Date/Time' },
    { value: 'EMAIL_ADDRESS', label: 'Email Address' },
    { value: 'IBAN_CODE', label: 'IBAN' },
    { value: 'IP_ADDRESS', label: 'IP Address' },
    { value: 'NRP', label: 'NRP' },
    { value: 'LOCATION', label: 'Location' },
    { value: 'PERSON', label: 'Person' },
    { value: 'PHONE_NUMBER', label: 'Phone Number' },
    { value: 'MEDICAL_LICENSE', label: 'Medical License' },
    { value: 'URL', label: 'URL' },
    { value: 'NO_ADDRESS', label: 'Norwegian Address' },
    { value: 'NO_PHONE_NUMBER', label: 'Norwegian Phone' },
    { value: 'NO_FODSELSNUMMER', label: 'Norwegian ID' },
];

// New Gliner ML entity options
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

// Gemini AI entity options (renamed from aiOptions)
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
        file,
        selectedMlEntities,
        setSelectedMlEntities,
        selectedAiEntities,
        setSelectedAiEntities,
        detectionMapping,
        setDetectionMapping,
    } = usePDFContext();

    // Add state for Gliner entities
    const [selectedGlinerEntities, setSelectedGlinerEntities] = useState<OptionType[]>([]);

    // Add state for customizable highlight colors
    const [presidioColor, setPresidioColor] = useState('#ffd771');
    const [glinerColor, setGlinerColor] = useState('#ff7171');
    const [geminiColor, setGeminiColor] = useState('#7171ff');

    const {
        clearAnnotationsByType,
        addAnnotation,
        getNextHighlightId
    } = useHighlightContext();

    // Update API hook to include new model
    const { loading, error, runDetectAi, runDetectMl, runDetectGliner } = usePDFApi();

    const [isDetecting, setIsDetecting] = useState(false);
    const [lastDetectionId, setLastDetectionId] = useState<string | null>(null);

    // This useEffect will convert detection mapping to highlight annotations
    // whenever the detection mapping changes
    useEffect(() => {
        if (!detectionMapping || !detectionMapping.pages || detectionMapping.pages.length === 0) {
            return;
        }

        // Generate a unique ID for this detection batch
        const currentDetectionId = `detection-${Date.now()}`;
        setLastDetectionId(currentDetectionId);

        // First, clear existing entity highlights only if this is a new detection
        if (lastDetectionId !== currentDetectionId) {
            clearAnnotationsByType(HighlightType.ENTITY);
        }

        // Convert detection results to highlights
        detectionMapping.pages.forEach(page => {
            const pageNumber = page.page;

            if (page.sensitive && Array.isArray(page.sensitive)) {
                page.sensitive.forEach(entity => {
                    if (entity.bbox) {
                        // Create a highlight rect from the entity
                        const highlight: HighlightRect = {
                            id: getNextHighlightId(),
                            page: pageNumber,
                            x: entity.bbox.x0 || 0,
                            y: entity.bbox.y0 || 0,
                            w: (entity.bbox.x1 || 0) - (entity.bbox.x0 || 0),
                            h: (entity.bbox.y1 || 0) - (entity.bbox.y0 || 0),
                            color: getColorForModel(entity.model || 'default'),
                            opacity: 0.4,
                            type: HighlightType.ENTITY,
                            entity: entity.entity_type || 'Unknown',
                            text: entity.content || '',
                        };

                        // Add the highlight to the HighlightContext
                        addAnnotation(pageNumber, highlight);
                    }
                });
            }
        });
    }, [detectionMapping, addAnnotation, clearAnnotationsByType, getNextHighlightId, lastDetectionId]);

    // Helper function to get color based on the model using the user's custom colors
    const getColorForModel = (model: string): string => {
        switch (model.toLowerCase()) {
            case 'presidio':
                return presidioColor;
            case 'gliner':
                return glinerColor;
            case 'gemini':
                return geminiColor;
            default:
                return glinerColor; // Default color
        }
    };

    // Run detection with selected entities
    const handleDetect = async () => {
        if (!file) return;

        try {
            setIsDetecting(true);

            // Clear existing entity highlights
            clearAnnotationsByType(HighlightType.ENTITY);

            let mappingAi = null;
            let mappingMl = null;
            let mappingGliner = null;

            // Run AI detection if entities are selected
            if (selectedAiEntities.length > 0) {
                console.log('Running Gemini AI detection with entities:', selectedAiEntities.map(e => e.value));
                mappingAi = await runDetectAi(file, selectedAiEntities.map(e => e.value));
                console.log('Gemini AI detection mapping:', mappingAi);

                // Mark these entities as from Gemini
                if (mappingAi?.pages) {
                    mappingAi.pages.forEach(page => {
                        page.sensitive.forEach(entity => {
                            entity.model = 'gemini';
                        });
                    });
                }
            }

            // Run Presidio ML detection if entities are selected
            if (selectedMlEntities.length > 0) {
                console.log('Running Presidio ML detection with entities:', selectedMlEntities.map(e => e.value));
                mappingMl = await runDetectMl(file, selectedMlEntities.map(e => e.value));
                console.log('Presidio ML detection mapping:', mappingMl);

                // Mark these entities as from Presidio
                if (mappingMl?.pages) {
                    mappingMl.pages.forEach(page => {
                        page.sensitive.forEach(entity => {
                            entity.model = 'presidio';
                        });
                    });
                }
            }

            // Run Gliner ML detection if entities are selected
            if (selectedGlinerEntities.length > 0) {
                console.log('Running Gliner ML detection with entities:', selectedGlinerEntities.map(e => e.value));
                mappingGliner = await runDetectGliner(file, selectedGlinerEntities.map(e => e.label.toLowerCase()));
                console.log('Gliner ML detection mapping:', mappingGliner);

                // Mark these entities as from Gliner
                if (mappingGliner?.pages) {
                    mappingGliner.pages.forEach(page => {
                        page.sensitive.forEach(entity => {
                            entity.model = 'gliner';
                        });
                    });
                }
            }

            // We'll set a fresh detection mapping to trigger the useEffect
            // that will convert these to highlights
            const newMapping = { pages: [] as any[] };

            // Function to add pages from a detection result
            const addPagesToMerged = (mapping: any) => {
                if (!mapping) return;

                let pages = [];
                if (mapping.pages && Array.isArray(mapping.pages)) {
                    pages = mapping.pages;
                } else if ((mapping as any).redaction_mapping?.pages) {
                    pages = (mapping as any).redaction_mapping.pages;
                }

                // Add to merged pages
                if (pages.length > 0) {
                    newMapping.pages = newMapping.pages.concat(pages);
                }
            };

            // Add pages from each detection method
            addPagesToMerged(mappingMl);
            addPagesToMerged(mappingGliner);
            addPagesToMerged(mappingAi);

            // Update detection mapping - this will trigger the useEffect
            // to create highlights
            setDetectionMapping(newMapping);
            console.log('New detection mapping:', newMapping);
        } catch (error) {
            console.error('Error during entity detection:', error);
            alert('An error occurred during entity detection. Please try again.');
        } finally {
            setIsDetecting(false);
        }
    };

    // Reset selected entities and clear detection results
    const handleReset = () => {
        setSelectedAiEntities([]);
        setSelectedMlEntities([]);
        setSelectedGlinerEntities([]);
        setDetectionMapping(null);
        clearAnnotationsByType(HighlightType.ENTITY);
    };

    // Reset highlight colors to defaults
    const handleResetColors = () => {
        setPresidioColor('#ffd771');
        setGlinerColor('#ff7171');
        setGeminiColor('#7171ff');
    };

    return (
        <div className="entity-detection-sidebar">
            <div className="sidebar-header">
                <h3>Entity Detection</h3>
            </div>

            <div className="sidebar-content">
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
                        isDisabled={isDetecting}
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
                        isDisabled={isDetecting}
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
                        isDisabled={isDetecting}
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                    />
                </div>

                {/* New section for highlight color customization */}
                <div className="sidebar-section">
                    <h4>Highlight Colors</h4>
                    <div className="color-picker-section">
                        <div className="color-picker-item">
                            <label htmlFor="presidio-color">Presidio:</label>
                            <div className="color-picker-input-wrapper">
                                <input
                                    type="color"
                                    id="presidio-color"
                                    value={presidioColor}
                                    onChange={(e) => setPresidioColor(e.target.value)}
                                    className="color-picker-input"
                                />
                                <div className="color-preview" style={{ backgroundColor: presidioColor }}></div>
                            </div>
                        </div>

                        <div className="color-picker-item">
                            <label htmlFor="gliner-color">Gliner:</label>
                            <div className="color-picker-input-wrapper">
                                <input
                                    type="color"
                                    id="gliner-color"
                                    value={glinerColor}
                                    onChange={(e) => setGlinerColor(e.target.value)}
                                    className="color-picker-input"
                                />
                                <div className="color-preview" style={{ backgroundColor: glinerColor }}></div>
                            </div>
                        </div>

                        <div className="color-picker-item">
                            <label htmlFor="gemini-color">Gemini:</label>
                            <div className="color-picker-input-wrapper">
                                <input
                                    type="color"
                                    id="gemini-color"
                                    value={geminiColor}
                                    onChange={(e) => setGeminiColor(e.target.value)}
                                    className="color-picker-input"
                                />
                                <div className="color-preview" style={{ backgroundColor: geminiColor }}></div>
                            </div>
                        </div>
                    </div>
                    <button
                        className="sidebar-button secondary-button reset-colors-button"
                        onClick={handleResetColors}
                    >
                        Reset Colors
                    </button>
                </div>

                <div className="sidebar-section button-group">
                    <button
                        className="sidebar-button primary-button"
                        onClick={handleDetect}
                        disabled={isDetecting || !file || (selectedMlEntities.length === 0 && selectedAiEntities.length === 0 && selectedGlinerEntities.length === 0)}
                    >
                        {isDetecting ? 'Detecting...' : 'Detect Entities'}
                    </button>

                    <button
                        className="sidebar-button secondary-button"
                        onClick={handleReset}
                        disabled={isDetecting || (selectedMlEntities.length === 0 && selectedAiEntities.length === 0 && selectedGlinerEntities.length === 0 && !detectionMapping)}
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EntityDetectionSidebar;
