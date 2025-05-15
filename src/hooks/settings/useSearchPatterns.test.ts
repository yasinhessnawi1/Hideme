import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSearchPatterns } from './useSearchPatterns';
import useAuth from '../auth/useAuth';
import apiClient from '../../services/api-services/apiClient';
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

// Original window.dispatchEvent
const originalDispatchEvent = window.dispatchEvent;

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

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Mock window.dispatchEvent
        window.dispatchEvent = vi.fn();

        // Setup default mock returns
        (useAuth as Mock).mockReturnValue(mockAuthenticatedUser);

        // Default mock for API responses
        (apiClient.get as Mock).mockResolvedValue(createSuccessResponse(mockPatterns));
    });

    afterEach(() => {
        // Restore original window.dispatchEvent
        window.dispatchEvent = originalDispatchEvent;
        vi.restoreAllMocks();
    });

    describe('Initial state', () => {
        /*
        test('should initialize with default values', () => {
          const { result } = renderHook(() => useSearchPatterns());

          expect(result.current.searchPatterns).toEqual([]);
          expect(result.current.isLoading).toBe(false);
          expect(result.current.error).toBeNull();
          expect(result.current.isInitialized).toBe(false);
        });

         */

        test('should automatically fetch patterns when authenticated', async () => {
            // Set up the mock API response
            (apiClient.get as Mock).mockResolvedValue(createSuccessResponse(mockPatterns));

            const { result } = renderHook(() => useSearchPatterns());

            // Wait for the effect to run
            await act(async () => {
                await vi.runAllTimersAsync();
            });

            expect(apiClient.get).toHaveBeenCalledWith('/settings/patterns');
            expect(result.current.searchPatterns).toEqual(mockPatterns);
            expect(result.current.isInitialized).toBe(true);
        });

        test('should not fetch patterns when not authenticated', async () => {
            // Mock unauthenticated state
            (useAuth as Mock).mockReturnValue({
                ...mockAuthenticatedUser,
                user: null,
                isAuthenticated: false
            });

            const { result } = renderHook(() => useSearchPatterns());

            // Verify that fetch is not triggered before timer advancement
            expect(apiClient.get).not.toHaveBeenCalled();

            // Advance timers to allow any potential side effects
            await act(async () => {
                await vi.runAllTimersAsync();
            });

            // Ensure API was never called and state wasn't initialized
            expect(apiClient.get).not.toHaveBeenCalled();
            expect(result.current.isInitialized).toBe(false);
        });
    });

    describe('getSearchPatterns', () => {
        /*
        test('should fetch patterns successfully', async () => {
          // We need to reset any automatic fetch from initialization
          (apiClient.get as Mock).mockReset();

          // Now setup the mock for our explicit getSearchPatterns call
          (apiClient.get as Mock).mockResolvedValueOnce(createSuccessResponse(mockPatterns));

          // Render the hook with fetchInProgress state as false
          const { result } = renderHook(() => useSearchPatterns());

          // Make sure the hook is initialized without any pending operations
          // Access and modify the fetch ref directly to avoid auto-fetching
          Object.defineProperty(result.current, 'fetchInProgressRef', {
            writable: true,
            value: { current: false }
          });

          let patterns;
          await act(async () => {
            patterns = await result.current.getSearchPatterns();
          });

          expect(apiClient.get).toHaveBeenCalledWith('/settings/patterns');
          expect(patterns).toEqual(mockPatterns);
        });

         */

        test('should handle error when fetching patterns', async () => {
            // Mock API error
            (apiClient.get as Mock).mockReset();
            (apiClient.get as Mock).mockRejectedValueOnce(
                createErrorResponse('Failed to load search patterns')
            );

            const { result } = renderHook(() => useSearchPatterns());

            // Make sure the hook is initialized without any pending operations
            Object.defineProperty(result.current, 'fetchInProgressRef', {
                writable: true,
                value: { current: false }
            });

            let patterns;
            await act(async () => {
                patterns = await result.current.getSearchPatterns();
            });

            // Should return empty array on error
            expect(patterns).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Failed to load search patterns');
        });

        test('should handle 404 as empty patterns, not an error', async () => {
            // Mock 404 response (no patterns yet)
            (apiClient.get as Mock).mockReset();
            const notFoundError = createErrorResponse('Not found', 404);
            (apiClient.get as Mock).mockRejectedValueOnce(notFoundError);

            const { result } = renderHook(() => useSearchPatterns());

            // Make sure the hook is initialized without any pending operations
            Object.defineProperty(result.current, 'fetchInProgressRef', {
                writable: true,
                value: { current: false }
            });

            let patterns;
            await act(async () => {
                patterns = await result.current.getSearchPatterns();
            });

            // Should return empty array for 404
            expect(patterns).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull(); // No error for 404
            expect(result.current.isInitialized).toBe(true);
        });

        /*
        test('should not make duplicate requests', async () => {
          // Reset the mock to avoid interference from other tests
          (apiClient.get as Mock).mockReset();

          // Set up a delayed response
          (apiClient.get as Mock).mockImplementationOnce(() => {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve(createSuccessResponse(mockPatterns));
              }, 100);
            });
          });

          const { result } = renderHook(() => useSearchPatterns());

          // Make first request
          let firstPromise;
          await act(async () => {
            firstPromise = result.current.getSearchPatterns();

            // Try to make a second request before first completes
            const secondPromise = result.current.getSearchPatterns();

            // Verify second call returns empty array due to in-progress first call
            expect(await secondPromise).toEqual([]);

            // Advance timer to resolve first call
            await vi.advanceTimersByTimeAsync(100);

            // Wait for the first promise to complete
            const patterns = await firstPromise;
            expect(patterns).toEqual(mockPatterns);
          });

          // Verify only one API call was made
          expect(apiClient.get).toHaveBeenCalledTimes(1);
        });
        */
    });

    describe('createSearchPattern', () => {
        test('should create pattern successfully', async () => {
            // Setup mocks
            const newPattern: SearchPattern = {
                id: 3,
                pattern_text: 'new pattern',
                pattern_type: 'regex',
                setting_id: 1,
                created_at: '2023-01-03T00:00:00Z',
                updated_at: '2023-01-03T00:00:00Z'
            };

            (apiClient.post as Mock).mockResolvedValueOnce(createSuccessResponse(newPattern));

            const { result } = renderHook(() => useSearchPatterns());

            // Set the searchPatterns directly to avoid initial fetch effects
            Object.defineProperty(result.current, 'searchPatterns', {
                writable: true,
                value: [...mockPatterns]
            });

            // Make the request
            let pattern;
            await act(async () => {
                pattern = await result.current.createSearchPattern({
                    pattern_text: 'new pattern',
                    pattern_type: 'regex'
                });
            });

            // Check the results
            expect(apiClient.post).toHaveBeenCalledWith('/settings/patterns', {
                pattern_text: 'new pattern',
                pattern_type: 'regex'
            });
            expect(pattern).toEqual(newPattern);

            // Check event dispatch
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'search-patterns-updated',
                    detail: expect.objectContaining({
                        type: 'add',
                        pattern: newPattern
                    })
                })
            );
        });

        test('should handle empty pattern text', async () => {
            const { result } = renderHook(() => useSearchPatterns());

            // Set error state directly
            Object.defineProperty(result.current, 'error', {
                writable: true,
                value: null
            });

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
            (apiClient.post as Mock).mockRejectedValueOnce(
                createErrorResponse('Invalid pattern format')
            );

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
            expect(window.dispatchEvent).not.toHaveBeenCalled();
        });

        test('should return null when user is not authenticated', async () => {
            // Mock unauthenticated state
            (useAuth as Mock).mockReturnValue({
                ...mockAuthenticatedUser,
                user: null,
                isAuthenticated: false
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
            // Setup mocks
            const updatedPattern: SearchPattern = {
                ...mockPatterns[0],
                pattern_text: 'updated pattern'
            };

            (apiClient.put as Mock).mockResolvedValueOnce(createSuccessResponse(updatedPattern));

            const { result } = renderHook(() => useSearchPatterns());

            // Set the searchPatterns directly to avoid initial fetch effects
            Object.defineProperty(result.current, 'searchPatterns', {
                writable: true,
                value: [...mockPatterns]
            });

            // Make the request
            let pattern;
            await act(async () => {
                pattern = await result.current.updateSearchPattern(1, {
                    pattern_text: 'updated pattern'
                });
            });

            // Check the results
            expect(apiClient.put).toHaveBeenCalledWith('/settings/patterns/1', {
                pattern_text: 'updated pattern'
            });
            expect(pattern).toEqual(updatedPattern);

            // Check event dispatch
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'search-patterns-updated',
                    detail: expect.objectContaining({
                        type: 'update',
                        pattern: updatedPattern
                    })
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
            (apiClient.put as Mock).mockRejectedValueOnce(
                createErrorResponse('Pattern not found')
            );

            const { result } = renderHook(() => useSearchPatterns());

            // Set the searchPatterns directly
            Object.defineProperty(result.current, 'searchPatterns', {
                writable: true,
                value: [...mockPatterns]
            });

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
            expect(window.dispatchEvent).not.toHaveBeenCalled();
        });

        test('should return null when user is not authenticated', async () => {
            // Mock unauthenticated state
            (useAuth as Mock).mockReturnValue({
                ...mockAuthenticatedUser,
                user: null,
                isAuthenticated: false
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
            // Setup API response mock
            (apiClient.delete as Mock).mockResolvedValueOnce({
                data: { success: true }
            });

            const { result } = renderHook(() => useSearchPatterns());

            // Set the searchPatterns directly
            Object.defineProperty(result.current, 'searchPatterns', {
                writable: true,
                value: [...mockPatterns]
            });

            await act(async () => {
                await result.current.deleteSearchPattern(1);
            });

            expect(apiClient.delete).toHaveBeenCalledWith('/settings/patterns/1');

            // Check event dispatch
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'search-patterns-updated',
                    detail: expect.objectContaining({
                        type: 'delete',
                        patternId: 1
                    })
                })
            );
        });

        test('should handle error when deleting pattern', async () => {
            // Mock API error
            (apiClient.delete as Mock).mockRejectedValueOnce(
                createErrorResponse('Pattern not found')
            );

            const { result } = renderHook(() => useSearchPatterns());

            // Set the searchPatterns directly
            Object.defineProperty(result.current, 'searchPatterns', {
                writable: true,
                value: [...mockPatterns]
            });

            await act(async () => {
                try {
                    await result.current.deleteSearchPattern(999);
                } catch (error) {
                    // Expected error
                }
            });

            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Pattern not found');
            expect(window.dispatchEvent).not.toHaveBeenCalled();
        });

        test('should do nothing when user is not authenticated', async () => {
            // Mock unauthenticated state
            (useAuth as Mock).mockReturnValue({
                ...mockAuthenticatedUser,
                user: null,
                isAuthenticated: false
            });

            const { result } = renderHook(() => useSearchPatterns());

            await act(async () => {
                await result.current.deleteSearchPattern(1);
            });

            expect(apiClient.delete).not.toHaveBeenCalled();
        });
    });

    describe('clearError', () => {
        test('should clear error', async () => {
            const { result } = renderHook(() => useSearchPatterns());

            // Set error directly
            Object.defineProperty(result.current, 'error', {
                writable: true,
                value: 'Test error'
            });

            expect(result.current.error).toBe('Test error');

            // Clear error and check
            await act(async () => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });
});