import { getCorrectedBoundingBox } from './utilities';
import {
    createFullRedactionMapping,
    createRedactionRequest,
    getRedactionStatistics,
    processRedactedFiles
} from './redactionUtils';
import { HighlightRect, HighlightType, RedactionMapping, Page, Sensitive } from "../types";
import { getFileKey } from "../contexts/PDFViewerContext";
import { Mock, test, expect, describe, beforeEach, vi, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../contexts/PDFViewerContext', () => ({
    getFileKey: vi.fn((file) => file.name)
}));

vi.mock('./utilities', () => ({
    getCorrectedBoundingBox: vi.fn((highlight) => {
        if (highlight.type === 'SEARCH' || highlight.type === 'ENTITY' || highlight.type === 'MANUAL') {
            return {
                x0: highlight.x + 5,
                y0: highlight.y + 5,
                x1: ((highlight.x + 5) + highlight.w) - 3,
                y1: (highlight.y + 5) + highlight.h - 5
            };
        } else {
            return {
                x0: highlight.x,
                y0: highlight.y,
                x1: (highlight.x + highlight.w),
                y1: (highlight.y + highlight.h)
            };
        }
    })
}));

describe('redactionUtils', () => {
    // Test data
    const mockFileKey1 = 'test1.pdf';
    const mockFileKey2 = 'test2.pdf';

    const mockFile1 = new File(['test content'], mockFileKey1, { type: 'application/pdf' });
    const mockFile2 = new File(['test content 2'], mockFileKey2, { type: 'application/pdf' });

    const mockHighlightSearch: HighlightRect = {
        id: 'search-123',
        type: HighlightType.SEARCH,
        x: 100,
        y: 200,
        w: 50,
        h: 30,
        fileKey: mockFileKey1,
        page: 1,
        text: 'confidential'
    };

    const mockHighlightEntity: HighlightRect = {
        id: 'entity-456',
        type: HighlightType.ENTITY,
        x: 150,
        y: 250,
        w: 60,
        h: 35,
        fileKey: mockFileKey1,
        page: 1,
        entity: 'PERSON',
        text: 'John Doe'
    };

    const mockHighlightManual: HighlightRect = {
        id: 'manual-789',
        type: HighlightType.MANUAL,
        x: 200,
        y: 300,
        w: 70,
        h: 40,
        fileKey: mockFileKey1,
        page: 2
    };

    const mockHighlightUnknown: HighlightRect = {
        id: 'unknown-012',
        x: 250,
        y: 350,
        w: 80,
        h: 45,
        fileKey: mockFileKey1,
        page: 2
    };

    // Reset mocks before each test
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createFullRedactionMapping', () => {
        test('should create a complete redaction mapping with all types included', () => {
            const fileAnnotations: Record<number, HighlightRect[]> = {
                1: [mockHighlightSearch, mockHighlightEntity],
                2: [mockHighlightManual, mockHighlightUnknown]
            };

            const result = createFullRedactionMapping(fileAnnotations);

            expect(result).toHaveProperty('pages');
            expect(result.pages.length).toBe(2);

            // Page 1 should have 2 sensitive items
            expect(result.pages[0].page).toBe(1);
            expect(result.pages[0].sensitive.length).toBe(2);

            // Page 2 should have 2 sensitive items
            expect(result.pages[1].page).toBe(2);
            expect(result.pages[1].sensitive.length).toBe(2);

            // Verify that getCorrectedBoundingBox was called for each highlight
            expect(getCorrectedBoundingBox).toHaveBeenCalledTimes(4);
        });

        test('should filter highlights by type when inclusion flags are provided', () => {
            const fileAnnotations: Record<number, HighlightRect[]> = {
                1: [mockHighlightSearch, mockHighlightEntity],
                2: [mockHighlightManual, mockHighlightUnknown]
            };

            // Only include search highlights
            const searchOnly = createFullRedactionMapping(
                fileAnnotations,
                true,   // includeSearchHighlights
                false,  // includeEntityHighlights
                false   // includeManualHighlights
            );

            expect(searchOnly.pages.length).toBe(1);
            expect(searchOnly.pages[0].page).toBe(1);
            expect(searchOnly.pages[0].sensitive.length).toBe(1);
            expect(searchOnly.pages[0].sensitive[0].entity_type).toBe('SEARCH');

            // Only include entity highlights
            const entityOnly = createFullRedactionMapping(
                fileAnnotations,
                false,  // includeSearchHighlights
                true,   // includeEntityHighlights
                false   // includeManualHighlights
            );

            expect(entityOnly.pages.length).toBe(1);
            expect(entityOnly.pages[0].page).toBe(1);
            expect(entityOnly.pages[0].sensitive.length).toBe(1);
            expect(entityOnly.pages[0].sensitive[0].entity_type).toBe('PERSON');

            // Only include manual highlights
            const manualOnly = createFullRedactionMapping(
                fileAnnotations,
                false,  // includeSearchHighlights
                false,  // includeEntityHighlights
                true    // includeManualHighlights
            );

            expect(manualOnly.pages.length).toBe(1);
            expect(manualOnly.pages[0].page).toBe(2);
            expect(manualOnly.pages[0].sensitive.length).toBe(2); // Both manual and unknown are treated as manual
        });

        test('should handle empty annotations', () => {
            const result = createFullRedactionMapping({});

            expect(result).toHaveProperty('pages');
            expect(result.pages.length).toBe(0);
        });

        test('should handle annotations with missing or malformed data', () => {
            const malformedHighlight: HighlightRect = {
                id: 'malformed',
                // @ts-ignore - intentionally missing required properties
                page: 3,
                fileKey: mockFileKey1,
                x: 0,
                y: 0,
                w: 0,
                h: 0
            };

            const fileAnnotations: Record<number, HighlightRect[]> = {
                3: [malformedHighlight]
            };

            const result = createFullRedactionMapping(fileAnnotations);

            expect(result.pages.length).toBe(1);
            expect(result.pages[0].page).toBe(3);
            expect(result.pages[0].sensitive.length).toBe(1);

            // Should still create a sensitive item with defaults
            expect(result.pages[0].sensitive[0].original_text).toBe('Unknown');
            expect(result.pages[0].sensitive[0].entity_type).toBe('MANUAL');
        });
    });

    describe('createRedactionRequest', () => {
        test('should create a valid redaction request from mappings', () => {
            const redactionMapping1: RedactionMapping = {
                pages: [
                    {
                        page: 1,
                        sensitive: [
                            {
                                original_text: 'confidential',
                                entity_type: 'SEARCH',
                                score: 1.0,
                                start: 0,
                                end: 0,
                                bbox: { x0: 105, y0: 205, x1: 152, y1: 225 }
                            }
                        ]
                    }
                ]
            };

            const redactionMapping2: RedactionMapping = {
                pages: [
                    {
                        page: 1,
                        sensitive: [
                            {
                                original_text: 'John Doe',
                                entity_type: 'PERSON',
                                score: 1.0,
                                start: 0,
                                end: 0,
                                bbox: { x0: 155, y0: 255, x1: 207, y1: 280 }
                            }
                        ]
                    }
                ]
            };

            const redactionMappings: Record<string, RedactionMapping> = {
                [mockFileKey1]: redactionMapping1,
                [mockFileKey2]: redactionMapping2
            };

            const result = createRedactionRequest([mockFile1, mockFile2], redactionMappings);

            expect(result).toHaveProperty('file_results');
            expect(result.file_results.length).toBe(2);

            // Verify file 1
            expect(result.file_results[0].file).toBe(mockFileKey1);
            expect(result.file_results[0].status).toBe('success');
            expect(result.file_results[0].results.redaction_mapping).toBe(redactionMapping1);
            expect(result.file_results[0].results.file_info.filename).toBe(mockFileKey1);
            expect(result.file_results[0].results.file_info.content_type).toBe('application/pdf');

            // Verify file 2
            expect(result.file_results[1].file).toBe(mockFileKey2);
            expect(result.file_results[1].status).toBe('success');
            expect(result.file_results[1].results.redaction_mapping).toBe(redactionMapping2);
            expect(result.file_results[1].results.file_info.filename).toBe(mockFileKey2);
            expect(result.file_results[1].results.file_info.content_type).toBe('application/pdf');

            // Verify getFileKey was called for each file
            expect(getFileKey).toHaveBeenCalledTimes(2);
        });

        test('should only include files with mappings', () => {
            const redactionMapping: RedactionMapping = {
                pages: [
                    {
                        page: 1,
                        sensitive: [
                            {
                                original_text: 'confidential',
                                entity_type: 'SEARCH',
                                score: 1.0,
                                start: 0,
                                end: 0,
                                bbox: { x0: 105, y0: 205, x1: 152, y1: 225 }
                            }
                        ]
                    }
                ]
            };

            const redactionMappings: Record<string, RedactionMapping> = {
                [mockFileKey1]: redactionMapping
                // No mapping for mockFileKey2
            };

            const result = createRedactionRequest([mockFile1, mockFile2], redactionMappings);

            expect(result.file_results.length).toBe(1);
            expect(result.file_results[0].file).toBe(mockFileKey1);

            // Verify getFileKey was called for each file
            expect(getFileKey).toHaveBeenCalledTimes(2);
        });

        test('should handle empty mappings', () => {
            const result = createRedactionRequest([mockFile1, mockFile2], {});

            expect(result.file_results.length).toBe(0);

            // Verify getFileKey was called for each file
            expect(getFileKey).toHaveBeenCalledTimes(2);
        });
    });

    describe('getRedactionStatistics', () => {
        test('should calculate accurate statistics from a redaction mapping', () => {
            const redactionMapping: RedactionMapping = {
                pages: [
                    {
                        page: 1,
                        sensitive: [
                            {
                                original_text: 'confidential',
                                entity_type: 'SEARCH',
                                score: 1.0,
                                start: 0,
                                end: 0,
                                bbox: { x0: 105, y0: 205, x1: 152, y1: 225 }
                            },
                            {
                                original_text: 'John Doe',
                                entity_type: 'PERSON',
                                score: 1.0,
                                start: 0,
                                end: 0,
                                bbox: { x0: 155, y0: 255, x1: 207, y1: 280 }
                            }
                        ]
                    },
                    {
                        page: 2,
                        sensitive: [
                            {
                                original_text: 'secret',
                                entity_type: 'MANUAL',
                                score: 1.0,
                                start: 0,
                                end: 0,
                                bbox: { x0: 205, y0: 305, x1: 267, y1: 335 }
                            },
                            {
                                original_text: 'jane@example.com',
                                entity_type: 'EMAIL',
                                score: 1.0,
                                start: 0,
                                end: 0,
                                bbox: { x0: 255, y0: 355, x1: 327, y1: 390 }
                            }
                        ]
                    }
                ]
            };

            const stats = getRedactionStatistics(redactionMapping);

            expect(stats.totalItems).toBe(4);

            // Check entity type counts
            expect(stats.byType['SEARCH']).toBe(1);
            expect(stats.byType['PERSON']).toBe(1);
            expect(stats.byType['MANUAL']).toBe(1);
            expect(stats.byType['EMAIL']).toBe(1);

            // Check page counts
            expect(stats.byPage['page_1']).toBe(2);
            expect(stats.byPage['page_2']).toBe(2);
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

        /*
        test('should handle undefined mapping', () => {
            const stats = getRedactionStatistics(undefined as any);

            expect(stats.totalItems).toBe(0);
            expect(stats.byType).toEqual({});
            expect(stats.byPage).toEqual({});
        });
        */

        test('should handle malformed mapping data', () => {
            const malformedMapping: RedactionMapping = {
                pages: [
                    {
                        page: 1,
                        sensitive: null as any
                    },
                    {
                        page: 2,
                        sensitive: [
                            {
                                original_text: 'data',
                                // Missing entity_type
                                score: 1.0,
                                start: 0,
                                end: 0,
                                bbox: { x0: 105, y0: 205, x1: 152, y1: 225 }
                            } as any
                        ]
                    }
                ]
            };

            const stats = getRedactionStatistics(malformedMapping);

            expect(stats.totalItems).toBe(1); // Only the valid item is counted
            expect(stats.byType['UNKNOWN']).toBe(1); // Missing entity_type defaults to UNKNOWN
            expect(stats.byPage['page_2']).toBe(1);
        });
    });

    describe('processRedactedFiles', () => {
        // Mock for Date for consistent test results
        let originalDate: DateConstructor;

        beforeEach(() => {
            originalDate = global.Date;

            // Mock Date to return a fixed timestamp
            const mockDate = new Date('2023-01-01T00:00:00Z');
            global.Date = class extends Date {
                constructor() {
                    super();
                    return mockDate;
                }

                static now() {
                    return mockDate.getTime();
                }
            } as any;
        });

        // Restore original Date after tests
        afterEach(() => {
            global.Date = originalDate;
        });

        /*
        test('should process redacted files and create new File objects', async () => {
            const redactedFiles: Record<string, Blob> = {
                [mockFileKey1]: new Blob(['redacted content 1'], { type: 'application/pdf' }),
                [mockFileKey2]: new Blob(['redacted content 2'], { type: 'application/pdf' })
            };

            const updateFiles = vi.fn();
            const currentFiles = [mockFile1, mockFile2];

            const result = await processRedactedFiles(redactedFiles, updateFiles, currentFiles);

            // Should return array of new File objects
            expect(result.length).toBe(2);

            // New files should have '-redacted-{date}' in their names
            expect(result[0].name).toMatch(/test1-redacted-2023-01-01T00-00-00\.pdf/);
            expect(result[1].name).toMatch(/test2-redacted-2023-01-01T00-00-00\.pdf/);

            // Should call updateFiles with new files
            expect(updateFiles).toHaveBeenCalledWith(result, false);
        });
        */

        test('should handle case where original file is not found', async () => {
            const redactedFiles: Record<string, Blob> = {
                'nonexistent.pdf': new Blob(['redacted content'], { type: 'application/pdf' })
            };

            const updateFiles = vi.fn();
            const currentFiles = [mockFile1, mockFile2];

            const result = await processRedactedFiles(redactedFiles, updateFiles, currentFiles);

            // Should return empty array - no files processed
            expect(result.length).toBe(0);

            // Should still call updateFiles with empty array
            expect(updateFiles).toHaveBeenCalledWith([], false);
        });

        test('should handle empty redacted files input', async () => {
            const updateFiles = vi.fn();
            const currentFiles = [mockFile1, mockFile2];

            const result = await processRedactedFiles({}, updateFiles, currentFiles);

            // Should return empty array
            expect(result.length).toBe(0);

            // Should call updateFiles with empty array
            expect(updateFiles).toHaveBeenCalledWith([], false);
        });

        /*
        test('should generate a file with the correct type and name format', async () => {
            const redactedFiles: Record<string, Blob> = {
                [mockFileKey1]: new Blob(['redacted content'], { type: 'application/pdf' })
            };

            const updateFiles = vi.fn();
            const currentFiles = [mockFile1];

            const result = await processRedactedFiles(redactedFiles, updateFiles, currentFiles);

            expect(result.length).toBe(1);
            expect(result[0].type).toBe('application/pdf');

            // The format should be "{original name}-redacted-{ISO date}.pdf"
            const expectedName = 'test1-redacted-2023-01-01T00-00-00.pdf';
            expect(result[0].name).toBe(expectedName);

            // Should call updateFiles with the new file
            expect(updateFiles).toHaveBeenCalledWith([result[0]], false);
        });

         */
    });

});