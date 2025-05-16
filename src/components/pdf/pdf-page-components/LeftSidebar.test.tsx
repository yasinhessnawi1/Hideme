import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import LeftSidebar from './LeftSidebar';

// Mock the Lucide icons
vi.mock('lucide-react', () => ({
  File: () => <span data-testid="mock-file-icon" />,
  Layers: () => <span data-testid="mock-layers-icon" />,
  History: () => <span data-testid="mock-history-icon" />,
}));

// Mock the components used in LeftSidebar
vi.mock('./PageThumbnailsViewer', () => ({
  default: () => <div data-testid="mock-page-thumbnails-viewer">Page Thumbnails Viewer</div>,
}));

vi.mock('./FileViewer', () => ({
  default: () => <div data-testid="mock-file-viewer">File Viewer</div>,
}));

vi.mock('./HistoryViewer', () => ({
  default: () => <div data-testid="mock-history-viewer">History Viewer</div>,
}));

// Mock language context
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (category: any, key: any) => `${category}.${key}`,
  }),
}));

describe('LeftSidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders correctly with default tab active', () => {
    render(<LeftSidebar />);
    
    // Check for the three tab buttons
    expect(screen.getByTitle('pdf.pageThumbnails')).toBeInTheDocument();
    expect(screen.getByTitle('pdf.pdfFiles')).toBeInTheDocument();
    expect(screen.getByTitle('pdf.documentHistory')).toBeInTheDocument();
    
    // Default tab is thumbnails, it should have active class
    expect(screen.getByTitle('pdf.pageThumbnails').className).toContain('active');
    
    // The thumbnails component should be visible by default
    expect(screen.getByTestId('mock-page-thumbnails-viewer')).toBeInTheDocument();
  });

  test('returns null when sidebar is collapsed', () => {
    const { container } = render(<LeftSidebar isSidebarCollapsed={true} />);
    expect(container.firstChild).toBeNull();
  });

  test('switches to files tab when clicked', () => {
    render(<LeftSidebar />);
    
    // Click the files tab
    fireEvent.click(screen.getByTitle('pdf.pdfFiles'));
    
    // Files tab should now be active
    expect(screen.getByTitle('pdf.pdfFiles').className).toContain('active');
    expect(screen.getByTitle('pdf.pageThumbnails').className).not.toContain('active');
    
    // The file viewer should now be visible
    expect(screen.getByTestId('mock-file-viewer')).toBeInTheDocument();
  });

  test('switches to history tab when clicked', () => {
    render(<LeftSidebar />);
    
    // Click the history tab
    fireEvent.click(screen.getByTitle('pdf.documentHistory'));
    
    // History tab should now be active
    expect(screen.getByTitle('pdf.documentHistory').className).toContain('active');
    expect(screen.getByTitle('pdf.pageThumbnails').className).not.toContain('active');
    
    // The history viewer should now be visible
    expect(screen.getByTestId('mock-history-viewer')).toBeInTheDocument();
  });

  test('switches back to thumbnails tab when clicked', () => {
    render(<LeftSidebar />);
    
    // First switch to a different tab
    fireEvent.click(screen.getByTitle('pdf.pdfFiles'));
    expect(screen.getByTitle('pdf.pdfFiles').className).toContain('active');
    
    // Then switch back to thumbnails
    fireEvent.click(screen.getByTitle('pdf.pageThumbnails'));
    
    // Thumbnails tab should now be active again
    expect(screen.getByTitle('pdf.pageThumbnails').className).toContain('active');
    expect(screen.getByTitle('pdf.pdfFiles').className).not.toContain('active');
    
    // The thumbnails viewer should be visible
    expect(screen.getByTestId('mock-page-thumbnails-viewer')).toBeInTheDocument();
  });

  test('responds to custom event to change tab to thumbnails', () => {
    const { rerender } = render(<LeftSidebar />);
    
    // First switch to a different tab
    fireEvent.click(screen.getByTitle('pdf.pdfFiles'));
    expect(screen.getByTitle('pdf.pdfFiles').className).toContain('active');
    
    // Dispatch custom event to switch to thumbnails
    act(() => {
      window.dispatchEvent(
        new CustomEvent('activate-left-panel', { 
          detail: { navigateToTab: 'thumbnails' } 
        })
      );
      // Force a rerender to ensure the component updates
      rerender(<LeftSidebar />);
    });
    
    // Thumbnails tab should now be active
    expect(screen.getByTitle('pdf.pageThumbnails').className).toContain('active');
  });

  test('responds to custom event to change tab to files', () => {
    const { rerender } = render(<LeftSidebar />);
    
    // Dispatch custom event to switch to files
    act(() => {
      window.dispatchEvent(
        new CustomEvent('activate-left-panel', { 
          detail: { navigateToTab: 'files' } 
        })
      );
      // Force a rerender to ensure the component updates
      rerender(<LeftSidebar />);
    });
    
    // Files tab should now be active
    expect(screen.getByTitle('pdf.pdfFiles').className).toContain('active');
  });

  test('responds to custom event to change tab to history', () => {
    const { rerender } = render(<LeftSidebar />);
    
    // Dispatch custom event to switch to history
    act(() => {
      window.dispatchEvent(
        new CustomEvent('activate-left-panel', { 
          detail: { navigateToTab: 'history' } 
        })
      );
      // Force a rerender to ensure the component updates
      rerender(<LeftSidebar />);
    });
    
    // History tab should now be active
    expect(screen.getByTitle('pdf.documentHistory').className).toContain('active');
  });

  test('responds to custom event to change tab when using "pages" instead of "thumbnails"', () => {
    const { rerender } = render(<LeftSidebar />);
    
    // First switch to a different tab
    fireEvent.click(screen.getByTitle('pdf.pdfFiles'));
    expect(screen.getByTitle('pdf.pdfFiles').className).toContain('active');
    
    // Dispatch custom event to switch to pages (which maps to thumbnails)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('activate-left-panel', { 
          detail: { navigateToTab: 'pages' } 
        })
      );
      // Force a rerender to ensure the component updates
      rerender(<LeftSidebar />);
    });
    
    // Thumbnails tab should now be active
    expect(screen.getByTitle('pdf.pageThumbnails').className).toContain('active');
  });
}); 