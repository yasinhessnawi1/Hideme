import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import EntityHighlightLayer from './EntityHighlightLayer';
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

describe('EntityHighlightLayer', () => {
  // Test data
  const highlights: HighlightRect[] = [
    {
      id: 'entity-1',
      page: 1,
      x: 100,
      y: 150,
      w: 200,
      h: 50,
      type: HighlightType.ENTITY,
      entity: 'PERSON',
      model: 'presidio',
      fileKey: 'test-file'
    },
    {
      id: 'entity-2',
      page: 1,
      x: 150,
      y: 250,
      w: 200,
      h: 50,
      type: HighlightType.ENTITY,
      entity: 'LOCATION',
      model: 'presidio',
      fileKey: 'test-file'
    }
  ];
  
  const containerRef = { current: document.createElement('div') };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders BaseHighlightLayer with correct props', () => {
    const { getByTestId } = render(
      <EntityHighlightLayer
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
    expect(baseLayer).toHaveAttribute('data-layer-class', 'entity');
    expect(baseLayer).toHaveAttribute('data-file-key', 'test-file');
  });
}); 