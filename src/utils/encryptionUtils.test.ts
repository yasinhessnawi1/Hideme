import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as base64ArrayBuffer from 'base64-arraybuffer';
import {
    encryptData,
    decryptData,
    deriveKey, 
    base64UrlEncode,
    base64UrlDecode
} from './encryptionUtils';

// Mock isUint8Array function since it's not directly exported
const isUint8Array = (data: any): boolean => {
    return data && data.constructor && data.constructor.name === 'Uint8Array';
};

// Mock base64-arraybuffer
vi.mock('base64-arraybuffer', () => ({
    encode: vi.fn((buffer) => 'mock-base64-encoded'),
    decode: vi.fn(() => {
        // Return a buffer with 16 bytes (more than the required 12 for IV)
        return new Uint8Array([
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
        ]).buffer;
    })
}));

// Mock File and Blob array buffer methods
global.File.prototype.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(10));
global.Blob.prototype.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(10));

describe('encryptionUtils', () => {
    // Store original implementations
    let originalSubtle: SubtleCrypto;
    let originalGetRandomValues: typeof crypto.getRandomValues;
    let mockCryptoKey: CryptoKey;
    
    beforeEach(() => {
        // Save original crypto functions
        originalSubtle = crypto.subtle;
        originalGetRandomValues = crypto.getRandomValues;
        
        // Mock crypto functions
        const mockRandomValues = vi.fn().mockReturnValue(new Uint8Array(12).fill(1));
        const mockEncrypt = vi.fn().mockResolvedValue(new Uint8Array([5, 6, 7, 8]).buffer);
        const mockDecrypt = vi.fn().mockImplementation((algorithm, key, data) => {
            // Return different mock values for different test scenarios
            if (new Uint8Array(data)[0] === 5) {
                // Return JSON data
                return Promise.resolve(new TextEncoder().encode('{"test":"data"}').buffer);
            } else if (new Uint8Array(data)[0] === 6) {
                // Return plain text
                return Promise.resolve(new TextEncoder().encode('plain text').buffer);
            } else if (new Uint8Array(data)[0] === 7) {
                // Return ZIP data
                return Promise.resolve(new TextEncoder().encode('PK...').buffer);
            } else if (new Uint8Array(data)[0] === 8) {
                // Return base64 data
                return Promise.resolve(new TextEncoder().encode('SGVsbG8=').buffer);
            } else {
                // Return binary data that can't be decoded as text
                return Promise.resolve(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]).buffer);
            }
        });
        const mockImportKey = vi.fn().mockResolvedValue({
            type: 'secret',
            extractable: false,
            algorithm: { name: 'AES-GCM' },
            usages: ['encrypt', 'decrypt']
        });

        // Mock crypto.subtle and crypto.getRandomValues instead of replacing the whole crypto object
        vi.spyOn(crypto, 'getRandomValues').mockImplementation(mockRandomValues);
        vi.spyOn(crypto.subtle, 'encrypt').mockImplementation(mockEncrypt);
        vi.spyOn(crypto.subtle, 'decrypt').mockImplementation(mockDecrypt);
        vi.spyOn(crypto.subtle, 'importKey').mockImplementation(mockImportKey);

        // Create a mock CryptoKey
        mockCryptoKey = {
            type: 'secret',
            extractable: false,
            algorithm: { name: 'AES-GCM' },
            usages: ['encrypt', 'decrypt']
        } as CryptoKey;

        // Mock console methods
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore all mocks
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    describe('isUint8Array', () => {
    });

    describe('encryptData', () => {
        it('should encrypt string data', async () => {
            const result = await encryptData('test data', mockCryptoKey);
            
            // Check that the encryption functions were called with appropriate arguments
            expect(crypto.getRandomValues).toHaveBeenCalled();
            expect(crypto.subtle.encrypt).toHaveBeenCalled();
            expect(result).toBe('mock-base64-encoded');
        });

        it('should encrypt Uint8Array data', async () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const result = await encryptData(data, mockCryptoKey);
            
            expect(crypto.getRandomValues).toHaveBeenCalled();
            expect(crypto.subtle.encrypt).toHaveBeenCalled();
            expect(result).toBe('mock-base64-encoded');
        });

        it('should throw error for unsupported data types', async () => {
            await expect(encryptData({} as any, mockCryptoKey)).rejects.toThrow('Unsupported data type');
        });
    });

    describe('decryptData', () => {
        it('should decrypt and parse JSON data', async () => {
            // Override the mock for this specific test to return JSON data
            vi.mocked(crypto.subtle.decrypt).mockResolvedValueOnce(
                new TextEncoder().encode('{"test":"data"}').buffer as ArrayBuffer
            );
            
            const result = await decryptData('encrypted-json-data', mockCryptoKey);
            
            expect(crypto.subtle.decrypt).toHaveBeenCalled();
            expect(result).toEqual({ test: 'data' });
        });

        it('should decrypt and handle ZIP file data', async () => {
            // Override the mock for this specific test to return ZIP data
            vi.mocked(crypto.subtle.decrypt).mockResolvedValueOnce(
                new TextEncoder().encode('PK...').buffer as ArrayBuffer
            );
            
            const result = await decryptData('encrypted-zip-data', mockCryptoKey);
            
            expect(crypto.subtle.decrypt).toHaveBeenCalled();
            expect(result).toEqual({ _type: 'binary_zip', data: expect.any(String) });
        });

        it('should decrypt and handle plain text data', async () => {
            // Override the mock for this specific test to return plain text
            vi.mocked(crypto.subtle.decrypt).mockResolvedValueOnce(
                new TextEncoder().encode('plain text').buffer as ArrayBuffer
            );
            
            const result = await decryptData('encrypted-text-data', mockCryptoKey);
            
            expect(crypto.subtle.decrypt).toHaveBeenCalled();
            expect(result).toBe('plain text');
        });

        it('should handle base64 encoded text', async () => {
            // Override the mock for this specific test to return base64 data
            vi.mocked(crypto.subtle.decrypt).mockResolvedValueOnce(
                new TextEncoder().encode('SGVsbG8=').buffer as ArrayBuffer
            );
            
            const result = await decryptData('encrypted-base64-data', mockCryptoKey);
            
            expect(crypto.subtle.decrypt).toHaveBeenCalled();
            expect(result).toBe('SGVsbG8=');
        });

        it('should handle binary data', async () => {
            // Override the mock for this specific test to return binary data
            vi.mocked(crypto.subtle.decrypt).mockResolvedValueOnce(
                new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]).buffer
            );
            
            const result = await decryptData('encrypted-binary-data', mockCryptoKey);
            
            expect(crypto.subtle.decrypt).toHaveBeenCalled();
            expect(typeof result).toBe('string'); // Should be base64 encoded
        });

        it('should handle invalid base64url input', async () => {
            const result = await decryptData('invalid!@#characters+/', mockCryptoKey);
            
            // Just verify it completes without error
            expect(result).toBeDefined();
        });

        it('should propagate decryption errors', async () => {
            // Mock a decryption failure
            vi.mocked(crypto.subtle.decrypt).mockRejectedValueOnce(new Error('Decryption failed'));
            
            await expect(decryptData('invalid-data', mockCryptoKey)).rejects.toThrow('Decryption failed');
        });
    });

    describe('deriveKey', () => {
        it('should derive a CryptoKey from a key string', async () => {
            const keyString = 'test-key-string';
            const result = await deriveKey(keyString);
            
            expect(crypto.subtle.importKey).toHaveBeenCalledWith(
                'raw',
                expect.any(Uint8Array),
                { name: 'AES-GCM' },
                false,
                ['encrypt', 'decrypt']
            );
            
            expect(result).toEqual({
                type: 'secret',
                extractable: false,
                algorithm: { name: 'AES-GCM' },
                usages: ['encrypt', 'decrypt']
            });
        });
    });

    describe('base64UrlEncode and base64UrlDecode', () => {
        it('should encode data to base64url format', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            
            // Mock base64ArrayBufferEncode to return a string with chars that need to be replaced
            vi.mocked(base64ArrayBuffer.encode).mockReturnValueOnce('ab+/cd==');
            
            const result = base64UrlEncode(data);
            
            expect(base64ArrayBuffer.encode).toHaveBeenCalledWith(data.buffer);
            // Check that + and / are replaced with - and _
            expect(result).toBe('ab-_cd==');
        });

        it('should decode base64url format to Uint8Array', () => {
            // For this test, manually mock the implementation
            const mockBaseDecode = vi.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4]).buffer);
            vi.mocked(base64ArrayBuffer.decode).mockImplementationOnce(mockBaseDecode);
            
            const base64url = 'ab-_cd==';
            const result = base64UrlDecode(base64url);
            
            // Check that - and _ are replaced with + and / before decoding
            expect(mockBaseDecode).toHaveBeenCalledWith('ab+/cd==');
            expect(result).toBeInstanceOf(Uint8Array);
        });

        it('should handle base64url strings that need padding', () => {
            // For this test, manually mock the implementation
            const mockBaseDecode = vi.fn();
            vi.mocked(base64ArrayBuffer.decode).mockImplementationOnce(mockBaseDecode);
            
            // A string that needs padding (length not multiple of 4)
            const base64url = 'abc';
            base64UrlDecode(base64url);
            
            // Should add padding to make length multiple of 4
            expect(mockBaseDecode).toHaveBeenCalledWith('abc=');
        });
    });
}); 