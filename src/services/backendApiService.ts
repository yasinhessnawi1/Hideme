import { RedactionMapping } from '../contexts/PDFContext';
import {ExtracteText} from "../types/pdfTypes";

// Base API URL - modify to match your actual backend API endpoint
const API_BASE_URL = 'https://api.hidemeai.com';

/**
 * Calls the AI-based entity detection API endpoint.
 *
 * @param file PDF file to analyze
 * @param entities Array of entity types to detect
 * @returns Parsed redaction mapping JSON
 */
export const detectAi = async (file: File, entities: string[]): Promise<any> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('requested_entities', JSON.stringify(entities));
        console.log('formData:', formData.get('entities'));

        const response = await fetch(`${API_BASE_URL}/ai/detect`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
                errorData?.message ||
                `AI detection failed with status ${response.status}: ${response.statusText}`
            );
        }

        return await response.json();
    } catch (error) {
        console.error('AI Detection API error:', error);
        throw error;
    }
};

/**
 * Calls the ML-based entity detection API endpoint.
 *
 * @param file PDF file to analyze
 * @param entities Array of entity types to detect
 * @returns Parsed redaction mapping JSON
 */
export const detectPresidio = async (file: File, entities: string[]): Promise<any> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('requested_entities', JSON.stringify(entities));

        const response = await fetch(`${API_BASE_URL}/ml/detect`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
                errorData?.message ||
                `ML detection failed with status ${response.status}: ${response.statusText}`
            );
        }

        return await response.json();
    } catch (error) {
        console.error('ML Detection API error:', error);
        throw error;
    }
};

/**
 * Calls the PDF redaction API endpoint.
 *
 * @param file Original PDF file
 * @param redactionMapping Mapping data for redactions
 * @returns A Blob representing the redacted PDF
 */
export const redactPdf = async (file: File, redactionMapping: RedactionMapping): Promise<Blob> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('redaction_mapping', JSON.stringify(redactionMapping));

        // Log the redaction mapping for debugging
        console.log('Sending redaction mapping to backend:', JSON.stringify(redactionMapping, null, 2));

        const response = await fetch(`${API_BASE_URL}/pdf/redact`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Redaction failed with status ${response.status}: ${errorText}`);
        }

        return await response.blob();
    } catch (error) {
        console.error('Redaction API error:', error);
        throw error;
    }
};

/**
 * Normalizes a redaction mapping to ensure consistent format.
 *
 * @param mapping The raw redaction mapping from detection endpoints
 * @returns Normalized redaction mapping
 */
export const normalizeRedactionMapping = (mapping: any): RedactionMapping => {
    // Handle different response formats from the API
    if (mapping.redaction_mapping) {
        return mapping.redaction_mapping as RedactionMapping;
    }

    if (mapping.pages) {
        return mapping as RedactionMapping;
    }

    // If the mapping has an unexpected format, return an empty mapping
    console.warn('Received unexpected redaction mapping format:', mapping);
    return { pages: [] };
};



/**
 * Calls the PDF redaction API endpoint.
 *
 * @param file Original PDF file
 * @param redactionMapping Mapping data for redactions
 * @returns A Blob representing the redacted PDF
 */
export const extractText = async (file: File): Promise<ExtracteText> => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        // Log the redaction mapping for debugging
        const response = await fetch(`${API_BASE_URL}/pdf/extract`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Extraction failed with status ${response.status}: ${errorText}`);
        }
        let textMapping = await response.json();
        if (textMapping.pages) {
            return await textMapping;
        }
        console.warn('Received unexpected extraction format:', textMapping);

        return textMapping;
    } catch (error) {
        console.error('Extraction API error:', error);
        throw error;
    }
};

/**
 * Calls the ML-based entity detection API endpoint.
 *
 * @param file PDF file to analyze
 * @param entities Array of entity types to detect
 * @returns Parsed redaction mapping JSON
 */
export const detectGliner = async (file: File, entities: string[]): Promise<any> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('requested_entities', JSON.stringify(entities));
        console.log('formData:', formData.get('requested_entities'));

        const response = await fetch(`${API_BASE_URL}/ml/gl_detect`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
                errorData?.message ||
                `ML detection failed with status ${response.status}: ${response.statusText}`
            );
        }

        return await response.json();
    } catch (error) {
        console.error('ML Detection API error:', error);
        throw error;
    }
};
