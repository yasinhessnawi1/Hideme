import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import ManualHighlightLayer from './ManualHighlightLayer';
import { HighlightRect, HighlightType } from '../../../types/pdfTypes';

// Mock BaseHighlightLayer component
vi.mock('./BaseHighlightLayer', () => ({
  default: vi.fn(({ pageNumber, highlights, layerClass, fileKey, containerRef }) => (
    <div 
      data-testid="mocked-base-highlight-layer" 
      data-page-number={pageNumber} 
      data-highlights-count={highlights.length}
      data-layer-class={layerClass}
      data-file-key={fileKey}
    />
  ))
}));

describe('ManualHighlightLayer', () => {
  // Test data
  const highlights: HighlightRect[] = [
    {
      id: 'manual-1',
      page: 1,
      x: 100,
      y: 150,
      w: 200,
      h: 50,
      color: '#ff9900',
      type: HighlightType.MANUAL,
      fileKey: 'test-file'
    },
    {
      id: 'manual-2',
      page: 1,
      x: 150,
      y: 250,
      w: 200,
      h: 50,
      color: '#ff9900',
      type: HighlightType.MANUAL,
      fileKey: 'test-file'
    }
  ];
  
  const containerRef = { current: document.createElement('div') };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders BaseHighlightLayer with correct props', () => {
    const { getByTestId } = render(
      <ManualHighlightLayer
        pageNumber={1}
        highlights={highlights}
        fileKey="test-file"
        containerRef={containerRef}
      />
    );

    // Check that BaseHighlightLayer is rendered with correct props
    const baseLayer = getByTestId('mocked-base-highlight-layer');
    expect(baseLayer).toBeInTheDocument();
    expect(baseLayer).toHaveAttribute('data-page-number', '1');
    expect(baseLayer).toHaveAttribute('data-highlights-count', '2');
    expect(baseLayer).toHaveAttribute('data-layer-class', 'manual');
    expect(baseLayer).toHaveAttribute('data-file-key', 'test-file');
  });

  test.skip('renders BaseHighlightLayer with correct props', () => {
    const { getByTestId } = render(
      <ManualHighlightLayer
        pageNumber={1}
        fileKey="test-file"
        viewport={{
          width: 800,
          height: 600,
          scale: 1,
          convertToViewportRectangle: vi.fn(rect => rect)
        }}
        isVisible={true}
      />
    );

    // Check that BaseHighlightLayer is rendered with the right props
    const baseHighlightLayer = getByTestId('mock-base-highlight-layer');
    expect(baseHighlightLayer).toBeInTheDocument();
    
    // Check for manual-highlight class
    expect(baseHighlightLayer).toHaveAttribute('data-highlight-class', 'manual-highlight');
    
    // Verify pageNumber and fileKey were passed
    expect(baseHighlightLayer).toHaveAttribute('data-page-number', '1');
    expect(baseHighlightLayer).toHaveAttribute('data-file-key', 'test-file');
  });
}); 