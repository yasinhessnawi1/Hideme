// src/services/BatchApiService.ts
import { apiRequest } from './apiService';
import { RedactionMapping } from '../types/types';
import { getFileKey } from '../contexts/PDFViewerContext';
import {createRedactionRequest} from "../utils/redactionUtils";
import JSZip from 'jszip';

// Base API URL - ensure this is consistent across services
const API_BASE_URL = 'https://api.hidemeai.com';
//const API_BASE_URL = 'http://localhost:8000';

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
        gliner?: string[] | null;
        gemini?: string[] | null;
        hideme?: string[] | null;
        threshold?: number;
        banlist?: string[] | null;
    } = {}
): Promise<Record<string, any>> => {
    try {
        const formData = new FormData();
        const entitySet = new Set<string>(); // Use a Set to prevent duplicates

        // Append all files to the formData
        files.forEach(file => {
            formData.append('files', file, file.name);
        });

        // Create helper function to check arrays properly
        const hasValidEntities = (arr: any[] | null | undefined): boolean => {
            return Array.isArray(arr) && arr.length > 0 && arr.some(item => !!item);
        };

        // Process engine options and entity lists
        // Presidio entities
        const hasPresidio = hasValidEntities(options.presidio);
        formData.append('use_presidio', hasPresidio ? "True" : "False");

        if (hasPresidio) {
            options.presidio!.forEach(entity => {
                if (entity) entitySet.add(entity);
            });
        }

        // Gliner entities
        const hasGliner = hasValidEntities(options.gliner);
        formData.append('use_gliner', hasGliner ? "True" : "False");

        if (hasGliner) {
            options.gliner!.forEach(entity => {
                if (entity) entitySet.add(entity);
            });
        }

        // Gemini entities
        const hasGemini = hasValidEntities(options.gemini);
        formData.append('use_gemini', hasGemini ? "True" : "False");

        if (hasGemini) {
            options.gemini!.forEach(entity => {
                if (entity) entitySet.add(entity);
            });
        }

        // Hide me AI entities
        const hasHideme = hasValidEntities(options.hideme);
        formData.append('use_hideme', hasHideme ? "True" : "False");

        if (hasHideme) {
            options.hideme!.forEach(entity => {
                if (entity) entitySet.add(entity);
            });
        }

        // Convert Set to Array for the requested entities
        const requestedEntities = Array.from(entitySet);

        // Add the requested entities to the form data
        formData.append('requested_entities', JSON.stringify(requestedEntities));

        // Add detection threshold if provided (value between 0.0 and 1.0)
        if (options.threshold !== undefined) {
            const threshold = Math.max(0, Math.min(1, options.threshold)); // Clamp between 0 and 1
            formData.append('detection_threshold', threshold.toString());
        }

        // Add banlist words if provided
        if (options.banlist && Array.isArray(options.banlist) && options.banlist.length > 0) {
            formData.append('remove_words', JSON.stringify(options.banlist));
        }

        // Log the request for debugging
        console.log('[BatchApiService] Sending entity detection request:', {
            files: files.length,
            use_presidio: hasPresidio,
            use_gliner: hasGliner,
            use_gemini: hasGemini,
            use_hideme: hasHideme,
            requestedEntities,
            threshold: options.threshold
        });

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
            const fileName = zipPath.split('/').pop() ?? '';

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

/**
 * Finds all occurrences of words matching a bounding box across multiple files
 * @param files Array of PDF files to search
 * @param boundingBox The bounding box coordinates of the word to find
 * @param selectedFiles Optional array of selected files to search within (if specified)
 * @returns Promise with batch find words results
 */
export const findWords = async (
    files: File[],
    boundingBox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    },
    selectedFiles?: File[]
): Promise<any> => {
    try {
        // Use selected files if provided, otherwise use all files
        const filesToSearch = selectedFiles && selectedFiles.length > 0 ? selectedFiles : files;

        if (filesToSearch.length === 0) {
            throw new Error('No files to search');
        }

        // Create FormData object to send files and bounding box
        const formData = new FormData();

        // Add each file to the FormData
        filesToSearch.forEach(file => {
            formData.append('files', file, file.name);
        });

        // Add the bounding box as JSON
        formData.append('bounding_box', JSON.stringify(boundingBox));

        // Log the request for debugging
        console.log('[BatchApiService] Sending find words request:', {
            files: filesToSearch.length,
            boundingBox
        });

        // Send the request to the API
        const result = await apiRequest<any>({
            method: 'POST',
            url: `${API_BASE_URL}/batch/find_words`,
            formData: formData,
        });

        console.log(`[BatchApiService] Find words completed. Found ${result.batch_summary.total_matches} matches across ${result.batch_summary.successful} files`);

        return result;
    } catch (error) {
        console.error('Batch Find Words API error:', error);
        throw error;
    }
}
