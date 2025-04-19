/**
 * User Profile Management Hook
 *
 * Manages user profile operations including:
 * - Fetching and updating user profile information
 * - Password management
 * - Account deletion
 * - Session management
 *
 * This hook depends on the core authentication hook for user state.
 */

import { useState, useCallback } from 'react';
import useAuth from './useAuth';
import userService, {
    UserUpdate,
    PasswordChange,
    AccountDeletion,
    ActiveSession
} from '../../services/userService';
import apiClient from '../../services/apiClient';
import { User } from '../../types';

export interface UseUserProfileReturn {
    // User state (from auth hook)
    user: User | null;
    isAuthenticated: boolean;

    // Loading and error states
    isLoading: boolean;
    error: string | null;

    // Profile operations
    getUserProfile: () => Promise<User | null>;
    updateUserProfile: (data: UserUpdate) => Promise<User | null>;
    changePassword: (data: PasswordChange) => Promise<void>;
    deleteAccount: (data: AccountDeletion) => Promise<void>;

    // Session management
    getActiveSessions: () => Promise<ActiveSession[]>;
    invalidateSession: (sessionId: string) => Promise<void>;

    // Utility methods
    clearError: () => void;
}

/**
 * Hook for managing user profile operations
 */
export const useUserProfile = (): UseUserProfileReturn => {
    // Get authentication state from core hook
    const {
        user,
        isAuthenticated,
        clearError: clearAuthError
    } = useAuth();

    // Local loading and error states
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Clear error messages
     */
    const clearError = useCallback((): void => {
        setError(null);
        clearAuthError();
    }, [clearAuthError]);

    /**
     * Get the current user's profile
     */
    const getUserProfile = useCallback(async (): Promise<User | null> => {
        if (!isAuthenticated) {
            console.warn('[UserProfile] getUserProfile called but user is not authenticated');
            return null;
        }

        setIsLoading(true);
        clearError();

        try {
            // Use the enhanced API client with caching
            const response = await apiClient.get<{ data: User }>('/users/me');
            return response.data.data;
        } catch (error: any) {
            setError(error.userMessage || 'Failed to load user profile');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, clearError]);

    /**
     * Update user profile information
     */
    const updateUserProfile = useCallback(async (data: UserUpdate): Promise<User | null> => {
        if (!isAuthenticated) {
            console.warn('[UserProfile] updateUserProfile called but user is not authenticated');
            return null;
        }

        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.put<User>('/users/me', data);

            // Invalidate user profile cache
            apiClient.clearCacheEntry('/users/me');

            return response.data;
        } catch (error: any) {
            setError(error.userMessage || 'Failed to update profile');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, clearError]);

    /**
     * Change user password
     */
    const changePassword = useCallback(async (data: PasswordChange): Promise<void> => {
        if (!isAuthenticated) {
            console.warn('[UserProfile] changePassword called but user is not authenticated');
            return;
        }

        setIsLoading(true);
        clearError();

        try {
            await userService.changePassword(data);
        } catch (error: any) {
            setError(error.userMessage || 'Failed to change password');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, clearError]);

    /**
     * Delete user account
     */
    const deleteAccount = useCallback(async (data: AccountDeletion): Promise<void> => {
        if (!isAuthenticated) {
            console.warn('[UserProfile] deleteAccount called but user is not authenticated');
            return;
        }

        setIsLoading(true);
        clearError();

        try {
            await userService.deleteAccount(data);

            // Clear all cached data
            apiClient.clearCache();
        } catch (error: any) {
            setError(error.userMessage || 'Failed to delete account');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, clearError]);

    /**
     * Get active user sessions
     */
    const getActiveSessions = useCallback(async (): Promise<ActiveSession[]> => {
        if (!isAuthenticated) {
            console.warn('[UserProfile] getActiveSessions called but user is not authenticated');
            return [];
        }

        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.get<ActiveSession[]>('/users/me/sessions');
            return response.data;
        } catch (error: any) {
            setError(error.userMessage || 'Failed to get active sessions');
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, clearError]);

    /**
     * Invalidate a specific session
     */
    const invalidateSession = useCallback(async (sessionId: string): Promise<void> => {
        if (!isAuthenticated) {
            console.warn('[UserProfile] invalidateSession called but user is not authenticated');
            return;
        }

        setIsLoading(true);
        clearError();

        try {
            await apiClient.delete('/users/me/sessions', { session_id: sessionId });

            // Invalidate sessions cache
            apiClient.clearCacheEntry('/users/me/sessions');
        } catch (error: any) {
            setError(error.userMessage || 'Failed to invalidate session');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, clearError]);

    return {
        // User state from auth hook
        user,
        isAuthenticated,

        // Loading and error states
        isLoading,
        error,

        // Profile operations
        getUserProfile,
        updateUserProfile,
        changePassword,
        deleteAccount,

        // Session management
        getActiveSessions,
        invalidateSession,

        // Utility methods
        clearError
    };
};

export default useUserProfile;
