// src/services/BatchApiService.ts
import { apiRequest } from './apiService';
import { RedactionMapping } from '../types/types';
import { getFileKey } from '../contexts/PDFViewerContext';
import {createRedactionRequest} from "../utils/redactionUtils";
import JSZip from 'jszip';

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
 * Sends multiple PDFs for batch redaction
 * @param files Array of PDF files to redact
 * @param redactionMappings Mapping of file keys to redaction mappings
 * @param removeImages Remove images
 * @returns Promise with blob objects for redacted PDFs
 */
export async function batchRedactPdfs(
    files: File[],
    redactionMappings: Record<string, RedactionMapping>,
    removeImages: boolean = false
): Promise<Record<string, Blob>> {
    if (files.length === 0) {
        return {};
    }


    // Create the redaction request object
    const redactionRequest = createRedactionRequest(files, redactionMappings);

    // Create FormData object to send files and redaction request
    const formData = new FormData();
    if (removeImages) {
        formData.append( 'remove_images', String(removeImages));
    }
    // Add each file to the FormData with a unique identifier
    files.forEach(file => {
        formData.append('files', file, file.name);

    });

    // Add the redaction request as JSON
    formData.append('redaction_mappings', JSON.stringify(redactionRequest));

    // Send request to the API
    const response = await fetch(`${API_BASE_URL}/batch/redact`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Batch redaction failed: ${errorText}`);
    }

    // The API should return a ZIP file containing all redacted PDFs
    const zipBlob = await response.blob();

    // Process the ZIP file to extract individual PDFs
    return processRedactionZip(zipBlob, files);
}

/**
 * Process a ZIP file containing redacted PDFs
 * @param zipBlob The ZIP file blob from the API
 * @param originalFiles The original files that were redacted
 * @returns Record mapping file keys to redacted file blobs
 */
async function processRedactionZip(zipBlob: Blob, originalFiles: File[]): Promise<Record<string, Blob>> {
    // JSZip is imported at the top of the file

    try {
        // Load the ZIP file
        const zip = await JSZip.loadAsync(zipBlob);

        // Map to store redacted file blobs by file key
        const redactedFiles: Record<string, Blob> = {};

        // Process each file in the ZIP
        const fileProcessingPromises = Object.keys(zip.files).map(async (zipPath) => {
            // Skip directories
            if (zip.files[zipPath].dir) {
                return;
            }

            // Get the file name from the path
            const fileName = zipPath.split('/').pop() || '';

            // Check if this is a PDF file
            if (!fileName.toLowerCase().endsWith('.pdf')) {
                return;
            }

            // Get the file content as a blob
            const fileBlob = await zip.files[zipPath].async('blob');

            // Determine which original file this corresponds to
            // We'll match by name, ignoring any redacted suffix
            const baseName = fileName.replace('redacted.pdf', '.pdf');

            const matchingFile = originalFiles.find(file =>
                file.name === baseName || file.name === fileName
            );

            if (matchingFile) {
                const fileKey = getFileKey(matchingFile);
                redactedFiles[fileKey] = fileBlob;
            }
        });

        // Wait for all files to be processed
        await Promise.all(fileProcessingPromises);

        return redactedFiles;
    } catch (error) {
        console.error('Error processing redaction ZIP file:', error);
        throw new Error('Failed to process redacted files');
    }
}
