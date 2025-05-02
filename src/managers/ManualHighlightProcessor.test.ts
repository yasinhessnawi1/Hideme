import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ManualHighlightProcessor } from '../managers/ManualHighlightProcessor';
import { highlightStore } from '../store/HighlightStore';
import {HighlightType, HighlightCreationMode, HighlightRect} from '../types/pdfTypes';

// Mock dependencies
vi.mock('../store/HighlightStore', () => ({
    highlightStore: {
        addHighlight: vi.fn().mockResolvedValue('highlight-id-123'),
        getHighlightsForPage: vi.fn()
    }
}));

describe('ManualHighlightProcessor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    // Tests for createRectangleHighlight method
    describe('createRectangleHighlight', () => {
        // Positive test cases
        test('should create a valid rectangle highlight', async () => {
            // Setup
            const fileKey = 'test-file';
            const pageNumber = 1;
            const startX = 10;
            const startY = 20;
            const endX = 100;
            const endY = 200;
            const color = '#00ff15';
            const text = 'Test highlight';

            // Execute
            const highlight = await ManualHighlightProcessor.createRectangleHighlight(
                fileKey,
                pageNumber,
                startX,
                startY,
                endX,
                endY,
                color,
                text
            );

            // Verify
            expect(highlight).not.toBeNull();
            expect(highlight?.id).toBe('highlight-id-123');
            expect(highlight?.fileKey).toBe(fileKey);
            expect(highlight?.page).toBe(pageNumber);
            expect(highlight?.x).toBe(10);
            expect(highlight?.y).toBe(20);
            expect(highlight?.w).toBe(90);
            expect(highlight?.h).toBe(180);
            expect(highlight?.color).toBe(color);
            expect(highlight?.text).toBe(text);
            expect(highlight?.type).toBe(HighlightType.MANUAL);

            // Verify highlightStore.addHighlight was called correctly
            expect(highlightStore.addHighlight).toHaveBeenCalledWith(
                expect.objectContaining({
                    fileKey,
                    page: pageNumber,
                    x: 10,
                    y: 20,
                    w: 90,
                    h: 180,
                    color,
                    text,
                    type: HighlightType.MANUAL
                })
            );
        });

        test('should handle creation with reversed coordinates', async () => {
            // When end coordinates are smaller than start coordinates
            const result = await ManualHighlightProcessor.createRectangleHighlight(
                'file',
                1,
                100,
                200,
                10,
                20,
                '#00ff15'
            );

            expect(result).not.toBeNull();
            expect(result?.x).toBe(10); // Should use smaller x
            expect(result?.y).toBe(20); // Should use smaller y
            expect(result?.w).toBe(90); // Should calculate absolute width
            expect(result?.h).toBe(180); // Should calculate absolute height
        });

        test('should store original coordinates for proper scaling', async () => {
            const result = await ManualHighlightProcessor.createRectangleHighlight(
                'file',
                1,
                10,
                20,
                100,
                200,
                '#00ff15'
            );

            expect(result?.originalX).toBe(result?.x);
            expect(result?.originalY).toBe(result?.y);
            expect(result?.originalW).toBe(result?.w);
            expect(result?.originalH).toBe(result?.h);
        });

        test('should use default color if not provided', async () => {
            const result = await ManualHighlightProcessor.createRectangleHighlight(
                'file',
                1,
                10,
                20,
                100,
                200
            );

            expect(result?.color).toBe('#00ff15'); // Default color
        });

        test('should use default creation mode if not provided', async () => {
            const result = await ManualHighlightProcessor.createRectangleHighlight(
                'file',
                1,
                10,
                20,
                100,
                200
            );

            expect(result?.creationMode).toBe(HighlightCreationMode.RECTANGULAR); // Default mode
        });

        test('should use provided creation mode if specified', async () => {
            const result = await ManualHighlightProcessor.createRectangleHighlight(
                'file',
                1,
                10,
                20,
                100,
                200,
                '#00ff15',
                'text',
                HighlightCreationMode.TEXT_SELECTION
            );

            expect(result?.creationMode).toBe(HighlightCreationMode.TEXT_SELECTION);
        });

        // Negative test cases
        test('should return null for highlights with width less than 2', async () => {
            const result = await ManualHighlightProcessor.createRectangleHighlight(
                'file',
                1,
                10,
                20,
                11, // Only 1px width
                200
            );

            expect(result).toBeNull();
            expect(highlightStore.addHighlight).not.toHaveBeenCalled();
        });

        test('should return null for highlights with height less than 2', async () => {
            const result = await ManualHighlightProcessor.createRectangleHighlight(
                'file',
                1,
                10,
                20,
                100,
                21 // Only 1px height
            );

            expect(result).toBeNull();
            expect(highlightStore.addHighlight).not.toHaveBeenCalled();
        });

        test('should handle store errors by propagating them', async () => {
            // Setup
            vi.mocked(highlightStore.addHighlight).mockRejectedValueOnce(new Error('Storage error'));

            // Verify it propagates the error
            await expect(
                ManualHighlightProcessor.createRectangleHighlight('file', 1, 10, 20, 100, 200)
            ).rejects.toThrow('Storage error');
        });
    });

    // Tests for findHighlightsByPosition method
    describe('findHighlightsByPosition', () => {
        // Test data for highlights
        const mockHighlights = [
            {
                id: 'highlight1',
                page: 1,
                x: 10,
                y: 10,
                w: 50,
                h: 50,
                fileKey: 'file1',
                type: HighlightType.MANUAL
            },
            {
                id: 'highlight2',
                page: 1,
                x: 100,
                y: 100,
                w: 50,
                h: 50,
                fileKey: 'file1',
                type: HighlightType.MANUAL
            },
            {
                id: 'highlight3',
                page: 1,
                x: 200,
                y: 200,
                w: 50,
                h: 50,
                fileKey: 'file1',
                type: HighlightType.MANUAL
            },
            // Highlight with missing position data
            {
                id: 'highlight4',
                page: 1,
                fileKey: 'file1',
                type: HighlightType.MANUAL,
                x: 0,
                y: 0,
                w: 0,
                h: 0
            }
        ];

        beforeEach(() => {
            // Setup default return value for getHighlightsForPage
            return vi.mocked(highlightStore.getHighlightsForPage).mockReturnValue(mockHighlights as HighlightRect[]);
        });

        test('should find highlights that overlap with the position', () => {
            const result = ManualHighlightProcessor.findHighlightsByPosition(
                'file1',
                1,
                20, // X position near highlight1
                20, // Y position near highlight1
                20, // Width
                20, // Height
                5 // Tolerance
            );

            // Should find the highlight1 which overlaps
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].id).toBe('highlight1');
        });

        test('should respect the tolerance parameter when finding overlaps', () => {
            // Position outside highlight1 but within tolerance
            const result = ManualHighlightProcessor.findHighlightsByPosition(
                'file1',
                1,
                45, // Just past the edge of highlight1 (x=10, w=50)
                45, // Just past the edge of highlight1 (y=10, h=50)
                10,
                10,
                20 // With tolerance, should still find overlap
            );

            // Should find the highlight with sufficient tolerance
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].id).toBe('highlight1');
        });

        test('should not find highlights outside position + tolerance range', () => {
            const result = ManualHighlightProcessor.findHighlightsByPosition(
                'file1',
                1,
                300, // Far from any highlight
                300,
                20,
                20,
                5
            );

            expect(result.length).toBe(0);
        });

        test('should skip highlights with missing position data', () => {
            const result = ManualHighlightProcessor.findHighlightsByPosition(
                'file1',
                1,
                10,
                10,
                50,
                50,
                5
            );

            // Should not include highlight4 which is missing position data
            expect(result.some(h => h.id === 'highlight4')).toBe(false);
        });

        test('should handle empty highlight array', () => {
            // Setup empty return value
            vi.mocked(highlightStore.getHighlightsForPage).mockReturnValueOnce([]);

            const result = ManualHighlightProcessor.findHighlightsByPosition(
                'file1',
                1,
                10,
                10,
                50,
                50,
                5
            );

            expect(result.length).toBe(0);
        });
    });
});