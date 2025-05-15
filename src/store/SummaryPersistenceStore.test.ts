import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import summaryPersistenceStore, { EntityFileSummary, SearchFileSummary } from '../store/SummaryPersistenceStore';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        getAllItems: () => store
    };
})();

// Mock window event dispatch
global.window.dispatchEvent = vi.fn();

// Assign mock to global object
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('SummaryPersistenceStore', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.resetAllMocks();
        localStorageMock.clear();

        // Spy on private methods/properties
        vi.spyOn(summaryPersistenceStore as any, 'notifySubscribers').mockImplementation(() => {});
        vi.spyOn(summaryPersistenceStore as any, 'subscribers', 'get').mockReturnValue(new Map());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ==========================================
    // ANALYZED FILES MANAGEMENT TESTS
    // ==========================================
    describe('Analyzed Files Management', () => {
        test('getAnalyzedFiles should return an empty set if no files are stored', () => {
            const entityFiles = summaryPersistenceStore.getAnalyzedFiles('entity');
            const searchFiles = summaryPersistenceStore.getAnalyzedFiles('search');

            expect(entityFiles.size).toBe(0);
            expect(searchFiles.size).toBe(0);
            expect(localStorageMock.getItem).toHaveBeenCalledTimes(2);
        });

        test('getAnalyzedFiles should return files from localStorage', () => {
            // Setup mock data
            localStorageMock.setItem('entity-detection-analyzed-files', JSON.stringify(['file1.pdf', 'file2.pdf']));
            localStorageMock.setItem('search-analyzed-files', JSON.stringify(['file1.pdf']));

            const entityFiles = summaryPersistenceStore.getAnalyzedFiles('entity');
            const searchFiles = summaryPersistenceStore.getAnalyzedFiles('search');

            expect(entityFiles.size).toBe(2);
            expect(entityFiles.has('file1.pdf')).toBe(true);
            expect(entityFiles.has('file2.pdf')).toBe(true);

            expect(searchFiles.size).toBe(1);
            expect(searchFiles.has('file1.pdf')).toBe(true);
        });

        test('addAnalyzedFile should add a file to the analyzed set', () => {
            const initialEntityFiles = summaryPersistenceStore.getAnalyzedFiles('entity');
            expect(initialEntityFiles.size).toBe(0);

            summaryPersistenceStore.addAnalyzedFile('entity', 'newFile.pdf');

            const updatedEntityFiles = summaryPersistenceStore.getAnalyzedFiles('entity');
            expect(updatedEntityFiles.size).toBe(1);
            expect(updatedEntityFiles.has('newFile.pdf')).toBe(true);

            // Verify localStorage was updated
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'entity-detection-analyzed-files',
                JSON.stringify(['newFile.pdf'])
            );

            // Verify subscribers were notified
            expect((summaryPersistenceStore as any).notifySubscribers).toHaveBeenCalledWith(
                'entity-analyzed-files-updated',
                expect.any(Set)
            );
        });

    });

    // ==========================================
    // FILE SUMMARIES MANAGEMENT TESTS
    // ==========================================
    describe('File Summaries Management', () => {
        test('getFileSummaries should return an empty array if no summaries are stored', () => {
            const entitySummaries = summaryPersistenceStore.getFileSummaries('entity');
            const searchSummaries = summaryPersistenceStore.getFileSummaries('search');

            expect(entitySummaries).toEqual([]);
            expect(searchSummaries).toEqual([]);
            expect(localStorageMock.getItem).toHaveBeenCalledTimes(2);
        });

        test('getFileSummaries should return summaries from localStorage', () => {
            // Setup mock data
            const entitySummary = {
                fileKey: 'file1.pdf',
                fileName: 'File 1',
                entities_detected: { total: 5 },
                performance: { sanitize_time: 500 }
            };

            const searchSummary = {
                fileKey: 'file1.pdf',
                fileName: 'File 1',
                matchCount: 10,
                pageMatches: { 1: 5, 2: 5 }
            };

            localStorageMock.setItem('entity-detection-file-summaries', JSON.stringify([entitySummary]));
            localStorageMock.setItem('search-file-summaries', JSON.stringify([searchSummary]));

            const entitySummaries = summaryPersistenceStore.getFileSummaries<EntityFileSummary>('entity');
            const searchSummaries = summaryPersistenceStore.getFileSummaries<SearchFileSummary>('search');

            expect(entitySummaries).toHaveLength(1);
            expect(entitySummaries[0].fileKey).toBe('file1.pdf');
            expect(entitySummaries[0].entities_detected).toEqual({ total: 5 });

            expect(searchSummaries).toHaveLength(1);
            expect(searchSummaries[0].fileKey).toBe('file1.pdf');
            expect(searchSummaries[0].matchCount).toBe(10);
        });

        test('updateFileSummary should add a new summary if file not present', () => {
            // Create a new summary
            const newSummary = {
                fileKey: 'newFile.pdf',
                fileName: 'New File',
                entities_detected: { total: 10 },
                performance: { sanitize_time: 300 }
            };

            // Update with new summary
            summaryPersistenceStore.updateFileSummary('entity', newSummary);

            // Verify summary was added
            const entitySummaries = summaryPersistenceStore.getFileSummaries<EntityFileSummary>('entity');
            expect(entitySummaries).toHaveLength(1);
            expect(entitySummaries[0].fileKey).toBe('newFile.pdf');

            // Verify localStorage was updated
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'entity-detection-file-summaries',
                expect.stringContaining('newFile.pdf')
            );

            // Verify subscribers were notified
            expect((summaryPersistenceStore as any).notifySubscribers).toHaveBeenCalledWith(
                'entity-summaries-updated',
                expect.arrayContaining([expect.objectContaining({ fileKey: 'newFile.pdf' })])
            );
        });

        test('updateFileSummary should update existing summary for same file', () => {
            // Setup initial state
            const initialSummary = {
                fileKey: 'file1.pdf',
                fileName: 'File 1',
                entities_detected: { total: 5 },
                performance: { sanitize_time: 500 }
            };

            localStorageMock.setItem('entity-detection-file-summaries', JSON.stringify([initialSummary]));

            // Update with new data for same file
            const updatedSummary = {
                fileKey: 'file1.pdf',
                fileName: 'File 1 Updated',
                entities_detected: { total: 10 },
                performance: { sanitize_time: 300 }
            };

            summaryPersistenceStore.updateFileSummary('entity', updatedSummary);

            // Verify summary was updated
            const entitySummaries = summaryPersistenceStore.getFileSummaries<EntityFileSummary>('entity');
            expect(entitySummaries).toHaveLength(1);
            expect(entitySummaries[0].fileName).toBe('File 1 Updated');
            expect(entitySummaries[0].entities_detected.total).toBe(10);

            // Verify localStorage was updated
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'entity-detection-file-summaries',
                expect.stringContaining('File 1 Updated')
            );
        });

        test('clearAllData should remove all data for a specific type', () => {
            // Setup initial state
            localStorageMock.setItem('entity-detection-analyzed-files', JSON.stringify(['file1.pdf']));
            localStorageMock.setItem('entity-detection-file-summaries', JSON.stringify([
                { fileKey: 'file1.pdf', fileName: 'File 1' }
            ]));

            // Clear all entity data
            summaryPersistenceStore.clearAllData('entity');

            // Verify all entity data was cleared
            expect(localStorageMock.setItem).toHaveBeenCalledWith('entity-detection-analyzed-files', '[]');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('entity-detection-file-summaries', '[]');

            // Verify event was dispatched
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'entity-all-cleared'
                })
            );

            // Verify subscribers were notified
            expect((summaryPersistenceStore as any).notifySubscribers).toHaveBeenCalledWith(
                'entity-all-cleared',
                null
            );
        });

        test('resetFileSummary should remove summary for a specific file', () => {
            // Setup initial state
            const summaries = [
                {
                    fileKey: 'file1.pdf',
                    fileName: 'File 1',
                    entities_detected: { total: 5 }
                },
                {
                    fileKey: 'file2.pdf',
                    fileName: 'File 2',
                    entities_detected: { total: 10 }
                }
            ];

            localStorageMock.setItem('entity-detection-file-summaries', JSON.stringify(summaries));

            // Reset summary for file1.pdf
            summaryPersistenceStore.resetFileSummary('entity', 'file1.pdf');

            // Verify summary was removed
            const entitySummaries = summaryPersistenceStore.getFileSummaries<EntityFileSummary>('entity');
            expect(entitySummaries).toHaveLength(1);
            expect(entitySummaries[0].fileKey).toBe('file2.pdf');

            // Verify localStorage was updated
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'entity-detection-file-summaries',
                expect.not.stringContaining('file1.pdf')
            );

            // Verify event was dispatched
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'entity-summary-reset',
                    detail: expect.objectContaining({ fileKey: 'file1.pdf' })
                })
            );
        });
    });

    // ==========================================
    // SEARCH QUERIES MANAGEMENT TESTS
    // ==========================================
    describe('Search Queries Management', () => {
        test('saveActiveSearchQueries should store queries in localStorage', () => {
            const queries = [
                { term: 'query1', case_sensitive: true, ai_search: false },
                { term: 'query2', case_sensitive: false, ai_search: true }
            ];

            summaryPersistenceStore.saveActiveSearchQueries(queries);

            // Verify localStorage was updated
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'search-active-queries',
                JSON.stringify(queries)
            );
        });

        test('getActiveSearchQueries should return queries from localStorage', () => {
            const queries = [
                { term: 'query1', case_sensitive: true, ai_search: false },
                { term: 'query2', case_sensitive: false, ai_search: true }
            ];

            localStorageMock.setItem('search-active-queries', JSON.stringify(queries));

            const result = summaryPersistenceStore.getActiveSearchQueries();

            expect(result).toHaveLength(2);
            expect(result[0].term).toBe('query1');
            expect(result[1].term).toBe('query2');
        });

        test('getActiveSearchQueries should return empty array if no queries stored', () => {
            const result = summaryPersistenceStore.getActiveSearchQueries();
            expect(result).toEqual([]);
        });

        test('getActiveSearchQueries should handle invalid JSON gracefully', () => {
            // Set invalid JSON in localStorage
            localStorageMock.setItem('search-active-queries', 'invalid-json');

            // Mock console.error to prevent test output noise
            const originalError = console.error;
            console.error = vi.fn();

            const result = summaryPersistenceStore.getActiveSearchQueries();

            // Verify result is empty array despite the error
            expect(result).toEqual([]);
            expect(console.error).toHaveBeenCalled();

            // Restore console.error
            console.error = originalError;
        });

        test('removeSearchQuery should remove a specific query', () => {
            const queries = [
                { query: 'query1', fileKey: 'file1.pdf' },
                { query: 'query2', fileKey: 'file2.pdf' }
            ];

            localStorageMock.setItem('search-active-queries', JSON.stringify(queries));

            // Remove first query
            summaryPersistenceStore.removeSearchQuery({ query: 'query1' });

            // Verify query was removed
            const updatedQueries = JSON.parse(localStorageMock.getItem('search-active-queries') || '[]');
            expect(updatedQueries).toHaveLength(1);
            expect(updatedQueries[0].query).toBe('query2');
        });
    });

    // ==========================================
    // SUBSCRIPTION & EVENT TESTS
    // ==========================================
    describe('Subscription & Event Mechanism', () => {
        test('subscribe should return an unsubscribe function', () => {
            // Override mock for this test to access real subscribers
            vi.restoreAllMocks();

            const callback = vi.fn();
            const subscription = summaryPersistenceStore.subscribe('test-event', callback);

            expect(subscription).toHaveProperty('unsubscribe');
            expect(typeof subscription.unsubscribe).toBe('function');
        });

        test('subscribers should be notified when relevant changes occur', () => {
            // Override mock for notifySubscribers for this test
            vi.restoreAllMocks();

            // Mock the internal subscribers Map
            const mockSubscribersMap = new Map();
            const mockCallbacks = new Set();
            const callback = vi.fn();
            mockCallbacks.add(callback);
            mockSubscribersMap.set('entity-analyzed-files-updated', mockCallbacks);
            (summaryPersistenceStore as any).subscribers = mockSubscribersMap;

            // Trigger a function that should notify subscribers
            summaryPersistenceStore.addAnalyzedFile('entity', 'test-file.pdf');

            // Verify callback was called
            expect(callback).toHaveBeenCalled();
        });

        test('unsubscribe should remove the callback', () => {
            // Override mock for this test to access real subscribers
            vi.restoreAllMocks();

            // Create a real subscription
            const callback = vi.fn();
            const subscription = summaryPersistenceStore.subscribe('test-event', callback);

            // Mock notifySubscribers to verify callback removal
            const originalNotify = (summaryPersistenceStore as any).notifySubscribers;
            (summaryPersistenceStore as any).notifySubscribers = vi.fn((...args) => {
                originalNotify.apply(summaryPersistenceStore, args);
            });

            // Unsubscribe
            subscription.unsubscribe();

            // Trigger notification
            (summaryPersistenceStore as any).notifySubscribers('test-event', {});

            // Verify callback was not called
            expect(callback).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // ERROR HANDLING TESTS
    // ==========================================
    describe('Error Handling', () => {
        test('saveAnalyzedFiles should handle localStorage exceptions', () => {
            // Make localStorage.setItem throw an error
            localStorageMock.setItem.mockImplementationOnce(() => {
                throw new Error('Storage error');
            });

            // Mock console.error to prevent test output noise
            const originalError = console.error;
            console.error = vi.fn();

            // Try to save
            const fileSet = new Set(['file1.pdf']);
            summaryPersistenceStore.saveAnalyzedFiles('entity', fileSet);

            // Verify error was logged
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('Error saving entity analyzed files'),
                expect.any(Error)
            );

            // Restore console.error
            console.error = originalError;
        });

        test('getFileSummaries should handle parsing errors', () => {
            // Set invalid JSON in localStorage
            localStorageMock.setItem('entity-detection-file-summaries', 'invalid-json');

            // Mock console.error to prevent test output noise
            const originalError = console.error;
            console.error = vi.fn();

            // Try to get summaries
            const result = summaryPersistenceStore.getFileSummaries('entity');

            // Verify empty array is returned despite error
            expect(result).toEqual([]);
            expect(console.error).toHaveBeenCalled();

            // Restore console.error
            console.error = originalError;
        });

        test('notifySubscribers should handle errors in callbacks', () => {
            // Setup a subscriber that throws an error
            vi.restoreAllMocks();

            const mockSubscribersMap = new Map();
            const mockCallbacks = new Set();

            // Add a callback that throws
            const errorCallback = vi.fn().mockImplementation(() => {
                throw new Error('Callback error');
            });
            mockCallbacks.add(errorCallback);

            // Add a normal callback
            const normalCallback = vi.fn();
            mockCallbacks.add(normalCallback);

            mockSubscribersMap.set('test-event', mockCallbacks);
            (summaryPersistenceStore as any).subscribers = mockSubscribersMap;

            // Mock console.error to prevent test output noise
            const originalError = console.error;
            console.error = vi.fn();

            // Trigger notification
            (summaryPersistenceStore as any).notifySubscribers('test-event', {});

            // Verify error was caught and logged
            expect(console.error).toHaveBeenCalled();

            // Verify normal callback was still called despite error in first callback
            expect(normalCallback).toHaveBeenCalled();

            // Restore console.error
            console.error = originalError;
        });
    });
});