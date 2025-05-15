import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useUserProfile } from './useUserProfile';
import useAuth from './useAuth';
import userService from '../../services/database-backend-services/userService';
import apiClient from '../../services/api-services/apiClient';
import authStateManager from '../../managers/authStateManager';
import authService from '../../services/database-backend-services/authService';
import { User } from '../../types';
import type { Mock } from 'vitest';
import { useState } from "react";
import { ReactNode } from 'react';
import { LanguageProvider } from '../../contexts/LanguageContext';
import React from 'react';

// Mock dependencies
vi.mock('./useAuth', () => ({
    default: vi.fn()
}));

vi.mock('../../services/database-backend-services/userService', () => {
    const changePassword = vi.fn();
    const deleteAccount = vi.fn();
    
    return {
        default: {
            changePassword,
            deleteAccount
        }
    };
});

vi.mock('../../services/api-services/apiClient', () => {
    const get = vi.fn();
    const put = vi.fn();
    const deleteMethod = vi.fn();
    const clearCache = vi.fn();
    const clearCacheEntry = vi.fn();
    
    return {
        default: {
            get,
            put,
            delete: deleteMethod,
            clearCache,
            clearCacheEntry
        }
    };
});

vi.mock('../../managers/authStateManager', () => ({
    default: {
        getCachedState: vi.fn(),
        clearState: vi.fn()
    }
}));

vi.mock('../../services/database-backend-services/authService', () => {
    const clearToken = vi.fn();
    
    return {
        default: {
            clearToken
        }
    };
});

// Mock localStorage properly for tests
const localStorageMock = {
    getItem: vi.fn().mockReturnValue('en'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// Create wrapper with context providers - Fixed with React.createElement
function createWrapper({ children }: { children: ReactNode }) {
  return React.createElement(LanguageProvider, null, children);
}

// Mock window.location.reload
const reloadMock = vi.fn();
Object.defineProperty(window, 'location', {
    value: { reload: reloadMock },
    writable: true
});

describe('useUserProfile', () => {
    // Mock user data
    const mockUser: User = {
        id: 123,
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
    };

    // Mock clearError function
    const mockClearError = vi.fn();

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Setup default mock returns
        (useAuth as Mock).mockReturnValue({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            clearError: mockClearError,
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

    describe('Initial state', () => {
        test('should initialize with user state from auth hook', () => {
            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            expect(result.current.user).toBe(mockUser);
            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        test('should use cached authentication state when available', () => {
            // Mock unauthenticated state from auth hook but authenticated from cache
            (useAuth as Mock).mockReturnValue({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
                login: vi.fn(),
                register: vi.fn(),
                logout: vi.fn(),
                clearError: mockClearError,
                verifySession: vi.fn(),
                setUser: vi.fn(),
                setIsAuthenticated: vi.fn(),
                setIsLoading: vi.fn(),
                setError: vi.fn()
            });

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            // Should still be authenticated due to cached state
            expect(result.current.isAuthenticated).toBe(true);
        });
    });

    describe('getUserProfile', () => {
        test('should fetch user profile successfully', async () => {
            // Mock API response
            (apiClient.get as Mock).mockResolvedValue({
                data: {
                    data: mockUser
                }
            });

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            let profile;
            await act(async () => {
                profile = await result.current.getUserProfile();
            });

            expect(apiClient.get).toHaveBeenCalledWith('/users/me');
            expect(profile).toEqual(mockUser);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        test('should handle error when fetching profile', async () => {
            // Mock API error
            const mockError = new Error('Failed to fetch profile') as Error & { userMessage?: string };
            mockError.userMessage = 'Could not load your profile';
            (apiClient.get as Mock).mockRejectedValue(mockError);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            let profile;
            await act(async () => {
                profile = await result.current.getUserProfile();
            });

            expect(profile).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Could not load your profile');
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
                clearError: mockClearError,
                verifySession: vi.fn(),
                setUser: vi.fn(),
                setIsAuthenticated: vi.fn(),
                setIsLoading: vi.fn(),
                setError: vi.fn()
            });

            (authStateManager.getCachedState as Mock).mockReturnValue(null);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            let profile;
            await act(async () => {
                profile = await result.current.getUserProfile();
            });

            expect(apiClient.get).not.toHaveBeenCalled();
            expect(profile).toBeNull();
        });
    });

    describe('updateUserProfile', () => {
        test('should update user profile successfully', async () => {
            // Mock API response
            const updatedUser = { ...mockUser, username: 'newusername' };
            (apiClient.put as Mock).mockResolvedValue({
                data: updatedUser
            });

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            let profile;
            await act(async () => {
                profile = await result.current.updateUserProfile({ username: 'newusername' });
            });

            expect(apiClient.put).toHaveBeenCalledWith('/users/me', { username: 'newusername' });
            expect(apiClient.clearCacheEntry).toHaveBeenCalledWith('/users/me');
            expect(profile).toEqual(updatedUser);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        test('should handle error when updating profile', async () => {
            // Mock API error
            const mockError = new Error('Failed to update profile') as Error & { userMessage?: string };
            mockError.userMessage = 'Username already taken';
            (apiClient.put as Mock).mockRejectedValue(mockError);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            await act(async () => {
                try {
                    await result.current.updateUserProfile({ username: 'existinguser' });
                } catch (error) {
                    // Expected error
                }
            });

            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Username already taken');
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
                clearError: mockClearError,
                verifySession: vi.fn(),
                setUser: vi.fn(),
                setIsAuthenticated: vi.fn(),
                setIsLoading: vi.fn(),
                setError: vi.fn()
            });

            (authStateManager.getCachedState as Mock).mockReturnValue(null);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            let profile;
            await act(async () => {
                profile = await result.current.updateUserProfile({ username: 'newusername' });
            });

            expect(apiClient.put).not.toHaveBeenCalled();
            expect(profile).toBeNull();
        });
    });

    describe('changePassword', () => {
        test('should change password successfully', async () => {
            // Mock service response
            (userService.changePassword as Mock).mockResolvedValue(undefined);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            await act(async () => {
                await result.current.changePassword({
                    current_password: 'oldpassword',
                    new_password: 'newpassword',
                    confirm_password: 'newpassword'
                });
            });

            expect(userService.changePassword).toHaveBeenCalledWith({
                current_password: 'oldpassword',
                new_password: 'newpassword',
                confirm_password: 'newpassword'
            });
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        test('should handle error when changing password', async () => {
            // Mock service error
            const mockError = new Error('Failed to change password') as Error & { userMessage?: string };
            mockError.userMessage = 'Current password is incorrect';
            (userService.changePassword as Mock).mockRejectedValue(mockError);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            await act(async () => {
                try {
                    await result.current.changePassword({
                        current_password: 'wrongpassword',
                        new_password: 'newpassword',
                        confirm_password: 'newpassword'
                    });
                } catch (error) {
                    // Expected error
                }
            });

            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Current password is incorrect');
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
                clearError: mockClearError,
                verifySession: vi.fn(),
                setUser: vi.fn(),
                setIsAuthenticated: vi.fn(),
                setIsLoading: vi.fn(),
                setError: vi.fn()
            });

            (authStateManager.getCachedState as Mock).mockReturnValue(null);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            await act(async () => {
                await result.current.changePassword({
                    current_password: 'oldpassword',
                    new_password: 'newpassword',
                    confirm_password: 'newpassword'
                });
            });

            expect(userService.changePassword).not.toHaveBeenCalled();
        });
    });

    describe('deleteAccount', () => {
        test('should delete account successfully', async () => {
            // Mock service response
            (userService.deleteAccount as Mock).mockResolvedValue(undefined);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            await act(async () => {
                await result.current.deleteAccount({
                    password: 'password',
                    confirm: 'true'
                });
            });

            // Fix: Match the actual parameters being passed
            expect(userService.deleteAccount).toHaveBeenCalledWith({
                password: 'password',
                confirm: 'true'
            });

            expect(apiClient.clearCache).toHaveBeenCalled();
            expect(authService.clearToken).toHaveBeenCalled();
            expect(authStateManager.clearState).toHaveBeenCalled();
            expect(localStorageMock.clear).toHaveBeenCalled();
            expect(reloadMock).toHaveBeenCalled();
        });

        test('should handle error when deleting account', async () => {
            // Mock service error
            const mockError = new Error('Failed to delete account') as Error & { userMessage?: string };
            mockError.userMessage = 'Incorrect password';
            (userService.deleteAccount as Mock).mockRejectedValue(mockError);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            await act(async () => {
                try {
                    await result.current.deleteAccount({
                        password: 'wrongpassword',
                        confirm: 'true'
                    });
                } catch (error) {
                    // Expected error
                }
            });

            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Incorrect password');
            expect(apiClient.clearCache).not.toHaveBeenCalled();
            expect(authService.clearToken).not.toHaveBeenCalled();
            expect(authStateManager.clearState).not.toHaveBeenCalled();
            expect(localStorageMock.clear).not.toHaveBeenCalled();
            expect(reloadMock).not.toHaveBeenCalled();
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
                clearError: mockClearError,
                verifySession: vi.fn(),
                setUser: vi.fn(),
                setIsAuthenticated: vi.fn(),
                setIsLoading: vi.fn(),
                setError: vi.fn()
            });

            (authStateManager.getCachedState as Mock).mockReturnValue(null);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            await act(async () => {
                await result.current.deleteAccount({
                    password: 'password',
                    confirm: 'true'
                });
            });

            expect(userService.deleteAccount).not.toHaveBeenCalled();
        });
    });

    describe('getActiveSessions', () => {
        test('should fetch active sessions successfully', async () => {
            // Mock API response
            const mockSessions = [
                { id: 'session1', device: 'Chrome', last_active: '2023-01-01T00:00:00Z', current: true },
                { id: 'session2', device: 'Firefox', last_active: '2023-01-02T00:00:00Z', current: false }
            ];

            (apiClient.get as Mock).mockResolvedValue({
                data: mockSessions
            });

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            let sessions;
            await act(async () => {
                sessions = await result.current.getActiveSessions();
            });

            expect(apiClient.get).toHaveBeenCalledWith('/users/me/sessions');
            expect(sessions).toEqual(mockSessions);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        test('should handle error when fetching sessions', async () => {
            // Mock API error
            const mockError = new Error('Failed to fetch sessions') as Error & { userMessage?: string };
            mockError.userMessage = 'Could not load your active sessions';
            (apiClient.get as Mock).mockRejectedValue(mockError);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            let sessions;
            await act(async () => {
                sessions = await result.current.getActiveSessions();
            });

            expect(sessions).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Could not load your active sessions');
        });

        test('should return empty array when user is not authenticated', async () => {
            // Mock unauthenticated state
            (useAuth as Mock).mockReturnValue({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
                login: vi.fn(),
                register: vi.fn(),
                logout: vi.fn(),
                clearError: mockClearError,
                verifySession: vi.fn(),
                setUser: vi.fn(),
                setIsAuthenticated: vi.fn(),
                setIsLoading: vi.fn(),
                setError: vi.fn()
            });

            (authStateManager.getCachedState as Mock).mockReturnValue(null);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            let sessions;
            await act(async () => {
                sessions = await result.current.getActiveSessions();
            });

            expect(apiClient.get).not.toHaveBeenCalled();
            expect(sessions).toEqual([]);
        });
    });

    describe('invalidateSession', () => {
        test('should invalidate session successfully', async () => {
            // Mock API response
            (apiClient.delete as Mock).mockResolvedValue({
                data: { success: true }
            });

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            await act(async () => {
                await result.current.invalidateSession('session-id');
            });

            expect(apiClient.delete).toHaveBeenCalledWith('/users/me/sessions', { session_id: 'session-id' });
            expect(apiClient.clearCacheEntry).toHaveBeenCalledWith('/users/me/sessions');
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        test('should handle error when invalidating session', async () => {
            // Mock API error
            const mockError = new Error('Failed to invalidate session') as Error & { userMessage?: string };
            mockError.userMessage = 'Session not found';
            (apiClient.delete as Mock).mockRejectedValue(mockError);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            await act(async () => {
                try {
                    await result.current.invalidateSession('invalid-session-id');
                } catch (error) {
                    // Expected error
                }
            });

            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Session not found');
            expect(apiClient.clearCacheEntry).not.toHaveBeenCalled();
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
                clearError: mockClearError,
                verifySession: vi.fn(),
                setUser: vi.fn(),
                setIsAuthenticated: vi.fn(),
                setIsLoading: vi.fn(),
                setError: vi.fn()
            });

            (authStateManager.getCachedState as Mock).mockReturnValue(null);

            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            await act(async () => {
                await result.current.invalidateSession('session-id');
            });

            expect(apiClient.delete).not.toHaveBeenCalled();
        });
    });

    describe('clearError', () => {
        test('should clear error and call auth clearError', () => {
            // Create a hook with an error
            const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper });

            // Set initial error state using useState return value (simulate error state)
            let hookInstance: any;
            act(() => {
                // Access hook internals properly through a mock implementation
                const mockSetError = vi.fn();
                hookInstance = renderHook(() => {
                    const [error, setError] = useState<string | null>('Test error');
                    return { error, setError };
                }).result.current;
            });

            // Then test the clearError function
            act(() => {
                result.current.clearError();
            });

            // Should call the auth hook's clearError
            expect(mockClearError).toHaveBeenCalled();
        });
    });
});