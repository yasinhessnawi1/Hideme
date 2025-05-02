import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { EntityHighlightProcessor } from '../managers/EntityHighlightProcessor';
import { highlightStore } from '../store/HighlightStore';
import processingStateService from '../services/ProcessingStateService';
import summaryPersistenceStore from '../store/SummaryPersistenceStore';
import { HighlightType } from '../types';

// Mock dependencies
vi.mock('../store/HighlightStore', () => ({
    highlightStore: {
        removeHighlightsByType: vi.fn().mockResolvedValue(true),
        addMultipleHighlights: vi.fn().mockImplementation((highlights) => {
            if (!highlights || !Array.isArray(highlights)) {
                return Promise.resolve([]);
            }
            return Promise.resolve(highlights.map(h => h.id || `highlight-${Math.random()}`));
        }),
        getHighlightsByType: vi.fn().mockReturnValue([])
    }
}));

vi.mock('../services/ProcessingStateService', () => ({
    default: {
        completeProcessing: vi.fn(),
        getProcessingInfo: vi.fn().mockReturnValue({ status: 'processing', progress: 50 })
    }
}));

vi.mock('../store/SummaryPersistenceStore', () => ({
    default: {
        addAnalyzedFile: vi.fn(),
        updateFileSummary: vi.fn()
    }
}));

// Mock window.dispatchEvent
const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

describe('EntityHighlightProcessor', () => {
    const testFileKey = 'test-file-key';

    // Mock detection results that match the expected format
    const mockValidDetectionResult = {
        redaction_mapping: {
            pages: [
                {
                    page: 1,
                    sensitive: [
                        {
                            original_text: 'John Doe',
                            entity_type: 'PERSON',
                            bbox: { x0: 10, y0: 10, x1: 20, y1: 20 },
                            engine: 'presidio'
                        }
                    ]
                },
                {
                    page: 2,
                    sensitive: [
                        {
                            original_text: '123-45-6789',
                            entity_type: 'SSN',
                            bbox: { x0: 30, y0: 30, x1: 40, y1: 40 },
                            engine: 'gliner'
                        }
                    ]
                }
            ]
        },
        entities_detected: {
            by_type: { PERSON: 1, SSN: 1 },
            by_page: { 1: 1, 2: 1 },
            total: 2
        },
        performance: {
            entity_density: 0.05,
            words_count: 100,
            pages_count: 2,
            sanitize_time: 0.5
        }
    };

    // Mock detection result without redaction_mapping
    const mockFlatDetectionResult = {
        pages: [
            {
                page: 1,
                sensitive: [
                    {
                        original_text: 'John Doe',
                        entity_type: 'PERSON',
                        bbox: { x0: 10, y0: 10, x1: 20, y1: 20 }
                    }
                ]
            }
        ],
        entities_detected: {
            by_type: { PERSON: 1 },
            by_page: { 1: 1 },
            total: 1
        },
        performance: {
            entity_density: 0.05,
            words_count: 100,
            pages_count: 1,
            sanitize_time: 0.5
        }
    };

    // Invalid detection results for negative testing
    const mockEmptyDetectionResult = {};
    const mockNoSensitiveDetectionResult = {
        pages: [
            { page: 1 }
        ]
    };
    const mockNoPagesDetectionResult = {
        redaction_mapping: {}
    };

    beforeEach(() => {
        vi.clearAllMocks();
        dispatchEventSpy.mockClear();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    test('should successfully process detection results', async () => {
        // Reset all mocks for clean state
        vi.mocked(highlightStore.removeHighlightsByType).mockClear();
        vi.mocked(highlightStore.addMultipleHighlights).mockClear();
        vi.mocked(summaryPersistenceStore.addAnalyzedFile).mockClear();
        vi.mocked(summaryPersistenceStore.updateFileSummary).mockClear();
        dispatchEventSpy.mockClear();
        vi.mocked(processingStateService.completeProcessing).mockClear();

        // Call the method
        const highlightIds = await EntityHighlightProcessor.processDetectionResults(
            testFileKey,
            mockValidDetectionResult
        );

        // Verify existing highlights were removed
        expect(highlightStore.removeHighlightsByType).toHaveBeenCalledWith(
            testFileKey,
            HighlightType.ENTITY
        );

        // Verify highlights were created and added to store
        expect(highlightStore.addMultipleHighlights).toHaveBeenCalledTimes(1);
        expect(highlightStore.addMultipleHighlights).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    page: 1,
                    text: 'John Doe',
                    entity: 'PERSON',
                    model: 'presidio',
                    color: '#ffd771',
                    type: HighlightType.ENTITY,
                    fileKey: testFileKey
                }),
                expect.objectContaining({
                    page: 2,
                    text: '123-45-6789',
                    entity: 'SSN',
                    model: 'gliner',
                    color: '#ff7171',
                    type: HighlightType.ENTITY,
                    fileKey: testFileKey
                })
            ])
        );

        // Verify file was marked as analyzed
        expect(summaryPersistenceStore.addAnalyzedFile).toHaveBeenCalledWith('entity', testFileKey);

        // Verify summary was updated
        expect(summaryPersistenceStore.updateFileSummary).toHaveBeenCalledWith(
            'entity',
            expect.objectContaining({
                fileKey: testFileKey,
                entities_detected: mockValidDetectionResult.entities_detected,
                performance: mockValidDetectionResult.performance
            })
        );

        // Verify no events were dispatched (not auto-process)
        expect(dispatchEventSpy).not.toHaveBeenCalled();
        expect(processingStateService.completeProcessing).not.toHaveBeenCalled();

        // Verify correct IDs were returned
        expect(Array.isArray(highlightIds)).toBe(true);
    });

    test('should process detection results without redaction_mapping wrapper', async () => {
        // Reset mocks for clean state
        vi.mocked(highlightStore.addMultipleHighlights).mockClear();
        vi.mocked(summaryPersistenceStore.addAnalyzedFile).mockClear();

        // Call the method with flat detection result
        const highlightIds = await EntityHighlightProcessor.processDetectionResults(
            testFileKey,
            mockFlatDetectionResult
        );

        // Verify highlights were created and added to store
        expect(highlightStore.addMultipleHighlights).toHaveBeenCalledTimes(1);
        expect(highlightStore.addMultipleHighlights).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    page: 1,
                    text: 'John Doe',
                    entity: 'PERSON',
                    type: HighlightType.ENTITY,
                    fileKey: testFileKey
                })
            ])
        );

        // Verify correct IDs were returned
        expect(highlightIds.length).toBe(1);
    });

    test('should dispatch event and update processing state when isAutoProcess is true', async () => {
        // Reset mocks for clean state
        vi.mocked(highlightStore.addMultipleHighlights).mockClear();
        vi.mocked(processingStateService.completeProcessing).mockClear();
        dispatchEventSpy.mockClear();

        // Call the method with isAutoProcess = true
        await EntityHighlightProcessor.processDetectionResults(
            testFileKey,
            mockValidDetectionResult,
            true
        );

        // Verify event was dispatched
        expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'auto-processing-complete',
                detail: expect.objectContaining({
                    fileKey: testFileKey,
                    hasEntityResults: true,
                })
            })
        );

        // Verify processing state was updated
        expect(processingStateService.completeProcessing).toHaveBeenCalledWith(
            testFileKey,
            true,
            mockValidDetectionResult
        );
    });

    test('should handle null detection result', async () => {
        // Reset mocks for clean state
        vi.mocked(highlightStore.addMultipleHighlights).mockClear();

        // Call the method with null detection result
        const highlightIds = await EntityHighlightProcessor.processDetectionResults(
            testFileKey,
            null as any
        );

        // Verify no highlights were added
        expect(highlightStore.addMultipleHighlights).not.toHaveBeenCalled();

        // Verify empty array was returned
        expect(highlightIds).toEqual([]);
    });

    test('should handle detection result with no pages', async () => {
        // Reset mocks for clean state
        vi.mocked(highlightStore.addMultipleHighlights).mockClear();

        // Enhance the mock result to avoid undefined errors
        const enhancedMockNoPagesResult = {
            ...mockNoPagesDetectionResult,
            // Add these properties to avoid undefined errors
            entities_detected: { total: 0 },
            performance: { entity_density: 0 }
        };

        // Call the method with result that has no pages
        const highlightIds = await EntityHighlightProcessor.processDetectionResults(
            testFileKey,
            enhancedMockNoPagesResult
        );

        // Verify no highlights were added
        expect(highlightStore.addMultipleHighlights).not.toHaveBeenCalled();

        // Verify empty array was returned
        expect(highlightIds).toEqual([]);
    });

    test('should handle detection result with empty pages array', async () => {
        // Call the method with result that has empty pages array
        const emptyPagesResult = {
            redaction_mapping: {
                pages: []
            },
            // Add these properties to avoid undefined errors
            entities_detected: { total: 0 },
            performance: { entity_density: 0 }
        };

        const highlightIds = await EntityHighlightProcessor.processDetectionResults(
            testFileKey,
            emptyPagesResult
        );

        // Verify no highlights were added - the store will get an empty array
        expect(highlightStore.addMultipleHighlights).toHaveBeenCalled();
        expect(highlightIds).toEqual([]);
    });

    test('should handle page with missing sensitive array', async () => {
        // Call the method with result where page has no sensitive array
        const noSensitiveResult = {
            redaction_mapping: {
                pages: [
                    { page: 1 } // No sensitive array
                ]
            },
            // Add these properties to avoid undefined errors
            entities_detected: { total: 0 },
            performance: { entity_density: 0 }
        };

        const highlightIds = await EntityHighlightProcessor.processDetectionResults(
            testFileKey,
            noSensitiveResult
        );

        // Verify no highlights were added
        expect(highlightStore.addMultipleHighlights).toHaveBeenCalled();

        // Verify empty array was returned
        expect(highlightIds).toEqual([]);
    });

    test('should handle entity with missing bbox', async () => {
        // Call the method with result where entity has no bbox
        const noBboxResult = {
            redaction_mapping: {
                pages: [
                    {
                        page: 1,
                        sensitive: [
                            {
                                original_text: 'John Doe',
                                entity_type: 'PERSON'
                                // No bbox
                            }
                        ]
                    }
                ]
            },
            // Add these properties to avoid undefined errors
            entities_detected: { total: 0 },
            performance: { entity_density: 0 }
        };

        const highlightIds = await EntityHighlightProcessor.processDetectionResults(
            testFileKey,
            noBboxResult
        );

        // Verify no highlights were added - empty array will be passed
        expect(highlightStore.addMultipleHighlights).toHaveBeenCalled();
        expect(highlightIds).toEqual([]);
    });

    test('should set default model if engine not specified', async () => {
        // Call the method with result where entity has no engine
        const noEngineResult = {
            redaction_mapping: {
                pages: [
                    {
                        page: 1,
                        sensitive: [
                            {
                                original_text: 'John Doe',
                                entity_type: 'PERSON',
                                bbox: { x0: 10, y0: 10, x1: 20, y1: 20 }
                                // No engine
                            }
                        ]
                    }
                ]
            },
            // Add these properties to avoid undefined errors
            entities_detected: { total: 1 },
            performance: { entity_density: 0 }
        };

        await EntityHighlightProcessor.processDetectionResults(
            testFileKey,
            noEngineResult
        );

        // Verify highlight was created with default model
        expect(highlightStore.addMultipleHighlights).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    model: 'presidio', // Default model
                    color: '#ffd771'   // Default model color
                })
            ])
        );
    });

    test('should handle errors when updating persistence store', async () => {
        // Mock error for persistence store
        vi.mocked(summaryPersistenceStore.updateFileSummary).mockImplementationOnce(() => {
            throw new Error('Test error');
        });

        // Should not throw - don't use resolves here as it might cause issues
        const highlightIds = await EntityHighlightProcessor.processDetectionResults(
            testFileKey,
            mockValidDetectionResult
        );

        // Check that we got a result
        expect(Array.isArray(highlightIds)).toBe(true);

        // Verify highlights were still added despite the error
        expect(highlightStore.addMultipleHighlights).toHaveBeenCalled();
    });

    test('should handle various model types with correct colors', async () => {
        // Access the private method directly for testing
        const getColorForModel = (EntityHighlightProcessor as any).getColorForModel;

        // Test all defined model colors
        expect(getColorForModel('presidio')).toBe('#ffd771'); // Yellow
        expect(getColorForModel('gliner')).toBe('#ff7171');   // Red
        expect(getColorForModel('gemini')).toBe('#7171ff');   // Blue
        expect(getColorForModel('hideme')).toBe('#71ffa0');   // Green

        // Test case insensitivity
        expect(getColorForModel('PRESIDIO')).toBe('#ffd771');
        expect(getColorForModel('Gliner')).toBe('#ff7171');

        // Test default color for undefined model
        expect(getColorForModel('unknown_model')).toBe('#757575'); // Gray
    });

    test('should use filename from page if available', async () => {
        // Result with filename in page
        const resultWithFilename = {
            redaction_mapping: {
                pages: [
                    {
                        page: 1,
                        file_name: 'test-file-name.pdf',
                        sensitive: [
                            {
                                original_text: 'John Doe',
                                entity_type: 'PERSON',
                                bbox: { x0: 10, y0: 10, x1: 20, y1: 20 }
                            }
                        ]
                    }
                ]
            },
            entities_detected: { total: 1 },
            performance: { entity_density: 0.05 }
        };

        // Reset the mock to ensure it gets called with the correct params
        vi.mocked(summaryPersistenceStore.updateFileSummary).mockClear();

        await EntityHighlightProcessor.processDetectionResults(
            testFileKey,
            resultWithFilename
        );

        // Verify summary was updated with filename from page
        expect(summaryPersistenceStore.updateFileSummary).toHaveBeenCalledWith(
            'entity',
            expect.objectContaining({
                fileKey: testFileKey,
                fileName: 'test-file-name.pdf'
            })
        );
    });

    test('should use entity_type as text if original_text is missing', async () => {
        // Result with missing original_text
        const resultWithoutText = {
            redaction_mapping: {
                pages: [
                    {
                        page: 1,
                        sensitive: [
                            {
                                // No original_text
                                entity_type: 'PERSON',
                                bbox: { x0: 10, y0: 10, x1: 20, y1: 20 }
                            }
                        ]
                    }
                ]
            },
            // Add these properties to avoid undefined errors
            entities_detected: { total: 1 },
            performance: { entity_density: 0 }
        };

        // Reset the mock to ensure clean state
        vi.mocked(highlightStore.addMultipleHighlights).mockClear();

        await EntityHighlightProcessor.processDetectionResults(
            testFileKey,
            resultWithoutText
        );

        // Verify highlight uses entity_type as text
        expect(highlightStore.addMultipleHighlights).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    text: 'PERSON'
                })
            ])
        );
    });
});