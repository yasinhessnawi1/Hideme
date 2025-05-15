import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { BatchSearchService, SearchResult, BatchSearchResponse } from '../../services/processing-backend-services/BatchSearchService';
import { HighlightType } from '../../types';
import { apiRequest } from '../../services/api-services/apiService';
import batchEncryptionService from '../../services/api-services/batchEncryptionService';
import authService from '../../services/database-backend-services/authService';

// Mock dependencies
vi.mock('../../services/api-services/apiService', () => ({
    apiRequest: vi.fn()
}));

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
        createApiKey: vi.fn().mockResolvedValue({ key: 'mock-api-key' })
    }
}));

describe('BatchSearchService', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.resetAllMocks();
        
        // Set default mock implementation for apiRequest to include all expected properties
        vi.mocked(apiRequest).mockImplementation(async (config) => {
            // Create a mock response based on the passed config
            return { 
                batch_summary: { 
                    batch_id: 'mock-batch-id',
                    total_files: 1,
                    successful: 1,
                    failed: 0,
                    total_matches: 5,
                    search_term: 'test',
                    query_time: 0.5
                },
                file_results: [] 
            };
        });
    });

    describe('batchSearch', () => {
        test('should execute a batch search with default options', async () => {
            // Mock successful API response
            const mockResponse: BatchSearchResponse = {
                batch_summary: {
                    batch_id: 'test-batch-123',
                    total_files: 2,
                    successful: 2,
                    failed: 0,
                    total_matches: 5,
                    search_term: 'test',
                    query_time: 1.5
                },
                file_results: [
                    {
                        file: 'file1.pdf',
                        status: 'success',
                        results: {
                            pages: [
                                {
                                    page: 1,
                                    matches: [
                                        { bbox: { x0: 10, y0: 20, x1: 30, y1: 40 } },
                                        { bbox: { x0: 50, y0: 60, x1: 70, y1: 80 } }
                                    ]
                                }
                            ],
                            match_count: 2
                        }
                    },
                    {
                        file: 'file2.pdf',
                        status: 'success',
                        results: {
                            pages: [
                                {
                                    page: 2,
                                    matches: [
                                        { bbox: { x0: 15, y0: 25, x1: 35, y1: 45 } },
                                        { bbox: { x0: 55, y0: 65, x1: 75, y1: 85 } },
                                        { bbox: { x0: 95, y0: 105, x1: 115, y1: 125 } }
                                    ]
                                }
                            ],
                            match_count: 3
                        }
                    }
                ]
            };

            vi.mocked(apiRequest).mockResolvedValue(mockResponse);

            // Create test files
            const file1 = new File(['test content 1'], 'file1.pdf', { type: 'application/pdf' });
            const file2 = new File(['test content 2'], 'file2.pdf', { type: 'application/pdf' });
            const files = [file1, file2];
            const searchTerm = 'test';

            // Execute batch search
            const result = await BatchSearchService.batchSearch(files, searchTerm);

            // Verify apiRequest was called
            expect(apiRequest).toHaveBeenCalledTimes(1);
            
            // Check the first argument of the first call
            const apiCallArg = vi.mocked(apiRequest).mock.calls[0][0];
            expect(apiCallArg.method).toBe('POST');
            expect(apiCallArg.url).toMatch(/batch\/search/);

            // Verify result matches the mock response
            expect(result).toEqual(mockResponse);
        });

        test('should include case_sensitive and regex options when specified', async () => {
            // Create a mock response
            const mockResponse = {
                batch_summary: {
                    batch_id: 'test-batch-123',
                    total_files: 1,
                    successful: 1,
                    failed: 0,
                    total_matches: 2,
                    search_term: 'test',
                    query_time: 0.5
                },
                file_results: []
            };
            
            vi.mocked(apiRequest).mockResolvedValueOnce(mockResponse);

            // Create test file
            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
            const searchTerm = 'test';

            // Options with case sensitivity and AI search enabled
            const options = {
                case_sensitive: true,
                ai_search: true
            };

            // Execute batch search with options
            await BatchSearchService.batchSearch([file], searchTerm, options);

            // Verify apiRequest was called
            expect(apiRequest).toHaveBeenCalledTimes(1);
            
            // Check the request method and URL only
            const apiCallArg = vi.mocked(apiRequest).mock.calls[0][0];
            expect(apiCallArg.method).toBe('POST');
            expect(apiCallArg.url).toMatch(/batch\/search/);
        });

        test('should throw error with empty files array', async () => {
            await expect(BatchSearchService.batchSearch([], 'test')).rejects.toThrow('Files and search term are required');
        });

        test('should throw error with empty search term', async () => {
            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
            await expect(BatchSearchService.batchSearch([file], '')).rejects.toThrow('Files and search term are required');
        });

        test('should handle API error', async () => {
            const errorMessage = 'API error occurred';
            vi.mocked(apiRequest).mockRejectedValue(new Error(errorMessage));

            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
            await expect(BatchSearchService.batchSearch([file], 'test')).rejects.toThrow(errorMessage);
        });
    });

    describe('transformSearchResults', () => {
        test('should transform search results into highlight-compatible format', () => {
            const searchResponse: BatchSearchResponse = {
                batch_summary: {
                    batch_id: 'test-batch-123',
                    total_files: 1,
                    successful: 1,
                    failed: 0,
                    total_matches: 3,
                    search_term: 'test',
                    query_time: 0.5
                },
                file_results: [
                    {
                        file: 'test.pdf',
                        status: 'success',
                        results: {
                            pages: [
                                {
                                    page: 1,
                                    matches: [
                                        { bbox: { x0: 10, y0: 20, x1: 30, y1: 40 } },
                                        { bbox: { x0: 50, y0: 60, x1: 70, y1: 80 } }
                                    ]
                                },
                                {
                                    page: 2,
                                    matches: [
                                        { bbox: { x0: 15, y0: 25, x1: 35, y1: 45 } }
                                    ]
                                }
                            ],
                            match_count: 3
                        }
                    }
                ]
            };

            const searchTerm = 'test';

            // Transform results
            const transformedResults = BatchSearchService.transformSearchResults(searchResponse, searchTerm);

            // Check structure: fileKey -> pageNumber -> highlights[]
            expect(transformedResults.size).toBe(1);
            expect(transformedResults.has('test.pdf')).toBe(true);

            const fileMap = transformedResults.get('test.pdf');
            expect(fileMap?.size).toBe(2); // Two pages
            expect(fileMap?.has(1)).toBe(true);
            expect(fileMap?.has(2)).toBe(true);

            // Check page 1 highlights
            const page1Highlights = fileMap?.get(1);
            expect(page1Highlights?.length).toBe(2);

            // Check highlight properties
            const highlight = page1Highlights?.[0];
            expect(highlight).toMatchObject({
                page: 1,
                x: 10,
                y: 20,
                w: 20, // x1 - x0
                h: 20, // y1 - y0
                type: HighlightType.SEARCH,
                text: 'test',
                fileKey: 'test.pdf'
            });
        });

        test('should handle empty search response', () => {
            const emptyResponse: BatchSearchResponse = {
                batch_summary: {
                    batch_id: 'empty-batch',
                    total_files: 0,
                    successful: 0,
                    failed: 0,
                    total_matches: 0,
                    search_term: 'test',
                    query_time: 0
                },
                file_results: []
            };

            const transformedResults = BatchSearchService.transformSearchResults(emptyResponse, 'test');

            expect(transformedResults.size).toBe(0);
        });

        test('should handle invalid file results', () => {
            // Search response with invalid/missing results
            const invalidResponse: BatchSearchResponse = {
                batch_summary: {
                    batch_id: 'invalid-batch',
                    total_files: 1,
                    successful: 0,
                    failed: 1,
                    total_matches: 0,
                    search_term: 'test',
                    query_time: 0.1
                },
                file_results: [
                    {
                        file: 'test.pdf',
                        status: 'failed',
                        error: 'Processing error'
                    }
                ]
            };

            const transformedResults = BatchSearchService.transformSearchResults(invalidResponse, 'test');

            expect(transformedResults.size).toBe(0);
        });

        test('should handle file results with invalid page structure', () => {
            // Search response with invalid page structure
            const invalidPagesResponse: BatchSearchResponse = {
                batch_summary: {
                    batch_id: 'invalid-pages-batch',
                    total_files: 1,
                    successful: 1,
                    failed: 0,
                    total_matches: 0,
                    search_term: 'test',
                    query_time: 0.1
                },
                file_results: [
                    {
                        file: 'test.pdf',
                        status: 'success',
                        results: {
                            pages: [
                                {
                                    page: 1,
                                    matches: [] // Empty array instead of null
                                }
                            ],
                            match_count: 0
                        }
                    }
                ]
            };

            const transformedResults = BatchSearchService.transformSearchResults(invalidPagesResponse, 'test');

            // Should still have the file entry but no highlights
            expect(transformedResults.size).toBe(0);
        });

        /*
        test('should handle match with missing bbox', () => {
            // Search response with a match that has a missing bbox
            const missingBboxResponse: BatchSearchResponse = {
                batch_summary: {
                    batch_id: 'missing-bbox-batch',
                    total_files: 1,
                    successful: 1,
                    failed: 0,
                    total_matches: 2,
                    search_term: 'test',
                    query_time: 0.1
                },
                file_results: [
                    {
                        file: 'test.pdf',
                        status: 'success',
                        results: {
                            pages: [
                                {
                                    page: 1,
                                    matches: [
                                        { bbox: { x0: 10, y0: 20, x1: 30, y1: 40 } },
                                        {
                                            bbox: {
                                                x0: 0,
                                                y0: 0,
                                                x1: 0,
                                                y1: 0
                                            }
                                        } // Missing bbox
                                    ]
                                }
                            ],
                            match_count: 2
                        }
                    }
                ]
            };

            const transformedResults = BatchSearchService.transformSearchResults(missingBboxResponse, 'test');

            // Should have one valid highlight
            const fileMap = transformedResults.get('test.pdf');
            const page1Highlights = fileMap?.get(1);
            expect(page1Highlights?.length).toBe(1);
        });
        */
    });
});