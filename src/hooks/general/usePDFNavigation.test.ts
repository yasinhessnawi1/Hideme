import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { usePDFNavigation } from './usePDFNavigation';
import { useFileContext } from '../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../contexts/PDFViewerContext';
import scrollManager from '../../services/client-services/ScrollManagerService';
import type { Mock } from 'vitest';
import { afterAll } from 'vitest';

// Mock dependencies with proper setup
vi.mock('../../contexts/FileContext', () => ({
  useFileContext: vi.fn()
}));

vi.mock('../../contexts/PDFViewerContext', () => ({
  getFileKey: vi.fn((file) => `key-${file.name}`),
  usePDFViewerContext: vi.fn()
}));

vi.mock('../../services/client-services/ScrollManagerService', () => ({
  default: {
    scrollToPage: vi.fn(() => true)
  }
}));

// Mock window.dispatchEvent
const originalDispatchEvent = window.dispatchEvent;
window.dispatchEvent = vi.fn();

// Mock setTimeout
vi.useFakeTimers();

describe('usePDFNavigation', () => {
  // Mock files
  const mockFiles = [
    { name: 'file1.pdf', size: 1000, type: 'application/pdf' } as File,
    { name: 'file2.pdf', size: 2000, type: 'application/pdf' } as File
  ];

  // Mock viewer context functions
  const mockSetFileCurrentPage = vi.fn();
  const mockSetFileActiveScrollPage = vi.fn();
  const mockGetFileCurrentPage = vi.fn((fileKey) => fileKey === 'key-file1.pdf' ? 2 : 1);
  const mockGetFileNumPages = vi.fn((fileKey) => fileKey === 'key-file1.pdf' ? 5 : 3);

  // Mock file context functions
  const mockSetCurrentFile = vi.fn();

  // Setup default mocks
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock useFileContext
    (useFileContext as Mock).mockReturnValue({
      currentFile: mockFiles[0],
      files: mockFiles,
      setCurrentFile: mockSetCurrentFile
    });

    // Mock usePDFViewerContext
    (usePDFViewerContext as Mock).mockReturnValue({
      getFileCurrentPage: mockGetFileCurrentPage,
      getFileNumPages: mockGetFileNumPages,
      setFileCurrentPage: mockSetFileCurrentPage,
      setFileActiveScrollPage: mockSetFileActiveScrollPage
    });
  });

  afterAll(() => {
    // Restore original functions
    window.dispatchEvent = originalDispatchEvent;
    vi.useRealTimers();
  });

  test('should initialize with correct methods', () => {
    const { result } = renderHook(() => usePDFNavigation());

    expect(result.current.navigateToPage).toBeDefined();
    expect(result.current.navigateToNextPage).toBeDefined();
    expect(result.current.navigateToPrevPage).toBeDefined();
    expect(result.current.navigateToFirstPage).toBeDefined();
    expect(result.current.navigateToLastPage).toBeDefined();
    expect(result.current.navigateToFile).toBeDefined();
    expect(result.current.isNavigating).toBeDefined();
  });

  describe('navigateToPage', () => {
    /*
    test('should navigate to a valid page', () => {
      const { result } = renderHook(() => usePDFNavigation('test-source'));

      act(() => {
        result.current.navigateToPage(3);
      });

      // Check state updates
      expect(mockSetFileCurrentPage).toHaveBeenCalledWith('key-file1.pdf', 3, 'test-source');
      expect(mockSetFileActiveScrollPage).toHaveBeenCalledWith('key-file1.pdf', 3);

      // Check event dispatch
      expect(window.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'page-navigated',
            detail: expect.objectContaining({
              fileKey: 'key-file1.pdf',
              page: 3,
              source: 'test-source'
            })
          })
      );

      // Advance timers to trigger scrolling
      vi.advanceTimersByTime(10);

      // Check scrolling
      expect(scrollManager.scrollToPage).toHaveBeenCalledWith(
          3,
          'key-file1.pdf',
          expect.objectContaining({
            behavior: 'smooth',
            alignToTop: false,
            highlightThumbnail: true
          }),
          'test-source'
      );
    });

     */

    test('should clamp page number to valid range', () => {
      const { result } = renderHook(() => usePDFNavigation());

      // Try to navigate to page 0 (should be clamped to 1)
      act(() => {
        result.current.navigateToPage(0);
      });

      expect(mockSetFileCurrentPage).toHaveBeenCalledWith('key-file1.pdf', 1, 'navigation-hook');

      vi.clearAllMocks();

      // Try to navigate to page 10 (should be clamped to 5)
      act(() => {
        result.current.navigateToPage(10);
      });

      expect(mockSetFileCurrentPage).toHaveBeenCalledWith('key-file1.pdf', 5, 'navigation-hook');
    });

    test('should do nothing if no file is available', () => {
      // Mock no current file
      (useFileContext as Mock).mockReturnValue({
        currentFile: null,
        files: mockFiles,
        setCurrentFile: mockSetCurrentFile
      });

      const { result } = renderHook(() => usePDFNavigation());

      act(() => {
        result.current.navigateToPage(3);
      });

      expect(mockSetFileCurrentPage).not.toHaveBeenCalled();
      expect(scrollManager.scrollToPage).not.toHaveBeenCalled();
    });

    test('should do nothing if file has no pages', () => {
      // Mock file with no pages
      (usePDFViewerContext as Mock).mockReturnValue({
        getFileCurrentPage: mockGetFileCurrentPage,
        getFileNumPages: vi.fn(() => 0), // No pages
        setFileCurrentPage: mockSetFileCurrentPage,
        setFileActiveScrollPage: mockSetFileActiveScrollPage
      });

      const { result } = renderHook(() => usePDFNavigation());

      act(() => {
        result.current.navigateToPage(3);
      });

      expect(mockSetFileCurrentPage).not.toHaveBeenCalled();
      expect(scrollManager.scrollToPage).not.toHaveBeenCalled();
    });
  });

  describe('navigateToNextPage', () => {
    test('should navigate to next page when available', () => {
      const { result } = renderHook(() => usePDFNavigation());

      act(() => {
        result.current.navigateToNextPage();
      });

      // Current page is 2, so should navigate to page 3
      expect(mockSetFileCurrentPage).toHaveBeenCalledWith('key-file1.pdf', 3, 'navigation-hook');
    });

    test('should not navigate if already on last page', () => {
      // Mock being on the last page
      (usePDFViewerContext as Mock).mockReturnValue({
        getFileCurrentPage: vi.fn(() => 5), // Last page
        getFileNumPages: vi.fn(() => 5),
        setFileCurrentPage: mockSetFileCurrentPage,
        setFileActiveScrollPage: mockSetFileActiveScrollPage
      });

      const { result } = renderHook(() => usePDFNavigation());

      act(() => {
        result.current.navigateToNextPage();
      });

      expect(mockSetFileCurrentPage).not.toHaveBeenCalled();
    });
  });

  describe('navigateToPrevPage', () => {
    test('should navigate to previous page when available', () => {
      const { result } = renderHook(() => usePDFNavigation());

      act(() => {
        result.current.navigateToPrevPage();
      });

      // Current page is 2, so should navigate to page 1
      expect(mockSetFileCurrentPage).toHaveBeenCalledWith('key-file1.pdf', 1, 'navigation-hook');
    });

    test('should not navigate if already on first page', () => {
      // Mock being on the first page
      (usePDFViewerContext as Mock).mockReturnValue({
        getFileCurrentPage: vi.fn(() => 1), // First page
        getFileNumPages: mockGetFileNumPages,
        setFileCurrentPage: mockSetFileCurrentPage,
        setFileActiveScrollPage: mockSetFileActiveScrollPage
      });

      const { result } = renderHook(() => usePDFNavigation());

      act(() => {
        result.current.navigateToPrevPage();
      });

      expect(mockSetFileCurrentPage).not.toHaveBeenCalled();
    });
  });

  describe('navigateToFirstPage', () => {
    test('should navigate to first page', () => {
      const { result } = renderHook(() => usePDFNavigation());

      act(() => {
        result.current.navigateToFirstPage();
      });

      expect(mockSetFileCurrentPage).toHaveBeenCalledWith('key-file1.pdf', 1, 'navigation-hook');
    });
  });

  describe('navigateToLastPage', () => {
    test('should navigate to last page', () => {
      const { result } = renderHook(() => usePDFNavigation());

      act(() => {
        result.current.navigateToLastPage();
      });

      // Total pages is 5
      expect(mockSetFileCurrentPage).toHaveBeenCalledWith('key-file1.pdf', 5, 'navigation-hook');
    });
  });

  describe('navigateToFile', () => {
    test('should navigate to a specific file and page', () => {
      const { result } = renderHook(() => usePDFNavigation());

      act(() => {
        result.current.navigateToFile('key-file2.pdf', 2);
      });

      // Should set current file
      expect(mockSetCurrentFile).toHaveBeenCalledWith(mockFiles[1]);

      // Should navigate to page 2
      expect(mockSetFileCurrentPage).toHaveBeenCalledWith('key-file2.pdf', 2, 'navigation-hook');
    });

    test('should use default page 1 if not specified', () => {
      const { result } = renderHook(() => usePDFNavigation());

      act(() => {
        result.current.navigateToFile('key-file2.pdf');
      });

      // Should navigate to page 1 by default
      expect(mockSetFileCurrentPage).toHaveBeenCalledWith('key-file2.pdf', 1, 'navigation-hook');
    });

    test.skip('should do nothing if file not found', () => {
      const { result } = renderHook(() => usePDFNavigation());

      // Mock console.error to avoid test output noise
      const originalConsoleError = console.error;
      console.error = vi.fn();

      act(() => {
        result.current.navigateToFile('non-existent-key');
      });

      // Should not set current file
      expect(mockSetCurrentFile).not.toHaveBeenCalled();

      // Should not navigate
      expect(mockSetFileCurrentPage).not.toHaveBeenCalled();

      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('isNavigating', () => {
    test.skip('should return navigation status', () => {
      const { result } = renderHook(() => usePDFNavigation());

      // Initially not navigating
      expect(result.current.isNavigating()).toBe(false);
    });
  });
});