import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    batchHybridDetect,
    batchRedactPdfs,
    findWords
} from '../services/BatchApiService';
import { apiRequest } from '../services/apiService';
import { getFileKey } from '../contexts/PDFViewerContext';
import { createRedactionRequest } from '../utils/redactionUtils';
import * as JSZip from 'jszip';

// Mock dependencies
vi.mock('../services/apiService', () => ({
    apiRequest: vi.fn()
}));

vi.mock('../contexts/PDFViewerContext', () => ({
    getFileKey: vi.fn()
}));

vi.mock('../utils/redactionUtils', () => ({
    createRedactionRequest: vi.fn()
}));

vi.mock('jszip', () => {
    return {
        default: {
            loadAsync: vi.fn()
        }
    };
});

// Mock fetch
global.fetch = vi.fn();

describe('BatchApiService', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.resetAllMocks();
        // Set default mock implementation for getFileKey
        (getFileKey as any).mockImplementation((file: { name: any }) => file.name);
    });

    describe('batchHybridDetect', () => {
        test('should call API with correct parameters and return results', async () => {
            // Prepare test data
            const files = [
                new File(['test content 1'], 'file1.pdf', { type: 'application/pdf' }),
                new File(['test content 2'], 'file2.pdf', { type: 'application/pdf' })
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
                            entities_detected: { total: 5 },
                            performance: { entity_density: 0.01 }
                        }
                    },
                    {
                        file: 'file2.pdf',
                        status: 'success',
                        results: {
                            entities_detected: { total: 3 },
                            performance: { entity_density: 0.005 }
                        }
                    }
                ]
            };

            // Mock apiRequest to return test data
            (apiRequest as any).mockResolvedValueOnce(mockResponse);

            // Call the function
            const result = await batchHybridDetect(files, options);

            // Verify apiRequest was called correctly
            expect(apiRequest).toHaveBeenCalledWith({
                method: 'POST',
                url: expect.stringContaining('/batch/hybrid_detect'),
                formData: expect.any(FormData)
            });

            // Verify the result is mapped correctly
            expect(result).toHaveProperty('file1.pdf');
            expect(result).toHaveProperty('file2.pdf');
            expect(result['file1.pdf']).toEqual(mockResponse.file_results[0].results);
            expect(result['file2.pdf']).toEqual(mockResponse.file_results[1].results);
        });

        /*
        test('should handle empty files array', async () => {
            const result = await batchHybridDetect([]);
            expect(result).toEqual({});
            expect(apiRequest).not.toHaveBeenCalled();
        });

        test('should correctly format entities and handle ALL values', async () => {
            const files = [
                new File(['test content'], 'file1.pdf', { type: 'application/pdf' })
            ];

            const options = {
                presidio: ['ALL_PRESIDIO_P'],
                gliner: null,
                gemini: null,
                hideme: null
            };

            const mockResponse = {
                file_results: [
                    {
                        file: 'file1.pdf',
                        status: 'success',
                        results: {
                            entities_detected: { total: 5 }
                        }
                    }
                ]
            };

            (apiRequest as any).mockResolvedValueOnce(mockResponse);

            await batchHybridDetect(files, options);

            // Verify FormData was created with correct values
            const apiCall = (apiRequest as any).mock.calls[0][0];
            const formData = apiCall.formData;

            // Extract and check form data - note these are implementation details that may need adjusting
            // For testing formData content, we'd typically need to spy on FormData.append
            expect(apiCall.method).toBe('POST');
            expect(apiCall.url).toContain('/batch/hybrid_detect');
        });
        */

        test('should handle API errors', async () => {
            const files = [
                new File(['test content'], 'file1.pdf', { type: 'application/pdf' })
            ];

            const error = new Error('API connection failed');
            (apiRequest as any).mockRejectedValueOnce(error);

            await expect(batchHybridDetect(files, {})).rejects.toThrow('API connection failed');
        });

        test('should handle invalid response format', async () => {
            const files = [
                new File(['test content'], 'file1.pdf', { type: 'application/pdf' })
            ];

            // Return a response with missing file_results
            const invalidResponse = { other_data: 'something' };
            (apiRequest as any).mockResolvedValueOnce(invalidResponse);

            await expect(batchHybridDetect(files, {})).rejects.toThrow('Invalid batch hybrid detection response format');
        });
    });

    describe('batchRedactPdfs', () => {
        test('should call API with correct parameters and process ZIP response', async () => {
            // Prepare test data
            const files = [
                new File(['test content 1'], 'file1.pdf', { type: 'application/pdf' }),
                new File(['test content 2'], 'file2.pdf', { type: 'application/pdf' })
            ];

            const redactionMappings = {
                'file1.pdf': {
                    pages: [
                        {
                            page: 1,
                            sensitive: [
                                {
                                    original_text: 'text 1',
                                    entity_type: 'PERSON',
                                    score: 1.0,
                                    start: 0,
                                    end: 0,
                                    bbox: { x0: 0, y0: 0, x1: 10, y1: 10 }
                                }
                            ]
                        }
                    ]
                }
            };

            const redactionRequest = {
                file_results: [
                    {
                        file: 'file1.pdf',
                        status: 'success',
                        results: {
                            redaction_mapping: redactionMappings['file1.pdf'],
                            file_info: {
                                filename: 'file1.pdf',
                                content_type: 'application/pdf',
                                size: '14'
                            }
                        }
                    }
                ]
            };

            // Mock createRedactionRequest
            (createRedactionRequest as any).mockReturnValueOnce(redactionRequest);

            // Mock fetch for API call
            const mockResponseBlob = new Blob(['zip content'], { type: 'application/zip' });
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                blob: () => Promise.resolve(mockResponseBlob)
            });

            // Mock JSZip for processing the ZIP
            const mockZip = {
                files: {
                    'file1.pdf': {
                        dir: false,
                        async: vi.fn()
                    }
                },
                loadAsync: vi.fn()
            };

            // Mock File inside ZIP
            const mockFileBlob = new Blob(['redacted content'], { type: 'application/pdf' });
            mockZip.files['file1.pdf'].async.mockResolvedValueOnce(mockFileBlob);

            // Set up JSZip.loadAsync
            (JSZip as any).default.loadAsync.mockResolvedValueOnce(mockZip);

            // Call the function
            const result = await batchRedactPdfs(files, redactionMappings);

            // Verify API call
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/batch/redact'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData)
                })
            );

            // Verify ZIP processing
            expect(JSZip.default.loadAsync).toHaveBeenCalledWith(mockResponseBlob);
            expect(mockZip.files['file1.pdf'].async).toHaveBeenCalledWith('blob');

            // Verify result
            expect(result).toHaveProperty('file1.pdf');
            expect(result['file1.pdf']).toEqual(mockFileBlob);
        });

        test('should handle empty files array', async () => {
            const result = await batchRedactPdfs([], {});
            expect(result).toEqual({});
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should handle image removal option', async () => {
            const files = [
                new File(['test content'], 'file1.pdf', { type: 'application/pdf' })
            ];

            const redactionMappings = {
                'file1.pdf': { pages: [] }
            };

            (createRedactionRequest as any).mockReturnValueOnce({
                file_results: []
            });

            // Mock fetch
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                blob: () => Promise.resolve(new Blob([], { type: 'application/zip' }))
            });

            // Mock JSZip
            (JSZip as any).default.loadAsync.mockResolvedValueOnce({ files: {} });

            // Call with removeImages = true
            await batchRedactPdfs(files, redactionMappings, true);

            // Verify FormData was created with correct values
            const formData = new FormData();
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData)
                })
            );
        });

        test('should handle API errors', async () => {
            const files = [
                new File(['test content'], 'file1.pdf', { type: 'application/pdf' })
            ];

            const redactionMappings = {
                'file1.pdf': { pages: [] }
            };

            (createRedactionRequest as any).mockReturnValueOnce({
                file_results: []
            });

            // Mock fetch to return an error
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                text: () => Promise.resolve('API error')
            });

            await expect(batchRedactPdfs(files, redactionMappings)).rejects.toThrow('Batch redaction failed: API error');
        });

        test('should handle ZIP processing errors', async () => {
            const files = [
                new File(['test content'], 'file1.pdf', { type: 'application/pdf' })
            ];

            const redactionMappings = {
                'file1.pdf': { pages: [] }
            };

            (createRedactionRequest as any).mockReturnValueOnce({
                file_results: []
            });

            // Mock fetch to return success
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                blob: () => Promise.resolve(new Blob([], { type: 'application/zip' }))
            });

            // Mock JSZip to throw an error
            const error = new Error('ZIP processing error');
            (JSZip as any).default.loadAsync.mockRejectedValueOnce(error);

            await expect(batchRedactPdfs(files, redactionMappings)).rejects.toThrow('Failed to process redacted files');
        });
    });

    describe('findWords', () => {
        test('should call API with correct parameters and return results', async () => {
            // Prepare test data
            const files = [
                new File(['test content 1'], 'file1.pdf', { type: 'application/pdf' }),
                new File(['test content 2'], 'file2.pdf', { type: 'application/pdf' })
            ];

            const boundingBox = {
                x0: 100,
                y0: 200,
                x1: 150,
                y1: 250
            };

            const mockResponse = {
                batch_summary: {
                    total_matches: 5,
                    successful: 2
                },
                file_results: [
                    {
                        file: 'file1.pdf',
                        status: 'success',
                        results: {
                            matches: [
                                { bbox: { x0: 100, y0: 200, x1: 150, y1: 250 } }
                            ]
                        }
                    }
                ]
            };

            // Mock apiRequest
            (apiRequest as any).mockResolvedValueOnce(mockResponse);

            // Call the function
            const result = await findWords(files, boundingBox);

            // Verify apiRequest was called correctly
            expect(apiRequest).toHaveBeenCalledWith({
                method: 'POST',
                url: expect.stringContaining('/batch/find_words'),
                formData: expect.any(FormData)
            });

            // Verify the result
            expect(result).toEqual(mockResponse);
        });

        test('should handle selected files parameter', async () => {
            const allFiles = [
                new File(['test content 1'], 'file1.pdf', { type: 'application/pdf' }),
                new File(['test content 2'], 'file2.pdf', { type: 'application/pdf' }),
                new File(['test content 3'], 'file3.pdf', { type: 'application/pdf' })
            ];

            const selectedFiles = [allFiles[0], allFiles[2]]; // Only select files 1 and 3

            const boundingBox = {
                x0: 100,
                y0: 200,
                x1: 150,
                y1: 250
            };

            const mockResponse = {
                batch_summary: {
                    total_matches: 3,
                    successful: 2
                },
                file_results: []
            };

            // Mock apiRequest
            (apiRequest as any).mockResolvedValueOnce(mockResponse);

            // Call the function with selectedFiles
            await findWords(allFiles, boundingBox, selectedFiles);

            // Extract the form data from the call
            const apiCall = (apiRequest as any).mock.calls[0][0];
            const formData = apiCall.formData;

            // Verify that only selected files were appended (note: we can't directly test FormData content)
            expect(apiCall.method).toBe('POST');
            expect(apiCall.url).toContain('/batch/find_words');
        });

        test('should handle empty files array', async () => {
            const boundingBox = {
                x0: 100,
                y0: 200,
                x1: 150,
                y1: 250
            };

            await expect(findWords([], boundingBox)).rejects.toThrow('No files to search');
            expect(apiRequest).not.toHaveBeenCalled();
        });

        test('should handle API errors', async () => {
            const files = [
                new File(['test content'], 'file1.pdf', { type: 'application/pdf' })
            ];

            const boundingBox = {
                x0: 100,
                y0: 200,
                x1: 150,
                y1: 250
            };

            const error = new Error('API error');
            (apiRequest as any).mockRejectedValueOnce(error);

            await expect(findWords(files, boundingBox)).rejects.toThrow('API error');
        });
    });
});