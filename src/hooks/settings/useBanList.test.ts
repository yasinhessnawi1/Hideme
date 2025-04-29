import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useBanList } from './useBanList';
import useAuth from '../auth/useAuth';
import apiClient from '../../services/apiClient';
import authStateManager from '../../managers/authStateManager';
import { BanListWithWords } from '../../types';
import type { Mock } from 'vitest';

// Define custom error type for mocking
interface CustomError extends Error {
  userMessage?: string;
  response?: {
    status: number;
    data?: {
      message: string;
    };
  };
}

// Mock modules using factory functions
vi.mock('../auth/useAuth', () => ({
  default: vi.fn()
}));

vi.mock('../../services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../managers/authStateManager', () => ({
  default: {
    getCachedState: vi.fn()
  }
}));

// Create response helper functions
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

// Spy on window.dispatchEvent
const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

describe('useBanList', () => {
  // Mock ban list data
  const mockBanList: BanListWithWords = {
    id: 1,
    words: ['banned1', 'banned2']
  };

  // Mock authenticated user
  const mockAuthenticatedUser = {
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
  };

  // Mock cached state
  const mockCachedState = {
    isAuthenticated: true,
    userId: '123',
    username: 'testuser'
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock returns
    (useAuth as Mock).mockReturnValue(mockAuthenticatedUser);
    (authStateManager.getCachedState as Mock).mockReturnValue(mockCachedState);
  });

  describe('Initial state', () => {
    test('should initialize with default values', () => {
      const { result } = renderHook(() => useBanList());

      expect(result.current.banList).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isInitialized).toBe(false);
    });

    test('should automatically fetch ban list when authenticated', async () => {
      // Mock API response
      (apiClient.get as Mock).mockResolvedValue(createSuccessResponse(mockBanList));

      const { result } = renderHook(() => useBanList());

      // Wait for the effect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(apiClient.get).toHaveBeenCalledWith('/settings/ban-list');
      expect(result.current.banList).toEqual(mockBanList);
      expect(result.current.isInitialized).toBe(true);
    });

    test('should not fetch ban list when not authenticated', () => {
      // Mock unauthenticated state
      (useAuth as Mock).mockReturnValue({
        ...mockAuthenticatedUser,
        user: null,
        isAuthenticated: false
      });
      (authStateManager.getCachedState as Mock).mockReturnValue(null);

      renderHook(() => useBanList());

      // Wait for any potential effects
      act(() => {
        vi.runAllTimers();
      });

      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('getBanList', () => {
    test('should fetch ban list successfully', async () => {
      // Mock API response
      (apiClient.get as Mock).mockResolvedValue(createSuccessResponse(mockBanList));

      const { result } = renderHook(() => useBanList());

      let banList;
      await act(async () => {
        banList = await result.current.getBanList();
      });

      expect(apiClient.get).toHaveBeenCalledWith('/settings/ban-list');
      expect(banList).toEqual(mockBanList);
      expect(result.current.banList).toEqual(mockBanList);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isInitialized).toBe(true);
    });

    test('should handle empty words array in response', async () => {
      // Mock API response with null words
      (apiClient.get as Mock).mockResolvedValue(createSuccessResponse({ id: 1, words: null }));

      const { result } = renderHook(() => useBanList());

      let banList;
      await act(async () => {
        banList = await result.current.getBanList();
      });

      // Should ensure words array exists
      expect(banList).toEqual({ id: 1, words: [] });
      expect(result.current.banList).toEqual({ id: 1, words: [] });
    });

    test('should handle error when fetching ban list', async () => {
      // Mock API error
      (apiClient.get as Mock).mockRejectedValue(
          createErrorResponse('Could not load your ban list')
      );

      const { result } = renderHook(() => useBanList());

      let banList;
      await act(async () => {
        banList = await result.current.getBanList();
      });

      // Should return empty ban list on error
      expect(banList).toEqual({ id: 0, words: [] });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Could not load your ban list');
    });

    test('should handle 404 as empty ban list, not an error', async () => {
      // Mock 404 response (no ban list yet)
      const notFoundError = createErrorResponse('Not found', 404);
      (apiClient.get as Mock).mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useBanList());

      let banList;
      await act(async () => {
        banList = await result.current.getBanList();
      });

      // Should return empty ban list for 404
      expect(banList).toEqual({ id: 0, words: [] });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull(); // No error for 404
      expect(result.current.isInitialized).toBe(true);
    });

    test('should not make duplicate requests', async () => {
      // Mock API response with delay to simulate async operation
      (apiClient.get as Mock).mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createSuccessResponse(mockBanList));
          }, 100);
        });
      });

      const { result } = renderHook(() => useBanList());

      // Call getBanList twice in quick succession
      let banList1, banList2;
      await act(async () => {
        const promise1 = result.current.getBanList();
        const promise2 = result.current.getBanList();

        // Fast-forward time to resolve the first request
        vi.advanceTimersByTime(100);

        banList1 = await promise1;
        banList2 = await promise2;
      });

      // Should only make one API call
      expect(apiClient.get).toHaveBeenCalledTimes(1);
      expect(banList1).toEqual(mockBanList);
      expect(banList2).toBeNull(); // Second call returns null because first call is in progress
    });
  });

  describe('addBanListWords', () => {
    test('should add words to ban list successfully', async () => {
      // Mock API response
      const updatedBanList: BanListWithWords = {
        id: 1,
        words: ['banned1', 'banned2', 'banned3']
      };

      (apiClient.post as Mock).mockResolvedValue(createSuccessResponse(updatedBanList));

      const { result } = renderHook(() => useBanList());

      // Set initial ban list
      act(() => {
        // @ts-ignore - Accessing private state for testing
        result.current.setBanList(mockBanList);
      });

      let banList;
      await act(async () => {
        banList = await result.current.addBanListWords(['banned3']);
      });

      expect(apiClient.post).toHaveBeenCalledWith('/settings/ban-list/words', {
        words: ['banned3']
      });

      expect(banList).toEqual(updatedBanList);
      expect(result.current.banList).toEqual(updatedBanList);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Should dispatch event
      expect(dispatchEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'ban-list-updated',
            detail: {
              type: 'add',
              words: ['banned3'],
              updatedList: updatedBanList
            }
          })
      );
    });

    test('should handle empty words array', async () => {
      const { result } = renderHook(() => useBanList());

      // Set initial ban list
      act(() => {
        // @ts-ignore - Accessing private state for testing
        result.current.setBanList(mockBanList);
      });

      let banList;
      await act(async () => {
        banList = await result.current.addBanListWords([]);
      });

      expect(apiClient.post).not.toHaveBeenCalled();
      expect(banList).toEqual(mockBanList); // Should return current ban list
    });

    test('should handle error when adding words', async () => {
      // Mock API error
      (apiClient.post as Mock).mockRejectedValue(
          createErrorResponse('Could not add words to ban list')
      );

      const { result } = renderHook(() => useBanList());

      await act(async () => {
        try {
          await result.current.addBanListWords(['banned3']);
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Could not add words to ban list');
      expect(dispatchEventSpy).not.toHaveBeenCalled();
    });

    test('should return null when user is not authenticated', async () => {
      // Mock unauthenticated state
      (useAuth as Mock).mockReturnValue({
        ...mockAuthenticatedUser,
        user: null,
        isAuthenticated: false
      });
      (authStateManager.getCachedState as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useBanList());

      let banList;
      await act(async () => {
        banList = await result.current.addBanListWords(['banned3']);
      });

      expect(apiClient.post).not.toHaveBeenCalled();
      expect(banList).toBeNull();
    });
  });

  describe('removeBanListWords', () => {
    test('should remove words from ban list successfully', async () => {
      // Mock API response
      const updatedBanList: BanListWithWords = {
        id: 1,
        words: ['banned1']
      };

      (apiClient.delete as Mock).mockResolvedValue(createSuccessResponse(updatedBanList));

      const { result } = renderHook(() => useBanList());

      // Set initial ban list
      act(() => {
        // @ts-ignore - Accessing private state for testing
        result.current.setBanList(mockBanList);
      });

      let banList;
      await act(async () => {
        banList = await result.current.removeBanListWords(['banned2']);
      });

      expect(apiClient.delete).toHaveBeenCalledWith('/settings/ban-list/words', {
        words: ['banned2']
      });

      expect(banList).toEqual(updatedBanList);
      expect(result.current.banList).toEqual(updatedBanList);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Should dispatch event
      expect(dispatchEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'ban-list-updated',
            detail: {
              type: 'remove',
              words: ['banned2'],
              updatedList: updatedBanList
            }
          })
      );
    });

    test('should handle empty words array', async () => {
      const { result } = renderHook(() => useBanList());

      // Set initial ban list
      act(() => {
        // @ts-ignore - Accessing private state for testing
        result.current.setBanList(mockBanList);
      });

      let banList;
      await act(async () => {
        banList = await result.current.removeBanListWords([]);
      });

      expect(apiClient.delete).not.toHaveBeenCalled();
      expect(banList).toEqual(mockBanList); // Should return current ban list
    });

    test('should handle error when removing words', async () => {
      // Mock API error
      (apiClient.delete as Mock).mockRejectedValue(
          createErrorResponse('Could not remove words from ban list')
      );

      const { result } = renderHook(() => useBanList());

      await act(async () => {
        try {
          await result.current.removeBanListWords(['banned2']);
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Could not remove words from ban list');
      expect(dispatchEventSpy).not.toHaveBeenCalled();
    });

    test('should return null when user is not authenticated', async () => {
      // Mock unauthenticated state
      (useAuth as Mock).mockReturnValue({
        ...mockAuthenticatedUser,
        user: null,
        isAuthenticated: false
      });
      (authStateManager.getCachedState as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useBanList());

      let banList;
      await act(async () => {
        banList = await result.current.removeBanListWords(['banned2']);
      });

      expect(apiClient.delete).not.toHaveBeenCalled();
      expect(banList).toBeNull();
    });
  });

  describe('clearError', () => {
    test('should clear error', () => {
      const { result } = renderHook(() => useBanList());

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