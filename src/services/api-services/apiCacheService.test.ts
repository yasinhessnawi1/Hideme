import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
    createFullRedactionMapping,
    createRedactionRequest,
    getRedactionStatistics,
    processRedactedFiles
} from '../../utils/redactionUtils';
import { HighlightRect, HighlightType, RedactionMapping } from '../../types';
import { getFileKey } from '../../contexts/PDFViewerContext';

// Mock dependencies
vi.mock('../../utils/utilities', () => ({
    getCorrectedBoundingBox: vi.fn()
}));

vi.mock('../../contexts/PDFViewerContext', () => ({
    getFileKey: vi.fn()
}));

// Import the mocked function after mocking
import { getCorrectedBoundingBox } from '../../utils/utilities';

describe('redactionUtils', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.resetAllMocks();

        // Default mock implementation for getCorrectedBoundingBox
        vi.mocked(getCorrectedBoundingBox).mockImplementation((highlight: { x: any; y: any; w: any; h: any; }) => ({
            x0: highlight.x,
            y0: highlight.y,
            x1: highlight.x + highlight.w,
            y1: highlight.y + highlight.h
        }));

        // Default mock implementation for getFileKey
        vi.mocked(getFileKey).mockImplementation((file: { name: any; }) => file.name);
    });

    describe('createFullRedactionMapping', () => {
        test('should create empty mapping when no annotations', () => {
            const fileAnnotations: Record<number, HighlightRect[]> = {};
            const result = createFullRedactionMapping(fileAnnotations);

            expect(result).toEqual({ pages: [] });
        });

        test('should include highlights based on type filters', () => {
            const fileAnnotations: Record<number, HighlightRect[]> = {
                1: [
                    {
                        id: 'search-1',
                        type: HighlightType.SEARCH,
                        x: 100,
                        y: 200,
                        w: 50,
                        h: 25,
                        fileKey: 'test.pdf',
                        page: 1,
                        text: 'search text'
                    },
                    {
                        id: 'entity-1',
                        type: HighlightType.ENTITY,
                        x: 150,
                        y: 250,
                        w: 60,
                        h: 30,
                        fileKey: 'test.pdf',
                        page: 1,
                        text: 'entity text',
                        entity: 'PERSON'
                    },
                    {
                        id: 'manual-1',
                        type: HighlightType.MANUAL,
                        x: 200,
                        y: 300,
                        w: 70,
                        h: 35,
                        fileKey: 'test.pdf',
                        page: 1
                    }
                ]
            };

            // Include all types
            let result = createFullRedactionMapping(
                fileAnnotations,
                true, // includeSearchHighlights
                true, // includeEntityHighlights
                true  // includeManualHighlights
            );

            expect(result.pages.length).toBe(1);
            expect(result.pages[0].sensitive.length).toBe(3);

            // Include only search highlights
            result = createFullRedactionMapping(
                fileAnnotations,
                true,  // includeSearchHighlights
                false, // includeEntityHighlights
                false  // includeManualHighlights
            );

            expect(result.pages.length).toBe(1);
            expect(result.pages[0].sensitive.length).toBe(1);
            expect(result.pages[0].sensitive[0].original_text).toBe('search text');

            // Include only entity highlights
            result = createFullRedactionMapping(
                fileAnnotations,
                false, // includeSearchHighlights
                true,  // includeEntityHighlights
                false  // includeManualHighlights
            );

            expect(result.pages.length).toBe(1);
            expect(result.pages[0].sensitive.length).toBe(1);
            expect(result.pages[0].sensitive[0].original_text).toBe('entity text');

            // Include only manual highlights
            result = createFullRedactionMapping(
                fileAnnotations,
                false, // includeSearchHighlights
                false, // includeEntityHighlights
                true   // includeManualHighlights
            );

            expect(result.pages.length).toBe(1);
            expect(result.pages[0].sensitive.length).toBe(1);
            expect(result.pages[0].sensitive[0].original_text).toBe('Unknown');
        });

        test('should handle multiple pages', () => {
            const fileAnnotations: Record<number, HighlightRect[]> = {
                1: [
                    {
                        id: 'search-1',
                        type: HighlightType.SEARCH,
                        x: 100,
                        y: 200,
                        w: 50,
                        h: 25,
                        fileKey: 'test.pdf',
                        page: 1,
                        text: 'page 1 text'
                    }
                ],
                3: [
                    {
                        id: 'search-3',
                        type: HighlightType.SEARCH,
                        x: 150,
                        y: 250,
                        w: 60,
                        h: 30,
                        fileKey: 'test.pdf',
                        page: 3,
                        text: 'page 3 text'
                    }
                ]
            };

            const result = createFullRedactionMapping(fileAnnotations);

            expect(result.pages.length).toBe(2);
            expect(result.pages[0].page).toBe(1);
            expect(result.pages[1].page).toBe(3);
            expect(result.pages[0].sensitive[0].original_text).toBe('page 1 text');
            expect(result.pages[1].sensitive[0].original_text).toBe('page 3 text');
        });
    });

    describe('shouldIncludeAnnotation', () => {
        // Testing the filtering behavior through the exported function
        test('should correctly filter by highlight type', () => {
            // Define test highlights
            const searchHighlight: HighlightRect = {
                id: 'search-1',
                type: HighlightType.SEARCH,
                x: 100,
                y: 200,
                w: 50,
                h: 25,
                fileKey: 'test.pdf',
                page: 1
            };

            const entityHighlight: HighlightRect = {
                id: 'entity-1',
                type: HighlightType.ENTITY,
                x: 150,
                y: 250,
                w: 60,
                h: 30,
                fileKey: 'test.pdf',
                page: 1
            };

            const manualHighlight: HighlightRect = {
                id: 'manual-1',
                type: HighlightType.MANUAL,
                x: 200,
                y: 300,
                w: 70,
                h: 35,
                fileKey: 'test.pdf',
                page: 1
            };

            // Testing filtering through createFullRedactionMapping
            // All types included
            let result = createFullRedactionMapping(
                { 1: [searchHighlight, entityHighlight, manualHighlight] },
                true, true, true
            );
            expect(result.pages[0].sensitive.length).toBe(3);

            // Only search highlights included
            result = createFullRedactionMapping(
                { 1: [searchHighlight, entityHighlight, manualHighlight] },
                true, false, false
            );
            expect(result.pages[0].sensitive.length).toBe(1);

            // Only entity highlights included
            result = createFullRedactionMapping(
                { 1: [searchHighlight, entityHighlight, manualHighlight] },
                false, true, false
            );
            expect(result.pages[0].sensitive.length).toBe(1);

            // Only manual highlights included
            result = createFullRedactionMapping(
                { 1: [searchHighlight, entityHighlight, manualHighlight] },
                false, false, true
            );
            expect(result.pages[0].sensitive.length).toBe(1);
        });

        test('should handle highlight with no type (treat as manual)', () => {
            const highlightNoType: HighlightRect = {
                id: 'no-type',
                x: 100,
                y: 200,
                w: 50,
                h: 25,
                fileKey: 'test.pdf',
                page: 1
            };

            // Should be treated as a manual highlight
            const result = createFullRedactionMapping(
                { 1: [highlightNoType] },
                false, false, true
            );
            expect(result.pages.length).toBe(1);
            expect(result.pages[0].sensitive.length).toBe(1);

            // Shouldn't be included if manual highlights are excluded
            const emptyResult = createFullRedactionMapping(
                { 1: [highlightNoType] },
                false, false, false
            );
            expect(emptyResult.pages.length).toBe(0);
        });

        /*
        test('should handle hints for search based on text property', () => {
            const highlightWithText: HighlightRect = {
                id: 'unknown-but-has-text',
                x: 100,
                y: 200,
                w: 50,
                h: 25,
                fileKey: 'test.pdf',
                page: 1,
                text: 'some text'
            };

            // Testing with createFullRedactionMapping
            const result = createFullRedactionMapping(
                { 1: [highlightWithText] },
                true, false, false
            );
            expect(result.pages.length).toBe(1);
            expect(result.pages[0].sensitive.length).toBe(1);
        });
        */

        /*
        test('should handle hints for entity based on entity property', () => {
            const highlightWithEntity: HighlightRect = {
                id: 'unknown-but-has-entity',
                x: 100,
                y: 200,
                w: 50,
                h: 25,
                fileKey: 'test.pdf',
                page: 1,
                entity: 'PERSON'
            };

            // Testing with createFullRedactionMapping
            const result = createFullRedactionMapping(
                { 1: [highlightWithEntity] },
                false, true, false
            );
            expect(result.pages.length).toBe(1);
            expect(result.pages[0].sensitive.length).toBe(1);
        });
        */
    });

    describe('createRedactionRequest', () => {
        test('should create a redaction request from files and mappings', () => {
            // Mock files
            const files = [
                new File(['test content 1'], 'file1.pdf', { type: 'application/pdf' }),
                new File(['test content 2'], 'file2.pdf', { type: 'application/pdf' })
            ];

            // Mock redaction mappings
            const redactionMappings: Record<string, RedactionMapping> = {
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

            // Configure mock for getFileKey
            vi.mocked(getFileKey).mockImplementation((file: { name: any; }) => file.name);

            // Create request
            const request = createRedactionRequest(files, redactionMappings);

            // Check results structure
            expect(request).toHaveProperty('file_results');
            expect(request.file_results.length).toBe(1); // Only file1.pdf has a mapping
            expect(request.file_results[0]).toHaveProperty('file', 'file1.pdf');
            expect(request.file_results[0]).toHaveProperty('status', 'success');
            expect(request.file_results[0].results).toHaveProperty('redaction_mapping');
            expect(request.file_results[0].results).toHaveProperty('file_info');

            // Check file info
            expect(request.file_results[0].results.file_info).toEqual({
                filename: 'file1.pdf',
                content_type: 'application/pdf',
                size: '14' // 'test content 1' length
            });
        });

        test('should skip files without redaction mappings', () => {
            // Mock files
            const files = [
                new File(['test content 1'], 'file1.pdf', { type: 'application/pdf' }),
                new File(['test content 2'], 'file2.pdf', { type: 'application/pdf' })
            ];

            // Mock redaction mappings - empty
            const redactionMappings: Record<string, RedactionMapping> = {};

            // Create request
            const request = createRedactionRequest(files, redactionMappings);

            // Check results
            expect(request.file_results.length).toBe(0);
        });
    });

    describe('getRedactionStatistics', () => {
        test('should calculate correct statistics from redaction mapping', () => {
            const mapping: RedactionMapping = {
                pages: [
                    {
                        page: 1,
                        sensitive: [
                            {
                                original_text: 'name',
                                entity_type: 'PERSON',
                                score: 1.0,
                                start: 0,
                                end: 0,
                                bbox: { x0: 0, y0: 0, x1: 10, y1: 10 }
                            },
                            {
                                original_text: 'another name',
                                entity_type: 'PERSON',
                                score: 1.0,
                                start: 0,
                                end: 0,
                                bbox: { x0: 0, y0: 0, x1: 10, y1: 10 }
                            }
                        ]
                    },
                    {
                        page: 2,
                        sensitive: [
                            {
                                original_text: 'email@example.com',
                                entity_type: 'EMAIL',
                                score: 1.0,
                                start: 0,
                                end: 0,
                                bbox: { x0: 0, y0: 0, x1: 10, y1: 10 }
                            }
                        ]
                    }
                ]
            };

            const stats = getRedactionStatistics(mapping);

            expect(stats.totalItems).toBe(3);
            expect(stats.byType).toEqual({
                'PERSON': 2,
                'EMAIL': 1
            });
            expect(stats.byPage).toEqual({
                'page_1': 2,
                'page_2': 1
            });
        });

        test('should handle empty mapping', () => {
            const emptyMapping: RedactionMapping = {
                pages: []
            };

            const stats = getRedactionStatistics(emptyMapping);

            expect(stats.totalItems).toBe(0);
            expect(stats.byType).toEqual({});
            expect(stats.byPage).toEqual({});
        });

        test('should handle undefined/invalid pages', () => {
            const invalidMapping = {
                pages: undefined
            } as any;

            const stats = getRedactionStatistics(invalidMapping);

            expect(stats.totalItems).toBe(0);
            expect(stats.byType).toEqual({});
            expect(stats.byPage).toEqual({});
        });

        /*
        test('should handle pages with no sensitive items', () => {
            const mappingWithEmptyPage: RedactionMapping = {
                pages: [
                    {
                        page: 1,
                        sensitive: []
                    }
                ]
            };

            const stats = getRedactionStatistics(mappingWithEmptyPage);

            expect(stats.totalItems).toBe(0);
            expect(stats.byType).toEqual({});
            expect(stats.byPage).toEqual({});
        });
        */
    });

    describe('processRedactedFiles', () => {
        test('should process redacted file blobs and return new File objects', async () => {
            // Mock redacted files (blobs)
            const redactedFiles: Record<string, Blob> = {
                'file1.pdf': new Blob(['redacted content 1'], { type: 'application/pdf' }),
                'file2.pdf': new Blob(['redacted content 2'], { type: 'application/pdf' })
            };

            // Mock current files
            const currentFiles = [
                new File(['original content 1'], 'file1.pdf', { type: 'application/pdf' }),
                new File(['original content 2'], 'file2.pdf', { type: 'application/pdf' })
            ];

            // Mock updateFiles function
            const updateFiles = vi.fn();

            // Configure getFileKey mock
            vi.mocked(getFileKey).mockImplementation((file: { name: any; }) => file.name);

            // Process redacted files
            const result = await processRedactedFiles(redactedFiles, updateFiles, currentFiles);

            // Check updateFiles was called
            expect(updateFiles).toHaveBeenCalledTimes(1);
            expect(updateFiles.mock.calls[0][0].length).toBe(2); // Two files
            expect(updateFiles.mock.calls[0][1]).toBe(false); // replace = false

            // Check returned files
            expect(result.length).toBe(2);

            // Each file should have a name with '-redacted' in it
            expect(result[0].name).toMatch(/file1-redacted-.+\.pdf/);
            expect(result[1].name).toMatch(/file2-redacted-.+\.pdf/);

            // Check file types
            expect(result[0].type).toBe('application/pdf');
            expect(result[1].type).toBe('application/pdf');
        });

        test('should handle case when original file is not found', async () => {
            // Mock redacted files (blobs)
            const redactedFiles: Record<string, Blob> = {
                'file1.pdf': new Blob(['redacted content 1'], { type: 'application/pdf' }),
                'missing.pdf': new Blob(['redacted content for missing'], { type: 'application/pdf' })
            };

            // Mock current files - missing.pdf is not in the list
            const currentFiles = [
                new File(['original content 1'], 'file1.pdf', { type: 'application/pdf' })
            ];

            // Mock console.warn
            const originalWarn = console.warn;
            console.warn = vi.fn();

            // Mock updateFiles function
            const updateFiles = vi.fn();

            // Configure getFileKey mock
            vi.mocked(getFileKey).mockImplementation((file: { name: any; }) => file.name);

            // Process redacted files
            const result = await processRedactedFiles(redactedFiles, updateFiles, currentFiles);

            // Check warning was logged
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Original file not found for key: missing.pdf'));

            // Check result - should only include the found file
            expect(result.length).toBe(1);
            expect(result[0].name).toMatch(/file1-redacted-.+\.pdf/);

            // Restore console.warn
            console.warn = originalWarn;
        });

        test('should handle empty redacted files', async () => {
            // Mock empty redacted files
            const redactedFiles: Record<string, Blob> = {};

            // Mock current files
            const currentFiles = [
                new File(['original content 1'], 'file1.pdf', { type: 'application/pdf' })
            ];

            // Mock console.warn
            const originalWarn = console.warn;
            console.warn = vi.fn();

            // Mock updateFiles function
            const updateFiles = vi.fn();

            // Process redacted files
            const result = await processRedactedFiles(redactedFiles, updateFiles, currentFiles);

            // Check warning was logged
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('No redacted files were successfully processed'));

            // Check result
            expect(result.length).toBe(0);

            // Check updateFiles was still called with empty array
            expect(updateFiles).toHaveBeenCalledWith([], false);

            // Restore console.warn
            console.warn = originalWarn;
        });
    });
});