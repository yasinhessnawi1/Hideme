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

import {useState, useCallback, useRef} from 'react';
import useAuth from '../auth/useAuth';
import apiClient from '../../services/api-services/apiClient';
import {ModelEntity, ModelEntityBatch, OptionType} from '../../types';
import authStateManager from '../../managers/authStateManager';
import {mapBackendErrorToMessage} from '../../utils/errorUtils';

export interface UseEntityDefinitionsReturn {
    // Entity definitions state
    modelEntities: Record<number, ModelEntity[]>;

    // Loading and error states
    isLoading: boolean;
    error: string | null;

    // Entity operations
    getModelEntities: (methodId: number, forceRefresh?: boolean) => Promise<ModelEntity[] | null>;
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
     * Get all model entities for a specific detection method
     *
     * @param methodId The detection method ID (1-4)
     * @param forceRefresh Whether to bypass cache and force a fresh request
     */
    const getModelEntities = useCallback(async (methodId: number, forceRefresh = false): Promise<ModelEntity[] | null> => {
        if (!isAuthenticatedOrCached) {
            return null;
        }

        // Validate method ID
        if (methodId < 1 || methodId > 4) {
            console.error(`[EntityDefinitions] Invalid method ID: ${methodId}`);
            setError(`Invalid method ID: ${methodId}`);
            return null;
        }

        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.get<{ data: ModelEntity[] }>(
                `/settings/entities/${methodId}`,
                null,
                forceRefresh
            );

            const entities = response.data.data || [];

            // Update state with the new entities
            setModelEntities(prevEntities => ({
                ...prevEntities,
                [methodId]: entities
            }));

            return entities;
        } catch (error: any) {
            // If the error is 404 (not found) or 204 (no content), this is acceptable
            // It means the user has no entities of this type
            if (error.response?.status === 404 || error.response?.status === 204) {
                console.log(`[EntityDefinitions] No entities found for method ${methodId} - this is normal for new users`);
                // Update state with empty array for this method
                setModelEntities(prevEntities => ({
                    ...prevEntities,
                    [methodId]: []
                }));
                return [];
            }
            
            setError(mapBackendErrorToMessage(error) || `Failed to load entities for method ${methodId}`);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticatedOrCached, clearError]);

    /**
     * Add new entity definitions
     */
    const addModelEntities = useCallback(async (data: ModelEntityBatch): Promise<ModelEntity[]> => {
        if (!isAuthenticatedOrCached) {
            console.warn('[EntityDefinitions] addModelEntities called but user is not authenticated');
            return [];
        }

        if (!data.entity_texts || !data.entity_texts.length) {
            console.log('[EntityDefinitions] addModelEntities called with empty entity_texts array - this is normal for clearing entities');
            return [];
        }

        setIsLoading(true);
        clearError();

        try {
            const response = await apiClient.post<{ data: ModelEntity[] }>('/settings/entities', data);
            const newEntities = response.data.data || [];
            console.log(`[EntityDefinitions] Successfully added ${newEntities.length} entities for method ${data.method_id}`);

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
            console.error(`[EntityDefinitions] Error adding entity definitions for method ${data.method_id}:`, error);
            
            // Check for specific error types that we can handle better
            if (error.response?.status === 409) {
                // Conflict - entities already exist
                console.log(`[EntityDefinitions] Some entities already exist for method ${data.method_id}`);
                setError('Some entities already exist and were not added again');
            } else {
                setError(mapBackendErrorToMessage(error) || 'Failed to add entity definitions');
            }
            
            // Return empty array instead of throwing to allow the operation to continue
            return [];
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
            try {
                await apiClient.delete(`/settings/entities/${entityId}`);
            } catch (error: any) {
                // If the error is 404 (not found) or 204 (no content), this is acceptable
                // It means the entity was already deleted or didn't exist
                if (error.response?.status === 404 || error.response?.status === 204) {
                    console.log(`[EntityDefinitions] Entity ${entityId} not found - this is normal for deleted entities`);
                } else {
                    // For other errors, rethrow
                    throw error;
                }
            }

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
            setError(mapBackendErrorToMessage(error) || 'Failed to delete entity definition');
            throw new Error(mapBackendErrorToMessage(error));
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
                console.log(`[EntityDefinitions] Successfully deleted all entities for method ${methodId}`);
            } catch (error: any) {
                // If the error is 404 (not found) or 204 (no content), this is acceptable
                // It means there were no entities to delete
                if (error.response?.status === 404 || error.response?.status === 204) {
                    console.log(`[EntityDefinitions] No entities found for method ${methodId} - this is normal for new users`);
                } else {
                    // For unexpected errors, log but don't rethrow to allow the operation to continue
                    console.error(`[EntityDefinitions] Error when deleting entities for method ${methodId}:`, error);
                    // Don't throw here, we want to continue with the update process
                }
            }

            // Update state to remove these entities regardless of the API result
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
            console.error(`[EntityDefinitions] Unexpected error in deleteAllEntitiesForMethod for method ${methodId}:`, error);
            setError(mapBackendErrorToMessage(error) || `Failed to delete entities for method ${methodId}`);
            // Don't throw the error, return quietly to allow the process to continue
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
            await deleteAllEntitiesForMethod(methodId);

            // 2. Filter out "ALL_" options that shouldn't be stored
            const entitiesToAdd = entities.filter(entity =>
                !entity.value.startsWith('ALL_')
            );

            if (entitiesToAdd.length === 0) {
                console.log(`[EntityDefinitions] No entities to add for method ${methodId} after filtering`);
                // Simply return empty array, don't try to make API call
                return [];
            }

            // 3. Create entity batch
            const entityBatch: ModelEntityBatch = {
                method_id: methodId,
                entity_texts: entitiesToAdd.map(entity => entity.value)
            };

            // 4. Add new entities
            console.log(`[EntityDefinitions] Adding ${entitiesToAdd.length} new entities for method ${methodId}`);
            try {
                const result = await addModelEntities(entityBatch);
                console.log(`[EntityDefinitions] Successfully added entities for method ${methodId}`);
                return result;
            } catch (error) {
                console.error(`[EntityDefinitions] Error adding entities for method ${methodId}:`, error);
                // Return empty array instead of rethrowing to allow the operation to continue
                return [];
            }
        } catch (error: any) {
            // Log the full error for debugging
            console.error(`[EntityDefinitions] Error replacing entities for method ${methodId}:`, error);
            setError(mapBackendErrorToMessage(error) || `Failed to replace entities for method ${methodId}`);
            // Return empty array instead of rethrowing to allow the operation to continue
            return [];
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

            let hasErrors = false;

            // Update each entity type in sequence to avoid race conditions
            console.log('[EntityDefinitions] Starting replacement of all entity types');

            try {
                // Replace Presidio entities
                if (presidioEntities.length > 0) {
                    await replaceModelEntities(methodMap.presidio, presidioEntities);
                } else {
                    await deleteAllEntitiesForMethod(methodMap.presidio);
                }
            } catch (error) {
                console.error('[EntityDefinitions] Error updating presidio entities:', error);
                hasErrors = true;
            }

            try {
                // Replace Gliner entities
                if (glinerEntities.length > 0) {
                    await replaceModelEntities(methodMap.gliner, glinerEntities);
                } else {
                    await deleteAllEntitiesForMethod(methodMap.gliner);
                }
            } catch (error) {
                console.error('[EntityDefinitions] Error updating gliner entities:', error);
                hasErrors = true;
            }

            try {
                // Replace Gemini entities
                if (geminiEntities.length > 0) {
                    await replaceModelEntities(methodMap.gemini, geminiEntities);
                } else {
                    await deleteAllEntitiesForMethod(methodMap.gemini);
                }
            } catch (error) {
                console.error('[EntityDefinitions] Error updating gemini entities:', error);
                hasErrors = true;
            }

            try {
                // Replace Hideme entities
                if (hidemeEntities.length > 0) {
                    await replaceModelEntities(methodMap.hideme, hidemeEntities);
                } else {
                    await deleteAllEntitiesForMethod(methodMap.hideme);
                }
            } catch (error) {
                console.error('[EntityDefinitions] Error updating hideme entities:', error);
                hasErrors = true;
            }

            if (hasErrors) {
                console.warn('[EntityDefinitions] Completed with some errors, but process continued');
                setError('Some entity types could not be updated completely. Please try again or contact support if the issue persists.');
            } else {
                console.log('[EntityDefinitions] Successfully replaced all entity types');
            }

            // Dispatch event to notify that all entity types have been updated
            window.dispatchEvent(new CustomEvent('entity-definitions-updated', {
                detail: {
                    type: 'update-all'
                }
            }));

        } catch (error: any) {
            console.error('[EntityDefinitions] Fatal error in updateAllEntitySelections:', error);
            setError(mapBackendErrorToMessage(error) || 'Failed to update entity selections');
            // Don't rethrow to prevent breaking the UI
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
