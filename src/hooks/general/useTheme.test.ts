import { renderHook, act } from '@testing-library/react';
import { useTheme, ThemePreference, AppliedTheme } from '../../hooks/general/useTheme';
import { describe, test, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

describe('useTheme', () => {
  // Create mocks for DOM APIs
  const mockClassList = {
    add: vi.fn(),
    remove: vi.fn()
  };

  const mockDocumentElement = {
    setAttribute: vi.fn(),
    classList: mockClassList
  };

  // Store original objects and methods for restoration
  const originalLocalStorage = global.localStorage;
  const originalMatchMedia = window.matchMedia;
  const originalDocumentSetAttribute = document.documentElement.setAttribute;
  const originalClassListAdd = document.documentElement.classList.add;
  const originalClassListRemove = document.documentElement.classList.remove;

  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value;
        }),
        clear: vi.fn(() => {
          store = {};
        })
      };
    })();

    Object.defineProperty(global, 'localStorage', { value: localStorageMock });

    // Default to light system theme
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Mock document methods instead of trying to redefine documentElement
    document.documentElement.setAttribute = vi.fn();
    document.documentElement.classList.add = vi.fn();
    document.documentElement.classList.remove = vi.fn();

    // Clear mocks between tests
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original objects and methods
    Object.defineProperty(global, 'localStorage', { value: originalLocalStorage });
    window.matchMedia = originalMatchMedia;
    document.documentElement.setAttribute = originalDocumentSetAttribute;
    document.documentElement.classList.add = originalClassListAdd;
    document.documentElement.classList.remove = originalClassListRemove;
  });

  test.skip('should use default preference when no stored preference exists', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('system');
    expect(global.localStorage.getItem).toHaveBeenCalledWith('theme-preference');
  });

  test.skip('should use stored preference from localStorage when available', () => {
    // Mock localStorage to return a stored preference
    (global.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValueOnce('dark');

    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('dark');
    expect(global.localStorage.getItem).toHaveBeenCalledWith('theme-preference');
  });

  test.skip('should use provided default preference', () => {
    const { result } = renderHook(() => useTheme('light'));

    expect(result.current.preference).toBe('light');
  });

  test.skip('should update preference and localStorage when setPreference is called', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setPreference('dark');
    });

    expect(result.current.preference).toBe('dark');
    expect(global.localStorage.setItem).toHaveBeenCalledWith('theme-preference', 'dark');
  });

  test.skip('should apply light theme to DOM when preference is light', () => {
    renderHook(() => useTheme('light'));

    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
  });

  test.skip('should apply dark theme to DOM when preference is dark', () => {
    renderHook(() => useTheme('dark'));

    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
  });

  test.skip('should apply system theme (light) to DOM when preference is system and system prefers light', () => {
    // System prefers light
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderHook(() => useTheme('system'));

    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
  });

  test.skip('should apply system theme (dark) to DOM when preference is system and system prefers dark', () => {
    // System prefers dark
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderHook(() => useTheme('system'));

    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
  });

  test.skip('should update theme when system preference changes', () => {
    // Setup matchMedia with event dispatcher
    const listeners: Array<(e: MediaQueryListEvent) => void> = [];
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false, // Start with light
      media: query,
      addEventListener: (event: string, listener: (e: MediaQueryListEvent) => void) => {
        listeners.push(listener);
      },
      removeEventListener: vi.fn(),
      addListener: (listener: (e: MediaQueryListEvent) => void) => {
        listeners.push(listener);
      },
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderHook(() => useTheme('system'));

    // Initial state should be light
    expect(document.documentElement.setAttribute).toHaveBeenLastCalledWith('data-theme', 'light');

    // Clear mocks to check next calls
    vi.clearAllMocks();

    // Simulate system theme change to dark
    const darkEvent = { matches: true } as MediaQueryListEvent;
    listeners.forEach(listener => listener(darkEvent));

    // Should update to dark
    expect(document.documentElement.setAttribute).toHaveBeenLastCalledWith('data-theme', 'dark');
    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
  });

  test.skip('should not add system theme listener when preference is not system', () => {
    const addEventListener = vi.fn();
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener,
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    renderHook(() => useTheme('light'));

    expect(addEventListener).not.toHaveBeenCalled();
  });

  test.skip('should remove system theme listener on unmount', () => {
    const removeEventListener = vi.fn();
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    const { unmount } = renderHook(() => useTheme('system'));

    unmount();

    expect(removeEventListener).toHaveBeenCalled();
  });

  /*
  test('should handle SSR environment safely', () => {
    // Mock window as undefined to simulate SSR
    const originalWindow = global.window;
    const originalDocument = global.document;

    // Create a controlled environment for this test only
    Object.defineProperty(global, 'window', { value: undefined, configurable: true });
    Object.defineProperty(global, 'document', { value: undefined, configurable: true });

    // This should not throw errors
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('system');
    expect(result.current.appliedTheme).toBe('light'); // Default for SSR

    // Restore window and document
    Object.defineProperty(global, 'window', { value: originalWindow, configurable: true });
    Object.defineProperty(global, 'document', { value: originalDocument, configurable: true });
  });

   */
});