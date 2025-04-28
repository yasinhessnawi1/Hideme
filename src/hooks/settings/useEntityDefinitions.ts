/**
 * Entity Definitions Management Hook
 *
 * Manages entity definitions for detection methods including:
 * - Fetching entity definitions by method
 * - Adding new entity definitions
 * - Removing entity definitions
 * - Replacing all entities for a method
 *
 * This hook depends on the auth hook for authentication state.
 */

import { useState, useCallback, useRef } from 'react';
import useAuth from '../auth/useAuth';
import apiClient from '../../services/apiClient';
import { ModelEntity, ModelEntityBatch, OptionType } from '../../types';
import authStateManager from '../../managers/authStateManager';

export interface UseEntityDefinitionsReturn {
    // Entity definitions state
    modelEntities: Record<number, ModelEntity[]>;

    // Loading and error states
    isLoading: boolean;
    error: string | null;

    // Entity operations
    getModelEntities: (methodId: number) => Promise<ModelEntity[] | null>;
    addModelEntities: (data: ModelEntityBatch) => Promise<ModelEntity[]>;
    deleteModelEntity: (entityId: number) => Promise<void>;
    replaceModelEntities: (methodId: number, entities: OptionType[]) => Promise<ModelEntity[] | null>;
    deleteAllEntitiesForMethod: (methodId: number) => Promise<void>;
    updateAllEntitySelections: (
        presidioEntities: OptionType[],
        glinerEntities: OptionType[],
        geminiEntities: OptionType[],
        hidemeEntities: OptionType[]
    ) => Promise<void>;

    // Utility methods
    clearError: () => void;

    // Helper for checking if method entities are loaded
    isMethodLoaded: (methodId: number) => boolean;
}

/**
 * Hook for managing entity definitions
 */
export const useEntityDefinitions = (): UseEntityDefinitionsReturn => {
    // Get authentication state from auth hook and cached state
    const { isAuthenticated, isLoading: userLoading } = useAuth();
    const cachedState = authStateManager.getCachedState();
    const isAuthenticatedOrCached = isAuthenticated || cachedState?.isAuthenticated;

    // Entity definitions state
    const [modelEntities, setModelEntities] = useState<Record<number, ModelEntity[]>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    // Track method loading to prevent duplicate requests
    const loadingMethodsRef = useRef<Record<number, boolean>>({});

    /**
     * Clear error messages
     */
    const clearError = useCallback((): void => {
        setError(null);
    }, []);

    /**
     * Check if entities for a method are already loaded
     */
    const isMethodLoaded = useCallback((methodId: number): boolean => {
        return !!modelEntities[methodId]?.length;
    }, [modelEntities]);

    /**
     * Get entity definitions for a specific method
     */
    const getModelEntities = useCallback(async (methodId: number): Promise<ModelEntity[] | null> => {
        if (!isAuthenticatedOrCached) {
            console.warn('[EntityDefinitions] getModelEntities called but user is not authenticated');
            return null;
        }

        // Return cached data if available
        if (isMethodLoaded(methodId)) {
            return modelEntities[methodId];
        }

        // Prevent duplicate loading for the same method
        if (loadingMethodsRef.current[methodId]) {
            console.log(`[EntityDefinitions] Already loading entities for method ${methodId}`);
            return [];
        }

        loadingMethodsRef.current[methodId] = true;
        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.get<{ data: ModelEntity[] }>(`/settings/entities/${methodId}`);
            const entities = response.data.data || [];

            // Update entity definitions for this method
            setModelEntities(prev => ({
                ...prev,
                [methodId]: entities
            }));

            return entities;
        } catch (error: any) {
            // Don't set error for 404 (empty entities is not an error)
            if (error.response?.status !== 404) {
                setError(error.userMessage ?? `Failed to load entities for method ${methodId}`);
            }

            return [];
        } finally {
            setIsLoading(false);
            loadingMethodsRef.current[methodId] = false;
        }
    }, [isAuthenticatedOrCached, isMethodLoaded, modelEntities, clearError]);

    /**
     * Add new entity definitions
     */
    const addModelEntities = useCallback(async (data: ModelEntityBatch): Promise<ModelEntity[]> => {
        if (!isAuthenticatedOrCached) {
            console.warn('[EntityDefinitions] addModelEntities called but user is not authenticated');
            return [];
        }

        if (!data.entity_texts.length) {
            console.warn('[EntityDefinitions] addModelEntities called with empty entity_texts array');
            return [];
        }

        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.post<{ data: ModelEntity[] }>('/settings/entities', data);
            const newEntities = response.data.data;

            // Update entity definitions for this method
            setModelEntities(prev => {
                const currentEntities = prev[data.method_id] || [];
                return {
                    ...prev,
                    [data.method_id]: [...currentEntities, ...newEntities]
                };
            });

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('entity-definitions-updated', {
                detail: {
                    type: 'add',
                    methodId: data.method_id,
                    entities: newEntities
                }
            }));

            return newEntities;
        } catch (error: any) {
            setError(error.userMessage ?? 'Failed to add entity definitions');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticatedOrCached, clearError]);

    /**
     * Delete an entity definition
     */
    const deleteModelEntity = useCallback(async (entityId: number): Promise<void> => {
        if (!isAuthenticatedOrCached) {
            console.warn('[EntityDefinitions] deleteModelEntity called but user is not authenticated');
            return;
        }

        setIsLoading(true);
        clearError();

        try {
            await apiClient.delete(`/settings/entities/${entityId}`);

            // Update entity definitions by removing the deleted entity
            setModelEntities(prev => {
                const updatedEntities = { ...prev };

                // Find and remove the entity from its method array
                Object.keys(updatedEntities).forEach(methodIdStr => {
                    const methodId = parseInt(methodIdStr, 10);
                    if (updatedEntities[methodId]) {
                        updatedEntities[methodId] = updatedEntities[methodId].filter(
                            entity => entity.id !== entityId
                        );
                    }
                });

                return updatedEntities;
            });

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('entity-definitions-updated', {
                detail: {
                    type: 'delete',
                    entityId
                }
            }));
        } catch (error: any) {
            setError(error.userMessage ?? 'Failed to delete entity definition');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticatedOrCached, clearError]);

    /**
     * Delete all entities for a specific method
     * This is useful when replacing all entities
     */
    const deleteAllEntitiesForMethod = useCallback(async (methodId: number): Promise<void> => {
        if (!isAuthenticatedOrCached) {
            console.warn('[EntityDefinitions] deleteAllEntitiesForMethod called but user is not authenticated');
            return;
        }

        setIsLoading(true);
        clearError();

        try {
            console.log(`[EntityDefinitions] Deleting all entities for method ${methodId}`);

            try {
                await apiClient.delete(`/settings/entities/delete_entities_by_method_id/${methodId}`);
            } catch (error: any) {
                // If the error is 404 (not found), this is acceptable for new users
                // It means there were no entities to delete
                if (error.response?.status === 404) {
                    console.log(`[EntityDefinitions] No entities found for method ${methodId} - this is normal for new users`);
                } else {
                    // For other errors, rethrow
                    throw error;
                }
            }

            // Update state to remove these entities regardless
            setModelEntities(prev => ({
                ...prev,
                [methodId]: []
            }));

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('entity-definitions-updated', {
                detail: {
                    type: 'delete-all',
                    methodId
                }
            }));
        } catch (error: any) {
            setError(error.userMessage ?? `Failed to delete entities for method ${methodId}`);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticatedOrCached, clearError]);

    /**
     * Replace all entities for a method with new ones
     * This performs a delete-then-add operation to ensure clean state
     */
    const replaceModelEntities = useCallback(async (
        methodId: number,
        entities: OptionType[]
    ): Promise<ModelEntity[] | null> => {
        if (!isAuthenticatedOrCached) {
            console.warn('[EntityDefinitions] replaceModelEntities called but user is not authenticated');
            return null;
        }

        setIsLoading(true);
        clearError();

        try {
            // 1. Delete all existing entities for this method
            // This now handles 404 errors internally
            await deleteAllEntitiesForMethod(methodId);

            // 2. Filter out "ALL_" options that shouldn't be stored
            const entitiesToAdd = entities.filter(entity =>
                !entity.value.startsWith('ALL_')
            );

            if (entitiesToAdd.length === 0) {
                console.log(`[EntityDefinitions] No entities to add for method ${methodId} after filtering`);
                return [];
            }

            // 3. Create entity batch
            const entityBatch: ModelEntityBatch = {
                method_id: methodId,
                entity_texts: entitiesToAdd.map(entity => entity.value)
            };

            // 4. Add new entities
            console.log(`[EntityDefinitions] Adding ${entitiesToAdd.length} new entities for method ${methodId}`);
            return await addModelEntities(entityBatch);

        } catch (error: any) {
            setError(error.userMessage ?? `Failed to replace entities for method ${methodId}`);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticatedOrCached, deleteAllEntitiesForMethod, addModelEntities, clearError]);

    /**
     * Update all entity selections for all methods at once
     */
    const updateAllEntitySelections = useCallback(async (
        presidioEntities: OptionType[],
        glinerEntities: OptionType[],
        geminiEntities: OptionType[],
        hidemeEntities: OptionType[]
    ): Promise<void> => {
        if (!isAuthenticatedOrCached) {
            console.warn('[EntityDefinitions] updateAllEntitySelections called but user is not authenticated');
            return;
        }

        setIsLoading(true);
        clearError();

        try {
            // Define the method IDs for each entity type
            const methodMap = {
                presidio: 1,
                gliner: 2,
                gemini: 3,
                hideme: 4
            };

            // Update each entity type in sequence to avoid race conditions
            console.log('[EntityDefinitions] Starting replacement of all entity types');

            // Replace Presidio entities
            if (presidioEntities.length > 0) {
                await replaceModelEntities(methodMap.presidio, presidioEntities);
            } else {
                await deleteAllEntitiesForMethod(methodMap.presidio);
            }

            // Replace Gliner entities
            if (glinerEntities.length > 0) {
                await replaceModelEntities(methodMap.gliner, glinerEntities);
            } else {
                await deleteAllEntitiesForMethod(methodMap.gliner);
            }

            // Replace Gemini entities
            if (geminiEntities.length > 0) {
                await replaceModelEntities(methodMap.gemini, geminiEntities);
            } else {
                await deleteAllEntitiesForMethod(methodMap.gemini);
            }

            // Replace Hideme entities
            if (hidemeEntities.length > 0) {
                await replaceModelEntities(methodMap.hideme, hidemeEntities);
            } else {
                await deleteAllEntitiesForMethod(methodMap.hideme);
            }

            console.log('[EntityDefinitions] Successfully replaced all entity types');

            // Dispatch event to notify that all entity types have been updated
            window.dispatchEvent(new CustomEvent('entity-definitions-updated', {
                detail: {
                    type: 'update-all'
                }
            }));

        } catch (error: any) {
            setError(error.userMessage ?? 'Failed to update entity selections');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticatedOrCached, replaceModelEntities, deleteAllEntitiesForMethod, clearError]);

    return {
        // Entity definitions state
        modelEntities,

        // Loading and error states
        isLoading,
        error,

        // Entity operations
        getModelEntities,
        addModelEntities,
        deleteModelEntity,
        replaceModelEntities,
        deleteAllEntitiesForMethod,
        updateAllEntitySelections,

        // Utility methods
        clearError,

        // Helper for checking if method entities are loaded
        isMethodLoaded
    };
};

export default useEntityDefinitions;
