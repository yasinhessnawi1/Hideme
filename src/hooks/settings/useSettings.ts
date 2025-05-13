/**
 * User Settings Hook
 *
 * Manages user settings operations including:
 * - Fetching and updating general application settings
 * - Theme preferences
 * - Auto-processing settings
 * - Detection thresholds
 * - Importing and exporting settings
 *
 * This hook depends on the auth hook for authentication state.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import useAuth from '../auth/useAuth';
import apiClient from '../../services/api-services/apiClient';
import { UserSettings, UserSettingsUpdate } from '../../types';
import authStateManager from '../../managers/authStateManager';
import { SettingsExport } from './useDocument';
import authService from '../../services/database-backend-services/authService';
import { useLanguage } from '../../contexts/LanguageContext';

export interface UseSettingsReturn {
    // User settings state
    settings: UserSettings | null;

    // Loading and error states
    isLoading: boolean;
    error: string | null;

    // Settings operations
    getSettings: (forceRefresh?: boolean) => Promise<UserSettings | null>;
    updateSettings: (data: UserSettingsUpdate) => Promise<UserSettings | null>;

    // Import/Export operations
    exportSettings: () => Promise<void>;
    importSettings: (settingsFile: File) => Promise<UserSettings | null>;

    // Utility methods
    clearError: () => void;

    // Initialize settings flag
    isInitialized: boolean;
}

/**
 * Hook for managing user settings
 */
export const useSettings = (): UseSettingsReturn => {
    // Get authentication state from auth hook and cached state
    const { isAuthenticated } = useAuth();
    const cachedState = authStateManager.getCachedState();
    const isAuthenticatedOrCached = isAuthenticated || Boolean(cachedState?.isAuthenticated);

    // Settings state
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Track settings fetch to prevent duplicate requests
    const fetchInProgressRef = useRef<boolean>(false);

    const { t } = useLanguage();

    /**
     * Clear error messages
     */
    const clearError = useCallback((): void => {
        setError(null);
    }, []);

    /**
     * Get user settings
     */
    const getSettings = useCallback(async (forceRefresh = false): Promise<UserSettings | null> => {
        // Skip if already in progress
        if (fetchInProgressRef.current) {
            return null;
        }

        // Set flag before any async operations
        fetchInProgressRef.current = true;
        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.get<{ data: UserSettings }>('/settings', null, forceRefresh);
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
            setError(error.userMessage ?? 'Failed to load settings');
            return null;
        } finally {
            setIsLoading(false);
            fetchInProgressRef.current = false;
        }
    }, [settings, clearError, isInitialized]);

    /**
     * Update user settings
     */
    const updateSettings = useCallback(async (data: UserSettingsUpdate): Promise<UserSettings | null> => {
        if (!isAuthenticatedOrCached) {
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
            setError(error.userMessage ?? t('errors', 'failedToUpdateSettings'));
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticatedOrCached, clearError, t]);

    /**
     * Export user settings to a file
     * The API returns a file directly, not JSON data
     */
    const exportSettings = useCallback(async (): Promise<void> => {
        if (!isAuthenticatedOrCached) {
            setError('You must be logged in to export settings');
            return;
        }

        setIsLoading(true);
        clearError();

        try {
            // Use apiClient directly, but override the cache settings
            // and pass the necessary headers
            const response = await apiClient.get('/settings/export', null, true);

            // Extract the raw response data (this is the binary file content)
            const fileData = response.data;

            // Get content disposition header to extract the filename
            const contentDisposition = response.headers?.['content-disposition'];
            let filename = 'settings_export.json';

            // Extract filename from content-disposition if available
            if (contentDisposition) {
                const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            } else {
                // Format date for default filename
                const dateStr = new Date().toISOString().split('T')[0];
                filename = `settings_export_${dateStr}.json`;
            }

            // Convert the data to a string
            let jsonString = '';

            // Check if the data is already a string, otherwise stringify it
            if (typeof fileData === 'string') {
                jsonString = fileData;
            } else if (fileData instanceof Blob) {
                // If it's already a blob, use it directly
                const url = window.URL.createObjectURL(fileData);

                // Create and trigger download
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                setIsLoading(false);
                return;
            } else if (fileData && typeof fileData === 'object') {
                // Special case: If the data is the actual settings object, not the file contents
                // This handles the case when the response wasn't properly processed as a blob
                try {
                    // If it has a toString() that returns '[object Object]', use JSON.stringify
                    if (Object.prototype.toString.call(fileData) === '[object Object]') {
                        jsonString = JSON.stringify(fileData, null, 2);
                    } else {
                        // Try to stringify the data
                        jsonString = JSON.stringify(fileData, null, 2);
                    }
                } catch (err) {
                    console.error('Failed to stringify settings data:', err);
                    throw new Error('Failed to process settings file');
                }
            } else {
                // Try to stringify the data
                try {
                    jsonString = JSON.stringify(fileData, null, 2);
                } catch (err) {
                    console.error('Failed to stringify settings data:', err);
                    throw new Error('Failed to process settings file');
                }
            }

            // Create a blob with the JSON data
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);

            // Create a temporary anchor element to trigger download
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error: any) {
            console.error('Failed to export settings:', error);
            setError(error.userMessage ?? 'Failed to export settings');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticatedOrCached, clearError]);

    /**
     * Import settings from a provided settings file
     * @param settingsFile The settings file to import
     */
    const importSettings = useCallback(async (settingsFile: File): Promise<UserSettings | null> => {
        if (!isAuthenticatedOrCached) {
            setError('You must be logged in to import settings');
            return null;
        }

        setIsLoading(true);
        clearError();

        try {
            // Create FormData to upload the file
            const formData = new FormData();
            formData.append('settings', settingsFile);

            // Get the axios instance to handle multipart/form-data
            const axiosInstance = apiClient.getAxiosInstance();

            // Send the file to the import endpoint
            const response = await axiosInstance.post('/settings/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${authService.getToken()}`
                },
            });

            // Check if we received a success message rather than settings data
            const isSuccessMessage = response.data.success &&
                response.data.data &&
                response.data.data.message &&
                !response.data.data.theme; // Check if it's just a message without actual settings

            let updatedSettings: UserSettings | null = null;

            if (isSuccessMessage) {
                // If we only got a success message, we need to fetch the settings
                console.log('[useSettings] Import successful, fetching updated settings');

                // Clear cache to ensure fresh data
                apiClient.clearCacheEntry('/settings');

                // Force refresh to bypass cache
                updatedSettings = await getSettings(true);
            } else {
                // If we got the actual settings data in the response
                updatedSettings = response.data.data;

                // Make sure to update settings state
                if (updatedSettings) {
                    setSettings(updatedSettings);
                }
            }

            // Dispatch event for settings update
            window.dispatchEvent(new CustomEvent('settings-import-completed', {
                detail: {
                    type: 'import',
                    success: true,
                    timestamp: Date.now()
                }
            }));

            return updatedSettings;
        } catch (error: any) {
            console.error('Failed to import settings:', error);
            setError(error.userMessage ?? 'Failed to import settings');

            // Dispatch event for failed import
            window.dispatchEvent(new CustomEvent('settings-import-completed', {
                detail: {
                    type: 'import',
                    success: false,
                    error: error.userMessage ?? 'Failed to import settings',
                    timestamp: Date.now()
                }
            }));

            return null;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticatedOrCached, clearError, getSettings]);

    /**
     * Initialize settings when authenticated
     */
    useEffect(() => {
        if (isAuthenticatedOrCached && !isInitialized && !fetchInProgressRef.current) {
            // Add a small delay to allow auth state to fully resolve
            const timeoutId = setTimeout(() => {
                getSettings().then(()=>{});
            }, 50);

            return () => clearTimeout(timeoutId);
        }
    }, [isAuthenticatedOrCached, isInitialized, getSettings]);

    return {
        // Settings state
        settings,

        // Loading and error states
        isLoading,
        error,

        // Settings operations
        getSettings,
        updateSettings,

        // Import/Export operations
        exportSettings,
        importSettings,

        // Utility methods
        clearError,

        // Initialize settings flag
        isInitialized
    };
};

export default useSettings;
