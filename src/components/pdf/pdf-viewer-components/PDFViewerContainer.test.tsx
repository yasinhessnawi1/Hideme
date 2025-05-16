import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import PDFViewerContainer from './PDFViewerContainer';

// Mock dependencies
const mockUsePDFViewerContext = vi.fn();
vi.mock('../../../contexts/PDFViewerContext', () => ({
  usePDFViewerContext: () => mockUsePDFViewerContext()
}));

vi.mock('./MultiPDFViewer', () => ({
  default: () => <div data-testid="mock-multi-pdf-viewer">MultiPDFViewer</div>
}));

describe('PDFViewerContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    mockUsePDFViewerContext.mockReturnValue({
      mainContainerRef: { current: null },
      zoomLevel: 1
    });
  });

  // Positive test: Component renders correctly with default zoom
  test('renders with the correct class at default zoom level', () => {
    render(<PDFViewerContainer />);
    
    const container = screen.getByTestId('pdf-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('pdf-viewer-container');
    expect(container).not.toHaveClass('zoomed-in');
    expect(container).toHaveAttribute('data-zoom-level', '1.0');
  });

  // Positive test: Component renders with zoomed-in class when zoom > 1
  test('renders with zoomed-in class when zoom level is greater than 1', () => {
    mockUsePDFViewerContext.mockReturnValue({
      mainContainerRef: { current: null },
      zoomLevel: 1.5
    });

    render(<PDFViewerContainer />);
    
    const container = screen.getByTestId('pdf-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('pdf-viewer-container');
    expect(container).toHaveClass('zoomed-in');
    expect(container).toHaveAttribute('data-zoom-level', '1.5');
  });

  // Positive test: MultiPDFViewer component is rendered
  test('renders the MultiPDFViewer component', () => {
    render(<PDFViewerContainer />);
    
    expect(screen.getByTestId('mock-multi-pdf-viewer')).toBeInTheDocument();
  });

  // Edge case: Component renders with very high zoom level
  test('renders correctly with a very high zoom level', () => {
    mockUsePDFViewerContext.mockReturnValue({
      mainContainerRef: { current: null },
      zoomLevel: 5
    });

    render(<PDFViewerContainer />);
    
    const container = screen.getByTestId('pdf-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('zoomed-in');
    expect(container).toHaveAttribute('data-zoom-level', '5.0');
  });

  // Edge case: Component renders with very low zoom level
  test('renders correctly with a very low zoom level', () => {
    mockUsePDFViewerContext.mockReturnValue({
      mainContainerRef: { current: null },
      zoomLevel: 0.5
    });

    render(<PDFViewerContainer />);
    
    const container = screen.getByTestId('pdf-container');
    expect(container).toBeInTheDocument();
    expect(container).not.toHaveClass('zoomed-in');
    expect(container).toHaveAttribute('data-zoom-level', '0.5');
  });
}); 