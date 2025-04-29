import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTheme, ThemePreference, AppliedTheme } from './useTheme';

describe('useTheme', () => {
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

  // Mock matchMedia
  const matchMediaMock = (matches: boolean) => {
    return vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  // Mock document.documentElement
  const documentElementMock = {
    setAttribute: vi.fn(),
    classList: {
      add: vi.fn(),
      remove: vi.fn()
    }
  };

  // Store original objects
  const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
  const originalMatchMedia = window.matchMedia;
  const originalDocumentElement = document.documentElement;

  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    Object.defineProperty(document, 'documentElement', { value: documentElementMock });

    // Default to light system theme
    window.matchMedia = matchMediaMock(false);

    // Clear mocks
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    // Restore original objects if they exist
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    }
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(document, 'documentElement', { value: originalDocumentElement });
  });

  test('should use default preference when no stored preference exists', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('system');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme-preference');
  });

  test('should use stored preference from localStorage when available', () => {
    localStorageMock.getItem.mockReturnValueOnce('dark');

    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('dark');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme-preference');
  });

  test('should use provided default preference', () => {
    const { result } = renderHook(() => useTheme('light'));

    expect(result.current.preference).toBe('light');
  });

  test('should update preference and localStorage when setPreference is called', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setPreference('dark');
    });

    expect(result.current.preference).toBe('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-preference', 'dark');
  });

  test('should apply light theme to DOM when preference is light', () => {
    renderHook(() => useTheme('light'));

    expect(documentElementMock.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(documentElementMock.classList.remove).toHaveBeenCalledWith('dark');
  });

  test('should apply dark theme to DOM when preference is dark', () => {
    renderHook(() => useTheme('dark'));

    expect(documentElementMock.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    expect(documentElementMock.classList.add).toHaveBeenCalledWith('dark');
  });

  test('should apply system theme (light) to DOM when preference is system and system prefers light', () => {
    window.matchMedia = matchMediaMock(false); // System prefers light

    renderHook(() => useTheme('system'));

    expect(documentElementMock.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(documentElementMock.classList.remove).toHaveBeenCalledWith('dark');
  });

  test('should apply system theme (dark) to DOM when preference is system and system prefers dark', () => {
    window.matchMedia = matchMediaMock(true); // System prefers dark

    renderHook(() => useTheme('system'));

    expect(documentElementMock.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    expect(documentElementMock.classList.add).toHaveBeenCalledWith('dark');
  });

  test('should update theme when system preference changes', () => {
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
    expect(documentElementMock.setAttribute).toHaveBeenLastCalledWith('data-theme', 'light');

    // Clear mocks to check next calls
    vi.clearAllMocks();

    // Simulate system theme change to dark
    const darkEvent = { matches: true } as MediaQueryListEvent;
    listeners.forEach(listener => listener(darkEvent));

    // Should update to dark
    expect(documentElementMock.setAttribute).toHaveBeenLastCalledWith('data-theme', 'dark');
    expect(documentElementMock.classList.add).toHaveBeenCalledWith('dark');
  });

  test('should not add system theme listener when preference is not system', () => {
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

  test('should remove system theme listener on unmount', () => {
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

  test('should handle SSR environment safely', () => {
    // Mock window as undefined to simulate SSR
    const originalWindow = global.window;
    // Use Object.defineProperty to override the window property for SSR test
    Object.defineProperty(global, 'window', { value: undefined, writable: true });

    // This should not throw errors
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('system');
    expect(result.current.appliedTheme).toBe('light'); // Default for SSR

    // Restore window
    Object.defineProperty(global, 'window', { value: originalWindow, writable: true });
  });
});