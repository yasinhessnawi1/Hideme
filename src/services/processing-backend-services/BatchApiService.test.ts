import { describe, test, expect, vi, beforeEach, afterEach, Mock} from 'vitest';
import {
    batchHybridDetect,
    batchRedactPdfs,
    findWords
} from '../../services/processing-backend-services/BatchApiService';
import {apiRequest} from '../../services/api-services/apiService';
import {getFileKey} from '../../contexts/PDFViewerContext';
import {createRedactionRequest} from '../../utils/redactionUtils';
import * as JSZip from 'jszip';
import batchEncryptionService from '../../services/api-services/batchEncryptionService';
import authService from '../../services/database-backend-services/authService';

// Mock dependencies
vi.mock('../../services/api-services/apiService', () => ({
    apiRequest: vi.fn()
}));

vi.mock('../../contexts/PDFViewerContext', () => ({
    getFileKey: vi.fn()
}));

vi.mock('../../utils/redactionUtils', () => ({
    createRedactionRequest: vi.fn()
}));

vi.mock('jszip', () => {
    return {
        default: {
            loadAsync: vi.fn()
        }
    };
});

// Mock batchEncryptionService and authService
vi.mock('../../services/api-services/batchEncryptionService', () => ({
    default: {
        ensureInitialized: vi.fn().mockResolvedValue(undefined),
        prepareEncryptedFormData: vi.fn().mockImplementation(async (formData) => formData),
        getAuthHeaders: vi.fn().mockReturnValue({}),
        decrypt: vi.fn().mockImplementation(data => data),
        cleanup: vi.fn().mockResolvedValue(undefined)
    }
}));

vi.mock('../../services/database-backend-services/authService', () => ({
    default: {
        createApiKey: vi.fn().mockResolvedValue({key: 'mock-api-key'})
    }
}));

// Create a proper mock for Response headers
class MockHeaders {
    private headers: Map<string, string>;

    constructor(init?: Record<string, string>) {
        this.headers = new Map();
        if (init) {
            Object.entries(init).forEach(([key, value]) => {
                this.headers.set(key.toLowerCase(), value);
            });
        }
    }

    get(key: string): string | null {
        return this.headers.get(key.toLowerCase()) || null;
    }

    forEach(callback: (value: string, key: string) => void): void {
        this.headers.forEach(callback);
    }
}

describe('BatchApiService', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.resetAllMocks();

        // Set default mock implementation for getFileKey
        vi.mocked(getFileKey).mockImplementation((file: { name: any }) => file.name);

        // Set default mock implementation for apiRequest
        vi.mocked(apiRequest).mockImplementation(async (config) => {
            return {
                file_results: [],
                result: 'success',
                ok: true
            };
        });

        // Mock createRedactionRequest
        vi.mocked(createRedactionRequest).mockReturnValue({
            file_results: []
        });
    });

    describe('batchHybridDetect', () => {
        test('should call API with correct parameters and return results', async () => {
            // Prepare test data
            const files = [
                new File(['test content 1'], 'file1.pdf', {type: 'application/pdf'}),
                new File(['test content 2'], 'file2.pdf', {type: 'application/pdf'})
            ];

            const options = {
                presidio: ['PERSON', 'EMAIL'],
                gliner: ['person', 'location'],
                gemini: ['PERSON-G'],
                hideme: ['PERSON-H'],
                threshold: 0.7,
                banlist: ['secret', 'confidential']
            };

            const mockResponse = {
                file_results: [
                    {
                        file: 'file1.pdf',
                        status: 'success',
                        results: {
                            entities_detected: {total: 5},
                            performance: {entity_density: 0.01}
                        }
                    },
                    {
                        file: 'file2.pdf',
                        status: 'success',
                        results: {
                            entities_detected: {total: 3},
                            performance: {entity_density: 0.005}
                        }
                    }
                ]
            };

            // Mock apiRequest to return test data
            vi.mocked(apiRequest).mockResolvedValueOnce(mockResponse);

            // Call the function
            const result = await batchHybridDetect(files, options);

            // Verify apiRequest was called correctly
            expect(apiRequest).toHaveBeenCalled();
            const apiCallArg = vi.mocked(apiRequest).mock.calls[0][0];
            expect(apiCallArg.method).toBe('POST');
            expect(apiCallArg.url).toMatch(/hybrid_detect/);

            // Verify the result is mapped correctly
            expect(result).toHaveProperty('file1.pdf');
            expect(result).toHaveProperty('file2.pdf');
            expect(result['file1.pdf']).toEqual(mockResponse.file_results[0].results);
            expect(result['file2.pdf']).toEqual(mockResponse.file_results[1].results);
        });

        test('should handle API errors', async () => {
            const files = [
                new File(['test content'], 'file1.pdf', {type: 'application/pdf'})
            ];

            const error = new Error('API connection failed');
            vi.mocked(apiRequest).mockRejectedValueOnce(error);

            await expect(batchHybridDetect(files, {})).rejects.toThrow('API connection failed');
        });

        test('should handle invalid response format', async () => {
            const files = [
                new File(['test content'], 'file1.pdf', {type: 'application/pdf'})
            ];

            // Return a response with missing file_results
            const invalidResponse = {other_data: 'something'};
            vi.mocked(apiRequest).mockResolvedValueOnce(invalidResponse);

            await expect(batchHybridDetect(files, {})).rejects.toThrow('Invalid batch hybrid detection response format');
        });
    });

    describe('batchRedactPdfs', () => {

        test('should handle API errors', async () => {
            const files = [
                new File(['test content'], 'file1.pdf', { type: 'application/pdf' })
            ];
            
            const redactionMappings = {
                'file1.pdf': { pages: [] }
            };
            
            // Mock the global fetch function to return an error
            const originalFetch = global.fetch;
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: false,
                text: vi.fn().mockResolvedValue('API error')
            });
            
            try {
                // Verify the error is properly thrown
                await expect(batchRedactPdfs(files, redactionMappings)).rejects.toThrow('API error');
            } finally {
                // Restore original fetch
                global.fetch = originalFetch;
            }
        });
    });

    describe('findWords', () => {
        test('should call API with correct parameters and return results', async () => {
            const files = [
                new File(['test content'], 'file1.pdf', { type: 'application/pdf' })
            ];
            
            const boundingBox = {
                x0: 10, y0: 20, x1: 30, y1: 40
            };
            
            const mockResponse = {
                batch_summary: {
                    total_matches: 5,
                    total_files: 1
                },
                results: [
                    {
                        file: 'file1.pdf',
                        words: ['test', 'content']
                    }
                ]
            };
            
            vi.mocked(apiRequest).mockResolvedValueOnce(mockResponse);

            const result = await findWords(files, boundingBox);
            
            expect(apiRequest).toHaveBeenCalled();
            const apiCallArg = vi.mocked(apiRequest).mock.calls[0][0];
            expect(apiCallArg.method).toBe('POST');
            expect(apiCallArg.url).toMatch(/find_words/);
            
            expect(result).toEqual(mockResponse);
        });

        test('should handle selected files parameter', async () => {
            const files = [
                new File(['test content 1'], 'file1.pdf', { type: 'application/pdf' }),
                new File(['test content 2'], 'file2.pdf', { type: 'application/pdf' })
            ];
            
            const selectedFiles = [files[0]];
            
            const boundingBox = {
                x0: 10, y0: 20, x1: 30, y1: 40
            };
            
            const mockResponse = {
                batch_summary: {
                    total_matches: 3,
                    total_files: 1
                },
                results: [
                    {
                        file: 'file1.pdf',
                        words: ['test', 'content']
                    }
                ]
            };
            
            vi.mocked(apiRequest).mockResolvedValueOnce(mockResponse);

            await findWords(files, boundingBox, selectedFiles);
            
            // Check that apiRequest was called
            expect(apiRequest).toHaveBeenCalled();
        });

        test('should handle empty files array', async () => {
            const boundingBox = {
                x0: 10, y0: 20, x1: 30, y1: 40
            };

            await expect(findWords([], boundingBox)).rejects.toThrow('No files to search');
            expect(apiRequest).not.toHaveBeenCalled();
        });

        test('should handle API errors', async () => {
            const files = [
                new File(['test content'], 'file1.pdf', { type: 'application/pdf' })
            ];
            
            const boundingBox = {
                x0: 10, y0: 20, x1: 30, y1: 40
            };
            
            const error = new Error('API error');
            vi.mocked(apiRequest).mockRejectedValueOnce(error);

            await expect(findWords(files, boundingBox)).rejects.toThrow('API error');
        });
    });
});