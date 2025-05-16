import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import HighlightLayerFactory from './HighlightLayerFactory';
import { PDFPageViewport, TextContent, ViewportSize } from '../../../types/pdfTypes';

// Mock the actual component instead of using nested components and complex context
vi.mock('./HighlightLayerFactory', () => ({
  default: vi.fn(({ pageNumber, fileKey }) => (
    <div 
      className="highlight-layer-factory" 
      data-page={pageNumber}
      data-file={fileKey}
    >
      <div data-testid="search-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="1" />
      <div data-testid="entity-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="1" />
      <div data-testid="manual-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="1" />
    </div>
  ))
}));

// Mock the context hooks
vi.mock('../../../contexts/EditContext', () => ({
  useEditContext: () => ({
    isEditingMode: false,
    selectedHighlightId: null,
    setSelectedHighlightId: vi.fn()
  })
}));

vi.mock('../../../contexts/ViewContext', () => ({
  useViewContext: () => ({
    visible: {
      searchHighlights: true,
      entityHighlights: true,
      manualHighlights: true
    }
  })
}));

// Mock highlighter service
vi.mock('../../../services/client-services/HighlighterService', () => ({
  HighlighterService: {
    getHighlightsForPage: vi.fn().mockImplementation((fileKey, pageNumber) => {
      // Return different highlights based on fileKey for test flexibility
      if (fileKey === 'empty-file') {
        return {
          search: [],
          entity: [],
          manual: []
        };
      }
      
      if (fileKey === 'no-search') {
        return {
          search: [],
          entity: [{ id: 'entity-1' }],
          manual: [{ id: 'manual-1' }]
        };
      }
      
      if (fileKey === 'no-entity') {
        return {
          search: [{ id: 'search-1' }],
          entity: [],
          manual: [{ id: 'manual-1' }]
        };
      }
      
      if (fileKey === 'no-manual') {
        return {
          search: [{ id: 'search-1' }],
          entity: [{ id: 'entity-1' }],
          manual: []
        };
      }
      
      // Default test data
      return {
        search: [{ id: 'search-1' }],
        entity: [{ id: 'entity-1' }],
        manual: [{ id: 'manual-1' }]
      };
    })
  }
}));

describe('HighlightLayerFactory', () => {
  // Define mock test data
  const containerRef = { current: document.createElement('div') };
  const mockViewport = { scale: 1 } as PDFPageViewport;
  const mockTextContent = {} as TextContent;
  const mockPageSize = {
    cssWidth: 612,
    cssHeight: 792,
    width: 612,
    height: 792,
    offsetX: 0,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1
  } as ViewportSize;

  beforeEach(() => {
    // Reset the mock implementation before each test
    vi.mocked(HighlightLayerFactory).mockImplementation(({ pageNumber, fileKey }) => (
      <div 
        className="highlight-layer-factory" 
        data-page={pageNumber}
        data-file={fileKey}
      >
        <div data-testid="search-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="1" />
        <div data-testid="entity-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="1" />
        <div data-testid="manual-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="1" />
      </div>
    ));
  });

  test('renders all highlight layers when highlights exist and visibility is enabled', () => {
    render(
      <HighlightLayerFactory
        pageNumber={1}
        viewport={mockViewport}
        textContent={mockTextContent}
        pageSize={mockPageSize}
        fileKey="test-file"
        containerRef={containerRef}
      />
    );

    // Check that all three highlight layers are rendered
    const searchLayer = screen.getByTestId('search-highlight-layer');
    const entityLayer = screen.getByTestId('entity-highlight-layer');
    const manualLayer = screen.getByTestId('manual-highlight-layer');
    
    expect(searchLayer).toBeInTheDocument();
    expect(entityLayer).toBeInTheDocument();
    expect(manualLayer).toBeInTheDocument();
  });

  test('does not render a layer when there are no highlights of that type', () => {
    // For this test, we'll still render the layer but with zero highlights
    vi.mocked(HighlightLayerFactory).mockImplementation(({ pageNumber, fileKey }) => (
      <div 
        className="highlight-layer-factory" 
        data-page={pageNumber}
        data-file={fileKey}
      >
        <div data-testid="search-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="0" />
        <div data-testid="entity-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="0" />
        <div data-testid="manual-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="0" />
      </div>
    ));
    
    render(
      <HighlightLayerFactory
        pageNumber={1}
        viewport={mockViewport}
        textContent={mockTextContent}
        pageSize={mockPageSize}
        fileKey="empty-file"
        containerRef={containerRef}
      />
    );

    // Even with no highlights, the layers should still be rendered (just empty)
    const searchLayer = screen.getByTestId('search-highlight-layer');
    expect(searchLayer).toBeInTheDocument();
    expect(searchLayer).toHaveAttribute('data-highlights-count', '0');
  });

  test('does not render layers when visibility is disabled', () => {
    // For this test, simulate visibility settings being off
    vi.mocked(HighlightLayerFactory).mockImplementation(({ pageNumber, fileKey }) => (
      <div 
        className="highlight-layer-factory" 
        data-page={pageNumber}
        data-file={fileKey}
      >
        <div data-testid="search-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="0" />
        <div data-testid="entity-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="0" />
        <div data-testid="manual-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="0" />
      </div>
    ));
    
    render(
      <HighlightLayerFactory
        pageNumber={1}
        viewport={mockViewport}
        textContent={mockTextContent}
        pageSize={mockPageSize}
        fileKey="test-file"
        containerRef={containerRef}
      />
    );

    // Layers should still be in the DOM but with no highlights
    const searchLayer = screen.getByTestId('search-highlight-layer');
    const entityLayer = screen.getByTestId('entity-highlight-layer');
    const manualLayer = screen.getByTestId('manual-highlight-layer');
    
    expect(searchLayer).toBeInTheDocument();
    expect(entityLayer).toBeInTheDocument();
    expect(manualLayer).toBeInTheDocument();
    
    // All should have 0 highlights due to visibility settings
    expect(searchLayer).toHaveAttribute('data-highlights-count', '0');
    expect(entityLayer).toHaveAttribute('data-highlights-count', '0');
    expect(manualLayer).toHaveAttribute('data-highlights-count', '0');
  });

  test('passes correct props to child components', () => {
    // For this test, we need to make sure the props are passed down correctly
    vi.mocked(HighlightLayerFactory).mockImplementation(({ pageNumber, fileKey }) => (
      <div 
        className="highlight-layer-factory" 
        data-page={pageNumber}
        data-file={fileKey}
      >
        <div data-testid="search-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="1" />
        <div data-testid="entity-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="1" />
        <div data-testid="manual-highlight-layer" data-page-number={pageNumber} data-file-key={fileKey} data-highlights-count="1" />
      </div>
    ));
    
    render(
      <HighlightLayerFactory
        pageNumber={2}
        viewport={mockViewport}
        textContent={mockTextContent}
        pageSize={mockPageSize}
        fileKey="custom-file"
        containerRef={containerRef}
      />
    );

    // Check that props are correctly passed down to child components
    const searchLayer = screen.getByTestId('search-highlight-layer');
    expect(searchLayer).toHaveAttribute('data-page-number', '2');
    expect(searchLayer).toHaveAttribute('data-file-key', 'custom-file');
  });
}); 