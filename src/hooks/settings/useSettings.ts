/**
 * User Settings Hook
 *
 * Manages user settings operations including:
 * - Fetching and updating general application settings
 * - Theme preferences
 * - Auto-processing settings
 * - Detection thresholds
 *
 * This hook depends on the auth hook for authentication state.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import useAuth from '../auth/useAuth';
import apiClient from '../../services/apiClient';
import { UserSettings, UserSettingsUpdate } from '../../types';

export interface UseSettingsReturn {
    // User settings state
    settings: UserSettings | null;

    // Loading and error states
    isLoading: boolean;
    error: string | null;

    // Settings operations
    getSettings: () => Promise<UserSettings | null>;
    updateSettings: (data: UserSettingsUpdate) => Promise<UserSettings | null>;

    // Utility methods
    clearError: () => void;

    // Initialize settings flag
    isInitialized: boolean;
}

/**
 * Hook for managing user settings
 */
export const useSettings = (): UseSettingsReturn => {
    // Get authentication state from auth hook
    const { isAuthenticated } = useAuth();

    // Settings state
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Track settings fetch to prevent duplicate requests
    const fetchInProgressRef = useRef<boolean>(false);

    /**
     * Clear error messages
     */
    const clearError = useCallback((): void => {
        setError(null);
    }, []);

    /**
     * Get user settings
     */
    const getSettings = useCallback(async (): Promise<UserSettings | null> => {
        if (!isAuthenticated) {
            console.warn('[Settings] getSettings called but user is not authenticated');
            return null;
        }

        // Return cached data if available
        if (settings !== null) {
            return settings;
        }

        // Skip if already in progress
        if (fetchInProgressRef.current) {
            console.log('[Settings] Settings fetch already in progress');
            return null;
        }

        // Set flag before any async operations
        fetchInProgressRef.current = true;
        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.get<{ data: UserSettings }>('/settings');
            const userSettings = response.data.data;

            // Only update state if settings actually changed
            if (JSON.stringify(settings) !== JSON.stringify(userSettings)) {
                setSettings(userSettings);
            }

            if (!isInitialized) {
                setIsInitialized(true);
            }

            return userSettings;
        } catch (error: any) {
            setError(error.userMessage || 'Failed to load settings');
            return null;
        } finally {
            setIsLoading(false);
            fetchInProgressRef.current = false;
        }
    }, [isAuthenticated, settings, clearError, isInitialized]);

    /**
     * Update user settings
     */
    const updateSettings = useCallback(async (data: UserSettingsUpdate): Promise<UserSettings | null> => {
        if (!isAuthenticated) {
            console.warn('[Settings] updateSettings called but user is not authenticated');
            return null;
        }

        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.put<{ data: UserSettings }>('/settings', data);
            const updatedSettings = response.data.data;

            setSettings(updatedSettings);

            // Dispatch an event for other components to react to settings changes
            window.dispatchEvent(new CustomEvent('settings-changed', {
                detail: {
                    type: 'general',
                    settings: updatedSettings
                }
            }));

            return updatedSettings;
        } catch (error: any) {
            setError(error.userMessage || 'Failed to update settings');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, clearError]);

    /**
     * Initialize settings when authenticated
     */
    useEffect(() => {
        if (isAuthenticated && !isInitialized && !fetchInProgressRef.current) {
            // Add a small delay to allow auth state to fully resolve
            const timeoutId = setTimeout(() => {
                console.log('[Settings] User authenticated, loading initial settings');
                getSettings().then(result => {
                    if (result) {
                        console.log('[Settings] Initial settings loaded successfully');
                    } else {
                        console.warn('[Settings] Failed to load initial settings');
                    }
                });
            }, 50);

            return () => clearTimeout(timeoutId);
        }
    }, [isAuthenticated, isInitialized, getSettings]);

    return {
        // Settings state
        settings,

        // Loading and error states
        isLoading,
        error,

        // Settings operations
        getSettings,
        updateSettings,

        // Utility methods
        clearError,

        // Initialize settings flag
        isInitialized
    };
};

export default useSettings;
