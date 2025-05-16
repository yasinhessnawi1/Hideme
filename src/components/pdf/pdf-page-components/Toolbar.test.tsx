import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, afterEach, expect, beforeEach } from 'vitest';
import Toolbar from './Toolbar';

// Mock the dependencies
vi.mock('react-icons/fa', () => ({
  FaFileDownload: () => <div data-testid="mock-download-icon">Download</div>,
  FaPrint: () => <div data-testid="mock-print-icon">Print</div>,
  FaUpload: () => <div data-testid="mock-upload-icon">Upload</div>,
  FaSearch: () => <div data-testid="mock-search-icon">Search</div>,
  FaMagic: () => <div data-testid="mock-magic-icon">Magic</div>,
  FaEraser: () => <div data-testid="mock-eraser-icon">Eraser</div>,
}));

// Mock file context
const mockAddFiles = vi.fn();
const mockFiles = [{ id: 'test-file-1', name: 'test1.pdf' }];
const mockSelectedFiles: never[] = [];

vi.mock('../../../contexts/FileContext', () => ({
  useFileContext: () => ({
    addFiles: mockAddFiles,
    files: mockFiles,
    selectedFiles: mockSelectedFiles
  })
}));

// Mock PDF context
vi.mock('../../../contexts/PDFViewerContext', () => ({
  usePDFViewerContext: () => ({
    zoomLevel: 1,
    setZoomLevel: vi.fn(),
  }),
  getFileKey: (file: { id: any; }) => file.id || 'no-id',
}));

// Mock PDF utility service
vi.mock('../../../store/PDFUtilityStore', () => ({
  default: {
    downloadMultiplePDFs: vi.fn().mockResolvedValue(true),
    printMultiplePDFs: vi.fn().mockResolvedValue(true),
  }
}));

// Mock loading context
vi.mock('../../../contexts/LoadingContext', () => ({
  useLoading: () => ({
    isLoading: (id: string) => false,
    startLoading: vi.fn(),
    stopLoading: vi.fn(),
  })
}));

// Mock notification context
const mockNotify = vi.fn();
vi.mock('../../../contexts/NotificationContext', () => ({
  useNotification: () => ({
    notify: mockNotify,
    confirm: vi.fn().mockResolvedValue(true),
  })
}));

// Mock language context
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (category: any, key: any) => `${category}.${key}`,
  })
}));

// Mock component
vi.mock('../../common/MinimalToolbar', () => ({
  default: () => <div data-testid="mock-minimal-toolbar">Minimal Toolbar</div>,
}));

vi.mock('../../common/LoadingWrapper', () => ({
  default: ({ children, isLoading, fallback }: { children: React.ReactNode; isLoading: boolean; fallback: React.ReactNode }) => (
    <div data-testid="mock-loading-wrapper">
      {isLoading ? fallback : children}
    </div>
  ),
}));

describe('Toolbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock setTimeout to execute immediately
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  // Test if the component renders correctly
  test('renders toolbar with all buttons', () => {
    const toggleLeftSidebar = vi.fn();
    const toggleRightSidebar = vi.fn();

    render(
      <Toolbar
        toggleLeftSidebar={toggleLeftSidebar}
        isLeftSidebarCollapsed={false}
        toggleRightSidebar={toggleRightSidebar}
        isRightSidebarCollapsed={false}
      />
    );

    // Check for sidebar toggle buttons
    expect(screen.getByTitle('toolbar.hideLeftSidebar')).toBeInTheDocument();
    expect(screen.getByTitle('toolbar.hideRightSidebar')).toBeInTheDocument();

    // Check for action buttons
    expect(screen.getByTitle('toolbar.openPDF')).toBeInTheDocument();
    expect(screen.getByTitle('toolbar.savePDF')).toBeInTheDocument();
    expect(screen.getByTitle('toolbar.printPDF')).toBeInTheDocument();
    
    // Check for more buttons
    expect(screen.getByTitle('toolbar.searchPDFs')).toBeInTheDocument();
    expect(screen.getByTitle('toolbar.detectEntities')).toBeInTheDocument();
    expect(screen.getByTitle('toolbar.redactPDFs')).toBeInTheDocument();

    // Check for minimal toolbar
    expect(screen.getByTestId('mock-minimal-toolbar')).toBeInTheDocument();
  });

  // Test sidebar toggle buttons
  test('calls toggleLeftSidebar when left sidebar button is clicked', () => {
    const toggleLeftSidebar = vi.fn();
    const toggleRightSidebar = vi.fn();

    render(
      <Toolbar
        toggleLeftSidebar={toggleLeftSidebar}
        isLeftSidebarCollapsed={false}
        toggleRightSidebar={toggleRightSidebar}
        isRightSidebarCollapsed={false}
      />
    );

    // Click left sidebar toggle button
    fireEvent.click(screen.getByTitle('toolbar.hideLeftSidebar'));
    expect(toggleLeftSidebar).toHaveBeenCalledTimes(1);
  });

  test('calls toggleRightSidebar when right sidebar button is clicked', () => {
    const toggleLeftSidebar = vi.fn();
    const toggleRightSidebar = vi.fn();

    render(
      <Toolbar
        toggleLeftSidebar={toggleLeftSidebar}
        isLeftSidebarCollapsed={false}
        toggleRightSidebar={toggleRightSidebar}
        isRightSidebarCollapsed={false}
      />
    );

    // Click right sidebar toggle button
    fireEvent.click(screen.getByTitle('toolbar.hideRightSidebar'));
    expect(toggleRightSidebar).toHaveBeenCalledTimes(1);
  });

  // Test file upload functionality
  test('handles file upload when file is selected', () => {
    const toggleLeftSidebar = vi.fn();
    const toggleRightSidebar = vi.fn();

    render(
      <Toolbar
        toggleLeftSidebar={toggleLeftSidebar}
        isLeftSidebarCollapsed={false}
        toggleRightSidebar={toggleRightSidebar}
        isRightSidebarCollapsed={false}
      />
    );

    // Click upload button
    fireEvent.click(screen.getByTitle('toolbar.openPDF'));
    
    // Find the file input
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    
    // Create a mock file and trigger change event
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput!, { target: { files: [file] } });
    
    expect(mockAddFiles).toHaveBeenCalledWith([file]);
    expect(mockNotify).toHaveBeenCalled();
  });

  // Test search functionality
  test('handles search button click', async () => {
    // Create a spy that can actually be called and checked
    const mockDispatchEvent = vi.spyOn(window, 'dispatchEvent');
    
    const toggleLeftSidebar = vi.fn();
    const toggleRightSidebar = vi.fn();
    
    // Define the global function that might be used
    window.executeSearchWithDefaultTerms = vi.fn();

    render(
      <Toolbar
        toggleLeftSidebar={toggleLeftSidebar}
        isLeftSidebarCollapsed={false}
        toggleRightSidebar={toggleRightSidebar}
        isRightSidebarCollapsed={false}
      />
    );

    // Click search button
    fireEvent.click(screen.getByTitle('toolbar.searchPDFs'));
    
    // Run any pending timers
    vi.runAllTimers();
    
    // Check if custom event was dispatched
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'execute-search'
      })
    );
    
    expect(mockNotify).toHaveBeenCalled();
    
    // Clean up
    delete window.executeSearchWithDefaultTerms;
    mockDispatchEvent.mockRestore();
  });

  // Test entity detection functionality
  test('handles entity detection button click', () => {
    const toggleLeftSidebar = vi.fn();
    const toggleRightSidebar = vi.fn();
    
    // Use a spy instead of completely replacing the function
    const mockDispatchEvent = vi.spyOn(window, 'dispatchEvent');

    render(
      <Toolbar
        toggleLeftSidebar={toggleLeftSidebar}
        isLeftSidebarCollapsed={false}
        toggleRightSidebar={toggleRightSidebar}
        isRightSidebarCollapsed={false}
      />
    );

    // Click entity detection button
    fireEvent.click(screen.getByTitle('toolbar.detectEntities'));
    
    // Check if custom event was dispatched
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'trigger-entity-detection-process'
      })
    );
    
    // Clean up
    mockDispatchEvent.mockRestore();
  });

  // Test redaction functionality
  test('handles redaction button click', () => {
    const toggleLeftSidebar = vi.fn();
    const toggleRightSidebar = vi.fn();
    
    // Use a spy instead of completely replacing the function
    const mockDispatchEvent = vi.spyOn(window, 'dispatchEvent');

    render(
      <Toolbar
        toggleLeftSidebar={toggleLeftSidebar}
        isLeftSidebarCollapsed={false}
        toggleRightSidebar={toggleRightSidebar}
        isRightSidebarCollapsed={false}
      />
    );

    // Click redaction button
    fireEvent.click(screen.getByTitle('toolbar.redactPDFs'));
    
    // Check if custom event was dispatched
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'trigger-redaction-process'
      })
    );
    
    expect(mockNotify).toHaveBeenCalled();
    
    // Clean up
    mockDispatchEvent.mockRestore();
  });
}); 