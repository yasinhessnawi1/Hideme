import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useHighlightStore } from './useHighlightStore';
import { HighlightStoreProvider } from '../../contexts/HighlightStoreContext';
import { highlightStore } from '../../store/HighlightStore';
import { HighlightRect, HighlightType } from '../../types';
import type { Mock } from 'vitest';

// Mock the highlightStore
vi.mock('../../store/HighlightStore', () => {
  const mockSubscriptions: Array<(fileKey?: string, page?: number, type?: HighlightType) => void> = [];
  
  // Create spy functions with vi.fn()
  const addHighlight = vi.fn(async () => 'mock-id');
  const removeHighlight = vi.fn(async () => true);
  const addMultipleHighlights = vi.fn(async () => ['mock-id-1', 'mock-id-2']);
  const removeMultipleHighlights = vi.fn(async () => true);
  const getHighlightsForPage = vi.fn(() => []);
  const addHighlightsToPage = vi.fn(async () => ['mock-id-1', 'mock-id-2']);
  const removeHighlightsFromPage = vi.fn(async () => true);
  const getHighlightsForFile = vi.fn(() => []);
  const addHighlightsToFile = vi.fn(async () => ['mock-id-1', 'mock-id-2']);
  const removeHighlightsFromFile = vi.fn(async () => true);
  const getHighlightsByType = vi.fn(() => []);
  const addHighlightsByType = vi.fn(async () => ['mock-id-1', 'mock-id-2']);
  const removeHighlightsByType = vi.fn(async () => true);
  const getHighlightsByProperty = vi.fn(() => []);
  const removeHighlightsByProperty = vi.fn(async () => true);
  const removeHighlightsByPropertyFromAllFiles = vi.fn(async () => true);
  const getHighlightsByText = vi.fn(() => []);
  const removeHighlightsByText = vi.fn(async () => true);
  const removeAllHighlights = vi.fn(async () => true);
  const removeAllHighlightsByType = vi.fn(async () => true);
  const removeHighlightsByPosition = vi.fn(async () => true);
  const subscribe = vi.fn((callback) => {
    mockSubscriptions.push(callback);
    return {
      unsubscribe: vi.fn(() => {
        const index = mockSubscriptions.indexOf(callback);
        if (index !== -1) {
          mockSubscriptions.splice(index, 1);
        }
      })
    };
  });

  const mockStore = {
    // Core operations
    addHighlight,
    removeHighlight,

    // Batch operations
    addMultipleHighlights,
    removeMultipleHighlights,

    // Page operations
    getHighlightsForPage,
    addHighlightsToPage,
    removeHighlightsFromPage,

    // File operations
    getHighlightsForFile,
    addHighlightsToFile,
    removeHighlightsFromFile,

    // Type operations
    getHighlightsByType,
    addHighlightsByType,
    removeHighlightsByType,

    // Property operations
    getHighlightsByProperty,
    removeHighlightsByProperty,
    removeHighlightsByPropertyFromAllFiles,
    getHighlightsByText,
    removeHighlightsByText,

    // Global operations
    removeAllHighlights,
    removeAllHighlightsByType,
    removeHighlightsByPosition,

    // Subscription management
    subscribe,

    // Helper to trigger subscriptions for testing
    _triggerSubscriptions: (fileKey?: string, page?: number, type?: HighlightType) => {
      mockSubscriptions.forEach(callback => callback(fileKey, page, type));
    }
  };

  return {
    highlightStore: mockStore,
    HighlightStore: vi.fn(() => mockStore)
  };
});

// Wrapper component for the hook
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <HighlightStoreProvider>{children}</HighlightStoreProvider>
);

describe('useHighlightStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return the highlight store context', () => {
    const { result } = renderHook(() => useHighlightStore(), { wrapper });

    // Check that all methods are available
    expect(result.current.addHighlight).toBeDefined();
    expect(result.current.removeHighlight).toBeDefined();
    expect(result.current.addMultipleHighlights).toBeDefined();
    expect(result.current.removeMultipleHighlights).toBeDefined();
    expect(result.current.getHighlightsForPage).toBeDefined();
    expect(result.current.addHighlightsToPage).toBeDefined();
    expect(result.current.removeHighlightsFromPage).toBeDefined();
    expect(result.current.getHighlightsForFile).toBeDefined();
    expect(result.current.addHighlightsToFile).toBeDefined();
    expect(result.current.removeHighlightsFromFile).toBeDefined();
    expect(result.current.getHighlightsByType).toBeDefined();
    expect(result.current.addHighlightsByType).toBeDefined();
    expect(result.current.removeHighlightsByType).toBeDefined();
    expect(result.current.getHighlightsByProperty).toBeDefined();
    expect(result.current.removeHighlightsByProperty).toBeDefined();
    expect(result.current.removeHighlightsByPropertyFromAllFiles).toBeDefined();
    expect(result.current.getHighlightsByText).toBeDefined();
    expect(result.current.removeHighlightsByText).toBeDefined();
    expect(result.current.removeAllHighlights).toBeDefined();
    expect(result.current.removeAllHighlightsByType).toBeDefined();
    expect(result.current.removeHighlightsByPosition).toBeDefined();
    expect(result.current.refreshTrigger).toBeDefined();
  });

  test('should call addHighlight with correct parameters', async () => {
    const { result } = renderHook(() => useHighlightStore(), { wrapper });

    const mockHighlight: HighlightRect = {
      id: 'test-id',
      page: 1,
      x: 10,
      y: 20,
      w: 100,
      h: 50,
      fileKey: 'test-file',
      type: HighlightType.MANUAL
    };

    await act(async () => {
      await result.current.addHighlight(mockHighlight);
    });

    expect(highlightStore.addHighlight).toHaveBeenCalledWith(mockHighlight);
  });

  test('should call removeHighlight with correct parameters', async () => {
    const { result } = renderHook(() => useHighlightStore(), { wrapper });

    await act(async () => {
      await result.current.removeHighlight('test-id');
    });

    expect(highlightStore.removeHighlight).toHaveBeenCalledWith('test-id');
  });

  test('should call getHighlightsForPage with correct parameters', () => {
    const { result } = renderHook(() => useHighlightStore(), { wrapper });

    act(() => {
      result.current.getHighlightsForPage('test-file', 1);
    });

    expect(highlightStore.getHighlightsForPage).toHaveBeenCalledWith('test-file', 1);
  });

  test('should update when store changes', async () => {
    const { result } = renderHook(() => useHighlightStore(), { wrapper });

    // Get initial refresh trigger value
    const initialRefreshTrigger = result.current.refreshTrigger;

    // Trigger a store change
    await act(async () => {
      (highlightStore as any)._triggerSubscriptions('test-file', 1, HighlightType.MANUAL);
    });

    // Check that refresh trigger has been updated
    expect(result.current.refreshTrigger).not.toBe(initialRefreshTrigger);
  });

  test('should subscribe to store changes on mount and unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useHighlightStore(), { wrapper });

    // Check that subscribe was called
    expect(highlightStore.subscribe).toHaveBeenCalled();

    // Get the unsubscribe function
    const unsubscribe = (highlightStore.subscribe as Mock).mock.results[0].value.unsubscribe;

    // Unmount the hook
    unmount();

    // Check that unsubscribe was called
    expect(unsubscribe).toHaveBeenCalled();
  });
});