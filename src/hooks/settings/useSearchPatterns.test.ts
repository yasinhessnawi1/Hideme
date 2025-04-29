import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useSearchPatterns } from './useSearchPatterns';
import useAuth from '../auth/useAuth';
import apiClient from '../../services/apiClient';
import { SearchPattern } from '../../types';
import type { Mock } from 'vitest';

// Create custom error type for mocking
interface CustomError extends Error {
  userMessage?: string;
  response?: {
    status: number;
    data?: {
      message: string;
    };
  };
}

// Mock dependencies
vi.mock('../auth/useAuth', () => ({
  default: vi.fn()
}));

vi.mock('../../services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Helper functions for API responses
function createSuccessResponse<T>(data: T) {
  return {
    data: {
      data
    }
  };
}

function createErrorResponse(message: string, status = 400): CustomError {
  const error = new Error(message) as CustomError;
  error.userMessage = message;
  error.response = { status };
  return error;
}

// Mock window.dispatchEvent
const dispatchEventMock = vi.fn();
window.dispatchEvent = dispatchEventMock;

describe('useSearchPatterns', () => {
  // Mock search patterns data
  const mockPatterns: SearchPattern[] = [
    {
      id: 1,
      pattern_text: 'test pattern',
      pattern_type: 'regex',
      setting_id: 1,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    {
      id: 2,
      pattern_text: 'another pattern',
      pattern_type: 'case_sensitive',
      setting_id: 1,
      created_at: '2023-01-02T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z'
    }
  ];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock returns
    (useAuth as Mock).mockReturnValue({
      user: { id: '123', username: 'testuser', email: 'test@example.com', created_at: '', updated_at: '' },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
      verifySession: vi.fn(),
      setUser: vi.fn(),
      setIsAuthenticated: vi.fn(),
      setIsLoading: vi.fn(),
      setError: vi.fn()
    });
  });

  describe('Initial state', () => {
    test('should initialize with default values', () => {
      const { result } = renderHook(() => useSearchPatterns());

      expect(result.current.searchPatterns).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isInitialized).toBe(false);
    });

    test('should automatically fetch patterns when authenticated', async () => {
      // Mock API response
      (apiClient.get as Mock).mockResolvedValue(createSuccessResponse(mockPatterns));

      const { result } = renderHook(() => useSearchPatterns());

      // Wait for the effect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(apiClient.get).toHaveBeenCalledWith('/settings/patterns');
      expect(result.current.searchPatterns).toEqual(mockPatterns);
      expect(result.current.isInitialized).toBe(true);
    });

    test('should not fetch patterns when not authenticated', () => {
      // Mock unauthenticated state
      (useAuth as Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        verifySession: vi.fn(),
        setUser: vi.fn(),
        setIsAuthenticated: vi.fn(),
        setIsLoading: vi.fn(),
        setError: vi.fn()
      });

      renderHook(() => useSearchPatterns());

      // Wait for any potential effects
      act(() => {
        vi.runAllTimers();
      });

      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('getSearchPatterns', () => {
    test('should fetch patterns successfully', async () => {
      // Mock API response
      (apiClient.get as Mock).mockResolvedValue(createSuccessResponse(mockPatterns));

      const { result } = renderHook(() => useSearchPatterns());

      let patterns;
      await act(async () => {
        patterns = await result.current.getSearchPatterns();
      });

      expect(apiClient.get).toHaveBeenCalledWith('/settings/patterns');
      expect(patterns).toEqual(mockPatterns);
      expect(result.current.searchPatterns).toEqual(mockPatterns);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isInitialized).toBe(true);
    });

    test('should handle error when fetching patterns', async () => {
      // Mock API error
      (apiClient.get as Mock).mockRejectedValue(createErrorResponse('Could not load your search patterns'));

      const { result } = renderHook(() => useSearchPatterns());

      let patterns;
      await act(async () => {
        patterns = await result.current.getSearchPatterns();
      });

      expect(patterns).toEqual([]);
      expect(result.current.searchPatterns).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Could not load your search patterns');
    });

    test('should handle 404 as empty patterns, not an error', async () => {
      // Mock 404 response (no patterns yet)
      const notFoundError = createErrorResponse('Not found', 404);
      (apiClient.get as Mock).mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useSearchPatterns());

      let patterns;
      await act(async () => {
        patterns = await result.current.getSearchPatterns();
      });

      expect(patterns).toEqual([]);
      expect(result.current.searchPatterns).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull(); // No error for 404
      expect(result.current.isInitialized).toBe(true);
    });

    test('should not make duplicate requests', async () => {
      // Mock API response with delay to simulate async operation
      (apiClient.get as Mock).mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createSuccessResponse(mockPatterns));
          }, 100);
        });
      });

      const { result } = renderHook(() => useSearchPatterns());

      // Call getSearchPatterns twice in quick succession
      let patterns1, patterns2;
      await act(async () => {
        const promise1 = result.current.getSearchPatterns();
        const promise2 = result.current.getSearchPatterns();

        // Fast-forward time to resolve the first request
        vi.advanceTimersByTime(100);

        patterns1 = await promise1;
        patterns2 = await promise2;
      });

      // Should only make one API call
      expect(apiClient.get).toHaveBeenCalledTimes(1);
      expect(patterns1).toEqual(mockPatterns);
      expect(patterns2).toEqual([]); // Second call returns empty array because first call is in progress
    });
  });

  describe('createSearchPattern', () => {
    test('should create pattern successfully', async () => {
      // Mock API response
      const newPattern: SearchPattern = {
        id: 3,
        pattern_text: 'new pattern',
        pattern_type: 'regex',
        setting_id: 1,
        created_at: '2023-01-03T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z'
      };

      (apiClient.post as Mock).mockResolvedValue(createSuccessResponse(newPattern));

      const { result } = renderHook(() => useSearchPatterns());

      // Set initial patterns
      act(() => {
        // @ts-ignore - Accessing private state for testing
        result.current.setSearchPatterns(mockPatterns);
      });

      let pattern;
      await act(async () => {
        pattern = await result.current.createSearchPattern({
          pattern_text: 'new pattern',
          pattern_type: 'regex'
        });
      });

      expect(apiClient.post).toHaveBeenCalledWith('/settings/patterns', {
        pattern_text: 'new pattern',
        pattern_type: 'regex'
      });

      expect(pattern).toEqual(newPattern);
      expect(result.current.searchPatterns).toEqual([...mockPatterns, newPattern]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Should dispatch event
      expect(dispatchEventMock).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'search-patterns-updated',
            detail: {
              type: 'add',
              pattern: newPattern
            }
          })
      );
    });

    test('should handle empty pattern text', async () => {
      const { result } = renderHook(() => useSearchPatterns());

      let pattern;
      await act(async () => {
        pattern = await result.current.createSearchPattern({
          pattern_text: '   ', // Empty after trim
          pattern_type: 'regex'
        });
      });

      expect(apiClient.post).not.toHaveBeenCalled();
      expect(pattern).toBeNull();
      expect(result.current.error).toBe('Search pattern cannot be empty');
    });

    test('should handle error when creating pattern', async () => {
      // Mock API error
      (apiClient.post as Mock).mockRejectedValue(createErrorResponse('Invalid pattern format'));

      const { result } = renderHook(() => useSearchPatterns());

      await act(async () => {
        try {
          await result.current.createSearchPattern({
            pattern_text: 'invalid pattern',
            pattern_type: 'regex'
          });
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Invalid pattern format');
      expect(dispatchEventMock).not.toHaveBeenCalled();
    });

    test('should return null when user is not authenticated', async () => {
      // Mock unauthenticated state
      (useAuth as Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        verifySession: vi.fn(),
        setUser: vi.fn(),
        setIsAuthenticated: vi.fn(),
        setIsLoading: vi.fn(),
        setError: vi.fn()
      });

      const { result } = renderHook(() => useSearchPatterns());

      let pattern;
      await act(async () => {
        pattern = await result.current.createSearchPattern({
          pattern_text: 'new pattern',
          pattern_type: 'regex'
        });
      });

      expect(apiClient.post).not.toHaveBeenCalled();
      expect(pattern).toBeNull();
    });
  });

  describe('updateSearchPattern', () => {
    test('should update pattern successfully', async () => {
      // Mock API response
      const updatedPattern: SearchPattern = {
        ...mockPatterns[0],
        pattern_text: 'updated pattern'
      };

      (apiClient.put as Mock).mockResolvedValue(createSuccessResponse(updatedPattern));

      const { result } = renderHook(() => useSearchPatterns());

      // Set initial patterns
      act(() => {
        // @ts-ignore - Accessing private state for testing
        result.current.setSearchPatterns(mockPatterns);
      });

      let pattern;
      await act(async () => {
        pattern = await result.current.updateSearchPattern(1, {
          pattern_text: 'updated pattern'
        });
      });

      expect(apiClient.put).toHaveBeenCalledWith('/settings/patterns/1', {
        pattern_text: 'updated pattern'
      });

      expect(pattern).toEqual(updatedPattern);
      expect(result.current.searchPatterns).toEqual([
        updatedPattern,
        mockPatterns[1]
      ]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Should dispatch event
      expect(dispatchEventMock).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'search-patterns-updated',
            detail: {
              type: 'update',
              pattern: updatedPattern
            }
          })
      );
    });

    test('should handle empty pattern text', async () => {
      const { result } = renderHook(() => useSearchPatterns());

      let pattern;
      await act(async () => {
        pattern = await result.current.updateSearchPattern(1, {
          pattern_text: '   ' // Empty after trim
        });
      });

      expect(apiClient.put).not.toHaveBeenCalled();
      expect(pattern).toBeNull();
    });

    test('should handle error when updating pattern', async () => {
      // Mock API error
      (apiClient.put as Mock).mockRejectedValue(createErrorResponse('Pattern not found'));

      const { result } = renderHook(() => useSearchPatterns());

      await act(async () => {
        try {
          await result.current.updateSearchPattern(999, {
            pattern_text: 'updated pattern'
          });
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Pattern not found');
      expect(dispatchEventMock).not.toHaveBeenCalled();
    });

    test('should return null when user is not authenticated', async () => {
      // Mock unauthenticated state
      (useAuth as Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        verifySession: vi.fn(),
        setUser: vi.fn(),
        setIsAuthenticated: vi.fn(),
        setIsLoading: vi.fn(),
        setError: vi.fn()
      });

      const { result } = renderHook(() => useSearchPatterns());

      let pattern;
      await act(async () => {
        pattern = await result.current.updateSearchPattern(1, {
          pattern_text: 'updated pattern'
        });
      });

      expect(apiClient.put).not.toHaveBeenCalled();
      expect(pattern).toBeNull();
    });
  });

  describe('deleteSearchPattern', () => {
    test('should delete pattern successfully', async () => {
      // Mock API response
      (apiClient.delete as Mock).mockResolvedValue({
        data: { success: true }
      });

      const { result } = renderHook(() => useSearchPatterns());

      // Set initial patterns
      act(() => {
        // @ts-ignore - Accessing private state for testing
        result.current.setSearchPatterns(mockPatterns);
      });

      await act(async () => {
        await result.current.deleteSearchPattern(1);
      });

      expect(apiClient.delete).toHaveBeenCalledWith('/settings/patterns/1');
      expect(result.current.searchPatterns).toEqual([mockPatterns[1]]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Should dispatch event
      expect(dispatchEventMock).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'search-patterns-updated',
            detail: {
              type: 'delete',
              patternId: 1
            }
          })
      );
    });

    test('should handle error when deleting pattern', async () => {
      // Mock API error
      (apiClient.delete as Mock).mockRejectedValue(createErrorResponse('Pattern not found'));

      const { result } = renderHook(() => useSearchPatterns());

      await act(async () => {
        try {
          await result.current.deleteSearchPattern(999);
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Pattern not found');
      expect(dispatchEventMock).not.toHaveBeenCalled();
    });

    test('should do nothing when user is not authenticated', async () => {
      // Mock unauthenticated state
      (useAuth as Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        verifySession: vi.fn(),
        setUser: vi.fn(),
        setIsAuthenticated: vi.fn(),
        setIsLoading: vi.fn(),
        setError: vi.fn()
      });

      const { result } = renderHook(() => useSearchPatterns());

      await act(async () => {
        await result.current.deleteSearchPattern(1);
      });

      expect(apiClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    test('should clear error', () => {
      const { result } = renderHook(() => useSearchPatterns());

      // Set error
      act(() => {
        // @ts-ignore - Accessing private state for testing
        result.current.setError('Test error');
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});