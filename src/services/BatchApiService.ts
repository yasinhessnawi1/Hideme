// src/services/BatchApiService.ts
import { apiRequest } from './apiService';
import { RedactionMapping } from '../types/types';
import { getFileKey } from '../contexts/PDFViewerContext';

// Base API URL - ensure this is consistent across services
const API_BASE_URL = 'http://localhost:8000';

/**
 * Calls the batch hybrid detection API endpoint.
 * Combined service to handle multiple detection engines in one request.
 *
 * @param files Array of PDF files to process for entity detection
 * @param options Object containing detection options for different models
 * @returns Response with batch_summary and file_results properties
 */
export const batchHybridDetect = async (
    files: File[],
    options: {
        presidio?: string[] | null;
        gliner?: string[]| null;
        gemini?: string[]| null;
    } = {}
): Promise<Record<string, any>> => {
    try {
        const formData = new FormData();
        let requested_entities  = new Array<string>();
        // Append all files to the formData
        files.forEach(file => {
            formData.append('files', file, file.name);
        });

        // Add entity options for each model
        if (options.presidio && Array.isArray(options.presidio) && options.presidio.length > 0) {
            options.presidio.forEach(
                entity => requested_entities.push(entity)
            );
            formData.append('use_presidio', "True")
        }else{
            formData.append('use_presidio', "False")
        }

        if (options.gliner && Array.isArray(options.gliner) && options.gliner.length > 0) {
            options.gliner.forEach(
                entity => requested_entities.push(entity)
            );
            formData.append('use_gliner', "True")

        }

        if (options.gemini && Array.isArray(options.gemini) && options.gemini.length > 0) {
            options.gemini.forEach(
                entity => requested_entities.push(entity)
            );
            formData.append('use_gemini', "True")

        }
        // Add the requested entities to the form data


        formData.append('requested_entities', JSON.stringify(requested_entities));

        const result = await apiRequest<any>({
            method: 'POST',
            url: `${API_BASE_URL}/batch/hybrid_detect`,
            formData: formData,
        });

        // Validate the response format
        if (!result.file_results || !Array.isArray(result.file_results)) {
            throw new Error('Invalid batch hybrid detection response format');
        }

        // Create a mapping of fileKey -> detection results
        const detectionResultsMap: Record<string, any> = {};

        // Process each file result
        result.file_results.forEach((fileResult: {
            file: string;
            status: string;
            results: any;
            error: string;
        }) => {
            if (fileResult.status === 'success' && fileResult.results) {
                // Use the filename as the fileKey for simplicity
                detectionResultsMap[fileResult.file] = fileResult.results;
            }
        });

        return detectionResultsMap;
    } catch (error) {
        console.error('Batch Hybrid Detection API error:', error);
        throw error;
    }
}

/**
 * Calls the batch redaction endpoint for multiple files.
 *
 * @param files Array of PDF files to redact
 * @param redactionMappings Mapping of fileKeys to RedactionMapping objects
 * @returns Mapping of fileKeys to redacted PDF Blobs
 */
export const batchRedactPdfs = async (
    files: File[],
    redactionMappings: Record<string, RedactionMapping>
): Promise<Record<string, Blob>> => {
    try {
        const formData = new FormData();

        // Maps for lookups by name
        const filesByName = new Map<string, File>();
        const mappingArray: RedactionMapping[] = [];

        // Process files and prepare mappings
        files.forEach(file => {
            const fileKey = getFileKey(file);
            const mapping = redactionMappings[fileKey];

            if (mapping) {
                formData.append('files', file, file.name);
                filesByName.set(file.name, file);
                mappingArray.push(mapping);
            }
        });

        if (mappingArray.length === 0) {
            throw new Error('No files with valid redaction mappings');
        }

        // Add redaction mappings as JSON
        formData.append('redaction_mappings', JSON.stringify(mappingArray));

        const response = await apiRequest<any>({
            method: 'POST',
            url: `${API_BASE_URL}/batch/redact`,
            formData: formData,
            responseType: 'json'
        });

        // Process the results
        const redactedPdfs: Record<string, Blob> = {};

        if (!response.file_results || !Array.isArray(response.file_results)) {
            throw new Error('Invalid batch redaction response format');
        }

        // Process each file result
        for (const fileResult of response.file_results) {
            if (fileResult.status !== 'success' || !fileResult.file || !fileResult.data) {
                continue;
            }

            const fileName = fileResult.file;
            const file = filesByName.get(fileName);

            if (!file) continue;

            const fileKey = getFileKey(file);
            const binaryData = atob(fileResult.data);

            // Convert base64 to Blob
            const bytes = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
                bytes[i] = binaryData.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: 'application/pdf' });
            redactedPdfs[fileKey] = blob;
        }

        return redactedPdfs;
    } catch (error) {
        console.error('Batch Redaction API error:', error);
        throw error;
    }
}
