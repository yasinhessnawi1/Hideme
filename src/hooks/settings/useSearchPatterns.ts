/**
 * Search Patterns Management Hook
 *
 * Manages the user's search patterns including:
 * - Fetching saved search patterns
 * - Creating new search patterns
 * - Updating existing patterns
 * - Deleting patterns
 *
 * This hook depends on the auth hook for authentication state.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import useAuth from '../auth/useAuth';
import apiClient from '../../services/apiClient';
import {
    SearchPattern,
    SearchPatternCreate,
    SearchPatternUpdate
} from '../../types';

export interface UseSearchPatternsReturn {
    // Search patterns state
    searchPatterns: SearchPattern[];

    // Loading and error states
    isLoading: boolean;
    error: string | null;

    // Search patterns operations
    getSearchPatterns: () => Promise<SearchPattern[]>;
    createSearchPattern: (data: SearchPatternCreate) => Promise<SearchPattern | null>;
    updateSearchPattern: (patternId: number, data: SearchPatternUpdate) => Promise<SearchPattern | null>;
    deleteSearchPattern: (patternId: number) => Promise<void>;

    // Utility methods
    clearError: () => void;

    // Initialize flag
    isInitialized: boolean;
}

/**
 * Hook for managing user's search patterns
 */
export const useSearchPatterns = (): UseSearchPatternsReturn => {
    // Get authentication state from auth hook
    const { isAuthenticated } = useAuth();

    // Search patterns state
    const [searchPatterns, setSearchPatterns] = useState<SearchPattern[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Track fetch operation to prevent duplicate requests
    const fetchInProgressRef = useRef<boolean>(false);

    /**
     * Clear error messages
     */
    const clearError = useCallback((): void => {
        setError(null);
    }, []);

    /**
     * Get user's search patterns
     */
    const getSearchPatterns = useCallback(async (): Promise<SearchPattern[]> => {
        if (!isAuthenticated) {
            console.warn('[SearchPatterns] getSearchPatterns called but user is not authenticated');
            return [];
        }

        // Prevent duplicate fetch
        if (fetchInProgressRef.current) {
            console.log('[SearchPatterns] Search patterns fetch already in progress');
            return [];
        }

        fetchInProgressRef.current = true;
        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.get<{ data: SearchPattern[] }>('/settings/patterns');
            const patterns = response.data.data || [];

            setSearchPatterns(patterns);
            setIsInitialized(true);
            return patterns;
        } catch (error: any) {
            // Don't set error for 404 (empty patterns is not an error)
            if (error.response?.status !== 404) {
                setError(error.userMessage || 'Failed to load search patterns');
            }

            return [];
        } finally {
            setIsLoading(false);
            fetchInProgressRef.current = false;
        }
    }, [searchPatterns.length, clearError]);

    /**
     * Create a new search pattern
     */
    const createSearchPattern = useCallback(async (
        data: SearchPatternCreate
    ): Promise<SearchPattern | null> => {
        if (!isAuthenticated) {
            console.warn('[SearchPatterns] createSearchPattern called but user is not authenticated');
            return null;
        }

        if (!data.pattern_text?.trim()) {
            setError('Search pattern cannot be empty');
            return null;
        }

        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.post<{ data: SearchPattern }>(
                '/settings/patterns',
                data
            );
            const newPattern = response.data.data;

            // Update local state with the new pattern
            setSearchPatterns(prevPatterns => [...prevPatterns, newPattern]);

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('search-patterns-updated', {
                detail: {
                    type: 'add',
                    pattern: newPattern
                }
            }));

            return newPattern;
        } catch (error: any) {
            setError(error.userMessage || 'Failed to create search pattern');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, clearError]);

    /**
     * Update an existing search pattern
     */
    const updateSearchPattern = useCallback(async (
        patternId: number,
        data: SearchPatternUpdate
    ): Promise<SearchPattern | null> => {
        if (!isAuthenticated) {
            console.warn('[SearchPatterns] updateSearchPattern called but user is not authenticated');
            return null;
        }

        if (data.pattern_text && !data.pattern_text.trim()) {
            setError('Search pattern cannot be empty');
            return null;
        }

        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.put<{ data: SearchPattern }>(
                `/settings/patterns/${patternId}`,
                data
            );
            const updatedPattern = response.data.data;

            // Update patterns list with the updated pattern
            setSearchPatterns(prevPatterns =>
                prevPatterns.map(pattern =>
                    pattern.id === patternId ? updatedPattern : pattern
                )
            );

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('search-patterns-updated', {
                detail: {
                    type: 'update',
                    pattern: updatedPattern
                }
            }));

            return updatedPattern;
        } catch (error: any) {
            setError(error.userMessage || 'Failed to update search pattern');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, clearError]);

    /**
     * Delete a search pattern
     */
    const deleteSearchPattern = useCallback(async (patternId: number): Promise<void> => {
        if (!isAuthenticated) {
            console.warn('[SearchPatterns] deleteSearchPattern called but user is not authenticated');
            return;
        }

        setIsLoading(true);
        clearError();

        try {
            await apiClient.delete(`/settings/patterns/${patternId}`);

            // Remove the deleted pattern from state
            setSearchPatterns(prevPatterns =>
                prevPatterns.filter(pattern => pattern.id !== patternId)
            );

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('search-patterns-updated', {
                detail: {
                    type: 'delete',
                    patternId
                }
            }));
        } catch (error: any) {
            setError(error.userMessage || 'Failed to delete search pattern');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, clearError]);

    /**
     * Initialize search patterns when authenticated
     */
    useEffect(() => {
        if (isAuthenticated && !isInitialized && !fetchInProgressRef.current) {
            console.log('[SearchPatterns] User authenticated, loading search patterns');
            getSearchPatterns().then(patterns => setSearchPatterns(patterns)).catch(err => {
                console.error('[SearchPatterns] Failed to load search patterns on init:', err);
            });
        }
    }, [isAuthenticated, isInitialized, getSearchPatterns]);

    return {
        // Search patterns state
        searchPatterns,

        // Loading and error states
        isLoading,
        error,

        // Search patterns operations
        getSearchPatterns,
        createSearchPattern,
        updateSearchPattern,
        deleteSearchPattern,

        // Utility methods
        clearError,

        // Initialize flag
        isInitialized
    };
};

export default useSearchPatterns;
