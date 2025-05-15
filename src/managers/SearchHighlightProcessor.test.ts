import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchHighlightProcessor } from './SearchHighlightProcessor';
import { highlightStore } from '../store/HighlightStore';
import { HighlightType } from '../types';
import { getFileKey } from "../contexts/PDFViewerContext";
import summaryPersistenceStore from '../store/SummaryPersistenceStore';
import { SearchResult } from '../services/processing-backend-services/BatchSearchService';

// Mock dependencies
vi.mock('../store/HighlightStore', () => ({
  highlightStore: {
    getHighlightsByText: vi.fn().mockReturnValue([]),
    removeMultipleHighlights: vi.fn().mockResolvedValue(true),
    addMultipleHighlights: vi.fn().mockImplementation((highlights) => 
      Promise.resolve(highlights.map((h: { id: any; }) => h.id))
    )
  }
}));

vi.mock('../contexts/PDFViewerContext', () => ({
  getFileKey: vi.fn((file) => `key-${file.name}`)
}));

vi.mock('../store/SummaryPersistenceStore', () => ({
  default: {
    addAnalyzedFile: vi.fn(),
    getFileSummaries: vi.fn().mockReturnValue([]),
    updateFileSummary: vi.fn()
  }
}));

describe('SearchHighlightProcessor', () => {
  // Mock window.dispatchEvent
  const originalDispatchEvent = window.dispatchEvent;
  let dispatchEventSpy: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.dispatchEvent
    dispatchEventSpy = vi.fn();
    window.dispatchEvent = dispatchEventSpy;
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    window.dispatchEvent = originalDispatchEvent;
  });
  
  describe('processSearchResults', () => {
    test('should handle empty search results', async () => {
      // Act
      const result = await SearchHighlightProcessor.processSearchResults(
        'test-file-key',
        [],
        'test query'
      );
      
      // Assert
      expect(result).toEqual([]);
      expect(highlightStore.addMultipleHighlights).not.toHaveBeenCalled();
    });
    
    test('should remove existing search highlights for the same term', async () => {
      // Arrange
      const fileKey = 'test-file-key';
      const searchTerm = 'test query';
      const existingHighlights = [
        { id: 'highlight-1', text: searchTerm, type: HighlightType.SEARCH, page: 1, x: 10, y: 20, w: 30, h: 40, fileKey },
        { id: 'highlight-2', text: searchTerm, type: HighlightType.SEARCH, page: 2, x: 15, y: 25, w: 35, h: 45, fileKey }
      ];

      vi.mocked(highlightStore.getHighlightsByText).mockReturnValue(existingHighlights);
      
      const searchResults: SearchResult[] = [
          {
              page: 1,
              x: 10,
              y: 20,
              w: 30,
              h: 40,
              fileKey,
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          }
      ];
      
      // Act
      await SearchHighlightProcessor.processSearchResults(
        fileKey,
        searchResults,
        searchTerm
      );
      
      // Assert
      expect(highlightStore.getHighlightsByText).toHaveBeenCalledWith(fileKey, searchTerm);
      expect(highlightStore.removeMultipleHighlights).toHaveBeenCalledWith(
        ['highlight-1', 'highlight-2']
      );
    });
    
    test('should process valid search results and create highlights', async () => {
      // Arrange
      const fileKey = 'test-file-key';
      const searchTerm = 'test query';
      const searchResults: SearchResult[] = [
          {
              page: 1,
              x: 10,
              y: 20,
              w: 30,
              h: 40,
              fileKey,
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          },
          {
              page: 2,
              x: 15,
              y: 25,
              w: 35,
              h: 45,
              fileKey,
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          }
      ];
      
      // Act
      const result = await SearchHighlightProcessor.processSearchResults(
        fileKey,
        searchResults,
        searchTerm
      );
      
      // Assert
      expect(highlightStore.addMultipleHighlights).toHaveBeenCalled();
      const addedHighlights = vi.mocked(highlightStore.addMultipleHighlights).mock.calls[0][0];
      
      // Should have created 2 highlights
      expect(addedHighlights.length).toBe(2);
      
      // Check properties of the first highlight
      const firstHighlight = addedHighlights[0];
      expect(firstHighlight).toMatchObject({
        page: 1,
        x: 7,  // x - 3 (padding)
        y: 15, // y - 5 (padding)
        w: 33, // w + 3 (padding)
        h: 45, // h + 5 (padding)
        text: searchTerm,
        color: '#71c4ff', // Light blue
        opacity: 0.4,
        type: HighlightType.SEARCH,
        fileKey
      });
      
      // Check that summary information was saved
      expect(summaryPersistenceStore.addAnalyzedFile).toHaveBeenCalledWith('search', fileKey);
      expect(summaryPersistenceStore.updateFileSummary).toHaveBeenCalledWith(
        'search',
        expect.objectContaining({
          fileKey,
          matchCount: 2,
          pageMatches: expect.any(Object)
        })
      );
      
      // Check highlight IDs were returned
      expect(result.length).toBe(2);
    });
    
    test('should skip results for different files', async () => {
      // Arrange
      const fileKey = 'test-file-key';
      const searchTerm = 'test query';
      const searchResults: SearchResult[] = [
          {
              page: 1,
              x: 10,
              y: 20,
              w: 30,
              h: 40,
              fileKey: 'different-file-key' // Different file key
              ,
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          }
      ];
      
      // Act
      const result = await SearchHighlightProcessor.processSearchResults(
        fileKey,
        searchResults,
        searchTerm
      );
      
      // Assert
      expect(highlightStore.addMultipleHighlights).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
    
    test('should track page-level match counts', async () => {
      // Arrange
      const fileKey = 'test-file-key';
      const searchTerm = 'test query';
      const searchResults: SearchResult[] = [
          {
              page: 1, x: 10, y: 20, w: 30, h: 40, fileKey,
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          },
          {
              page: 1, x: 50, y: 60, w: 30, h: 40, fileKey,
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          },
          {
              page: 2, x: 15, y: 25, w: 35, h: 45, fileKey,
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          }
      ];
      
      // Act
      await SearchHighlightProcessor.processSearchResults(
        fileKey,
        searchResults,
        searchTerm
      );
      
      // Assert
      expect(summaryPersistenceStore.updateFileSummary).toHaveBeenCalled();
      const summaryArg = vi.mocked(summaryPersistenceStore.updateFileSummary).mock.calls[0][1];
      
      // Should have tracked matches per page
      expect((summaryArg as any).matchCount).toBe(3);
      expect((summaryArg as any).pageMatches).toEqual({
        "1": 2, // 2 matches on page 1
        "2": 1  // 1 match on page 2
      });
    });
    
    test('should dispatch event when isFirstFile is true', async () => {
      // Arrange
      const fileKey = 'test-file-key';
      const searchTerm = 'test query';
      const searchResults: SearchResult[] = [
          {
              page: 1, x: 10, y: 20, w: 30, h: 40, fileKey,
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          }
      ];
      
      // Act
      await SearchHighlightProcessor.processSearchResults(
        fileKey,
        searchResults,
        searchTerm,
        true // isFirstFile = true
      );
      
      // Assert
      expect(dispatchEventSpy).toHaveBeenCalled();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.type).toBe('search-summary-updated');
      expect(event.detail).toEqual(expect.objectContaining({
        fileKey,
        fileName: fileKey,
        summary: expect.anything()
      }));
    });
    
    test('should handle error when updating persistence store', async () => {
      // Arrange
      const fileKey = 'test-file-key';
      const searchTerm = 'test query';
      const searchResults: SearchResult[] = [
          {
              page: 1, x: 10, y: 20, w: 30, h: 40, fileKey,
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          }
      ];
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(summaryPersistenceStore.updateFileSummary).mockImplementationOnce(() => {
        throw new Error('Store update failed');
      });
      
      // Act
      const result = await SearchHighlightProcessor.processSearchResults(
        fileKey,
        searchResults,
        searchTerm
      );
      
      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SearchHighlightProcessor] Error updating persistence store:',
        expect.any(Error)
      );
      expect(result.length).toBe(1); // Should still return highlight IDs
    });
  });
  
  describe('processBatchSearchResults', () => {
    test('should handle empty batch results', async () => {
      // Act
      const result = await SearchHighlightProcessor.processBatchSearchResults(
        new Map(),
        'test query'
      );
      
      // Assert
      expect(result).toBe(false);
    });
    
    test('should process multiple files in batch', async () => {
      // Arrange
      const searchTerm = 'test query';
      const batchResults = new Map<string, SearchResult[]>();
      
      batchResults.set('file-key-1', [
          {
              page: 1, x: 10, y: 20, w: 30, h: 40, fileKey: 'file-key-1',
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          }
      ]);
      
      batchResults.set('file-key-2', [
          {
              page: 1, x: 15, y: 25, w: 35, h: 45, fileKey: 'file-key-2',
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          },
          {
              page: 2, x: 55, y: 65, w: 35, h: 45, fileKey: 'file-key-2',
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          }
      ]);
      
      // Mock processSearchResults to verify calls
      const processSpy = vi.spyOn(SearchHighlightProcessor, 'processSearchResults')
        .mockResolvedValueOnce(['id-1'])
        .mockResolvedValueOnce(['id-2', 'id-3']);
      
      // Act
      const result = await SearchHighlightProcessor.processBatchSearchResults(
        batchResults,
        searchTerm
      );
      
      // Assert
      expect(result).toBe(true);
      expect(processSpy).toHaveBeenCalledTimes(2);
      expect(processSpy).toHaveBeenCalledWith('file-key-1', batchResults.get('file-key-1'), searchTerm);
      expect(processSpy).toHaveBeenCalledWith('file-key-2', batchResults.get('file-key-2'), searchTerm);
    });
    
    test('should skip files with no results', async () => {
      // Arrange
      const searchTerm = 'test query';
      const batchResults = new Map<string, SearchResult[]>();
      
      batchResults.set('file-key-1', []);
      batchResults.set('file-key-2', [
          {
              page: 1, x: 15, y: 25, w: 35, h: 45, fileKey: 'file-key-2',
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          }
      ]);
      
      // Mock processSearchResults to verify calls
      const processSpy = vi.spyOn(SearchHighlightProcessor, 'processSearchResults')
        .mockResolvedValueOnce(['id-1']);
      
      // Act
      await SearchHighlightProcessor.processBatchSearchResults(
        batchResults,
        searchTerm
      );
      
      // Assert
      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(processSpy).toHaveBeenCalledWith('file-key-2', batchResults.get('file-key-2'), searchTerm);
    });
    
    test('should handle errors during processing', async () => {
      // Arrange
      const searchTerm = 'test query';
      const batchResults = new Map<string, SearchResult[]>();
      
      batchResults.set('file-key-1', [
          {
              page: 1, x: 10, y: 20, w: 30, h: 40, fileKey: 'file-key-1',
              id: '',
              color: '',
              opacity: 0,
              type: HighlightType.MANUAL,
              text: ''
          }
      ]);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processSpy = vi.spyOn(SearchHighlightProcessor, 'processSearchResults')
        .mockRejectedValueOnce(new Error('Processing failed'));
      
      // Act
      const result = await SearchHighlightProcessor.processBatchSearchResults(
        batchResults,
        searchTerm
      );
      
      // Assert
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        `[SearchHighlightProcessor] Error in batch search processing:`,
        expect.any(Error)
      );
    });
  });
});
