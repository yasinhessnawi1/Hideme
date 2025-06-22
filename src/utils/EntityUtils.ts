/**
 * entityUtils.ts
 * --------------------------------------------
 * Shared utilities for entity detection functionality
 * Used by both the EntityDetectionSidebar and EntitySettings components
 */

import {OptionType} from '../types';

// ======= SHARED ENTITY MODEL OPTIONS =======

// Entity keys for each model
export const PRESIDIO_ENTITY_KEYS = [
    { value: 'ALL_PRESIDIO', key: 'allPresidioEntities' },
    { value: 'PERSON_P', key: 'person' },
    { value: 'DATE_TIME_P', key: 'dateTime' },
    { value: 'EMAIL_ADDRESS_P', key: 'emailAddress' },
    { value: 'IBAN_CODE_P', key: 'iban' },
    { value: 'IP_ADDRESS_P', key: 'ipAddress' },
    { value: 'LOCATION_P', key: 'location' },
    { value: 'MEDICAL_LICENSE_P', key: 'medicalLicense' },
    { value: 'URL_P', key: 'url' },
    { value: 'NO_ADDRESS_P', key: 'address' },
    { value: 'NO_PHONE_NUMBER_P', key: 'phone' },
    { value: 'NO_FODSELSNUMMER_P', key: 'id' },
    { value: 'NO_BANK_ACCOUNT_P', key: 'bankAccount' },
    { value: 'NO_LICENSE_PLATE_P', key: 'licensePlate' },
    { value: 'CRYPTO_P', key: 'cryptoWallet' },
];

export const GLINER_ENTITY_KEYS = [
    { value: 'ALL_GLINER', key: 'allGlinerEntities' },

    // Enhanced person detection entities
    { value: 'person', key: 'person' },

    // Core entities
    { value: 'location', key: 'location' },
    { value: 'date', key: 'date' },
    { value: 'organization', key: 'organization' },
    { value: 'phone number', key: 'phoneNumber' },
    { value: 'address', key: 'address' },
    { value: 'email', key: 'emailAddress' },


    // Norwegian medical entities
    { value: 'medical_condition_norwegian', key: 'medicalConditionNorwegian' },
    { value: 'medication_norwegian', key: 'medicationNorwegian' },
    { value: 'anatomical_structure_norwegian', key: 'anatomicalStructureNorwegian' },
    { value: 'medical_procedure_norwegian', key: 'medicalProcedureNorwegian' },
    { value: 'health_provider_norwegian', key: 'healthProviderNorwegian' },

    // Financial and identification
    { value: 'passport number', key: 'passportNumber' },
    { value: 'credit card number', key: 'creditCardNumber' },
    { value: 'date of birth', key: 'dateOfBirth' },
    { value: 'bank account number', key: 'bankAccountNumber' },
    { value: 'tax identification number', key: 'taxIdentificationNumber' },
    { value: 'identity card number', key: 'identityCardNumber' },
    { value: 'national id number', key: 'nationalIdNumber' },
    { value: 'insurance number', key: 'insuranceNumber' },
    { value: 'license plate number', key: 'licensePlateNumber' },

    // Technical identifiers
    { value: 'ip address', key: 'ipAddress' },
    { value: 'iban', key: 'iban' },
    { value: 'username', key: 'username' },
    { value: 'social media handle', key: 'socialMediaHandle' },
    { value: 'registration number', key: 'registrationNumber' },
    { value: 'student id number', key: 'studentIdNumber' },
    { value: 'vehicle registration number', key: 'vehicleRegistrationNumber' },
    { value: 'fax number', key: 'faxNumber' },
    { value: 'visa number', key: 'visaNumber' },
    { value: 'postal code', key: 'postalCode' },

    // Medical (standard)
    { value: 'medication', key: 'medication' },
    { value: 'medical condition', key: 'medicalCondition' },

    // Temporal
    { value: 'credit card expiration date', key: 'creditCardExpirationDate' },


];

export const GEMINI_ENTITY_KEYS = [
    { value: 'ALL_GEMINI', key: 'allGeminiEntities' },
    { value: 'PERSON-G', key: 'person' },
    { value: 'ORGANIZATION-G', key: 'organization' },
    { value: 'PHONE-G', key: 'phone' },
    { value: 'EMAIL-G', key: 'emailAddress' },
    { value: 'ADDRESS-G', key: 'address' },
    { value: 'LOCATION-G', key: 'location' },
    { value: 'DATE-G', key: 'date' },
    { value: 'NATIONAL_ID-G', key: 'nationalId' },
    { value: 'FINANCIAL_INFO-G', key: 'financial' },
    { value: 'AGE-G', key: 'age' },
    { value: 'HEALTH-G', key: 'health' },
    { value: 'CRIMINAL-G', key: 'criminal' },
    { value: 'SEXUAL-G', key: 'sexual' },
    { value: 'RELIGIOUS_BELIEF-G', key: 'religiousBelief' },
    { value: 'POLITICAL_AFFILIATION-G', key: 'politicalAffiliation' },
    { value: 'TRADE_UNION-G', key: 'tradeUnion' },
    { value: 'BIOMETRIC_DATA-G', key: 'biometricData' },
    { value: 'GENETIC_DATA-G', key: 'geneticData' },
    { value: 'CONTEXT-G', key: 'context' },
];

export const HIDEME_ENTITY_KEYS = [
    { value: 'ALL_HIDEME', key: 'allHidemeEntities' },
    { value: 'PERSON-H', key: 'person' },
    { value: 'AGE-H', key: 'age' },
    { value: 'AGE_INFO-H', key: 'contextualAgeInformation' },
    { value: 'DATE_TIME-H', key: 'date' },
    { value: 'EMAIL_ADDRESS-H', key: 'emailAddress' },
    { value: 'GOV_ID-H', key: 'id' },
    { value: 'NO_ADDRESS-H', key: 'address' },
    { value: 'POSTAL_CODE-H', key: 'postalCode' },
    { value: 'NO_PHONE_NUMBER-H', key: 'phoneNumber' },
    { value: 'POLITICAL_CASE-H', key: 'politicalCases' },
    { value: 'BEHAVIORAL_PATTERN-H', key: 'behavioralPattern' },
    { value: 'CONTEXT_SENSITIVE-H', key: 'contextualInformation' },
    { value: 'CRIMINAL_RECORD-H', key: 'criminalRecord' },
    { value: 'ECONOMIC_STATUS-H', key: 'economicStatus' },
    { value: 'EMPLOYMENT_INFO-H', key: 'employmentInformation' },
    { value: 'FAMILY_RELATION-H', key: 'familyRelated' },
    { value: 'FINANCIAL_INFO-H', key: 'financialInformation' },
    { value: 'HEALTH_INFO-H', key: 'healthInformation' },
    { value: 'SEXUAL_ORIENTATION-H', key: 'sexualOrientation' },
    { value: 'ANIMAL_INFO-H', key: 'animalRelatedInformation' },
];

// Helper to build options with translation
export function buildEntityOptions(entityKeys: { value: string, key: string }[], t: (ns: string, key: string) => string): OptionType[] {
    return entityKeys.map(({ value, key }) => ({ value, label: t('entityDetection', key) }));
}

export const getPresidioOptions = (t: (ns: string, key: string) => string): OptionType[] => buildEntityOptions(PRESIDIO_ENTITY_KEYS, t);
export const getGlinerOptions = (t: (ns: string, key: string) => string): OptionType[] => buildEntityOptions(GLINER_ENTITY_KEYS, t);
export const getGeminiOptions = (t: (ns: string, key: string) => string): OptionType[] => buildEntityOptions(GEMINI_ENTITY_KEYS, t);
export const getHidemeOptions = (t: (ns: string, key: string) => string): OptionType[] => buildEntityOptions(HIDEME_ENTITY_KEYS, t);

// Define model colors for dots and other UI elements
export const MODEL_COLORS = {
    presidio: '#ffd771', // Yellow
    gliner: '#ff7171',   // Red
    gemini: '#7171ff',   // Blue
    hideme: '#71ffa0'    // Green
};

// Map model names to their method IDs for the API
export const METHOD_ID_MAP: { [key: string]: number } = {
    presidio: 1,
    gliner: 2,
    gemini: 3,
    hideme: 4
};

// ======= SHARED UI COMPONENTS =======

/**
 * Reusable component for displaying colored model indicators
 */
/**
 * Styling for the color dot used to indicate different models
 * This avoids using JSX in a TypeScript file
 */
export const getColorDotStyle = (color: string) => ({
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: color,
    marginRight: '8px',
    verticalAlign: 'middle'
});

// ======= SHARED UTILITY FUNCTIONS =======
/**
 * Handle selection of "ALL" options for entity selections
 * Serves two purposes:
 * 1. If all entities are selected, only show the "ALL" option in the UI
 * 2. When processing entity selections for API requests, properly handle "ALL" options
 *
 * @param selectedOptions Current selected options
 * @param allOptions All available options for this model
 * @param allOptionValue The value of the "ALL" option (e.g., "ALL_PRESIDIO_P")
 * @returns Processed options for display or API use
 */
export const handleAllOptions = (
    selectedOptions: OptionType[],
    allOptions: OptionType[],
    allOptionValue: string
): OptionType[] => {
    // Early return for empty selection
    if (!selectedOptions || selectedOptions.length === 0) {
        return [];
    }

    // Check if the "ALL" option is already selected
    const hasAllOption = selectedOptions.some(option => option.value === allOptionValue);
    if (hasAllOption) {
        // If "ALL" is selected, return only the "ALL" option
        const allOption = allOptions.find(option => option.value === allOptionValue);
        return allOption ? [allOption] : [];
    }

    // Get all options except the "ALL" option
    const individualOptions = allOptions.filter(option => option.value !== allOptionValue);

    // Count how many individual options are selected
    const selectedCount = selectedOptions.filter(option =>
        individualOptions.some(individual => individual.value === option.value)
    ).length;

    // If all individual options are selected, return only the "ALL" option
    if (selectedCount === individualOptions.length && selectedCount > 0) {
        const allOption = allOptions.find(option => option.value === allOptionValue);
        return allOption ? [allOption] : [];
    }

    // Otherwise, return the selected options as they are
    return selectedOptions;
};

/**
 * Prepare entity options for API request
 * Converts UI selections (including "ALL" options) to backend-compatible format
 *
 * @param selectedOptions The options selected in the UI
 * @param allOptionValue The value of the "ALL" option
 * @returns Array of entity values for the backend
 */
export const prepareEntitiesForApi = (
    selectedOptions: OptionType[],
    allOptionValue: string
): string[] => {
    // Handle empty selection
    if (!selectedOptions || selectedOptions.length === 0) {
        return [];
    }

    // Check if the "ALL" option is selected
    const hasAllOption = selectedOptions.some(option => option.value === allOptionValue);

    if (hasAllOption) {
        // If ALL is selected, return the ALL flag for the backend
        return [allOptionValue];
    }

    // Otherwise return individual entity values
    return selectedOptions.map(option => option.value);
};

/**
 * Creates a batch of model entities for API submission
 *
 * @param selectedEntities Array of selected entity options
 * @param methodId The method ID for the detection model
 * @returns EntityBatch ready for API submission
 */
export function createEntityBatch(selectedEntities: OptionType[], methodId: number) {
    return {
        method_id: methodId,
        entity_texts: selectedEntities
            .filter(entity => !entity.value.startsWith('ALL_')) // Filter out "ALL" options
            .map(entity => entity.value)
    };
}

/**
 * Converts a list of ModelEntity objects to OptionType objects for UI display
 *
 * @param entities The model entities from the API
 * @param availableOptions The available options for this model
 * @returns Array of OptionType objects for the UI
 */
export function entitiesToOptions(entities: string[], availableOptions: OptionType[]): OptionType[] {
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
        return [];
    }

    // Create a set of entity texts for faster lookups
    const entityTexts = new Set(entities.map(entity => entity.toLowerCase()));

    // Find matching options
    return availableOptions.filter(option => {
        const optionText = option.value.toLowerCase();
        return entityTexts.has(optionText) || optionText.startsWith('ALL_');
    });
}

// Helper to get translation key and model for an entity value
export function getEntityTranslationKeyAndModel(entityValue: string): { key: string | null, model: string | null } {
    // Check each model's entity keys
    for (const { value, key } of PRESIDIO_ENTITY_KEYS) {
        if (value === entityValue || key === entityValue) return { key, model: 'presidio' };
    }
    for (const { value, key } of GLINER_ENTITY_KEYS) {
        if (value === entityValue || key === entityValue) return { key, model: 'gliner' };
    }
    for (const { value, key } of GEMINI_ENTITY_KEYS) {
        if (value === entityValue || key === entityValue) return { key, model: 'gemini' };
    }
    for (const { value, key } of HIDEME_ENTITY_KEYS) {
        if (value === entityValue || key === entityValue) return { key, model: 'hideme' };
    }
    return { key: null, model: null };
}



