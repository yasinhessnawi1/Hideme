import { getCorrectedBoundingBox } from './utilities';
import { HighlightRect, HighlightType } from '../types';
import { Mock, test, expect, describe } from 'vitest';


describe('getCorrectedBoundingBox', () => {
    // Test for SEARCH type highlight
    test('should add padding for SEARCH type highlight', () => {
        const highlight: HighlightRect = {
            id: 'test-search',
            type: HighlightType.SEARCH,
            x: 100,
            y: 200,
            w: 50,
            h: 25,
            fileKey: 'test.pdf',
            page: 1
        };

        const result = getCorrectedBoundingBox(highlight);

        expect(result).toEqual({
            x0: 105,
            y0: 205,
            x1: 152,
            y1: 225
        });
    });

    // Test for ENTITY type highlight
    test('should add padding for ENTITY type highlight', () => {
        const highlight: HighlightRect = {
            id: 'test-entity',
            type: HighlightType.ENTITY,
            x: 100,
            y: 200,
            w: 50,
            h: 25,
            fileKey: 'test.pdf',
            page: 1
        };

        const result = getCorrectedBoundingBox(highlight);

        expect(result).toEqual({
            x0: 105,
            y0: 205,
            x1: 152,
            y1: 225
        });
    });

    // Test for MANUAL type highlight
    test('should add padding for MANUAL type highlight', () => {
        const highlight: HighlightRect = {
            id: 'test-manual',
            type: HighlightType.MANUAL,
            x: 100,
            y: 200,
            w: 50,
            h: 25,
            fileKey: 'test.pdf',
            page: 1
        };

        const result = getCorrectedBoundingBox(highlight);

        expect(result).toEqual({
            x0: 105,
            y0: 205,
            x1: 152,
            y1: 225
        });
    });

    // Test for unknown/other type highlight
    test('should not add padding for unknown type highlight', () => {
        const highlight: HighlightRect = {
            id: 'test-unknown',
            type: 'UNKNOWN' as HighlightType,
            x: 100,
            y: 200,
            w: 50,
            h: 25,
            fileKey: 'test.pdf',
            page: 1
        };

        const result = getCorrectedBoundingBox(highlight);

        expect(result).toEqual({
            x0: 100,
            y0: 200,
            x1: 150,
            y1: 225
        });
    });

    // Test for highlight with no type specified
    test('should not add padding for highlight with no type', () => {
        const highlight: HighlightRect = {
            id: 'test-no-type',
            x: 100,
            y: 200,
            w: 50,
            h: 25,
            fileKey: 'test.pdf',
            page: 1
        };

        const result = getCorrectedBoundingBox(highlight);

        expect(result).toEqual({
            x0: 100,
            y0: 200,
            x1: 150,
            y1: 225
        });
    });

    // Test with zero dimensions
    test('should handle zero dimensions correctly', () => {
        const highlight: HighlightRect = {
            id: 'test-zero',
            type: HighlightType.SEARCH,
            x: 100,
            y: 200,
            w: 0,
            h: 0,
            fileKey: 'test.pdf',
            page: 1
        };

        const result = getCorrectedBoundingBox(highlight);

        expect(result).toEqual({
            x0: 105,
            y0: 205,
            x1: 102,
            y1: 200
        });
    });
});