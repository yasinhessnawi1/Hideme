/**
 * entityUtils.ts
 * --------------------------------------------
 * Shared utilities for entity detection functionality
 * Used by both the EntityDetectionSidebar and EntitySettings components
 */

import React from 'react';
import { OptionType } from '../types/types';
import { ModelEntity } from '../types';

// ======= SHARED ENTITY MODEL OPTIONS =======

// Presidio ML entity options
export const presidioOptions: OptionType[] = [
    { value: 'ALL_PRESIDIO_P', label: 'All Presidio Entities' },
    { value: 'PERSON_P', label: 'Person' },
    { value: 'DATE_TIME_P', label: 'Date/Time' },
    { value: 'EMAIL_ADDRESS_P', label: 'Email Address' },
    { value: 'IBAN_CODE_P', label: 'IBAN' },
    { value: 'IP_ADDRESS_P', label: 'IP Address' },
    { value: 'NO_COMPANY_NUMBER_P', label: 'Org number' },
    { value: 'LOCATION_P', label: 'Location' },
    { value: 'MEDICAL_LICENSE_P', label: 'Medical License' },
    { value: 'URL_P', label: 'URL' },
    { value: 'NO_ADDRESS_P', label: 'Address' },
    { value: 'NO_PHONE_NUMBER_P', label: 'Phone' },
    { value: 'NO_FODSELSNUMMER_P', label: 'ID' },
    { value: 'NO_BANK_ACCOUNT_P', label: 'Bank account' },
    { value: 'NO_LICENSE_PLATE_P', label: 'License plate' },
    { value: 'ORGANIZATION_P', label: 'Organization' },
    { value: 'CRYPTO_P', label: 'Crypto Wallet' },
];

// Gliner ML entity options
export const glinerOptions: OptionType[] = [
    { value: 'ALL_GLINER', label: 'All Gliner Entities' },
    { value: 'person', label: 'Person' },
    { value: 'location', label: 'Location' },
    { value: 'date', label: 'Date' },
    { value: 'organization', label: 'Organization' },
    { value: 'phone number', label: 'Phone Number' },
    { value: 'address', label: 'Address' },
    { value: 'passport number', label: 'Passport Number' },
    { value: 'email', label: 'Email' },
    { value: 'credit card number', label: 'Credit Card Number' },
    { value: 'date of birth', label: 'Date of Birth' },
    { value: 'bank account number', label: 'Bank Account Number' },
    { value: 'medication', label: 'Medication' },
    { value: 'tax identification number', label: 'Tax Identification Number' },
    { value: 'medical condition', label: 'Medical Condition' },
    { value: 'identity card number', label: 'Identity Card Number' },
    { value: 'national id number', label: 'National ID Number' },
    { value: 'ip address', label: 'IP Address' },
    { value: 'iban', label: 'IBAN' },
    { value: 'credit card expiration date', label: 'Credit Card Expiration Date' },
    { value: 'username', label: 'Username' },
    { value: 'registration number', label: 'Registration Number' },
    { value: 'student id number', label: 'Student ID Number' },
    { value: 'insurance number', label: 'Insurance Number' },
    { value: 'social media handle', label: 'Social Media Handle' },
    { value: 'license plate number', label: 'License Plate Number' },
    { value: 'postal code', label: 'Postal Code' },
    { value: 'vehicle registration number', label: 'Vehicle Registration Number' },
    { value: 'fax number', label: 'Fax Number' },
    { value: 'visa number', label: 'Visa Number' },
    { value: 'passport_number', label: 'Passport_number' },
];

// Gemini AI entity options
export const geminiOptions: OptionType[] = [
    { value: 'ALL_GEMINI', label: 'All Gemini Entities' },
    { value: 'PERSON-G', label: 'Person' },
    { value: 'ORGANIZATION-G', label: 'Organization' },
    { value: 'PHONE-G', label: 'Phone' },
    { value: 'EMAIL-G', label: 'Email' },
    { value: 'ADDRESS-G', label: 'Address' },
    { value: 'LOCATION-G', label: 'Location' },
    { value: 'DATE-G', label: 'Date' },
    { value: 'NATIONAL_ID-G', label: 'National ID' },
    { value: 'FINANCIAL_INFO-G', label: 'Financial' },
    { value: 'AGE-G', label: 'Age' },
    { value: 'HEALTH-G', label: 'Health' },
    { value: 'CRIMINAL-G', label: 'Criminal' },
    { value: 'SEXUAL-G', label: 'Sexual' },
    { value: 'RELIGIOUS_BELIEF-G', label: 'Religious Belief' },
    { value: 'POLITICAL_AFFILIATION-G', label: 'Political Affiliation' },
    { value: 'TRADE_UNION-G', label: 'Trade Union' },
    { value: 'BIOMETRIC_DATA-G', label: 'Biometric Data' },
    { value: 'GENETIC_DATA-G', label: 'Genetic Data' },
    { value: 'CONTEXT-G', label: 'Context' },
];

// New! Hide me AI entity options
export const hidemeOptions: OptionType[] = [
    { value: 'ALL_HIDEME', label: 'All Hide me AI Entities' },
    { value: 'PERSON-H', label: 'Person' },
    { value: 'ORGANIZATION-H', label: 'Organization' },
    { value: 'CONTACT-H', label: 'Contact Information' },
    { value: 'ADDRESS-H', label: 'Address' },
    { value: 'LOCATION-H', label: 'Location' },
    { value: 'DATE-H', label: 'Date' },
    { value: 'ID-H', label: 'Identification' },
    { value: 'FINANCIAL-H', label: 'Financial Data' },
    { value: 'MEDICAL-H', label: 'Medical Information' },
    { value: 'CREDENTIAL-H', label: 'Credentials' },
    { value: 'CUSTOM-H', label: 'Custom Entity' },
];

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

// Reverse map for looking up model names from method IDs
export const METHOD_ID_REVERSE_MAP: { [key: number]: string } = {
    1: 'presidio',
    2: 'gliner',
    3: 'gemini',
    4: 'hideme'
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

/**
 * Get the appropriate options array for a specific model
 *
 * @param modelName The name of the model
 * @returns The options array for the model
 */
export function getOptionsForModel(modelName: string): OptionType[] {
    switch (modelName) {
        case 'presidio':
            return presidioOptions;
        case 'gliner':
            return glinerOptions;
        case 'gemini':
            return geminiOptions;
        case 'hideme':
            return hidemeOptions;
        default:
            return [];
    }
}

/**
 * Convert selected entity options to backend ModelEntity format
 * Prepares entity data for saving to settings
 *
 * @param selectedEntities Map of model names to selected entity options
 * @returns Array of entities ready for saving
 */
export function prepareEntitiesToSave(selectedEntities: {
    [modelName: string]: OptionType[]
}): { method_id: number; entity_text: string }[] {
    const entities: { method_id: number; entity_text: string }[] = [];

    // Process each model's selections
    Object.entries(selectedEntities).forEach(([modelName, options]) => {
        const methodId = METHOD_ID_MAP[modelName];
        if (!methodId) return;

        // Add each entity with the correct method ID
        options
            .filter(opt => !opt.value.startsWith('ALL_')) // Filter out "ALL_" options
            .forEach(option => {
                entities.push({
                    method_id: methodId,
                    entity_text: option.value
                });
            });
    });

    return entities;
}
