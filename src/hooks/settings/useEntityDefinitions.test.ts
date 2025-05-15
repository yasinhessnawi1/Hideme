import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEntityDefinitions } from './useEntityDefinitions';
import useAuth from '../auth/useAuth';
import apiClient from '../../services/api-services/apiClient';
import authStateManager from '../../managers/authStateManager';
import { ModelEntity, OptionType } from '../../types';
import type { Mock } from 'vitest';

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

vi.mock('../../managers/authStateManager', () => ({
    default: {
        getCachedState: vi.fn()
    }
}));

// Helper function to create API success response
function createSuccessResponse<T>(data: T) {
    return {
        data: {
            data
        }
    };
}

describe('useEntityDefinitions', () => {
    // Mock entity data with correct type structure
    const mockEntities: ModelEntity[] = [
        {
            id: 1,
            method_id: 1,
            entity_text: 'PERSON',
            created_at: '2023-01-01T00:00:00Z',
            setting_id: 1,
            updated_at: '2023-01-01T00:00:00Z'
        },
        {
            id: 2,
            method_id: 1,
            entity_text: 'ORGANIZATION',
            created_at: '2023-01-01T00:00:00Z',
            setting_id: 1,
            updated_at: '2023-01-01T00:00:00Z'
        }
    ];

    const mockGlinerEntities: ModelEntity[] = [
        {
            id: 3,
            method_id: 2,
            entity_text: 'EMAIL',
            setting_id: 1,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
        }
    ];

    // Setup for window.dispatchEvent mock
    const dispatchEventMock = vi.fn();
    const originalDispatchEvent = window.dispatchEvent;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

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
        // Restore original window.dispatchEvent
        window.dispatchEvent = originalDispatchEvent;
    });

    describe('Initial state', () => {
        test('should initialize with default values', () => {
            const { result } = renderHook(() => useEntityDefinitions());

            expect(result.current.modelEntities).toEqual({});
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    describe('isMethodLoaded', () => {
        test('should return false when method entities are not loaded', () => {
            const { result } = renderHook(() => useEntityDefinitions());

            expect(result.current.isMethodLoaded(1)).toBe(false);
        });

        test('should return true when method entities are loaded', async () => {
            // Mock API response
            (apiClient.get as Mock).mockResolvedValue(createSuccessResponse(mockEntities));

            const { result } = renderHook(() => useEntityDefinitions());

            // Load entities using the public API
            await act(async () => {
                await result.current.getModelEntities(1);
            });

            expect(result.current.isMethodLoaded(1)).toBe(true);
        });
    });

    describe('getModelEntities', () => {
        test('should fetch entities successfully', async () => {
            // Mock API response
            (apiClient.get as Mock).mockResolvedValue(createSuccessResponse(mockEntities));

            const { result } = renderHook(() => useEntityDefinitions());

            let entities;
            await act(async () => {
                entities = await result.current.getModelEntities(1);
            });

            expect(apiClient.get).toHaveBeenCalledWith('/settings/entities/1');
            expect(entities).toEqual(mockEntities);
            expect(result.current.modelEntities[1]).toEqual(mockEntities);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        test('should return cached entities if already loaded', async () => {
            // Mock API response for first call
            (apiClient.get as Mock).mockResolvedValueOnce(createSuccessResponse(mockEntities));

            const { result } = renderHook(() => useEntityDefinitions());

            // First call to load entities
            await act(async () => {
                await result.current.getModelEntities(1);
            });

            // Reset the mock to verify it's not called again
            vi.mocked(apiClient.get).mockClear();

            // Second call should use cached data
            let entities;
            await act(async () => {
                entities = await result.current.getModelEntities(1);
            });

            // Should not make API call
            expect(apiClient.get).not.toHaveBeenCalled();
            expect(entities).toEqual(mockEntities);
        });

        test('should handle error when fetching entities', async () => {
            // Mock API error
            const mockError = new Error('Failed to fetch entities') as Error & { userMessage?: string };
            mockError.userMessage = 'Could not load entity definitions';
            (apiClient.get as Mock).mockRejectedValue(mockError);

            const { result } = renderHook(() => useEntityDefinitions());

            let entities;
            await act(async () => {
                entities = await result.current.getModelEntities(1);
            });

            expect(entities).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Could not load entity definitions');
        });
    });

    describe('addModelEntities', () => {
        test('should add entities successfully', async () => {
            // Mock API responses
            // First for getModelEntities
            (apiClient.get as Mock).mockResolvedValueOnce(createSuccessResponse(mockEntities));

            // Then for addModelEntities
            const newEntities: ModelEntity[] = [
                {
                    id: 3,
                    method_id: 1,
                    entity_text: 'LOCATION',
                    setting_id: 1,
                    created_at: '2023-01-03T00:00:00Z',
                    updated_at: '2023-01-03T00:00:00Z'
                }
            ];

            (apiClient.post as Mock).mockResolvedValue(createSuccessResponse(newEntities));

            const { result } = renderHook(() => useEntityDefinitions());

            // Load initial entities using the public API
            await act(async () => {
                await result.current.getModelEntities(1);
            });

            let entities;
            await act(async () => {
                entities = await result.current.addModelEntities({
                    method_id: 1,
                    entity_texts: ['LOCATION']
                });
            });

            expect(apiClient.post).toHaveBeenCalledWith('/settings/entities', {
                method_id: 1,
                entity_texts: ['LOCATION']
            });

            expect(entities).toEqual(newEntities);
            expect(result.current.modelEntities[1]).toEqual([...mockEntities, ...newEntities]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();

            // Should dispatch event
            expect(dispatchEventMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'entity-definitions-updated',
                    detail: expect.objectContaining({
                        type: 'add',
                        methodId: 1,
                        entities: newEntities
                    })
                })
            );
        });
    });

    describe('deleteModelEntity', () => {
        test('should delete entity successfully', async () => {
            // Mock API responses
            // First for getModelEntities
            (apiClient.get as Mock).mockResolvedValueOnce(createSuccessResponse(mockEntities));

            // Then for deleteModelEntity
            (apiClient.delete as Mock).mockResolvedValue(createSuccessResponse({ success: true }));

            const { result } = renderHook(() => useEntityDefinitions());

            // Load initial entities using the public API
            await act(async () => {
                await result.current.getModelEntities(1);
            });

            await act(async () => {
                await result.current.deleteModelEntity(1);
            });

            expect(apiClient.delete).toHaveBeenCalledWith('/settings/entities/1');
            expect(result.current.modelEntities[1]).toEqual([mockEntities[1]]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();

            // Should dispatch event
            expect(dispatchEventMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'entity-definitions-updated',
                    detail: expect.objectContaining({
                        type: 'delete',
                        entityId: 1
                    })
                })
            );
        });
    });

    describe('deleteAllEntitiesForMethod', () => {
        test('should delete all entities for a method successfully', async () => {
            // Mock API responses
            // First for getModelEntities (method 1)
            (apiClient.get as Mock).mockResolvedValueOnce(createSuccessResponse(mockEntities));

            // Second for getModelEntities (method 2)
            (apiClient.get as Mock).mockResolvedValueOnce(createSuccessResponse(mockGlinerEntities));

            // Then for deleteAllEntitiesForMethod
            (apiClient.delete as Mock).mockResolvedValue(createSuccessResponse({ success: true }));

            const { result } = renderHook(() => useEntityDefinitions());

            // Load initial entities for both methods using the public API
            await act(async () => {
                await result.current.getModelEntities(1);
                await result.current.getModelEntities(2);
            });

            await act(async () => {
                await result.current.deleteAllEntitiesForMethod(1);
            });

            expect(apiClient.delete).toHaveBeenCalledWith('/settings/entities/delete_entities_by_method_id/1');
            expect(result.current.modelEntities[1]).toEqual([]);
            expect(result.current.modelEntities[2]).toEqual(mockGlinerEntities); // Other method entities should remain
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();

            // Should dispatch event
            expect(dispatchEventMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'entity-definitions-updated',
                    detail: expect.objectContaining({
                        type: 'delete-all',
                        methodId: 1
                    })
                })
            );
        });
    });

    describe('replaceModelEntities', () => {
        test('should replace entities successfully', async () => {
            // Mock API responses
            // First for getModelEntities
            (apiClient.get as Mock).mockResolvedValueOnce(createSuccessResponse(mockEntities));

            // Then for deleteAllEntitiesForMethod
            (apiClient.delete as Mock).mockResolvedValue(createSuccessResponse({ success: true }));

            const newEntities: ModelEntity[] = [
                {
                    id: 4,
                    method_id: 1,
                    entity_text: 'LOCATION',
                    setting_id: 1,
                    created_at: '2023-01-04T00:00:00Z',
                    updated_at: '2023-01-04T00:00:00Z'
                }
            ];

            // Then for addModelEntities
            (apiClient.post as Mock).mockResolvedValue(createSuccessResponse(newEntities));

            const { result } = renderHook(() => useEntityDefinitions());

            // Load initial entities using the public API
            await act(async () => {
                await result.current.getModelEntities(1);
            });

            const newOptions: OptionType[] = [
                { value: 'LOCATION', label: 'Location' }
            ];

            let entities;
            await act(async () => {
                entities = await result.current.replaceModelEntities(1, newOptions);
            });

            // Should delete all entities first
            expect(apiClient.delete).toHaveBeenCalledWith('/settings/entities/delete_entities_by_method_id/1');

            // Then add new entities
            expect(apiClient.post).toHaveBeenCalledWith('/settings/entities', {
                method_id: 1,
                entity_texts: ['LOCATION']
            });

            expect(entities).toEqual(newEntities);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    describe('updateAllEntitySelections', () => {
        test('should update all entity selections successfully', async () => {
            // Mock API responses
            (apiClient.delete as Mock).mockResolvedValue(createSuccessResponse({ success: true }));

            const presidioEntities: ModelEntity[] = [
                {
                    id: 4,
                    method_id: 1,
                    entity_text: 'PERSON',
                    setting_id: 1,
                    created_at: '2023-01-04T00:00:00Z',
                    updated_at: '2023-01-04T00:00:00Z'
                }
            ];

            const glinerEntities: ModelEntity[] = [
                {
                    id: 5,
                    method_id: 2,
                    entity_text: 'EMAIL',
                    setting_id: 1,
                    created_at: '2023-01-04T00:00:00Z',
                    updated_at: '2023-01-04T00:00:00Z'
                }
            ];

            // Mock post to return different entities based on method_id
            (apiClient.post as Mock).mockImplementation((url, data: any) => {
                if (data.method_id === 1) {
                    return Promise.resolve(createSuccessResponse(presidioEntities));
                } else if (data.method_id === 2) {
                    return Promise.resolve(createSuccessResponse(glinerEntities));
                } else {
                    return Promise.resolve(createSuccessResponse([]));
                }
            });

            const { result } = renderHook(() => useEntityDefinitions());

            const presidioOptions: OptionType[] = [
                { value: 'PERSON', label: 'Person' }
            ];

            const glinerOptions: OptionType[] = [
                { value: 'EMAIL', label: 'Email' }
            ];

            await act(async () => {
                await result.current.updateAllEntitySelections(
                    presidioOptions,
                    glinerOptions,
                    [], // Empty gemini entities
                    []  // Empty hideme entities
                );
            });

            // Should call delete for each method
            expect(apiClient.delete).toHaveBeenCalledWith('/settings/entities/delete_entities_by_method_id/1');
            expect(apiClient.delete).toHaveBeenCalledWith('/settings/entities/delete_entities_by_method_id/2');
            expect(apiClient.delete).toHaveBeenCalledWith('/settings/entities/delete_entities_by_method_id/3');
            expect(apiClient.delete).toHaveBeenCalledWith('/settings/entities/delete_entities_by_method_id/4');

            // Should call post for methods with entities
            expect(apiClient.post).toHaveBeenCalledWith('/settings/entities', {
                method_id: 1,
                entity_texts: ['PERSON']
            });

            expect(apiClient.post).toHaveBeenCalledWith('/settings/entities', {
                method_id: 2,
                entity_texts: ['EMAIL']
            });

            // Should dispatch event
            expect(dispatchEventMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'entity-definitions-updated',
                    detail: expect.objectContaining({
                        type: 'update-all'
                    })
                })
            );
        });
    });
});