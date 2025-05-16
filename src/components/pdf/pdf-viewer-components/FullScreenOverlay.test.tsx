import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import FullScreenOverlay from './FullScreenOverlay';

// Mock dependencies
const mockGetFileKey = vi.fn().mockReturnValue('test-file-key');
const mockUsePDFViewerContext = vi.fn();

vi.mock('../../../contexts/PDFViewerContext', () => ({
  getFileKey: (file: any) => mockGetFileKey(file),
  usePDFViewerContext: () => mockUsePDFViewerContext()
}));

vi.mock('./PDFWrapper', () => ({
  default: () => <div data-testid="mock-pdf-document-wrapper">PDFDocumentWrapper</div>
}));

vi.mock('../../common/MinimalToolbar', () => ({
  default: ({ zoomLevel, setZoomLevel }: { zoomLevel: number, setZoomLevel: (level: number) => void }) => (
    <div data-testid="mock-minimal-toolbar" data-zoom-level={zoomLevel}>
      MinimalToolbar
    </div>
  )
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (category: any, key: any) => `${category}.${key}`
  })
}));

describe('FullScreenOverlay', () => {
  const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
  const mockOnClose = vi.fn();
  const mockSetZoomLevel = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset document.body.style
    document.body.style.overflow = '';
    
    // Default mock implementation
    mockUsePDFViewerContext.mockReturnValue({
      zoomLevel: 1,
      setZoomLevel: mockSetZoomLevel
    });
  });

  // Positive test: Component renders correctly
  test('renders correctly with all expected elements', () => {
    render(<FullScreenOverlay file={mockFile} onClose={mockOnClose} />);
    
    // Check MinimalToolbar is rendered
    expect(screen.getByTestId('mock-minimal-toolbar')).toBeInTheDocument();
    
    // Check PDFDocumentWrapper is rendered
    expect(screen.getByTestId('mock-pdf-document-wrapper')).toBeInTheDocument();
    
    // Check file name is displayed
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    
    // Check close button exists
    expect(screen.getByRole('button', { name: 'pdf.exitFullscreen' })).toBeInTheDocument();
  });

  // Positive test: Close button calls onClose
  test('close button calls onClose when clicked', () => {
    render(<FullScreenOverlay file={mockFile} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: 'pdf.exitFullscreen' });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  // Positive test: Escape key calls onClose
  test('pressing escape key calls onClose', () => {
    render(<FullScreenOverlay file={mockFile} onClose={mockOnClose} />);
    
    // Simulate escape key press
    fireEvent.keyDown(window, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  // Positive test: Body overflow style is set to 'hidden'
  test('sets body overflow to hidden when mounted', () => {
    render(<FullScreenOverlay file={mockFile} onClose={mockOnClose} />);
    
    expect(document.body.style.overflow).toBe('hidden');
  });
  
  // Positive test: Body overflow style is reset on unmount
  test('resets body overflow on unmount', () => {
    const { unmount } = render(<FullScreenOverlay file={mockFile} onClose={mockOnClose} />);
    
    // Verify style is set
    expect(document.body.style.overflow).toBe('hidden');
    
    // Unmount component
    unmount();
    
    // Verify style is reset
    expect(document.body.style.overflow).toBe('');
  });
  
  // Negative test: Other keys don't trigger onClose
  test('pressing keys other than escape does not call onClose', () => {
    render(<FullScreenOverlay file={mockFile} onClose={mockOnClose} />);
    
    // Simulate other key presses
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Space' });
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });
  
  // Edge case: Component handles large filename
  test('renders with a very long filename', () => {
    const longNameFile = new File(
      ['dummy content'], 
      'this_is_a_very_long_filename_that_tests_how_the_component_handles_long_filenames.pdf', 
      { type: 'application/pdf' }
    );
    
    render(<FullScreenOverlay file={longNameFile} onClose={mockOnClose} />);
    
    // Check the long filename is displayed (or at least part of it)
    expect(screen.getByText('this_is_a_very_long_filename_that_tests_how_the_component_handles_long_filenames.pdf')).toBeInTheDocument();
  });
}); 