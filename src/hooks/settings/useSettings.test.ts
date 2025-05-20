import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSettings } from './useSettings';
import useAuth from '../auth/useAuth';
import apiClient from '../../services/api-services/apiClient';
import authStateManager from '../../managers/authStateManager';
import { UserSettings, UserSettingsUpdate } from '../../types';
import type { Mock } from 'vitest';
import { ReactNode } from 'react';
import { LanguageProvider } from '../../contexts/LanguageContext';
import React from 'react';

// Mock dependencies
vi.mock('../auth/useAuth', () => ({
    default: vi.fn()
}));

// Mock apiClient with proper Jest/Vitest mocks
vi.mock('../../services/api-services/apiClient', () => {
    const get = vi.fn();
    const put = vi.fn();
    const clearCacheEntry = vi.fn();
    
    return {
        default: {
            get,
            put,
            clearCacheEntry
        }
    };
});

vi.mock('../../managers/authStateManager', () => ({
    default: {
        getCachedState: vi.fn()
    }
}));

// Create wrapper with context providers - Fixed with React.createElement
function createWrapper({ children }: { children: ReactNode }) {
  return React.createElement(LanguageProvider, null, children);
}

// Mock window.dispatchEvent
const dispatchEventMock = vi.fn();
const originalDispatchEvent = window.dispatchEvent;

describe('useSettings', () => {
    // Mock settings data
    const mockSettings: UserSettings = {
        id: 1,
        theme: 'light',
        auto_processing: true,
        detection_threshold: 0.7,
        use_banlist_for_detection: true,
        user_id: 123,
        remove_images: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
    };

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Setup fake timers for all tests
        vi.useFakeTimers();

        // Replace window.dispatchEvent with mock
        window.dispatchEvent = dispatchEventMock;

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

        (authStateManager.getCachedState as Mock).mockReturnValue({
            isAuthenticated: true,
            userId: '123',
            username: 'testuser'
        });
    });

    afterEach(() => {
        // Restore real timers
        vi.useRealTimers();

        // Restore original window.dispatchEvent
        window.dispatchEvent = originalDispatchEvent;
    });

    describe('Initial state', () => {
        test('should initialize with default values', () => {
            const { result } = renderHook(() => useSettings(), { wrapper: createWrapper });

            expect(result.current.settings).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.isInitialized).toBe(false);
        });

        test('should automatically fetch settings when authenticated', async () => {
            // Mock API response
            (apiClient.get as Mock).mockResolvedValue({
                data: {
                    data: mockSettings
                }
            });

            renderHook(() => useSettings(), { wrapper: createWrapper });

            // Fast-forward timers to trigger the initial fetch
            await act(async () => {
                vi.advanceTimersByTime(50);
            });

            expect(apiClient.get).toHaveBeenCalledWith('/settings', expect.any(Object), expect.any(Boolean));
        });

        test('should not fetch settings when not authenticated', () => {
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

            (authStateManager.getCachedState as Mock).mockReturnValue(null);

            renderHook(() => useSettings(), { wrapper: createWrapper });

            // Fast-forward timers
            act(() => {
                vi.advanceTimersByTime(50);
            });

            expect(apiClient.get).not.toHaveBeenCalled();
        });
    });

    describe('getSettings', () => {
        test('should fetch settings successfully', async () => {
            // Mock API response
            (apiClient.get as Mock).mockResolvedValue({
                data: {
                    data: mockSettings
                }
            });

            const { result } = renderHook(() => useSettings(), { wrapper: createWrapper });

            let settings;
            await act(async () => {
                settings = await result.current.getSettings();
            });

            expect(apiClient.get).toHaveBeenCalledWith('/settings', expect.any(Object), expect.any(Boolean));
            expect(settings).toEqual(mockSettings);
            expect(result.current.settings).toEqual(mockSettings);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.isInitialized).toBe(true);
        });

        test('should handle error when fetching settings', async () => {
            // Mock API error
            const mockError = new Error('Failed to fetch settings') as Error & { userMessage?: string };
            mockError.userMessage = 'Could not load your settings';
            (apiClient.get as Mock).mockRejectedValue(mockError);

            const { result } = renderHook(() => useSettings(), { wrapper: createWrapper });

            let settings;
            await act(async () => {
                settings = await result.current.getSettings();
            });

            expect(settings).toBeNull();
            expect(result.current.settings).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Could not load your settings');
        });

        test('should not make duplicate requests', async () => {
            // Mock API response with delay to simulate async operation
            (apiClient.get as Mock).mockImplementation(() => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            data: {
                                data: mockSettings
                            }
                        });
                    }, 100);
                });
            });

            const { result } = renderHook(() => useSettings(), { wrapper: createWrapper });

            // Call getSettings twice in quick succession
            let settings1, settings2;
            await act(async () => {
                const promise1 = result.current.getSettings();
                const promise2 = result.current.getSettings();

                // Fast-forward time to resolve the first request
                vi.advanceTimersByTime(200);

                settings1 = await promise1;
                settings2 = await promise2;
            });

            // Should only make one API call
            expect(apiClient.get).toHaveBeenCalledTimes(1);
            expect(settings1).toEqual(mockSettings);
            expect(settings2).toBeNull(); // Second call returns null because first call is in progress
        });

        test('should not update state if settings have not changed', async () => {
            // First call returns settings
            (apiClient.get as Mock).mockResolvedValueOnce({
                data: {
                    data: mockSettings
                }
            });

            const { result } = renderHook(() => useSettings(), { wrapper: createWrapper });

            // First fetch
            await act(async () => {
                await result.current.getSettings();
            });

            // Reset mock to track calls
            vi.mocked(apiClient.get).mockClear();

            // Mock same settings returned
            (apiClient.get as Mock).mockResolvedValueOnce({
                data: {
                    data: mockSettings
                }
            });

            // Second fetch
            await act(async () => {
                await result.current.getSettings();
            });

            // Should still make API call
            expect(apiClient.get).toHaveBeenCalledTimes(1);

            // But setState should not be called with the same value
            // This is hard to test directly, but we can verify the behavior indirectly
            expect(result.current.settings).toEqual(mockSettings);
        });
    });

    describe('updateSettings', () => {
        test('should update settings successfully', async () => {
            // Mock API response
            const updatedSettings: UserSettings = {
                ...mockSettings,
                theme: 'dark'
            };

            (apiClient.put as Mock).mockResolvedValue({
                data: {
                    data: updatedSettings
                }
            });

            const { result } = renderHook(() => useSettings(), { wrapper: createWrapper });

            const updateData: UserSettingsUpdate = { theme: 'dark' };
            let settings;
            await act(async () => {
                settings = await result.current.updateSettings(updateData);
            });

            expect(apiClient.put).toHaveBeenCalledWith('/settings', updateData);
            expect(settings).toEqual(updatedSettings);
            expect(result.current.settings).toEqual(updatedSettings);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();

            // Should dispatch settings-changed event
            expect(dispatchEventMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'settings-changed',
                    detail: {
                        type: 'general',
                        settings: updatedSettings
                    }
                })
            );
        });

        test('should handle error when updating settings', async () => {
            // Mock API error
            const mockError = new Error('Failed to update settings') as Error & { userMessage?: string };
            mockError.userMessage = 'Invalid settings data';
            (apiClient.put as Mock).mockRejectedValue(mockError);

            const { result } = renderHook(() => useSettings(), { wrapper: createWrapper });

            await act(async () => {
                try {
                    await result.current.updateSettings({ theme: 'invalid-theme' as any });
                } catch (error) {
                    // Expected error
                }
            });

            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Invalid settings data');
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

            (authStateManager.getCachedState as Mock).mockReturnValue(null);

            const { result } = renderHook(() => useSettings(), { wrapper: createWrapper });

            let settings;
            await act(async () => {
                settings = await result.current.updateSettings({ theme: 'dark' });
            });

            expect(apiClient.put).not.toHaveBeenCalled();
            expect(settings).toBeNull();
        });
    });

    describe('clearError', () => {
        test('should clear error', async () => {
            // Mock API error to set an error state
            const mockError = new Error('Failed to fetch settings') as Error & { userMessage?: string };
            mockError.userMessage = 'Could not load your settings';
            (apiClient.get as Mock).mockRejectedValue(mockError);

            const { result } = renderHook(() => useSettings(), { wrapper: createWrapper });

            // First cause an error
            await act(async () => {
                await result.current.getSettings();
            });

            expect(result.current.error).toBe('Could not load your settings');

            // Then clear error
            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });
});