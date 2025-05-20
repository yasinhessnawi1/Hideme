/**
 * Utility functions for encrypting and decrypting data for API communication
 */

import { encode as base64ArrayBufferEncode, decode as base64ArrayBufferDecode } from 'base64-arraybuffer';
import {isArray} from "node:util";

function isUint8Array(data: any): data is Uint8Array {
    return data && data.constructor && data.constructor.name === 'Uint8Array';
}

/**
 * Encrypts data using AES-GCM algorithm
 * @param data Data to encrypt
 * @param key Encryption key
 * @returns Base64-URL encoded encrypted data
 */
/**
 * Encrypts data using AES-GCM algorithm
 * @param data Data to encrypt
 * @param key Encryption key
 * @returns Base64-URL encoded encrypted data
 */
/**
 * Encrypts data using AES-GCM algorithm
 * @param data Data to encrypt
 * @param key Encryption key
 * @returns Base64-URL encoded encrypted data
 */
export const encryptData = async (data: string | Uint8Array | File | Blob, key: CryptoKey): Promise<string> => {
    // Log the data type for debugging
    console.log('[encryptData] Data type:', {
        isFile: data instanceof File,
        isBlob: data instanceof Blob,
        isUint8Array: isUint8Array(data),
        typeofData: typeof data,
        constructorName: data.constructor?.name || 'unknown'
    });

    // Generate random initialization vector
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    let dataArrayBuffer: ArrayBuffer;

    if (data instanceof File || data instanceof Blob) {
        console.log('[encryptData] Processing as File/Blob:', 
                   data instanceof File ? 'File: ' + (data as File).name : 'Blob');
        dataArrayBuffer = await data.arrayBuffer();
    } else if (isUint8Array(data)) {
        console.log('[encryptData] Processing as Uint8Array, length:', (data as Uint8Array).length);
        dataArrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    } else if (typeof data === 'string') {
        console.log('[encryptData] Processing as string, length:', data.length);
        const uint8Array = new TextEncoder().encode(data);
        dataArrayBuffer = uint8Array.buffer as ArrayBuffer;
    } else {
        // Unknown type - this should never happen with proper TypeScript enforcement
        console.error('[encryptData] Unexpected data type:', data);
        throw new Error(`Unsupported data type for encryption: ${typeof data}`);
    }

    console.log('[encryptData] Final dataArrayBuffer size:', dataArrayBuffer.byteLength);
    
    // Encrypt data
    const encryptedData = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataArrayBuffer
    );

    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encryptedData.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedData), iv.length);

    // Base64-URL encode
    return base64UrlEncode(result);
};


/**
 * Decrypts data using AES-GCM algorithm
 * @param encryptedData Base64-URL encoded encrypted data
 * @param key Decryption key
 * @returns Decrypted data
 */
export const decryptData = async (encryptedData: string, key: CryptoKey): Promise<any> => {
    try {
        // Base64-URL decode
        console.log('[decryptData] Starting decryption, input length:', encryptedData.length);
        console.log('[decryptData] First few chars:', encryptedData.slice(0, 10) + '...');
        
        // Validate base64url format
        if (!/^[-A-Za-z0-9_=]*$/.test(encryptedData)) {
            console.warn('[decryptData] Input contains invalid base64url characters, cleaning up');
            encryptedData = encryptedData.replace(/[^A-Za-z0-9\-_=]/g, '');
        }
        
        const data = base64UrlDecode(encryptedData);
        console.log('[decryptData] Decoded data length:', data.length);

        if (data.length < 12) {
            throw new Error(`Decoded data too short (${data.length} bytes), expected at least 12 bytes for IV`);
        }

        // Extract IV (first 12 bytes)
        const iv = data.slice(0, 12);
        const actualEncryptedData = data.slice(12);

        // Log detailed debugging info
        console.log('[decryptData] IV length:', iv.length);
        console.log('[decryptData] IV bytes:', Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(' '));
        console.log('[decryptData] Encrypted data length:', actualEncryptedData.length);

        // Decrypt data with Web Crypto API
        const decryptedData = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            actualEncryptedData
        );

        // Try to parse as JSON, otherwise return as string or binary
        try {
            const decodedText = new TextDecoder().decode(decryptedData);
            
            // Check if this looks like a ZIP file (starts with PK)
            if (decodedText.startsWith('PK')) {
                console.log('[decryptData] Detected ZIP file format');
                
                // For binary data like ZIP files, we need a more reliable way to return it
                // Create a Uint8Array directly from the ArrayBuffer for binary integrity
                const binaryData = new Uint8Array(decryptedData);
                
                // Convert to base64 for reliable transport
                let binary = '';
                binaryData.forEach(byte => {
                    binary += String.fromCharCode(byte);
                });
                
                // We'll encode as base64 for safe transport
                const base64 = btoa(binary);
                console.log('[decryptData] Converted ZIP to base64 for transport, length:', base64.length);
                
                // Mark this as a special format so BatchApiService can handle it correctly
                return {
                    _type: 'binary_zip',
                    data: base64
                };
            }
            
            // Check if this looks like base64 (it might be base64-encoded binary data)
            if (/^[A-Za-z0-9+/=]+$/.test(decodedText)) {
                try {
                    // It might be base64-encoded binary data - return as is
                    console.log('[decryptData] Result appears to be base64 data, returning as is');
                    return decodedText;
                } catch {
                    // Fall back to treating as text
                }
            }
            
            // Try parsing as JSON
            try {
                const jsonResult = JSON.parse(decodedText);
                console.log('[decryptData] Decrypted as JSON object');
                return jsonResult;
            } catch {
                // Not JSON, return as text
                console.log('[decryptData] Decrypted as text (not JSON)');
                return decodedText;
            }
        } catch (error) {
            console.log('[decryptData] Decrypted as binary data');
            // Return binary data as standard base64 string (not base64url)
            const uint8Array = new Uint8Array(decryptedData);
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            try {
                // Use standard base64 encoding for binary data
                const base64Result = btoa(binary);
                console.log('[decryptData] Binary data encoded as base64, length:', base64Result.length);
                console.log('[decryptData] First 20 chars:', base64Result.substring(0, 20) + '...');
                return base64Result;
            } catch (e) {
                console.error('[decryptData] Failed to encode binary as base64:', e);
                // Fallback - convert to Array Buffer and encode as base64
                const buffer = uint8Array.buffer;
                const base64 = base64ArrayBufferEncode(buffer);
                console.log('[decryptData] Fallback encoding, length:', base64.length);
                return base64;
            }
        }
    } catch (err) {
        console.error('[decryptData] Decryption error:', err);
        // Additional diagnostics
        if (err.name === 'OperationError') {
            console.error('[decryptData] This is likely due to an incorrect key or corrupted data');
        }
        throw err;
    }
};

/**
 * Derives a CryptoKey from a key string
 * @param keyString Key string
 * @returns CryptoKey object
 */
export const deriveKey = async (keyString: string): Promise<CryptoKey> => {
    // Decode the key string (assume base64-url)
    const keyBytes = base64UrlDecode(keyString);
    console.log('[deriveKey] Original key string:', keyString);
    console.log('[deriveKey] Decoded key bytes:', keyBytes);
    console.log('[deriveKey] Key length (bytes):', keyBytes.length);
    // Import key directly
    return await window.crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
};

/**
 * Base64-URL encodes data
 * @param data Data to encode
 * @returns Base64-URL encoded string
 */
export const base64UrlEncode = (data: Uint8Array): string => {
    // Get base64 string from the array buffer
    const base64 = base64ArrayBufferEncode(data.buffer as ArrayBuffer);
    
    // Convert to URL-safe format (replace + with -, / with _)
    // This matches Python's base64.urlsafe_b64encode
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    // Note: Keep padding (=) intact to match Python's default behavior
};

/**
 * Base64-URL decodes a string
 * @param base64Url Base64-URL encoded string
 * @returns Decoded data as Uint8Array
 */
export const base64UrlDecode = (base64: string): Uint8Array => {
    try {
        // Log the input for debugging
        console.log('[base64UrlDecode] Input string length:', base64.length);
        console.log('[base64UrlDecode] First few chars:', base64.slice(0, 10) + '...');
        
        // Check if the string contains any non-base64url characters
        if (!/^[-A-Za-z0-9_=]*$/.test(base64)) {
            console.warn('[base64UrlDecode] Input contains non-base64url characters, cleaning up');
            // Remove any characters that aren't valid in base64url
            base64 = base64.replace(/[^A-Za-z0-9\-_=]/g, '');
        }
        
        // Add padding if needed to ensure length is multiple of 4
        let padded = base64;
        const padNeeded = (4 - (base64.length % 4)) % 4;
        if (padNeeded > 0) {
            padded += '='.repeat(padNeeded);
        }
        
        // Convert from URL-safe format back to standard base64
        const standard = padded
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        // Decode to Uint8Array
        return new Uint8Array(base64ArrayBufferDecode(standard));
    } catch (error) {
        console.error('[base64UrlDecode] Error decoding base64 string:', error);
        console.error('[base64UrlDecode] Problematic base64 string:', 
            base64.length > 100 ? (base64.slice(0, 50) + '...' + base64.slice(-50)) : base64);
        throw new Error(`Base64 decoding error: ${error.message}`);
    }
};
