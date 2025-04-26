/**
 * Ban List Management Hook
 *
 * Manages the user's ban list operations including:
 * - Fetching the ban list
 * - Adding words to the ban list
 * - Removing words from the ban list
 *
 * This hook depends on the auth hook for authentication state.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import useAuth from '../auth/useAuth';
import apiClient from '../../services/apiClient';
import { BanListWithWords } from '../../types';

export interface UseBanListReturn {
    // Ban list state
    banList: BanListWithWords | null;

    // Loading and error states
    isLoading: boolean;
    error: string | null;

    // Ban list operations
    getBanList: () => Promise<BanListWithWords | null>;
    addBanListWords: (words: string[]) => Promise<BanListWithWords | null>;
    removeBanListWords: (words: string[]) => Promise<BanListWithWords | null>;

    // Utility methods
    clearError: () => void;

    // Initialize flag
    isInitialized: boolean;
}

/**
 * Hook for managing the user's ban list
 */
export const useBanList = (): UseBanListReturn => {
    // Get authentication state from auth hook
    const { isAuthenticated } = useAuth();

    // Ban list state
    const [banList, setBanList] = useState<BanListWithWords | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Track ban list fetch to prevent duplicate requests
    const fetchInProgressRef = useRef<boolean>(false);

    /**
     * Clear error messages
     */
    const clearError = useCallback((): void => {
        setError(null);
    }, []);

    /**
     * Get the user's ban list
     */
    const getBanList = useCallback(async (): Promise<BanListWithWords | null> => {
        if (!isAuthenticated) {
            console.warn('[BanList] getBanList called but user is not authenticated');
            return null;
        }

        // Return cached data if available
        if (banList !== null) {
            return banList;
        }

        // Prevent duplicate fetch
        if (fetchInProgressRef.current) {
            console.log('[BanList] Ban list fetch already in progress');
            return null;
        }

        fetchInProgressRef.current = true;
        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.get<{ data: BanListWithWords }>('/settings/ban-list');
            const list = response.data.data;

            // Ensure words array exists even if API returns null
            const updatedList = {
                ...list,
                words: list.words || []
            };

            setBanList(updatedList);
            setIsInitialized(true);
            return updatedList;
        } catch (error: any) {
            // Don't set error for 404 (empty ban list is not an error)
            if (error.response?.status !== 404) {
                setError(error.userMessage ?? 'Failed to load ban list');
            }

            // Return empty ban list on error
            return { id: 0, words: [] };
        } finally {
            setIsLoading(false);
            fetchInProgressRef.current = false;
        }
    }, [isAuthenticated, banList, clearError]);

    /**
     * Add words to the ban list
     */
    const addBanListWords = useCallback(async (words: string[]): Promise<BanListWithWords | null> => {
        if (!isAuthenticated) {
            console.warn('[BanList] addBanListWords called but user is not authenticated');
            return null;
        }

        if (!words.length) {
            console.warn('[BanList] addBanListWords called with empty words array');
            return banList;
        }

        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.post<{ data: BanListWithWords }>(
                '/settings/ban-list/words',
                { words }
            );
            const updatedList = response.data.data;

            setBanList(updatedList);

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('ban-list-updated', {
                detail: {
                    type: 'add',
                    words,
                    updatedList
                }
            }));

            return updatedList;
        } catch (error: any) {
            setError(error.userMessage ?? 'Failed to add words to ban list');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, banList, clearError]);

    /**
     * Remove words from the ban list
     */
    const removeBanListWords = useCallback(async (words: string[]): Promise<BanListWithWords | null> => {
        if (!isAuthenticated) {
            console.warn('[BanList] removeBanListWords called but user is not authenticated');
            return null;
        }

        if (!words.length) {
            console.warn('[BanList] removeBanListWords called with empty words array');
            return banList;
        }

        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.delete<{ data: BanListWithWords }>(
                '/settings/ban-list/words',
                { words }
            );
            const updatedList = response.data.data;

            setBanList(updatedList);

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('ban-list-updated', {
                detail: {
                    type: 'remove',
                    words,
                    updatedList
                }
            }));

            return updatedList;
        } catch (error: any) {
            setError(error.userMessage ?? 'Failed to remove words from ban list');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, banList, clearError]);

    /**
     * Initialize ban list when authenticated
     */
    useEffect(() => {
        if (isAuthenticated && !isInitialized && !fetchInProgressRef.current) {
            console.log('[BanList] User authenticated, loading initial ban list');
            getBanList().then(result => {
                if (result) {
                    console.log(`[BanList] Initial ban list loaded with ${result.words.length} words`);
                }
            });
        }
    }, [isAuthenticated, isInitialized, getBanList]);

    return {
        // Ban list state
        banList,

        // Loading and error states
        isLoading,
        error,

        // Ban list operations
        getBanList,
        addBanListWords,
        removeBanListWords,

        // Utility methods
        clearError,

        // Initialize flag
        isInitialized
    };
};

export default useBanList;
