// Modified BatchApiService.ts
import {apiRequest} from '../api-services/apiService';
import {RedactionMapping} from '../../types';
import {getFileKey} from '../../contexts/PDFViewerContext';
import {createRedactionRequest} from "../../utils/redactionUtils";
import JSZip from 'jszip';
import batchEncryptionService from '../api-services/batchEncryptionService';
import authService from '../database-backend-services/authService';
import {mapBackendErrorToMessage} from '../../utils/errorUtils';

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
        // Ensure encryption service is initialized
        await batchEncryptionService.ensureInitialized(authService.createApiKey.bind(authService));
        console.log('[BatchApiService] Encryption service initialized:', batchEncryptionService);

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
            formData.append('threshold', threshold.toString());
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

        // Encrypt required fields: files, requested_entities, remove_words
        const fieldsToEncrypt = ['files', 'requested_entities', 'remove_words'];
        const encryptedFormData = await batchEncryptionService.prepareEncryptedFormData(
            formData,
            fieldsToEncrypt
        );

        // Ensure encryption service is initialized
        await batchEncryptionService.ensureInitialized(authService.createApiKey.bind(authService));
        console.log('[BatchApiService] Encryption service initialized:', batchEncryptionService);
        // Get authentication headers
        console.log('[BatchApiService] Calling getAuthHeaders');
        const authHeaders = batchEncryptionService.getAuthHeaders();

        // Make API request with encrypted data
        const encryptedResponse = await apiRequest<any>({
            method: 'POST',
            url: `${API_BASE_URL}/batch/hybrid_detect`,
            formData: encryptedFormData,
            headers: authHeaders,
        });

        // Decrypt response if it's encrypted
        let result = encryptedResponse;
        if (encryptedResponse.encrypted_data) {
            result = await batchEncryptionService.decrypt(encryptedResponse.encrypted_data);
        }

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
    } finally {
        // Clean up the API key after operation completes (success or error)
        try {
            await batchEncryptionService.cleanup();
        } catch (cleanupError) {
            console.warn('[BatchApiService] Error during API key cleanup:', cleanupError);
        }
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

    try {
        console.log('[BatchApiService] Starting batch redaction for', files.length, 'files');

        // Ensure encryption service is initialized
        await batchEncryptionService.ensureInitialized(authService.createApiKey.bind(authService));

        // Create the redaction request object using utility function
        const redactionRequest = createRedactionRequest(files, redactionMappings);
        console.log('[BatchApiService] Created redaction request with',
            redactionRequest.file_results?.length, 'file results');

        // Create FormData object to send files and redaction request
        const formData = new FormData();
        if (removeImages) {
            formData.append('remove_images', String(removeImages));
        }

        // Add each file to the FormData with its original filename
        files.forEach(file => {
            console.log(`[BatchApiService] Adding file to request: ${file.name} (${file.size} bytes)`);
            formData.append('files', file, file.name);
        });

        // Add the redaction request as JSON
        const redactionMappingsJson = JSON.stringify(redactionRequest);
        formData.append('redaction_mappings', redactionMappingsJson);

        // Log request details for debugging
        console.log('[BatchApiService] Redaction request structure:',
            `${redactionRequest.file_results.length} files,`,
            `Total mapping JSON size: ${redactionMappingsJson.length} characters`);

        // Encrypt required fields: files, redaction_mappings
        const fieldsToEncrypt = ['files', 'redaction_mappings'];
        const encryptedFormData = await batchEncryptionService.prepareEncryptedFormData(
            formData,
            fieldsToEncrypt
        );

        // Get authentication headers
        const authHeaders = batchEncryptionService.getAuthHeaders();

        // Send request to the API with encrypted data
        const response = await fetch(`${API_BASE_URL}/batch/redact`, {
            method: 'POST',
            body: encryptedFormData,
            headers: authHeaders,
        });

        if (!response.ok) {
            // Handle 401 (Unauthorized) and 429 (Too Many Requests) by logging out the user
            if (response.status === 401 || response.status === 429) {
                console.warn(`[BatchApiService] Received ${response.status} status, logging out user`);

                try {
                    // Import authService for logout (we'll need to add the import at the top)
                    const {default: authService} = await import('../database-backend-services/authService');

                    // Clear authentication state
                    authService.clearToken();

                    // Clear any additional stored state
                    localStorage.clear();

                    console.log(`[BatchApiService] User logged out due to ${response.status} status`);

                    // Dispatch a custom event that the app can listen for
                    const eventType = response.status === 401 ? 'auth:session-expired' : 'auth:too-many-requests';
                    window.dispatchEvent(new CustomEvent(eventType, {
                        detail: {
                            originalUrl: `${API_BASE_URL}/batch/redact`,
                            status: response.status,
                            message: response.status === 401
                                ? 'Your session has expired. Please log in again.'
                                : 'Too many requests. Please log in again.'
                        }
                    }));

                    // For immediate redirect (can be disabled if app handles the event)
                    setTimeout(() => {
                        if (window.location.pathname !== '/login' && !window.location.pathname.includes('/auth')) {
                            window.location.href = '/login?expired=true';
                        }
                    }, 100);

                } catch (logoutError) {
                    console.error('[BatchApiService] Error during forced logout:', logoutError);
                }
            }

            const errorText = await response.text();
            console.error('[BatchApiService] Redaction failed:', errorText);
            let errorPayload;
            try {
                const parsed = JSON.parse(errorText);
                errorPayload = parsed.error || parsed.detail || parsed;
            } catch {
                errorPayload = errorText;
            }
            throw new Error(mapBackendErrorToMessage(errorPayload));
        }

        // Log response headers for debugging
        console.log('[BatchApiService] Response headers:');
        response.headers.forEach((value, key) => {
            console.log(`  ${key}: ${value}`);
        });

        // Check content type
        const contentType = response.headers.get('content-type');
        console.log('[BatchApiService] Response content type:', contentType);

        // Init the zipBlob variable here
        let zipBlob: Blob;

        // Check if response is JSON (encrypted) or binary (direct ZIP)
        let responseData;
        if (contentType?.includes('application/json')) {
            responseData = await response.json();
            console.log('[BatchApiService] Received JSON response');
        } else if (contentType?.includes('application/zip') || contentType?.includes('application/octet-stream')) {
            // Direct binary response
            console.log('[BatchApiService] Received direct binary response');
            zipBlob = await response.blob();
            console.log('[BatchApiService] Created ZIP blob directly from response:', zipBlob.size);
            return processRedactionZip(zipBlob, files);
        } else {
            console.warn('[BatchApiService] Unexpected content type:', contentType);
            responseData = await response.json().catch(async () => {
                // If not JSON, try to get as text
                const text = await response.text();
                console.error('[BatchApiService] Response is not JSON:', text.substring(0, 200));
                let errorPayload;
                try {
                    const parsed = JSON.parse(text);
                    errorPayload = parsed.error || parsed.detail || parsed;
                } catch {
                    errorPayload = text;
                }
                throw new Error(mapBackendErrorToMessage(errorPayload));
            });
        }

        // Process encrypted data if present
        if (responseData.encrypted_data) {
            console.log('[BatchApiService] Received encrypted response');
            // Decrypt the response
            const decryptedData = await batchEncryptionService.decrypt(responseData.encrypted_data);
            console.log('[BatchApiService] Decrypted response data type:', typeof decryptedData);

            try {
                // Check if we received the special binary_zip format
                if (decryptedData && typeof decryptedData === 'object' && decryptedData._type === 'binary_zip') {
                    console.log('[BatchApiService] Received binary_zip format data');
                    // Convert from base64 back to binary
                    const binaryString = atob(decryptedData.data);

                    // Convert binary string to Uint8Array
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }

                    zipBlob = new Blob([bytes], { type: 'application/zip' });
                    console.log('[BatchApiService] Created ZIP blob from binary_zip data, size:', zipBlob.size);

                    // Debug first few bytes to verify PK signature
                    const header = new Uint8Array(await zipBlob.slice(0, 4).arrayBuffer());
                    console.log('[BatchApiService] ZIP header check:',
                        Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' '));
                } else {
                    console.log('[BatchApiService] First 100 chars of decrypted data:',
                        typeof decryptedData === 'string' ? decryptedData.substring(0, 100) : 'Not a string');

                    // Handle string data
                    if (typeof decryptedData === 'string') {
                        // Check if the data starts with "PK" (ZIP file signature)
                        if (decryptedData.startsWith('PK')) {
                            console.log('[BatchApiService] Detected ZIP file content, converting to blob');

                            // In JavaScript, strings aren't great for binary data
                            // We need to use TextEncoder for proper binary handling
                            const buffer = new TextEncoder().encode(decryptedData);

                            // Check if the TextEncoder preserved the proper ZIP signature
                            console.log('[BatchApiService] Binary conversion check - first bytes:',
                                Array.from(buffer.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' '));

                            zipBlob = new Blob([buffer], { type: 'application/zip' });
                            console.log('[BatchApiService] Created ZIP blob with TextEncoder, size:', zipBlob.size);
                        } else {
                            // Convert base64 to binary
                            const binaryString = atob(decryptedData);
                            console.log('[BatchApiService] Converted base64 to binary string, length:', binaryString.length);

                            // Convert binary string to Uint8Array
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }

                            zipBlob = new Blob([bytes], { type: 'application/zip' });
                            console.log('[BatchApiService] Created ZIP blob from binary data, size:', zipBlob.size);
                        }

                        // Debug first few bytes to verify PK signature (ZIP file magic number)
                        if (zipBlob.size > 4) {
                            const header = new Uint8Array(await zipBlob.slice(0, 4).arrayBuffer());
                            const isPK = header[0] === 0x50 && header[1] === 0x4B;
                            console.log('[BatchApiService] ZIP header check:',
                                Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' '),
                                'Valid ZIP:', isPK);
                        }
                    } else {
                        throw new Error('Expected base64 string from decryption, got: ' + typeof decryptedData);
                    }
                }
            } catch (error) {
                console.error('[BatchApiService] Error processing decrypted data:', error);
                throw new Error(mapBackendErrorToMessage(error));
            }
        } else {
            // Direct response
            zipBlob = await response.blob();
        }

        // Process the ZIP file to extract individual PDFs
        return processRedactionZip(zipBlob, files);
    } catch (error) {
        console.error('Batch Redaction API error:', error);
        throw error;
    } finally {
        // Clean up the API key after operation completes (success or error)
        try {
            await batchEncryptionService.cleanup();
        } catch (cleanupError) {
            console.warn('[BatchApiService] Error during API key cleanup:', cleanupError);
        }
    }
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
        // Log info about the blob
        console.log(`[processRedactionZip] Processing ZIP blob, size: ${zipBlob.size} bytes, type: ${zipBlob.type}`);

        // Verify this is actually a zip file by checking the first few bytes
        const firstChunk = await zipBlob.slice(0, 4).arrayBuffer();
        const signature = new Uint8Array(firstChunk);
        const isPK = signature[0] === 0x50 && signature[1] === 0x4B; // 'PK' signature

        console.log('[processRedactionZip] ZIP signature check:',
            Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join(' '),
            'Valid ZIP:', isPK);

        if (!isPK) {
            console.error('[processRedactionZip] Invalid ZIP file signature:',
                Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join(' '));

            // Try to read small blobs as text to see if it's an error message
            if (zipBlob.size < 10000) {
                try {
                    const errorText = await zipBlob.text();
                    console.error('[processRedactionZip] Blob content (first 1000 chars):',
                        errorText.substring(0, 1000));

                    // Check if it might be JSON
                    try {
                        const jsonError = JSON.parse(errorText);
                        console.error('[processRedactionZip] JSON error object:', jsonError);
                        let errorPayload;
                        try {
                            errorPayload = jsonError.error || jsonError.detail || jsonError;
                        } catch {
                            errorPayload = errorText;
                        }
                        throw new Error(mapBackendErrorToMessage(errorPayload));
                    } catch (e) {
                        // Not valid JSON - continue with normal error
                        let errorPayload;
                        try {
                            errorPayload = JSON.parse(errorText);
                            errorPayload = errorPayload.error || errorPayload.detail || errorPayload;
                        } catch {
                            errorPayload = errorText;
                        }
                        throw new Error(mapBackendErrorToMessage(errorPayload));
                    }
                } catch (e) {
                    // Unable to read as text
                }
            }

            throw new Error('Invalid ZIP file format - missing PK signature');
        }

        // Load the ZIP file with more robust error handling
        console.log('[processRedactionZip] Loading ZIP file with JSZip...');
        try {
            const zip = await JSZip.loadAsync(zipBlob, {
                // Add these options to make JSZip more tolerant of corrupted ZIPs
                checkCRC32: false,   // Don't verify checksums
                createFolders: true  // Create folders even if incomplete
            });

            console.log('[processRedactionZip] ZIP loaded successfully, files:', Object.keys(zip.files).length);

            if (Object.keys(zip.files).length === 0) {
                console.warn('[processRedactionZip] ZIP file contains no files');
                throw new Error('ZIP file contains no files');
            }

            // List all files in ZIP for debugging
            console.log('[processRedactionZip] ZIP contents:');
            Object.keys(zip.files).forEach(path => {
                console.log(`  - ${path} (dir: ${zip.files[path].dir})`);
            });

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
                console.log(`[processRedactionZip] Found file in ZIP: ${fileName}`);

                // Check if this is a PDF file
                if (!fileName.toLowerCase().endsWith('.pdf')) {
                    console.log(`[processRedactionZip] Skipping non-PDF file: ${fileName}`);
                    return;
                }

                // Get the file content as a blob
                try {
                    const fileBlob = await zip.files[zipPath].async('blob');
                    console.log(`[processRedactionZip] Extracted ${fileName}, size: ${fileBlob.size} bytes`);

                    // Determine which original file this corresponds to
                    // We'll match by name, ignoring any redacted suffix
                    const baseName = fileName.replace('_redacted.pdf', '.pdf')
                                            .replace('-redacted.pdf', '.pdf');

                    const matchingFile = originalFiles.find(file =>
                        file.name === baseName || file.name === fileName
                    );

                    if (matchingFile) {
                        const fileKey = getFileKey(matchingFile);
                        redactedFiles[fileKey] = fileBlob;
                        console.log(`[processRedactionZip] Matched file ${fileName} to original ${matchingFile.name}, key: ${fileKey}`);
                    } else {
                        console.warn(`[processRedactionZip] Could not find matching original file for: ${fileName}`);
                        console.log(`[processRedactionZip] Original files:`, originalFiles.map(f => f.name));
                    }
                } catch (e) {
                    console.error(`[processRedactionZip] Error extracting ${fileName}:`, e);
                }
            });

            // Wait for all files to be processed
            await Promise.all(fileProcessingPromises);
            console.log(`[processRedactionZip] Successfully processed ${Object.keys(redactedFiles).length} redacted files`);

            return redactedFiles;
        } catch (error) {
            console.error('Error processing redaction ZIP file:', error);

            // Additional diagnostics
            if (zipBlob.size === 0) {
                throw new Error('Empty ZIP file received from server');
            } else if (zipBlob.size < 1000) {
                // If it's small, maybe it's an error message instead of a ZIP
                try {
                    const text = await zipBlob.text();
                    if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
                        try {
                            const errorJson = JSON.parse(text);
                            let errorPayload;
                            try {
                                errorPayload = errorJson.error || errorJson.detail || errorJson;
                            } catch {
                                errorPayload = text;
                            }
                            throw new Error(mapBackendErrorToMessage(errorPayload));
                        } catch (e) {
                            // Not valid JSON
                            let errorPayload;
                            try {
                                errorPayload = JSON.parse(text);
                                errorPayload = errorPayload.error || errorPayload.detail || errorPayload;
                            } catch {
                                errorPayload = text;
                            }
                            throw new Error(mapBackendErrorToMessage(errorPayload));
                        }
                    } else {
                        let errorPayload;
                        try {
                            errorPayload = JSON.parse(text);
                            errorPayload = errorPayload.error || errorPayload.detail || errorPayload;
                        } catch {
                            errorPayload = text;
                        }
                        throw new Error(mapBackendErrorToMessage(errorPayload));
                    }
                } catch (e) {
                    if (e.message.includes('Server returned error')) {
                        throw e; // Rethrow our custom error
                    }
                    // continue with original error
                }
            }

            throw new Error(mapBackendErrorToMessage(error));
        }
    } catch (error) {
        console.error('Error processing redaction ZIP file:', error);

        // Additional diagnostics
        if (zipBlob.size === 0) {
            throw new Error('Empty ZIP file received from server');
        } else if (zipBlob.size < 1000) {
            // If it's small, maybe it's an error message instead of a ZIP
            try {
                const text = await zipBlob.text();
                if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
                    try {
                        const errorJson = JSON.parse(text);
                        let errorPayload;
                        try {
                            errorPayload = errorJson.error || errorJson.detail || errorJson;
                        } catch {
                            errorPayload = text;
                        }
                        throw new Error(mapBackendErrorToMessage(errorPayload));
                    } catch (e) {
                        // Not valid JSON
                        let errorPayload;
                        try {
                            errorPayload = JSON.parse(text);
                            errorPayload = errorPayload.error || errorPayload.detail || errorPayload;
                        } catch {
                            errorPayload = text;
                        }
                        throw new Error(mapBackendErrorToMessage(errorPayload));
                    }
                } else {
                    throw new Error(mapBackendErrorToMessage(text));
                }
            } catch (e) {
                if (e.message.includes('Server returned error')) {
                    throw e; // Rethrow our custom error
                }
                // continue with original error
            }
        }

        throw new Error(mapBackendErrorToMessage(error));
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
        // Ensure encryption service is initialized
        await batchEncryptionService.ensureInitialized(authService.createApiKey.bind(authService));

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

        // Encrypt required fields: files, bounding_box
        const fieldsToEncrypt = ['files', 'bounding_box'];
        const encryptedFormData = await batchEncryptionService.prepareEncryptedFormData(
            formData,
            fieldsToEncrypt
        );

        // Get authentication headers
        const authHeaders = batchEncryptionService.getAuthHeaders();

        // Send the request to the API
        const encryptedResponse = await apiRequest<any>({
            method: 'POST',
            url: `${API_BASE_URL}/batch/find_words`,
            formData: encryptedFormData,
            headers: authHeaders,
        });

        // Decrypt response if encrypted
        let result = encryptedResponse;
        if (encryptedResponse.encrypted_data) {
            result = await batchEncryptionService.decrypt(encryptedResponse.encrypted_data);
        }

        console.log(`[BatchApiService] Find words completed. Found ${result.batch_summary.total_matches} matches across ${result.batch_summary.successful} files`);

        return result;
    } catch (error) {
        console.error('Batch Find Words API error:', error);
        throw error;
    } finally {
        // Clean up the API key after operation completes (success or error)
        try {
            await batchEncryptionService.cleanup();
        } catch (cleanupError) {
            console.warn('[BatchApiService] Error during API key cleanup:', cleanupError);
        }
    }
}
