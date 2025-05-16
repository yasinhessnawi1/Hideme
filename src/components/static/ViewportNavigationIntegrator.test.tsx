import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Create mock functions for navigation
const mockNavigateToPage = vi.fn();

// Mock dependencies
// Mock scrollManager
vi.mock('../../services/client-services/ScrollManagerService', () => ({
  default: {
    refreshObservers: vi.fn()
  }
}));

// Mock navigation hook
vi.mock('../../hooks/general/usePDFNavigation', () => ({
  usePDFNavigation: () => ({
    navigateToPage: mockNavigateToPage
  })
}));

// Mock file context
vi.mock('../../contexts/FileContext', () => ({
  useFileContext: () => ({
    currentFile: { id: 'file1', name: 'test.pdf' }
  })
}));

// Mock PDF viewer context
vi.mock('../../contexts/PDFViewerContext', () => ({
  usePDFViewerContext: () => ({
    mainContainerRef: { current: document.createElement('div') }
  }),
  getFileKey: (file) => file?.id || ''
}));

// Import after mocks
import ViewportNavigationIntegrator from './ViewportNavigationIntegrator';
import scrollManager from '../../services/client-services/ScrollManagerService';

// Store original MutationObserver
const originalMutationObserver = global.MutationObserver;

describe('ViewportNavigationIntegrator', () => {
  let mutationCallback: MutationCallback;
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Set up mock MutationObserver that captures the callback
    global.MutationObserver = vi.fn().mockImplementation((callback) => {
      mutationCallback = callback;
      return {
        observe: vi.fn(),
        disconnect: vi.fn()
      };
    }) as unknown as typeof MutationObserver;
  });

  afterEach(() => {
    vi.useRealTimers();
    global.MutationObserver = originalMutationObserver;
  });

  it('renders nothing visible', () => {
    const { container } = render(<ViewportNavigationIntegrator />);
    expect(container.firstChild).toBeNull();
  });

  it('initializes scrollManager observers', () => {
    render(<ViewportNavigationIntegrator />);
    expect(scrollManager.refreshObservers).toHaveBeenCalled();
    
    vi.advanceTimersByTime(1000);
    expect(scrollManager.refreshObservers).toHaveBeenCalledTimes(2);
  });

  it('registers global window navigation method', () => {
    render(<ViewportNavigationIntegrator />);
    
    expect(window).toHaveProperty('navigateToPageWithViewport');
    expect(typeof (window as any).navigateToPageWithViewport).toBe('function');
  });

  it('cleans up global navigation method on unmount', () => {
    const { unmount } = render(<ViewportNavigationIntegrator />);
    unmount();
    
    expect((window as any).navigateToPageWithViewport).toBeUndefined();
  });

  it('handles precise navigation requests for initialized pages', () => {
    render(<ViewportNavigationIntegrator />);
    
    // Simulate page render complete event
    window.dispatchEvent(new CustomEvent('pdf-page-render-complete', {
      detail: { pageNumber: 5, fileKey: 'file1' }
    }));
    
    // Simulate navigation request to the initialized page
    window.dispatchEvent(new CustomEvent('pdf-precise-navigation-request', {
      detail: { pageNumber: 5, fileKey: 'file1', options: { alignToTop: true } }
    }));
    
    // Navigation should happen immediately for initialized pages
    expect(mockNavigateToPage).toHaveBeenCalledWith(5, 'file1', { alignToTop: true });
  });

  it('defers navigation requests for uninitialized pages', () => {
    render(<ViewportNavigationIntegrator />);
    
    // Simulate navigation request to uninitialized page
    window.dispatchEvent(new CustomEvent('pdf-precise-navigation-request', {
      detail: { pageNumber: 7, fileKey: 'file1', options: { alignToTop: true } }
    }));
    
    // Navigation shouldn't happen immediately
    expect(mockNavigateToPage).not.toHaveBeenCalled();
    
    // Simulate page render complete for the requested page
    window.dispatchEvent(new CustomEvent('pdf-page-render-complete', {
      detail: { pageNumber: 7, fileKey: 'file1' }
    }));
    
    // Fast forward to let setTimeout complete
    vi.advanceTimersByTime(100);
    
    // Now navigation should happen
    expect(mockNavigateToPage).toHaveBeenCalledWith(7, 'file1', { alignToTop: true });
  });

  it('uses global navigation method to trigger navigation events', () => {
    render(<ViewportNavigationIntegrator />);
    
    // Create a spy on dispatchEvent
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    
    // Use the global navigation method
    (window as any).navigateToPageWithViewport(3, 'file2', { alignToTop: false });
    
    // Check if the event was dispatched with correct parameters
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'pdf-precise-navigation-request'
      })
    );
    
    // Extract the detail from the dispatched event
    const eventArgument = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
    expect(eventArgument.detail).toEqual({
      fileKey: 'file2',
      pageNumber: 3,
      options: { alignToTop: false }
    });
    
    dispatchEventSpy.mockRestore();
  });

  it('detects canvas elements and dispatches render complete events', () => {
    // Render the component which sets up the MutationObserver
    render(<ViewportNavigationIntegrator />);
    
    // Create a spy on dispatchEvent
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    
    // Create mock DOM structure
    const canvas = document.createElement('canvas');
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'pdf-page-wrapper';
    pageWrapper.setAttribute('data-page-number', '2');
    const fileContainer = document.createElement('div');
    fileContainer.className = 'pdf-file-container';
    fileContainer.setAttribute('data-file-key', 'file1');
    
    // Build DOM structure
    pageWrapper.appendChild(canvas);
    fileContainer.appendChild(pageWrapper);
    document.body.appendChild(fileContainer);
    
    // Mock closest method for the elements
    const originalClosest = Element.prototype.closest;
    Element.prototype.closest = function(selector: string) {
      if (this === canvas && selector === '.pdf-page-wrapper') return pageWrapper;
      if (this === pageWrapper && selector === '.pdf-file-container') return fileContainer;
      return null;
    };
    
    // Manually trigger the mutation callback
    if (mutationCallback) {
      const mockMutation = [{
        addedNodes: [canvas],
        type: 'childList',
        target: document.body,
        attributeName: null,
        oldValue: null,
        removedNodes: [] as Node[],
        nextSibling: null,
        previousSibling: null
      }] as MutationRecord[];
      
      mutationCallback(mockMutation, {} as MutationObserver);
    }
    
    // Fast forward for the timeout in the canvas detection
    vi.advanceTimersByTime(150);
    
    // Check if the render complete event was dispatched
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'pdf-page-render-complete',
        detail: expect.objectContaining({
          pageNumber: 2,
          fileKey: 'file1'
        })
      })
    );
    
    // Clean up
    dispatchEventSpy.mockRestore();
    Element.prototype.closest = originalClosest;
    document.body.removeChild(fileContainer);
  });

  it('resets initialized pages when file changes', () => {
    const { rerender } = render(<ViewportNavigationIntegrator />);
    
    // Initialize some pages
    window.dispatchEvent(new CustomEvent('pdf-page-render-complete', {
      detail: { pageNumber: 1, fileKey: 'file1' }
    }));
    
    window.dispatchEvent(new CustomEvent('pdf-page-render-complete', {
      detail: { pageNumber: 2, fileKey: 'file2' }
    }));
    
    // Attempt navigation to page from previous file should work because it's initialized
    window.dispatchEvent(new CustomEvent('pdf-precise-navigation-request', {
      detail: { pageNumber: 1, fileKey: 'file1', options: {} }
    }));
    
    // Navigation should work because the page was initialized
    expect(mockNavigateToPage).toHaveBeenCalledWith(1, 'file1', {});
  });
}); 