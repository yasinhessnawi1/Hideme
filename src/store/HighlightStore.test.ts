import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { HighlightStore } from '../store/HighlightStore';
import { HighlightRect, HighlightType } from '../types';

// Mock the IDB module
vi.mock('idb', () => ({
    openDB: vi.fn().mockImplementation(() => Promise.resolve({
        getAll: vi.fn().mockResolvedValue([]),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
        transaction: vi.fn().mockReturnValue({
            store: {
                index: vi.fn().mockReturnValue({
                    openCursor: vi.fn().mockResolvedValue(null)
                })
            },
            done: Promise.resolve()
        })
    }))
}));

// Mock UUID generation to ensure predictable IDs
vi.mock('uuid', () => ({
    v4: vi.fn().mockReturnValue('mocked-uuid')
}));

describe('HighlightStore', () => {
    let highlightStore: HighlightStore;

    // Sample highlight for tests
    const sampleHighlight: HighlightRect = {
        id: 'test-id-1',
        fileKey: 'test-file.pdf',
        page: 1,
        x: 100,
        y: 100,
        w: 200,
        h: 50,
        type: HighlightType.MANUAL,
        timestamp: 1625076000000
    };

    const sampleSearchHighlight: HighlightRect = {
        id: 'test-id-2',
        fileKey: 'test-file.pdf',
        page: 1,
        x: 150,
        y: 150,
        w: 100,
        h: 25,
        type: HighlightType.SEARCH,
        text: 'search text',
        timestamp: 1625076000000
    };

    const sampleEntityHighlight: HighlightRect = {
        id: 'test-id-3',
        fileKey: 'test-file.pdf',
        page: 2,
        x: 200,
        y: 200,
        w: 150,
        h: 30,
        type: HighlightType.ENTITY,
        entity: 'PERSON',
        text: 'John Doe',
        timestamp: 1625076000000
    };

    beforeEach(() => {
        // Reset all mocks
        vi.resetAllMocks();

        // Create a new instance of HighlightStore for each test
        highlightStore = new HighlightStore();

        // Add spy methods to access private methods/properties for testing
        (highlightStore as any).addToMemoryStore = vi.fn();
        (highlightStore as any).saveToDatabase = vi.fn().mockResolvedValue(undefined);
        (highlightStore as any).removeFromDatabase = vi.fn().mockResolvedValue(undefined);
        (highlightStore as any).ensureDatabaseInitialized = vi.fn().mockResolvedValue(undefined);
        (highlightStore as any).notifySubscribers = vi.fn();
        (highlightStore as any).highlights = new Map();
        (highlightStore as any).dbInitialized = true;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ==========================================
    // LEVEL 1: CORE OPERATIONS TESTS
    // ==========================================
    describe('Core Operations', () => {
        test('addHighlight should add a highlight and return its ID', async () => {
            (highlightStore as any).generateUniqueId = vi.fn().mockReturnValue('generated-id');

            const result = await highlightStore.addHighlight(sampleHighlight);

            expect(result).toBe('test-id-1'); // Should use the ID from the highlight
            expect((highlightStore as any).addToMemoryStore).toHaveBeenCalledWith(sampleHighlight);
            expect((highlightStore as any).saveToDatabase).toHaveBeenCalledWith(sampleHighlight);
            expect((highlightStore as any).notifySubscribers).toHaveBeenCalledWith(
                sampleHighlight.fileKey,
                sampleHighlight.page,
                sampleHighlight.type
            );
        });

        test('addHighlight should generate ID if not provided', async () => {
            const { id, ...highlightWithoutId } = sampleHighlight;

            (highlightStore as any).generateUniqueId = vi.fn().mockReturnValue('generated-id');

            const result = await highlightStore.addHighlight({
                ...highlightWithoutId,
                id: undefined
            } as unknown as HighlightRect);

            expect(result).toBe('generated-id');

            // Check that ID was added to the highlight
            const updatedHighlight = { ...highlightWithoutId, id: 'generated-id' };
            expect((highlightStore as any).addToMemoryStore).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'generated-id' })
            );
        });

        test('removeHighlight should remove a highlight by ID', async () => {
            // Setup the in-memory store with a highlight
            const fileMap = new Map();
            const pageMap = new Map();
            pageMap.set('test-id-1', sampleHighlight);
            fileMap.set(1, pageMap);
            (highlightStore as any).highlights.set('test-file.pdf', fileMap);

            const result = await highlightStore.removeHighlight('test-id-1');

            expect(result).toBe(true);
            expect((highlightStore as any).removeFromDatabase).toHaveBeenCalledWith('test-id-1');
            expect((highlightStore as any).notifySubscribers).toHaveBeenCalledWith(
                'test-file.pdf',
                1,
                HighlightType.MANUAL
            );
        });

        test('removeHighlight should return false if highlight not found', async () => {
            // Empty store
            (highlightStore as any).highlights = new Map();

            const result = await highlightStore.removeHighlight('non-existent-id');

            expect(result).toBe(false);
            expect((highlightStore as any).removeFromDatabase).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // LEVEL 2: BATCH OPERATIONS TESTS
    // ==========================================
    describe('Batch Operations', () => {

        test('addMultipleHighlights should handle empty array', async () => {
            const result = await highlightStore.addMultipleHighlights([]);

            expect(result).toEqual([]);
            expect((highlightStore as any).addToMemoryStore).not.toHaveBeenCalled();
            expect((highlightStore as any).saveToDatabase).not.toHaveBeenCalled();
            expect((highlightStore as any).notifySubscribers).not.toHaveBeenCalled();
        });

        test('removeMultipleHighlights should handle empty array', async () => {
            const result = await highlightStore.removeMultipleHighlights([]);

            expect(result).toBe(true);
            expect((highlightStore as any).removeFromDatabase).not.toHaveBeenCalled();
            expect((highlightStore as any).notifySubscribers).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // LEVEL 3: PAGE OPERATIONS TESTS
    // ==========================================
    describe('Page Operations', () => {
        test('getHighlightsForPage should return highlights for a specific page', () => {
            // Setup the in-memory store with highlights
            const fileMap = new Map();
            const pageMap1 = new Map();
            pageMap1.set('test-id-1', sampleHighlight);
            pageMap1.set('test-id-2', sampleSearchHighlight);

            const pageMap2 = new Map();
            pageMap2.set('test-id-3', sampleEntityHighlight);

            fileMap.set(1, pageMap1);
            fileMap.set(2, pageMap2);
            (highlightStore as any).highlights.set('test-file.pdf', fileMap);

            const result = highlightStore.getHighlightsForPage('test-file.pdf', 1);

            expect(result).toHaveLength(2);
            expect(result).toEqual(expect.arrayContaining([sampleHighlight, sampleSearchHighlight]));
        });

        test('getHighlightsForPage should return empty array for non-existent file', () => {
            const result = highlightStore.getHighlightsForPage('non-existent-file.pdf', 1);

            expect(result).toEqual([]);
        });

        test('getHighlightsForPage should return empty array for non-existent page', () => {
            // Setup with a different page
            const fileMap = new Map();
            const pageMap = new Map();
            pageMap.set('test-id-3', sampleEntityHighlight);
            fileMap.set(2, pageMap);
            (highlightStore as any).highlights.set('test-file.pdf', fileMap);

            const result = highlightStore.getHighlightsForPage('test-file.pdf', 1);

            expect(result).toEqual([]);
        });

        test('addHighlightsToPage should add highlights to a specific page', async () => {
            const highlights = [
                { ...sampleHighlight, fileKey: undefined as any, page: undefined as any },
                { ...sampleSearchHighlight, fileKey: undefined as any, page: undefined as any }
            ];

            await highlightStore.addHighlightsToPage('test-file.pdf', 1, highlights);

            // Both highlights should have fileKey and page set
            expect((highlightStore as any).addToMemoryStore).toHaveBeenCalledTimes(2);
            const callArgs = (highlightStore as any).addToMemoryStore.mock.calls;

            // Verify first highlight
            expect(callArgs[0][0].fileKey).toBe('test-file.pdf');
            expect(callArgs[0][0].page).toBe(1);

            // Verify second highlight
            expect(callArgs[1][0].fileKey).toBe('test-file.pdf');
            expect(callArgs[1][0].page).toBe(1);
        });

        test('removeHighlightsFromPage should remove all highlights from a page', async () => {
            // Setup the in-memory store with highlights
            const fileMap = new Map();
            const pageMap1 = new Map();
            pageMap1.set('test-id-1', sampleHighlight);
            pageMap1.set('test-id-2', sampleSearchHighlight);

            const pageMap2 = new Map();
            pageMap2.set('test-id-3', sampleEntityHighlight);

            fileMap.set(1, pageMap1);
            fileMap.set(2, pageMap2);
            (highlightStore as any).highlights.set('test-file.pdf', fileMap);

            // Mock removeMultipleHighlights
            (highlightStore as any).removeMultipleHighlights = vi.fn().mockResolvedValue(true);

            const result = await highlightStore.removeHighlightsFromPage('test-file.pdf', 1);

            expect(result).toBe(true);
            expect((highlightStore as any).removeMultipleHighlights).toHaveBeenCalledWith(['test-id-1', 'test-id-2']);
            expect((highlightStore as any).notifySubscribers).toHaveBeenCalledWith('test-file.pdf', 1);
        });

        test('removeHighlightsFromPage should handle non-existent page', async () => {
            // Empty store
            (highlightStore as any).highlights = new Map();

            const result = await highlightStore.removeHighlightsFromPage('test-file.pdf', 1);

            expect(result).toBe(true); // No error, just nothing to remove
            expect((highlightStore as any).notifySubscribers).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // LEVEL 4: FILE OPERATIONS TESTS
    // ==========================================
    describe('File Operations', () => {
        test('getHighlightsForFile should return all highlights for a file', () => {
            // Setup the in-memory store with highlights
            const fileMap = new Map();
            const pageMap1 = new Map();
            pageMap1.set('test-id-1', sampleHighlight);
            pageMap1.set('test-id-2', sampleSearchHighlight);

            const pageMap2 = new Map();
            pageMap2.set('test-id-3', sampleEntityHighlight);

            fileMap.set(1, pageMap1);
            fileMap.set(2, pageMap2);
            (highlightStore as any).highlights.set('test-file.pdf', fileMap);

            const result = highlightStore.getHighlightsForFile('test-file.pdf');

            expect(result).toHaveLength(3);
            expect(result).toEqual(
                expect.arrayContaining([sampleHighlight, sampleSearchHighlight, sampleEntityHighlight])
            );
        });

        test('getHighlightsForFile should return empty array for non-existent file', () => {
            const result = highlightStore.getHighlightsForFile('non-existent-file.pdf');

            expect(result).toEqual([]);
        });

        test('addHighlightsToFile should add highlights to a file', async () => {
            const highlights = [
                { ...sampleHighlight, fileKey: 'test-file.pdf' },
                { ...sampleSearchHighlight, fileKey: 'test-file.pdf' }
            ];

            await highlightStore.addHighlightsToFile('test-file.pdf', highlights);

            // Both highlights should have fileKey set
            expect((highlightStore as any).addToMemoryStore).toHaveBeenCalledTimes(2);
            const callArgs = (highlightStore as any).addToMemoryStore.mock.calls;

            // Verify first highlight
            expect(callArgs[0][0].fileKey).toBe('test-file.pdf');

            // Verify second highlight
            expect(callArgs[1][0].fileKey).toBe('test-file.pdf');
        });

        test('removeHighlightsFromFile should remove all highlights from a file', async () => {
            // Setup the in-memory store with highlights
            const fileMap = new Map();
            const pageMap1 = new Map();
            pageMap1.set('test-id-1', sampleHighlight);
            pageMap1.set('test-id-2', sampleSearchHighlight);

            const pageMap2 = new Map();
            pageMap2.set('test-id-3', sampleEntityHighlight);

            fileMap.set(1, pageMap1);
            fileMap.set(2, pageMap2);
            (highlightStore as any).highlights.set('test-file.pdf', fileMap);

            // Mock removeMultipleHighlights
            (highlightStore as any).removeMultipleHighlights = vi.fn().mockResolvedValue(true);

            const result = await highlightStore.removeHighlightsFromFile('test-file.pdf');

            expect(result).toBe(true);
            expect((highlightStore as any).removeMultipleHighlights).toHaveBeenCalledWith(
                ['test-id-1', 'test-id-2', 'test-id-3']
            );
            expect((highlightStore as any).notifySubscribers).toHaveBeenCalledWith('test-file.pdf');
        });

        test('removeHighlightsFromFile should handle non-existent file', async () => {
            // Empty store
            (highlightStore as any).highlights = new Map();

            const result = await highlightStore.removeHighlightsFromFile('test-file.pdf');

            expect(result).toBe(true); // No error, just nothing to remove
            expect((highlightStore as any).notifySubscribers).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // LEVEL 5: TYPE OPERATIONS TESTS
    // ==========================================
    describe('Type Operations', () => {
        test('getHighlightsByType should return highlights of a specific type', () => {
            // Setup the in-memory store with highlights
            const fileMap = new Map();
            const pageMap1 = new Map();
            pageMap1.set('test-id-1', sampleHighlight); // MANUAL
            pageMap1.set('test-id-2', sampleSearchHighlight); // SEARCH

            const pageMap2 = new Map();
            pageMap2.set('test-id-3', sampleEntityHighlight); // ENTITY

            fileMap.set(1, pageMap1);
            fileMap.set(2, pageMap2);
            (highlightStore as any).highlights.set('test-file.pdf', fileMap);

            // Get SEARCH type highlights
            const result = highlightStore.getHighlightsByType('test-file.pdf', HighlightType.SEARCH);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(sampleSearchHighlight);
        });

        test('getHighlightsByType should return empty array if no highlights of that type', () => {
            // Setup with only MANUAL highlights
            const fileMap = new Map();
            const pageMap = new Map();
            pageMap.set('test-id-1', sampleHighlight); // MANUAL
            fileMap.set(1, pageMap);
            (highlightStore as any).highlights.set('test-file.pdf', fileMap);

            // Try to get SEARCH highlights (none exist)
            const result = highlightStore.getHighlightsByType('test-file.pdf', HighlightType.SEARCH);

            expect(result).toEqual([]);
        });

        test('addHighlightsByType should add highlights with a specific type', async () => {
            const highlights = [
                { ...sampleHighlight, fileKey: undefined as unknown as string, type: undefined },
                { ...sampleSearchHighlight, fileKey: undefined as unknown as string, type: undefined }
            ];

            await highlightStore.addHighlightsByType('test-file.pdf', HighlightType.ENTITY, highlights);

            // Both highlights should have fileKey and type set to ENTITY
            expect((highlightStore as any).addToMemoryStore).toHaveBeenCalledTimes(2);
            const callArgs = (highlightStore as any).addToMemoryStore.mock.calls;

            // Verify first highlight
            expect(callArgs[0][0].fileKey).toBe('test-file.pdf');
            expect(callArgs[0][0].type).toBe(HighlightType.ENTITY);

            // Verify second highlight
            expect(callArgs[1][0].fileKey).toBe('test-file.pdf');
            expect(callArgs[1][0].type).toBe(HighlightType.ENTITY);
        });

        test('removeHighlightsByType should remove highlights of a specific type', async () => {
            // Setup the in-memory store with highlights
            const fileMap = new Map();
            const pageMap1 = new Map();
            pageMap1.set('test-id-1', sampleHighlight); // MANUAL
            pageMap1.set('test-id-2', sampleSearchHighlight); // SEARCH

            const pageMap2 = new Map();
            pageMap2.set('test-id-3', sampleEntityHighlight); // ENTITY

            fileMap.set(1, pageMap1);
            fileMap.set(2, pageMap2);
            (highlightStore as any).highlights.set('test-file.pdf', fileMap);

            // Mock methods
            (highlightStore as any).getHighlightsForFile = vi.fn().mockReturnValue([
                sampleHighlight, sampleSearchHighlight, sampleEntityHighlight
            ]);
            (highlightStore as any).removeMultipleHighlights = vi.fn().mockResolvedValue(true);

            // Remove all SEARCH highlights
            const result = await highlightStore.removeHighlightsByType('test-file.pdf', HighlightType.SEARCH);

            expect(result).toBe(true);
            expect((highlightStore as any).getHighlightsForFile).toHaveBeenCalledWith('test-file.pdf');
            expect((highlightStore as any).removeMultipleHighlights).toHaveBeenCalledWith(['test-id-2']);
            expect((highlightStore as any).notifySubscribers).toHaveBeenCalledWith(
                'test-file.pdf', undefined, HighlightType.SEARCH
            );
        });
    });

    // ==========================================
    // LEVEL 6: PROPERTY OPERATIONS TESTS
    // ==========================================
    describe('Property Operations', () => {
        test('getHighlightsByProperty should return highlights with a specific property value', () => {
            // Setup the in-memory store with highlights
            const fileMap = new Map();
            const pageMap1 = new Map();
            pageMap1.set('test-id-1', sampleHighlight);
            pageMap1.set('test-id-2', { ...sampleSearchHighlight, text: 'specific text' });

            const pageMap2 = new Map();
            pageMap2.set('test-id-3', sampleEntityHighlight);

            fileMap.set(1, pageMap1);
            fileMap.set(2, pageMap2);
            (highlightStore as any).highlights.set('test-file.pdf', fileMap);

            // Get highlights with text = 'specific text'
            const result = highlightStore.getHighlightsByProperty('test-file.pdf', 'text', 'specific text');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('test-id-2');
        });

        test('getHighlightsByProperty should return empty array if no highlights with that property', () => {
            // Setup with highlights
            const fileMap = new Map();
            const pageMap = new Map();
            pageMap.set('test-id-1', sampleHighlight); // No 'entity' property
            fileMap.set(1, pageMap);
            (highlightStore as any).highlights.set('test-file.pdf', fileMap);

            // Try to get highlights with entity property
            const result = highlightStore.getHighlightsByProperty('test-file.pdf', 'entity', 'PERSON');

            expect(result).toEqual([]);
        });

        test('removeHighlightsByProperty should remove highlights with a specific property value', async () => {
            // Setup the in-memory store with highlights
            const specificEntityHighlight = {
                ...sampleEntityHighlight,
                id: 'entity-highlight',
                entity: 'SPECIFIC_ENTITY'
            };

            // Mock methods
            (highlightStore as any).getHighlightsByProperty = vi.fn().mockReturnValue([specificEntityHighlight]);
            (highlightStore as any).removeMultipleHighlights = vi.fn().mockResolvedValue(true);

            // Remove all highlights with entity = 'SPECIFIC_ENTITY'
            const result = await highlightStore.removeHighlightsByProperty(
                'test-file.pdf', 'entity', 'SPECIFIC_ENTITY'
            );

            expect(result).toBe(true);
            expect((highlightStore as any).getHighlightsByProperty).toHaveBeenCalledWith(
                'test-file.pdf', 'entity', 'SPECIFIC_ENTITY'
            );
            expect((highlightStore as any).removeMultipleHighlights).toHaveBeenCalledWith(['entity-highlight']);
        });

        test('getHighlightsByText should return highlights with specific text', () => {
            // Setup with highlights containing different text
            const fileMap = new Map();
            const pageMap = new Map();
            pageMap.set('test-id-1', { ...sampleHighlight, text: 'First text' });
            pageMap.set('test-id-2', { ...sampleSearchHighlight, text: 'Target text' });
            pageMap.set('test-id-3', { ...sampleEntityHighlight, text: 'Target text' });
            fileMap.set(1, pageMap);
            (highlightStore as any).highlights.set('test-file.pdf', fileMap);

            // Mock getHighlightsForFile
            (highlightStore as any).getHighlightsForFile = vi.fn().mockReturnValue([
                { ...sampleHighlight, text: 'First text' },
                { ...sampleSearchHighlight, text: 'Target text' },
                { ...sampleEntityHighlight, text: 'Target text' }
            ]);

            // Try to get highlights with specific text
            const result = highlightStore.getHighlightsByText('test-file.pdf', 'Target text');

            expect(result).toHaveLength(2);
            expect(result[0].text).toBe('Target text');
            expect(result[1].text).toBe('Target text');
        });

        test('removeHighlightsByText should remove highlights with specific text', async () => {
            // Mock methods
            (highlightStore as any).getHighlightsByText = vi.fn().mockReturnValue([
                { ...sampleSearchHighlight, id: 'text-highlight-1', text: 'Target text' },
                { ...sampleEntityHighlight, id: 'text-highlight-2', text: 'Target text' }
            ]);
            (highlightStore as any).removeMultipleHighlights = vi.fn().mockResolvedValue(true);

            // Remove all highlights with text = 'Target text'
            const result = await highlightStore.removeHighlightsByText('test-file.pdf', 'Target text');

            expect(result).toBe(true);
            expect((highlightStore as any).getHighlightsByText).toHaveBeenCalledWith(
                'test-file.pdf', 'Target text'
            );
            expect((highlightStore as any).removeMultipleHighlights).toHaveBeenCalledWith(
                ['text-highlight-1', 'text-highlight-2']
            );
        });
    });

    // ==========================================
    // LEVEL 7: GLOBAL OPERATIONS TESTS
    // ==========================================
    describe('Global Operations', () => {
        test('removeAllHighlights should clear all highlights when no files are specified', async () => {
            // Create a mock implementation that's sufficient for this test
            const mockDB = {
                clear: vi.fn().mockResolvedValue(undefined)
            };
            (highlightStore as any).db = mockDB;

            const result = await highlightStore.removeAllHighlights([]);

            expect(result).toBe(true);
            expect(mockDB.clear).toHaveBeenCalledWith('highlights');
            expect((highlightStore as any).highlights.size).toBe(0); // Should clear in-memory store
            expect((highlightStore as any).notifySubscribers).toHaveBeenCalled();
        });
    });

    // ==========================================
    // SUBSCRIPTION TESTS
    // ==========================================
    describe('Subscription Mechanism', () => {
        test('subscribe should return an unsubscribe function', () => {
            const callback = vi.fn();

            const subscription = highlightStore.subscribe(callback);

            expect(subscription).toHaveProperty('unsubscribe');
            expect(typeof subscription.unsubscribe).toBe('function');
        });

        test('unsubscribe should remove the callback', async () => {
            const callback = vi.fn();

            // Subscribe to changes
            const subscription = highlightStore.subscribe(callback);

            // Unsubscribe
            subscription.unsubscribe();

            // Add a highlight
            await highlightStore.addHighlight(sampleHighlight);

            // Direct call to notifySubscribers
            (highlightStore as any).notifySubscribers('test-file.pdf', 1, HighlightType.MANUAL);

            // Callback should not have been called
            expect(callback).not.toHaveBeenCalled();
        });
    });
});