// src/services/batchEncryptionService.ts
import { encryptData, decryptData, deriveKey, base64UrlDecode } from '../../utils/encryptionUtils';
import authService from '../database-backend-services/authService';
import { mapBackendErrorToMessage } from '../../utils/errorUtils';

/**
 * API key interface
 */
export interface ApiKey {
    id: string;
    key: string;
    created_at: string;
    expires_at: string;
}

/**
 * Service for handling batch API encryption and decryption
 */
export class BatchEncryptionService {
    private static instance: BatchEncryptionService;
    private key: CryptoKey | null = null;
    private apiKeyId: string | null = null;
    private initialized = false;
    private initPromise: Promise<void> | null = null;

    /**
     * Get singleton instance
     */
    static getInstance(): BatchEncryptionService {
        if (!BatchEncryptionService.instance) {
            BatchEncryptionService.instance = new BatchEncryptionService();
        }
        return BatchEncryptionService.instance;
    }

    /**
     * Initialize encryption with API key
     * @param apiKey API key data
     */
    async initialize(apiKey: ApiKey): Promise<void> {
        if (this.initialized) return;

        try {
            this.key = await deriveKey(apiKey.key);
            this.apiKeyId = apiKey.id;
            this.initialized = true;
            console.log('[BatchEncryptionService] Initialized successfully');
        } catch (error) {
            console.error('[BatchEncryptionService] Initialization failed:', error);
            throw new Error(mapBackendErrorToMessage(error));
        }
    }

    /**
     * Ensures encryption service is initialized
     * @param createApiKey Function to create a new API key
     */
    async ensureInitialized(createApiKey: () => Promise<ApiKey>): Promise<void> {
        if (this.initialized) return;

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                const apiKey = await createApiKey();
                await this.initialize(apiKey);
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    /**
     * Reset encryption state
     */
    reset(): void {
        this.key = null;
        this.apiKeyId = null;
        this.initialized = false;
    }

    /**
     * Cleanup and delete the current API key
     * Call this after completing operations to improve security
     */
    async cleanup(): Promise<void> {
        if (this.apiKeyId) {
            console.log('[BatchEncryptionService] Cleaning up and deleting API key:', this.apiKeyId);
            try {
                await authService.deleteApiKey(this.apiKeyId);
                console.log('[BatchEncryptionService] API key deleted successfully');
            } catch (error) {
                console.error('[BatchEncryptionService] Failed to delete API key:', error);
            } finally {
                // Reset state even if deletion fails
                this.reset();
            }
        } else {
            console.log('[BatchEncryptionService] No API key to clean up');
        }
    }

    /**
     * Encrypt a file
     * @param file File to encrypt
     * @returns Promise with encrypted File
     */
    async encryptFile(file: File): Promise<Blob> {
        if (!this.initialized || !this.key) {
            throw new Error('Encryption service not initialized');
        }

        const fileBuffer = await file.arrayBuffer();
        // Encrypt the file data - this returns a base64url string
        const encryptedData = await encryptData(new Uint8Array(fileBuffer), this.key);

        // Convert from base64url string back to binary for sending to backend
        // The backend expects raw binary data that contains [nonce]+[ciphertext]
        const bytes = base64UrlDecode(encryptedData);

        // Log debugging info
        const first16Bytes = Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log('[encryptFile] First 16 bytes of encrypted file (hex):', first16Bytes);
        console.log('[encryptFile] Encrypted file length (bytes):', bytes.length);
        console.log('[encryptFile] IV (first 12 bytes):', Array.from(bytes.slice(0, 12)));

        // Return as Blob with correct content type for binary data
        return new Blob([bytes], { type: 'application/octet-stream' });
    }

    /**
     * Encrypt string data
     * @param data String to encrypt
     * @returns Encrypted string
     */
    async encryptString(data: string): Promise<string> {
        if (!this.initialized || !this.key) {
            throw new Error('Encryption service not initialized');
        }

        return encryptData(data, this.key);
    }

    /**
     * Encrypt object data
     * @param data Object to encrypt
     * @returns Encrypted string
     */
    async encryptObject(data: any): Promise<string> {
        if (!this.initialized || !this.key) {
            throw new Error('Encryption service not initialized');
        }

        return encryptData(JSON.stringify(data), this.key);
    }

    /**
     * Decrypt data
     * @param encryptedData Encrypted data
     * @returns Decrypted data
     */
    async decrypt(encryptedData: string): Promise<any> {
        if (!this.initialized || !this.key) {
            throw new Error('Encryption service not initialized');
        }

        try {
            console.log('[BatchEncryptionService] Decrypting data, length:', encryptedData?.length);
            console.log('[BatchEncryptionService] First 20 chars:', encryptedData?.substring(0, 20));

            // Check for any characters that shouldn't be in base64url and remove them
            if (!/^[-A-Za-z0-9_=]*$/.test(encryptedData)) {
                console.warn('[BatchEncryptionService] Cleaning up non-base64url characters');
                encryptedData = encryptedData.replace(/[^A-Za-z0-9\-_=]/g, '');
            }

            return decryptData(encryptedData, this.key);
        } catch (error) {
            console.error('[BatchEncryptionService] Decryption failed:', error);
            console.error('[BatchEncryptionService] First/last 50 chars of input:',
                encryptedData?.length > 100 ?
                `${encryptedData.substring(0, 50)}...${encryptedData.substring(encryptedData.length - 50)}` :
                encryptedData);
            throw new Error(mapBackendErrorToMessage(error));
        }
    }

    /**
     * Prepare encrypted form data
     * @param formData Original form data
     * @param fieldsToEncrypt Fields that need encryption
     * @returns Encrypted form data
     */
    async prepareEncryptedFormData(
        formData: FormData,
        fieldsToEncrypt: string[]
    ): Promise<FormData> {
        if (!this.initialized || !this.key) {
            throw new Error('Encryption service not initialized');
        }

        const encryptedFormData = new FormData();

        // Process each field in the form data
        for (const [key, value] of formData.entries()) {
            if (fieldsToEncrypt.includes(key)) {
                if (value instanceof File) {
                    console.log(`[ENCRYPT] Encrypting file: ${value.name}, key: ${key}`);
                    // Encrypt file
                    const encryptedFile = await this.encryptFile(value);
                    // Preserve the original filename when appending to FormData
                    encryptedFormData.append(key, encryptedFile, value.name);
                } else {
                    console.log(`[ENCRYPT] Encrypting object for key: ${key}, value:`, value);
                    // Encrypt other values
                    const encryptedValue = await this.encryptObject(value);
                    console.log(`[ENCRYPT] Encrypted object for key: ${key}, encryptedValue:`, encryptedValue);
                    encryptedFormData.append(key, encryptedValue);
                }
            } else {
                if (value instanceof File) {
                    console.log(`[ENCRYPT] Passing through file (not encrypted): ${value.name}, key: ${key}`);
                } else {
                    console.log(`[ENCRYPT] Passing through value (not encrypted) for key: ${key}, value:`, value);

                    // Special handling for redaction_mappings - deep log structure
                    if (key === 'redaction_mappings') {
                        try {
                            const mappings = JSON.parse(value as string);
                            console.log('[ENCRYPT] Redaction mappings structure:',
                                        `File results: ${mappings.file_results?.length || 0}`);
                            if (mappings.file_results && mappings.file_results.length > 0) {
                                mappings.file_results.forEach((result: any, idx: number) => {
                                    console.log(`[ENCRYPT] Redaction file result ${idx}:`,
                                                `file: ${result.file}, ` +
                                                `pages: ${result.results?.redaction_mapping?.pages?.length || 0}`);
                                });
                            }
                        } catch (err) {
                            console.error('[ENCRYPT] Failed to parse redaction_mappings:', err);
                        }
                    }
                }
                // Pass through non-encrypted fields
                encryptedFormData.append(key, value);
            }
        }

        return encryptedFormData;
    }

    /**
     * Get authentication headers for API requests
     * @returns Headers object
     */
    getAuthHeaders(): Record<string, string> {
        if (!this.initialized || !this.apiKeyId) {
            throw new Error('Encryption service not initialized');
        }

        return {
            'session-key': authService.getToken() ?? '',
            'api-key-id': this.apiKeyId,
            'file': 'application/pdf'
        };
    }
}

// Export singleton instance
export const batchEncryptionService = BatchEncryptionService.getInstance();
export default batchEncryptionService;
