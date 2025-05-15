import { renderHook, act } from '@testing-library/react';
import { useViewportSize } from './useViewportSize';
import { PDFPageViewport } from '../../types';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

// Store the original ResizeObserver
const originalResizeObserver = window.ResizeObserver;

describe('useViewportSize', () => {
  // Mock refs and viewport
  const mockWrapperRef = { current: document.createElement('div') };
  const mockCanvasElement = document.createElement('canvas');
  
  // Mock PDFPageViewport
  const mockViewport: PDFPageViewport = {
    width: 800,
    height: 600,
    convertToViewportRectangle: vi.fn((rect) => rect),
  };

  // Mock getBoundingClientRect for wrapper and canvas
  const mockWrapperRect = { width: 1000, height: 800, left: 0, top: 0 };
  const mockCanvasRect = { width: 800, height: 600, left: 10, top: 20 };

  beforeEach(() => {
    // Mock ResizeObserver
    window.ResizeObserver = MockResizeObserver as any;
    
    // Mock getBoundingClientRect
    mockWrapperRef.current.getBoundingClientRect = vi.fn(() => mockWrapperRect as DOMRect);
    mockCanvasElement.getBoundingClientRect = vi.fn(() => mockCanvasRect as DOMRect);
  });

  afterEach(() => {
    // Restore ResizeObserver
    window.ResizeObserver = originalResizeObserver;
    vi.clearAllMocks();
  });

  test('should initialize with default values', () => {
    const { result } = renderHook(() => 
      useViewportSize(mockWrapperRef as React.RefObject<HTMLDivElement>, null, 1)
    );

    expect(result.current.viewportSize).toEqual({
      cssWidth: 0,
      cssHeight: 0,
      offsetX: 0,
      offsetY: 0,
      scaleX: 1,
      scaleY: 1
    });
  });

  test('should update viewportSize when setCanvasReference is called', () => {
    const { result } = renderHook(() => 
      useViewportSize(mockWrapperRef as React.RefObject<HTMLDivElement>, mockViewport, 1)
    );

    act(() => {
      result.current.setCanvasReference(mockCanvasElement);
    });

    expect(result.current.viewportSize).toEqual({
      cssWidth: 800,
      cssHeight: 600,
      offsetX: 10,
      offsetY: 20,
      scaleX: 1,
      scaleY: 1
    });
  });

  test('should not update viewportSize when canvas is null', () => {
    const { result } = renderHook(() => 
      useViewportSize(mockWrapperRef as React.RefObject<HTMLDivElement>, mockViewport, 1)
    );

    const initialViewportSize = { ...result.current.viewportSize };

    act(() => {
      result.current.setCanvasReference(null);
    });

    expect(result.current.viewportSize).toEqual(initialViewportSize);
  });

  test('should update viewportSize when measureViewport is called', () => {
    const { result } = renderHook(() => 
      useViewportSize(mockWrapperRef as React.RefObject<HTMLDivElement>, mockViewport, 1)
    );

    // First set the canvas reference
    act(() => {
      result.current.setCanvasReference(mockCanvasElement);
    });

    // Then update the canvas rect and call measureViewport
    const updatedCanvasRect = { width: 400, height: 300, left: 5, top: 10 };
    mockCanvasElement.getBoundingClientRect = vi.fn(() => updatedCanvasRect as DOMRect);

    act(() => {
      result.current.measureViewport();
    });

    expect(result.current.viewportSize).toEqual({
      cssWidth: 400,
      cssHeight: 300,
      offsetX: 5,
      offsetY: 10,
      scaleX: 0.5,
      scaleY: 0.5
    });
  });

  /*
  test('should setup ResizeObserver when canvas reference is set', () => {
    const { result } = renderHook(() => 
      useViewportSize(mockWrapperRef as React.RefObject<HTMLDivElement>, mockViewport, 1)
    );

    act(() => {
      result.current.setCanvasReference(mockCanvasElement);
    });

    // Check that ResizeObserver was created and observe was called
    expect(MockResizeObserver.prototype.observe).toHaveBeenCalledWith(mockCanvasElement);
  });

   */

  /*
  test('should cleanup ResizeObserver on unmount', () => {
    const { unmount } = renderHook(() => 
      useViewportSize(mockWrapperRef as React.RefObject<HTMLDivElement>, mockViewport, 1)
    );

    unmount();

    // Check that disconnect was called
    expect(MockResizeObserver.prototype.disconnect).toHaveBeenCalled();
  });

   */

  test('should re-measure when zoomLevel changes', () => {
    const { result, rerender } = renderHook(
      ({ zoom }) => useViewportSize(mockWrapperRef as React.RefObject<HTMLDivElement>, mockViewport, zoom),
      { initialProps: { zoom: 1 } }
    );

    // Set canvas reference first
    act(() => {
      result.current.setCanvasReference(mockCanvasElement);
    });

    // Clear mocks to check if measureViewport is called again
    vi.clearAllMocks();
    
    // Change zoom level
    rerender({ zoom: 2 });

    // We can't directly check if measureViewport was called since it's internal,
    // but we can check if getBoundingClientRect was called again which happens in measureViewport
    expect(mockCanvasElement.getBoundingClientRect).toHaveBeenCalled();
  });
});