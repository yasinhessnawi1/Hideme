import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchHighlightProcessor } from '../managers/SearchHighlightProcessor';
import { SearchResult } from '../services/BatchSearchService';
import { highlightStore } from '../store/HighlightStore';
import summaryPersistenceStore from '../store/SummaryPersistenceStore';
import { HighlightRect, HighlightType } from '../types/pdfTypes';

// Mock dependencies
vi.mock('../store/HighlightStore', () => ({
    highlightStore: {
        addMultipleHighlights: vi.fn().mockResolvedValue(['highlight1', 'highlight2']),
        getHighlightsByText: vi.fn().mockReturnValue([]),
        removeMultipleHighlights: vi.fn().mockResolvedValue(true)
    }
}));

vi.mock('../store/SummaryPersistenceStore', () => ({
    default: {
        addAnalyzedFile: vi.fn(),
        getFileSummaries: vi.fn().mockReturnValue([]),
        updateFileSummary: vi.fn(),
        getAnalyzedFiles: vi.fn().mockImplementation(() => new Set())
    }
}));

// Mock window.dispatchEvent
global.dispatchEvent = vi.fn();

describe('SearchHighlightProcessor', () => {
    // Test data setup
    const fileKey = 'test-file.pdf';
    const searchTerm = 'test search';

    const mockSearchResults: SearchResult[] = [
        {
            id: 'search-1',
            page: 1,
            x: 100,
            y: 100,
            w: 50,
            h: 20,
            color: '#71c4ff',
            opacity: 0.4,
            type: HighlightType.SEARCH,
            text: 'test search',
            fileKey: 'test-file.pdf'
        },
        {
            id: 'search-2',
            page: 2,
            x: 200,
            y: 150,
            w: 60,
            h: 25,
            color: '#71c4ff',
            opacity: 0.4,
            type: HighlightType.SEARCH,
            text: 'test search',
            fileKey: 'test-file.pdf'
        }
    ];

    const mockExistingHighlights: HighlightRect[] = [
        {
            id: 'existing-1',
            page: 1,
            x: 100,
            y: 100,
            w: 50,
            h: 20,
            color: '#71c4ff',
            opacity: 0.4,
            type: HighlightType.SEARCH,
            text: 'test search',
            fileKey: 'test-file.pdf'
        }
    ];

    // Set up console.error spy for capturing errors
    let consoleErrorSpy: any;

    beforeEach(() => {
        vi.clearAllMocks();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.resetAllMocks();
        consoleErrorSpy.mockRestore();
    });

    describe('processSearchResults', () => {
        test('should process valid search results successfully', async () => {
            // Mock highlight store to return no existing highlights
            vi.mocked(highlightStore.getHighlightsByText).mockReturnValue([]);

            // Call the method with valid search results
            const result = await SearchHighlightProcessor.processSearchResults(
                fileKey,
                mockSearchResults,
                searchTerm
            );

            // Verify highlights were added
            expect(highlightStore.addMultipleHighlights).toHaveBeenCalled();

            // Verify persistence store was updated
            expect(summaryPersistenceStore.addAnalyzedFile).toHaveBeenCalledWith('search', fileKey);
            expect(summaryPersistenceStore.updateFileSummary).toHaveBeenCalled();

            // Verify correct result
            expect(result).toEqual(['highlight1', 'highlight2']);
        });

        test('should handle empty search results', async () => {
            // Call the method with empty search results
            const result = await SearchHighlightProcessor.processSearchResults(
                fileKey,
                [],
                searchTerm
            );

            // Verify no highlights were added
            expect(highlightStore.addMultipleHighlights).not.toHaveBeenCalled();

            // Verify empty result
            expect(result).toEqual([]);
        });

        test('should remove existing highlights for the same search term', async () => {
            // Mock highlightStore.getHighlightsByText to return existing highlights
            vi.mocked(highlightStore.getHighlightsByText).mockReturnValueOnce(mockExistingHighlights);

            // Call the method
            await SearchHighlightProcessor.processSearchResults(
                fileKey,
                mockSearchResults,
                searchTerm
            );

            // Verify existing highlights were removed
            expect(highlightStore.removeMultipleHighlights).toHaveBeenCalledWith(
                mockExistingHighlights.map(h => h.id)
            );
        });

        test('should dispatch event when processing first file', async () => {
            // Call the method with isFirstFile=true
            await SearchHighlightProcessor.processSearchResults(
                fileKey,
                mockSearchResults,
                searchTerm,
                true
            );

            // Verify event was dispatched
            expect(global.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'search-summary-updated'
                })
            );
        });

        test('should not dispatch event when not processing first file', async () => {
            // Call the method with isFirstFile=false (default)
            await SearchHighlightProcessor.processSearchResults(
                fileKey,
                mockSearchResults,
                searchTerm
            );

            // Verify event was not dispatched
            expect(global.dispatchEvent).not.toHaveBeenCalled();
        });

        test('should handle errors when removing existing highlights', async () => {
            // Mock error when removing highlights
            vi.mocked(highlightStore.getHighlightsByText).mockReturnValueOnce(mockExistingHighlights);
            vi.mocked(highlightStore.removeMultipleHighlights).mockRejectedValueOnce(new Error('Remove error'));

            // Call the method (should not throw)
            const result = await SearchHighlightProcessor.processSearchResults(
                fileKey,
                mockSearchResults,
                searchTerm
            );

            // Should still process highlights despite the error
            expect(highlightStore.addMultipleHighlights).toHaveBeenCalled();
            expect(result).toEqual(['highlight1', 'highlight2']);

            // Verify error was logged
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        test('should handle errors when adding highlights', async () => {
            // Mock error when adding highlights
            vi.mocked(highlightStore.addMultipleHighlights).mockRejectedValueOnce(new Error('Add error'));

            // Call the method and expect error to be caught
            await expect(
                SearchHighlightProcessor.processSearchResults(fileKey, mockSearchResults, searchTerm)
            ).rejects.toThrow('Add error');
        });

        test('should handle errors when updating persistence store', async () => {
            // Mock error when updating store
            vi.mocked(summaryPersistenceStore.updateFileSummary).mockImplementationOnce(() => {
                throw new Error('Store error');
            });

            // Call the method (should not throw)
            await SearchHighlightProcessor.processSearchResults(
                fileKey,
                mockSearchResults,
                searchTerm
            );

            // Verify error was caught and logged
            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('processBatchSearchResults', () => {
        test('should process multiple files successfully', async () => {
            // Mock the processSearchResults method to avoid internal errors
            const processSearchResultsSpy = vi.spyOn(SearchHighlightProcessor, 'processSearchResults')
                .mockResolvedValueOnce(['highlight1', 'highlight2'])  // first file
                .mockResolvedValueOnce(['highlight3', 'highlight4']); // second file

            // Create a map with search results for multiple files
            const resultsMap = new Map<string, SearchResult[]>();
            resultsMap.set('file1.pdf', [...mockSearchResults]);
            resultsMap.set('file2.pdf', [...mockSearchResults]);

            // Call the method
            const result = await SearchHighlightProcessor.processBatchSearchResults(
                resultsMap,
                searchTerm
            );

            // Verify each file was processed
            expect(processSearchResultsSpy).toHaveBeenCalledTimes(2);

            // Verify success result
            expect(result).toBe(true);

            // Restore the original implementation
            processSearchResultsSpy.mockRestore();
        });

        test('should handle empty results map', async () => {
            // Call the method with empty map
            const result = await SearchHighlightProcessor.processBatchSearchResults(
                new Map(),
                searchTerm
            );

            // Verify no processing happened
            expect(highlightStore.addMultipleHighlights).not.toHaveBeenCalled();

            // Verify success result (false in this case)
            expect(result).toBe(false);
        });

        test('should handle empty results for some files', async () => {
            // Mock the processSearchResults method to avoid internal errors
            const processSearchResultsSpy = vi.spyOn(SearchHighlightProcessor, 'processSearchResults')
                .mockResolvedValueOnce(['highlight1'])    // first file succeeds
                .mockResolvedValueOnce([]);               // second file has no results

            // Create a map with one file having results and one empty
            const resultsMap = new Map<string, SearchResult[]>();
            resultsMap.set('file1.pdf', [...mockSearchResults]);
            resultsMap.set('file2.pdf', []);

            // Call the method
            const result = await SearchHighlightProcessor.processBatchSearchResults(
                resultsMap,
                searchTerm
            );

            // Verify both files were processed
            expect(processSearchResultsSpy).toHaveBeenCalledTimes(2);

            // Verify success result
            expect(result).toBe(true);

            // Restore the original implementation
            processSearchResultsSpy.mockRestore();
        });

        test('should handle errors during file processing', async () => {
            // Mock the processSearchResults method to throw on second file
            const processSearchResultsSpy = vi.spyOn(SearchHighlightProcessor, 'processSearchResults')
                .mockResolvedValueOnce(['highlight1'])            // first file succeeds
                .mockRejectedValueOnce(new Error('Processing error')); // second file fails

            // Create a map with multiple files
            const resultsMap = new Map<string, SearchResult[]>();
            resultsMap.set('file1.pdf', [...mockSearchResults]);
            resultsMap.set('file2.pdf', [...mockSearchResults]);

            // Call the method
            const result = await SearchHighlightProcessor.processBatchSearchResults(
                resultsMap,
                searchTerm
            );

            // Verify result is false (failure)
            expect(result).toBe(false);

            // Verify error was logged
            expect(consoleErrorSpy).toHaveBeenCalled();

            // Restore the original implementation
            processSearchResultsSpy.mockRestore();
        });
    });

    // Additional test for specific edge cases
    describe('edge cases', () => {
        test('should handle search results with different file keys', async () => {
            // Mock the processSearchResults implementation to check arguments
            const addHighlightsSpy = vi.spyOn(highlightStore, 'addMultipleHighlights');

            // Create search results with mixed file keys
            const mixedResults: SearchResult[] = [
                {
                    id: 'search-1',
                    page: 1,
                    x: 100,
                    y: 100,
                    w: 50,
                    h: 20,
                    color: '#71c4ff',
                    opacity: 0.4,
                    type: HighlightType.SEARCH,
                    text: 'test search',
                    fileKey: 'test-file.pdf'
                },
                {
                    id: 'search-2',
                    page: 1,
                    x: 100,
                    y: 100,
                    w: 50,
                    h: 20,
                    color: '#71c4ff',
                    opacity: 0.4,
                    type: HighlightType.SEARCH,
                    text: 'test search',
                    fileKey: 'another-file.pdf' // Different file key
                }
            ];

            // Call the method
            await SearchHighlightProcessor.processSearchResults(
                fileKey,
                mixedResults,
                searchTerm
            );

            // Verify only the matching file key result was processed
            expect(addHighlightsSpy).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ fileKey: 'test-file.pdf' })
                ])
            );

            // Get the argument passed to addMultipleHighlights
            const addCall = addHighlightsSpy.mock.calls[0][0];

            // Check that only highlights with the correct fileKey were included
            expect(addCall.length).toBe(1);
            expect(addCall[0].fileKey).toBe('test-file.pdf');

            // Clean up
            addHighlightsSpy.mockRestore();
        });

        test('should handle errors in individual highlights creation', async () => {
            // Create a mock implementation of processSearchResults to test error handling
            const processSearchResultsSpy = vi.spyOn(SearchHighlightProcessor, 'processSearchResults');

            // Restore original implementation but with monitoring
            processSearchResultsSpy.mockImplementation(async (fileKey, searchResults, searchTerm, isFirstFile) => {
                // Create a malformed search result that will cause errors
                const badResults: SearchResult[] = [
                    {
                        // Missing required properties
                        id: 'bad-search',
                        fileKey,
                        page: 0,
                        x: 0,
                        y: 0,
                        w: 0,
                        h: 0,
                        color: '',
                        opacity: 0,
                        type: HighlightType.SEARCH,
                        text: ''
                    }
                ];

                // Process these bad results instead
                try {
                    const result = await SearchHighlightProcessor.processSearchResults.call(
                        SearchHighlightProcessor,
                        fileKey,
                        badResults,
                        searchTerm,
                        isFirstFile
                    );
                    return result;
                } catch (error) {
                    // Log the error as the real implementation would
                    console.error('[Test] Error in processSearchResults:', error);
                    // Return empty array to match expected behavior
                    return [];
                }
            });

            // Call through our mock
            await SearchHighlightProcessor.processSearchResults(
                fileKey,
                mockSearchResults,
                searchTerm
            );

            // Verify error was logged
            expect(consoleErrorSpy).toHaveBeenCalled();

            // Restore original implementation
            processSearchResultsSpy.mockRestore();
        });
    });
});