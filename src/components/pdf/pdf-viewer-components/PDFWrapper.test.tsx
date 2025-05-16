import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import PDFWrapper from './PDFWrapper';

// Mock React-PDF Document
vi.mock('react-pdf', () => {
  return {
    Document: function MockDocument(props: { children: any; onLoadSuccess: any; onLoadError: any; loading: any; file: any; }) {
      const { children, onLoadSuccess, onLoadError, loading, file } = props;
      
      // Call onLoadSuccess with a mock pdf object after a delay if file is provided
      React.useEffect(() => {
        if (onLoadSuccess && file) {
          setTimeout(() => {
            onLoadSuccess({
              numPages: 3,
              getPage: () => Promise.resolve({})
            });
          }, 0);
        } else if (onLoadError && !file) {
          setTimeout(() => {
            onLoadError(new Error('Failed to load PDF'));
          }, 0);
        }
      }, [file, onLoadSuccess, onLoadError]);

      return (
        <div className="pdf-document" data-testid="mock-pdf-document">
          {loading}
          {children}
        </div>
      );
    }
  };
});

// Create mock functions for FileContext
let mockIsFileOpen = vi.fn().mockReturnValue(true);
let mockTest;

// Mock FileContext
vi.mock('../../../contexts/FileContext', () => {
  return {
    useFileContext: function mockUseFileContext() {
      const testFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
      mockTest = testFile;
      
      return {
        currentFile: testFile,
        isFileOpen: mockIsFileOpen
      };
    }
  };
});

// Mock PDFViewerContext
vi.mock('../../../contexts/PDFViewerContext', () => {
  return {
    getFileKey: function mockGetFileKey() {
      return 'test-file-key';
    },
    usePDFViewerContext: function mockUsePDFViewerContext() {
      return {
        numPages: 0,
        setNumPages: vi.fn(),
        setRenderedPages: vi.fn(),
        getFileNumPages: vi.fn().mockReturnValue(0),
        setFileNumPages: vi.fn(),
        setFileRenderedPages: vi.fn(),
        mainContainerRef: { current: null },
        zoomLevel: 1
      };
    }
  };
});

// Mock PageRenderer
vi.mock('./PageRenderer', () => {
  return {
    default: function MockPageRenderer(props: { pageNumber: any; fileKey: any; }) {
      const { pageNumber, fileKey } = props;
      return (
        <div data-testid={`page-${pageNumber}`} data-file-key={fileKey}>
          Page {pageNumber}
        </div>
      );
    }
  };
});

// Mock ScrollManagerService
vi.mock('../../../services/client-services/ScrollManagerService', () => {
  return {
    default: {
      refreshObservers: vi.fn()
    }
  };
});

// Mock react-intersection-observer
vi.mock('react-intersection-observer', () => {
  return {
    useInView: function mockUseInView() {
      return {
        ref: function() {},
        inView: true
      };
    }
  };
});

// Mock NotificationContext
vi.mock('../../../contexts/NotificationContext', () => {
  return {
    useNotification: function mockUseNotification() {
      return {
        notify: vi.fn()
      };
    }
  };
});

// Mock LanguageContext
vi.mock('../../../contexts/LanguageContext', () => {
  return {
    useLanguage: function mockUseLanguage() {
      return {
        t: function(category: any, key: any) {
          return `${category}.${key}`;
        }
      };
    }
  };
});

// Suppress console.log during tests
console.log = vi.fn();

describe('PDFWrapper', () => {
  const testFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
  const mockDispatchEvent = vi.fn();
  const originalDispatchEvent = window.dispatchEvent;
  
  beforeEach(() => {
    vi.clearAllMocks();
    window.dispatchEvent = mockDispatchEvent;
    
    // Reset mockIsFileOpen
    mockIsFileOpen = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    window.dispatchEvent = originalDispatchEvent;
  });

  // Basic render test
  test('renders without crashing', () => {
    const { container } = render(
      <PDFWrapper 
        file={testFile}
        fileKey="test-file-key"
        forceOpen={true}
      />
    );
    
    // Verify container renders
    expect(container.querySelector('.pdf-document-container')).toBeInTheDocument();
  });
}); 