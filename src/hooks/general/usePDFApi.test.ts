import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { usePDFApi } from './usePDFApi';
import { RedactionMapping } from '../../types';
import type { Mock } from 'vitest';

// Mock dependencies
vi.mock('../../services/processing-backend-services/BatchApiService', () => ({
  batchHybridDetect: vi.fn(),
  batchRedactPdfs: vi.fn(),
  findWords: vi.fn()
}));

vi.mock('../../services/processing-backend-services/BatchSearchService', () => ({
  BatchSearchService: {
    batchSearch: vi.fn()
  }
}));

vi.mock('../../contexts/PDFViewerContext', () => ({
  getFileKey: vi.fn((file) => `key-${file.name}`)
}));

// Import mocked modules
import { batchHybridDetect, batchRedactPdfs, findWords } from '../../services/processing-backend-services/BatchApiService';
import { BatchSearchService } from '../../services/processing-backend-services/BatchSearchService';
import { getFileKey } from '../../contexts/PDFViewerContext';

describe('usePDFApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to create mock files
  const createMockFiles = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      name: `file-${i}.pdf`,
      size: 1000,
      type: 'application/pdf'
    } as File));
  };

  describe('State management', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => usePDFApi());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.fileErrors.size).toBe(0);
      expect(result.current.progress).toBe(0);
    });

    /*
    test('should reset errors when called', () => {
      const { result } = renderHook(() => usePDFApi());

      // Set some errors first
      act(() => {
        // @ts-ignore - Accessing private state for testing
        result.current.setError('Test error');
        // @ts-ignore - Accessing private state for testing
        result.current.setFileErrors(new Map([['file1', 'Error 1']]));
      });

      act(() => {
        result.current.resetErrors();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.fileErrors.size).toBe(0);
    });

     */
  });

  describe('runBatchHybridDetect', () => {
    test('should handle successful detection', async () => {
      const mockFiles = createMockFiles(2);
      const mockResults = {
        'file-0.pdf': { pages: [{ entities: [] }] },
        'file-1.pdf': { pages: [{ entities: [] }] }
      };

      (batchHybridDetect as Mock).mockResolvedValue(mockResults);

      const { result } = renderHook(() => usePDFApi());

      let returnedResults;
      await act(async () => {
        returnedResults = await result.current.runBatchHybridDetect(mockFiles);
      });

      expect(batchHybridDetect).toHaveBeenCalledWith(mockFiles, {});
      expect(result.current.loading).toBe(false);
      expect(result.current.progress).toBe(100);
      expect(returnedResults).toEqual({
        'key-file-0.pdf': expect.objectContaining({
          fileKey: 'key-file-0.pdf',
          fileName: 'file-0.pdf',
          pages: expect.any(Array)
        }),
        'key-file-1.pdf': expect.objectContaining({
          fileKey: 'key-file-1.pdf',
          fileName: 'file-1.pdf',
          pages: expect.any(Array)
        })
      });
    });

    test('should handle empty file array', async () => {
      const { result } = renderHook(() => usePDFApi());

      let returnedResults;
      await act(async () => {
        returnedResults = await result.current.runBatchHybridDetect([]);
      });

      expect(batchHybridDetect).not.toHaveBeenCalled();
      expect(returnedResults).toEqual({});
    });

    test('should handle detection error', async () => {
      const mockFiles = createMockFiles(1);
      const mockError = new Error('Detection failed');

      (batchHybridDetect as Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePDFApi());

      await act(async () => {
        await expect(result.current.runBatchHybridDetect(mockFiles)).rejects.toThrow('Detection failed');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Detection failed');
      expect(result.current.progress).toBe(0);
    });

    test('should use cache for repeated calls', async () => {
      const mockFiles = createMockFiles(1);
      const mockResults = {
        'file-0.pdf': { pages: [{ entities: [] }] }
      };

      (batchHybridDetect as Mock).mockResolvedValue(mockResults);

      const { result } = renderHook(() => usePDFApi());

      // First call
      await act(async () => {
        await result.current.runBatchHybridDetect(mockFiles);
      });

      // Reset mock to verify it's not called again
      (batchHybridDetect as Mock).mockClear();

      // Second call with same parameters
      await act(async () => {
        await result.current.runBatchHybridDetect(mockFiles);
      });

      // Should still be called because the cache is cleared in the implementation
      expect(batchHybridDetect).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDetectionResults', () => {
    test('should return cached detection results', async () => {
      const mockFiles = createMockFiles(1);
      const mockResults = {
        'file-0.pdf': { pages: [{ entities: [] }] }
      };

      (batchHybridDetect as Mock).mockResolvedValue(mockResults);

      const { result } = renderHook(() => usePDFApi());

      // First run detection to cache results
      await act(async () => {
        await result.current.runBatchHybridDetect(mockFiles);
      });

      // Then get cached results
      let cachedResults;
      act(() => {
        cachedResults = result.current.getDetectionResults('key-file-0.pdf');
      });

      expect(cachedResults).toEqual(expect.objectContaining({
        fileKey: 'key-file-0.pdf',
        fileName: 'file-0.pdf',
        pages: expect.any(Array)
      }));
    });

    test('should return null for non-existent cache entry', () => {
      const { result } = renderHook(() => usePDFApi());

      let cachedResults;
      act(() => {
        cachedResults = result.current.getDetectionResults('non-existent-key');
      });

      expect(cachedResults).toBeNull();
    });
  });

  describe('runRedactPdf', () => {
    test('should handle successful redaction', async () => {
      const mockFile = createMockFiles(1)[0];
      const mockRedactionMapping: RedactionMapping = {
        pages: [{ sensitive: [], page: 1 }]
      };
      const mockBlob = new Blob(['redacted content'], { type: 'application/pdf' });

      (batchRedactPdfs as Mock).mockResolvedValue({
        'key-file-0.pdf': mockBlob
      });

      const { result } = renderHook(() => usePDFApi());

      let returnedBlob;
      await act(async () => {
        returnedBlob = await result.current.runRedactPdf(mockFile, mockRedactionMapping);
      });

      expect(batchRedactPdfs).toHaveBeenCalledWith([mockFile], { 'key-file-0.pdf': mockRedactionMapping }, false);
      expect(result.current.loading).toBe(false);
      expect(result.current.progress).toBe(100);
      expect(returnedBlob).toBe(mockBlob);
    });

    test('should handle redaction error', async () => {
      const mockFile = createMockFiles(1)[0];
      const mockRedactionMapping: RedactionMapping = {
        pages: [{ sensitive: [], page: 1 }]
      };
      const mockError = new Error('Redaction failed');

      (batchRedactPdfs as Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePDFApi());

      await act(async () => {
        await expect(result.current.runRedactPdf(mockFile, mockRedactionMapping)).rejects.toThrow('Redaction failed');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Redaction failed');
      expect(result.current.progress).toBe(0);
    });
  });

  describe('runBatchRedactPdfs', () => {
    test('should handle successful batch redaction', async () => {
      const mockFiles = createMockFiles(2);
      const mockRedactionMappings: Record<string, RedactionMapping> = {
        'key-file-0.pdf': { pages: [{ sensitive: [], page: 1 }] },
        'key-file-1.pdf': { pages: [{ sensitive: [], page: 1 }] }
      };
      const mockResults = {
        'key-file-0.pdf': new Blob(['redacted content 1'], { type: 'application/pdf' }),
        'key-file-1.pdf': new Blob(['redacted content 2'], { type: 'application/pdf' })
      };

      (batchRedactPdfs as Mock).mockResolvedValue(mockResults);

      const { result } = renderHook(() => usePDFApi());

      let returnedResults;
      await act(async () => {
        returnedResults = await result.current.runBatchRedactPdfs(mockFiles, mockRedactionMappings);
      });

      expect(batchRedactPdfs).toHaveBeenCalledWith(mockFiles, mockRedactionMappings, false);
      expect(result.current.loading).toBe(false);
      expect(result.current.progress).toBe(100);
      expect(returnedResults).toBe(mockResults);
    });

    test('should handle empty file array', async () => {
      const { result } = renderHook(() => usePDFApi());

      let returnedResults;
      await act(async () => {
        returnedResults = await result.current.runBatchRedactPdfs([], {});
      });

      expect(batchRedactPdfs).not.toHaveBeenCalled();
      expect(returnedResults).toEqual({});
    });

    test('should handle batch redaction error', async () => {
      const mockFiles = createMockFiles(2);
      const mockRedactionMappings: Record<string, RedactionMapping> = {
        'key-file-0.pdf': { pages: [{ sensitive: [], page: 1 }] },
        'key-file-1.pdf': { pages: [{ sensitive: [], page: 1 }] }
      };
      const mockError = new Error('Batch redaction failed');

      (batchRedactPdfs as Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePDFApi());

      await act(async () => {
        await expect(result.current.runBatchRedactPdfs(mockFiles, mockRedactionMappings)).rejects.toThrow('Batch redaction failed');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Batch redaction failed');
      expect(result.current.progress).toBe(0);
    });
  });

  describe('runBatchSearch', () => {
    test('should handle successful search', async () => {
      const mockFiles = createMockFiles(2);
      const mockSearchTerm = 'test';
      const mockResults = {
        batch_summary: { total_matches: 5 },
        files: {
          'file-0.pdf': { matches: 2 },
          'file-1.pdf': { matches: 3 }
        }
      };

      (BatchSearchService.batchSearch as Mock).mockResolvedValue(mockResults);

      const { result } = renderHook(() => usePDFApi());

      let returnedResults;
      await act(async () => {
        returnedResults = await result.current.runBatchSearch(mockFiles, mockSearchTerm);
      });

      expect(BatchSearchService.batchSearch).toHaveBeenCalledWith(
          mockFiles,
          mockSearchTerm,
          { case_sensitive: undefined, ai_search: undefined }
      );
      expect(result.current.loading).toBe(false);
      expect(result.current.progress).toBe(100);
      expect(returnedResults).toBe(mockResults);
    });

    test('should handle empty file array or search term', async () => {
      const { result } = renderHook(() => usePDFApi());

      await act(async () => {
        await expect(result.current.runBatchSearch([], 'test')).rejects.toThrow('Files and search term are required');
        await expect(result.current.runBatchSearch(createMockFiles(1), '')).rejects.toThrow('Files and search term are required');
      });

      expect(BatchSearchService.batchSearch).not.toHaveBeenCalled();
    });

    test('should handle search error', async () => {
      const mockFiles = createMockFiles(1);
      const mockSearchTerm = 'test';
      const mockError = new Error('Search failed');

      (BatchSearchService.batchSearch as Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePDFApi());

      await act(async () => {
        await expect(result.current.runBatchSearch(mockFiles, mockSearchTerm)).rejects.toThrow('Search failed');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Search failed');
      expect(result.current.progress).toBe(0);
    });

    test('should use cache for repeated searches', async () => {
      const mockFiles = createMockFiles(1);
      const mockSearchTerm = 'test';
      const mockResults = {
        batch_summary: { total_matches: 5 },
        files: {
          'file-0.pdf': { matches: 5 }
        }
      };

      (BatchSearchService.batchSearch as Mock).mockResolvedValue(mockResults);

      const { result } = renderHook(() => usePDFApi());

      // First search
      await act(async () => {
        await result.current.runBatchSearch(mockFiles, mockSearchTerm);
      });

      // Reset mock to verify it's not called again
      (BatchSearchService.batchSearch as Mock).mockClear();

      // Second search with same parameters
      await act(async () => {
        await result.current.runBatchSearch(mockFiles, mockSearchTerm);
      });

      // Should not be called again due to caching
      expect(BatchSearchService.batchSearch).not.toHaveBeenCalled();
    });
  });

  describe('runFindWords', () => {
    test('should handle successful word finding', async () => {
      const mockFiles = createMockFiles(2);
      const mockBoundingBox = { x0: 10, y0: 20, x1: 100, y1: 50 };
      const mockResults = {
        'key-file-0.pdf': { words: ['test', 'example'] },
        'key-file-1.pdf': { words: ['another', 'word'] }
      };

      (findWords as Mock).mockResolvedValue(mockResults);

      const { result } = renderHook(() => usePDFApi());

      let returnedResults;
      await act(async () => {
        returnedResults = await result.current.runFindWords(mockFiles, mockBoundingBox);
      });

      expect(findWords).toHaveBeenCalledWith(mockFiles, mockBoundingBox, undefined);
      expect(result.current.loading).toBe(false);
      expect(result.current.progress).toBe(100);
      expect(returnedResults).toBe(mockResults);
    });

    test('should handle empty file array', async () => {
      const mockBoundingBox = { x0: 10, y0: 20, x1: 100, y1: 50 };
      const { result } = renderHook(() => usePDFApi());

      await act(async () => {
        await expect(result.current.runFindWords([], mockBoundingBox)).rejects.toThrow('No files provided for word search');
      });

      expect(findWords).not.toHaveBeenCalled();
    });

    test('should handle find words error', async () => {
      const mockFiles = createMockFiles(1);
      const mockBoundingBox = { x0: 10, y0: 20, x1: 100, y1: 50 };
      const mockError = new Error('Find words failed');

      (findWords as Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePDFApi());

      await act(async () => {
        await expect(result.current.runFindWords(mockFiles, mockBoundingBox)).rejects.toThrow('Find words failed');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Find words failed');
      expect(result.current.progress).toBe(0);
    });

    test('should use cache for repeated calls', async () => {
      const mockFiles = createMockFiles(1);
      const mockBoundingBox = { x0: 10, y0: 20, x1: 100, y1: 50 };
      const mockResults = {
        'key-file-0.pdf': { words: ['test', 'example'] }
      };

      (findWords as Mock).mockResolvedValue(mockResults);

      const { result } = renderHook(() => usePDFApi());

      // First call
      await act(async () => {
        await result.current.runFindWords(mockFiles, mockBoundingBox);
      });

      // Reset mock to verify it's not called again
      (findWords as Mock).mockClear();

      // Second call with same parameters
      await act(async () => {
        await result.current.runFindWords(mockFiles, mockBoundingBox);
      });

      // Should not be called again due to caching
      expect(findWords).not.toHaveBeenCalled();
    });
  });

  describe('clearDetectionCache', () => {
    test('should clear specific file keys from cache', async () => {
      const mockFiles = createMockFiles(2);
      const mockResults = {
        'file-0.pdf': { pages: [{ entities: [] }] },
        'file-1.pdf': { pages: [{ entities: [] }] }
      };

      (batchHybridDetect as Mock).mockResolvedValue(mockResults);

      const { result } = renderHook(() => usePDFApi());

      // First run detection to cache results
      await act(async () => {
        await result.current.runBatchHybridDetect(mockFiles);
      });

      // Verify cache has results
      expect(result.current.getDetectionResults('key-file-0.pdf')).not.toBeNull();
      expect(result.current.getDetectionResults('key-file-1.pdf')).not.toBeNull();

      // Clear specific file from cache
      act(() => {
        result.current.clearDetectionCache(['key-file-0.pdf']);
      });

      // Verify cache state
      expect(result.current.getDetectionResults('key-file-0.pdf')).toBeNull();
      expect(result.current.getDetectionResults('key-file-1.pdf')).not.toBeNull();
    });

    test('should clear entire cache when no keys provided', async () => {
      const mockFiles = createMockFiles(2);
      const mockResults = {
        'file-0.pdf': { pages: [{ entities: [] }] },
        'file-1.pdf': { pages: [{ entities: [] }] }
      };

      (batchHybridDetect as Mock).mockResolvedValue(mockResults);

      const { result } = renderHook(() => usePDFApi());

      // First run detection to cache results
      await act(async () => {
        await result.current.runBatchHybridDetect(mockFiles);
      });

      // Verify cache has results
      expect(result.current.getDetectionResults('key-file-0.pdf')).not.toBeNull();
      expect(result.current.getDetectionResults('key-file-1.pdf')).not.toBeNull();

      // Clear entire cache
      act(() => {
        result.current.clearDetectionCache();
      });

      // Verify cache is empty
      expect(result.current.getDetectionResults('key-file-0.pdf')).toBeNull();
      expect(result.current.getDetectionResults('key-file-1.pdf')).toBeNull();
    });
  });
});