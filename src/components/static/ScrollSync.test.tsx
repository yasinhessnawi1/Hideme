/*
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

// Create mocks
const mockSetFileCurrentPage = vi.fn();
const mockSetFileActiveScrollPage = vi.fn();
const mockGetFileCurrentPage = vi.fn().mockReturnValue(1);
const mockSetCurrentFile = vi.fn();

// Create a container ref that can be accessed in tests
const containerRef = { current: document.createElement('div') };

// Mock dependencies
vi.mock('../../services/client-services/ScrollManagerService', () => ({
  default: {
    initializeObservers: vi.fn(),
    refreshObservers: vi.fn(),
    findMostVisiblePage: vi.fn().mockReturnValue({
      fileKey: null,
      pageNumber: null,
      visibilityRatio: 0
    }),
    isScrollingInProgress: vi.fn().mockReturnValue(false),
    isFileChangeInProgress: vi.fn().mockReturnValue(false),
    saveScrollPosition: vi.fn(),
    getSavedScrollPosition: vi.fn(),
    highlightActivePage: vi.fn(),
    calculateScrollPosition: vi.fn(),
    addScrollListener: vi.fn(),
    removeScrollListener: vi.fn(),
    setFileChanging: vi.fn()
  }
}));

// Mock contexts
vi.mock('../../contexts/FileContext', () => ({
  useFileContext: () => ({
    currentFile: { id: 'file1', name: 'test.pdf' },
    files: [{ id: 'file1', name: 'test.pdf' }, { id: 'file2', name: 'test2.pdf' }],
    activeFiles: [{ id: 'file1', name: 'test.pdf' }, { id: 'file2', name: 'test2.pdf' }],
    setCurrentFile: mockSetCurrentFile
  })
}));

vi.mock('../../contexts/PDFViewerContext', () => ({
  usePDFViewerContext: () => ({
    mainContainerRef: containerRef,
    setFileCurrentPage: mockSetFileCurrentPage,
    setFileActiveScrollPage: mockSetFileActiveScrollPage,
    getFileCurrentPage: mockGetFileCurrentPage
  }),
  getFileKey: (file: { id?: string }) => file?.id || ''
}));

// Import components and services after mocks
import ScrollSync from './ScrollSync';
import scrollManager from '../../services/client-services/ScrollManagerService';

describe('ScrollSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes observers when rendered', () => {
    render(<ScrollSync />);
    expect(scrollManager.initializeObservers).toHaveBeenCalled();
  });

  it('registers scroll listeners on mount', () => {
    render(<ScrollSync />);
    expect(scrollManager.addScrollListener).toHaveBeenCalledWith('scroll-sync', expect.any(Function));
  });

  it('cleans up scroll listeners on unmount', () => {
    const { unmount } = render(<ScrollSync />);
    unmount();
    expect(scrollManager.removeScrollListener).toHaveBeenCalledWith('scroll-sync');
  });

  it('refreshes observers when active files change', async () => {
    // Create a new mock with additional files
    const useFileContextMock = vi.fn().mockReturnValue({
      currentFile: { id: 'file1', name: 'test.pdf' },
      files: [
        { id: 'file1', name: 'test.pdf' },
        { id: 'file2', name: 'test2.pdf' },
        { id: 'file3', name: 'test3.pdf' }
      ],
      activeFiles: [
        { id: 'file1', name: 'test.pdf' },
        { id: 'file2', name: 'test2.pdf' },
        { id: 'file3', name: 'test3.pdf' }
      ],
      setCurrentFile: mockSetCurrentFile
    });
    
    // Override the mock for this test
    const fileContextModule = await import('../../contexts/FileContext');
    const originalUseFileContext = fileContextModule.useFileContext;
    vi.spyOn(fileContextModule, 'useFileContext').mockImplementation(() => useFileContextMock());
    
    render(<ScrollSync />);
    
    // Observers should be refreshed when active files change
    vi.advanceTimersByTime(300);
    expect(scrollManager.refreshObservers).toHaveBeenCalled();
    
    // Restore original mock
    vi.spyOn(fileContextModule, 'useFileContext').mockRestore();
  });

  it('handles scroll events and updates state', () => {
    render(<ScrollSync />);

    // Setup mock to return a visible page
    scrollManager.findMostVisiblePage.mockReturnValue({
      fileKey: 'file1',
      pageNumber: 2,
      visibility: 0.8
    });
    
    // Simulate scroll event
    const event = new Event('scroll');
    containerRef.current.dispatchEvent(event);
    
    // Fast-forward timers to trigger the debounced handler
    vi.advanceTimersByTime(50);
    
    // Check that current page has been updated
    expect(mockSetFileCurrentPage).toHaveBeenCalledWith('file1', 2, 'scroll-sync');
    expect(mockSetFileActiveScrollPage).toHaveBeenCalledWith('file1', 2);
  });

  it('switches current file when scrolling to different document', () => {
    render(<ScrollSync />);

    // Setup mock to return a visible page from different file
    scrollManager.findMostVisiblePage.mockReturnValue({
      fileKey: 'file2',
      pageNumber: 1,
      visibility: 0.9
    });
    
    // Simulate scroll event
    const event = new Event('scroll');
    containerRef.current.dispatchEvent(event);
    
    // Fast-forward timers to trigger the debounced handler
    vi.advanceTimersByTime(50);
    
    // Check that file has been changed
    expect(mockSetCurrentFile).toHaveBeenCalledWith(expect.objectContaining({ id: 'file2' }));
    expect(scrollManager.setFileChanging).toHaveBeenCalledWith(true);
    
    // Fast-forward to check that scroll position is restored
    vi.advanceTimersByTime(100);
    expect(scrollManager.setFileChanging).toHaveBeenCalledWith(false);
  });

  it('restores scroll position when current file changes', () => {
    // Mock saved position
    scrollManager.getSavedScrollPosition.mockReturnValue(100);
    
    render(<ScrollSync />);
    
    // Fast-forward timers
    vi.advanceTimersByTime(100);
    
    // Check that scroll is restored and page is highlighted
    expect(scrollManager.highlightActivePage).toHaveBeenCalledWith('file1', 1);
  });

  it('scrolls to first page when no saved position exists', () => {
    // Mock no saved position
    scrollManager.getSavedScrollPosition.mockReturnValue(undefined);
    scrollManager.calculateScrollPosition.mockReturnValue(50);
    
    // Mock document.querySelector
    const mockPageElement = document.createElement('div');
    const querySelectorSpy = vi.spyOn(document, 'querySelector')
      .mockReturnValue(mockPageElement);
    
    render(<ScrollSync />);
    
    // Fast-forward timers
    vi.advanceTimersByTime(150);
    
    // Check that correct functions are called
    expect(scrollManager.calculateScrollPosition).toHaveBeenCalled();
    
    // Restore original implementation
    querySelectorSpy.mockRestore();
  });
});

// Helper function to fire events
function fireEvent(element: Element, event: Event) {
  element.dispatchEvent(event);
}

 */