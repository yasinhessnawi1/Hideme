import React, { useState } from 'react';
import Select from 'react-select';
import { usePDFContext, OptionType } from '../../contexts/PDFContext';
import { useHighlightContext, HighlightType } from '../../contexts/HighlightContext';
import { usePDFApi } from '../../hooks/usePDFApi';
import '../../styles/pdf/SettingsSidebar.css';

// Presidio ML entity options (renamed from mlOptions)
const presidioOptions: OptionType[] = [
    { value: 'CREDIT_CARD', label: 'Credit Card' },
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
    { value: 'HEALTH_INSURANCE_ID_NUMBER', label: 'Health Insurance ID' },
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

    const {
        clearAnnotationsByType
    } = useHighlightContext();

    // Update API hook to include new model
    const { loading, error, runDetectAi, runDetectMl, runDetectGliner } = usePDFApi();

    const [isDetecting, setIsDetecting] = useState(false);

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

            // Merge results from all detection methods
            let mergedMapping = { pages: [] as any[] };

            // Function to add pages from a detection result
            const addPagesToMerged = (mapping: any, modelName: string) => {
                if (!mapping) return;

                let pages = [];
                if (mapping.pages && Array.isArray(mapping.pages)) {
                    pages = mapping.pages;
                } else if ((mapping as any).redaction_mapping?.pages) {
                    pages = (mapping as any).redaction_mapping.pages;
                }

                // Add to merged pages
                if (pages.length > 0) {
                    mergedMapping.pages = mergedMapping.pages.concat(pages);
                }
            };

            // Add pages from each detection method
            addPagesToMerged(mappingMl, 'presidio');
            addPagesToMerged(mappingGliner, 'gliner');
            addPagesToMerged(mappingAi, 'gemini');

            // Update detection mapping
            setDetectionMapping(mergedMapping);
            console.log('Merged detection mapping:', mergedMapping);
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
                    />
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
