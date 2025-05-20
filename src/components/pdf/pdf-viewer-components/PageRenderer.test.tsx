import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import PageRenderer from './PageRenderer';

// Define mocks directly within mock functions to avoid hoisting issues
vi.mock('react-pdf', () => {
  return {
    Page: function MockPage(props: { onRenderSuccess: any; pageNumber: any; children: any; loading: any; }) {
      const { onRenderSuccess, pageNumber, children, loading } = props;
      
      // Call onRenderSuccess if provided
      React.useEffect(() => {
        if (onRenderSuccess) {
          setTimeout(() => {
            onRenderSuccess({
              getViewport: () => ({ width: 800, height: 1000, scale: 1 }),
              getTextContent: () => Promise.resolve({ items: [{ str: 'Mock text content' }] })
            });
          }, 0);
        }
      }, [onRenderSuccess]);

      return (
        <div className="pdf-page" data-testid={`pdf-page-${pageNumber}`}>
          <canvas width="800" height="1000" />
          {loading}
          {children}
        </div>
      );
    }
  };
});

// Mock ScrollManagerService with inline functions
vi.mock('../../../services/client-services/ScrollManagerService', () => {
  const refreshObservers = vi.fn();
  
  return {
    default: {
      refreshObservers,
      __mocks: {
        refreshObservers
      }
    }
  };
});

// Mock PDFViewerContext
vi.mock('../../../contexts/PDFViewerContext', () => ({
  usePDFViewerContext: function mockUsePDFViewerContext() {
    return {
      pageRefs: { current: [] },
      zoomLevel: 1,
      activeScrollPage: 1,
      getFileActiveScrollPage: () => 1
    };
  }
}));

// Mock EditContext
vi.mock('../../../contexts/EditContext', () => ({
  useEditContext: function mockUseEditContext() {
    return {
      isEditingMode: false,
      highlightingMode: 'text-selection'
    };
  }
}));

// Mock useViewportSize
vi.mock('../../../hooks/general/useViewportSize', () => ({
  useViewportSize: function mockUseViewportSize() {
    return {
      viewportSize: { width: 800, height: 1000 },
      setCanvasReference: vi.fn()
    };
  }
}));

// Mock NotificationContext
vi.mock('../../../contexts/NotificationContext', () => ({
  useNotification: function mockUseNotification() {
    return {
      notify: vi.fn()
    };
  }
}));

// Mock LanguageContext
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: function mockUseLanguage() {
    return {
      t: (category: any, key: any) => `${category}.${key}`
    };
  }
}));

// Mock PageOverlay
vi.mock('./PageOverlay', () => ({
  default: function MockPageOverlay() {
    return <div data-testid="mock-page-overlay">PageOverlay</div>;
  }
}));

// Mock TextSelectionHighlighter
vi.mock('../highlighters/TextSelectionHighlighter', () => ({
  default: function MockTextSelectionHighlighter() {
    return <div data-testid="mock-text-selection-highlighter">TextSelectionHighlighter</div>;
  }
}));

// Mock HighlightLayerFactory
vi.mock('../highlighters/HighlightLayerFactory', () => ({
  default: function MockHighlightLayerFactory() {
    return <div data-testid="mock-highlight-layer-factory">HighlightLayerFactory</div>;
  }
}));

describe('PageRenderer', () => {
  // Mock window.dispatchEvent
  const mockDispatchEvent = vi.fn();
  const originalDispatchEvent = window.dispatchEvent;
  
  beforeEach(() => {
    vi.clearAllMocks();
    window.dispatchEvent = mockDispatchEvent;
  });

  afterEach(() => {
    window.dispatchEvent = originalDispatchEvent;
  });

  // Basic render test
  test.skip('renders without crashing', () => {
    render(<PageRenderer pageNumber={2} fileKey="test-file" isVisible={true} />);
    
    // Verify page number is rendered
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  // Test rendered page content after async loading
  test.skip('renders page content after successful loading', async () => {
    render(<PageRenderer pageNumber={3} fileKey="test-file" isVisible={true} />);
    
    // Initially, highlighting components should not be rendered
    expect(screen.queryByTestId('mock-page-overlay')).not.toBeInTheDocument();
    
    // Wait for async render to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    // After rendering is complete, highlighting components should be rendered
    expect(screen.getByTestId('mock-page-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('mock-text-selection-highlighter')).toBeInTheDocument();
    expect(screen.getByTestId('mock-highlight-layer-factory')).toBeInTheDocument();
  });

  // Test event dispatching
  test.skip('dispatches pdf-page-render-complete event', async () => {
    render(<PageRenderer pageNumber={4} fileKey="test-file" isVisible={true} />);
    
    // Wait for async render to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    // Verify the event was dispatched
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'pdf-page-render-complete',
        detail: expect.objectContaining({
          pageNumber: 4,
          fileKey: 'test-file',
          viewport: expect.any(Object)
        })
      })
    );
  });

  // Edge case: page with no fileKey
  test.skip('renders correctly without fileKey', async () => {
    render(<PageRenderer pageNumber={7} isVisible={true} />);
    
    // Verify page number is rendered
    expect(screen.getByText('7')).toBeInTheDocument();
    
    // Wait for async render to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    // Verify page is rendered
    expect(screen.getByTestId('pdf-page-7')).toBeInTheDocument();
  });
}); 