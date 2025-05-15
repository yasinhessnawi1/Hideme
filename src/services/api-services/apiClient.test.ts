import { describe, test, expect, vi, beforeEach } from 'vitest';
import apiClient from '../../services/api-services/apiClient';
import apiCache from '../../services/api-services/apiCacheService';
import authService from '../../services/database-backend-services/authService';

// Mock dependencies
vi.mock('../../services/api-services/apiCacheService', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        clearCache: vi.fn(),
        clearCacheEntry: vi.fn(),
        setDebugMode: vi.fn(),
        getAxiosInstance: vi.fn()
    }
}));

vi.mock('../../services/database-backend-services/authService', () => ({
    default: {
        getToken: vi.fn()
    }
}));

describe('apiClient', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('get', () => {
        /*
        test('should call apiCache.get with correct parameters', async () => {
            // Setup mock
            (apiCache.get as any).mockResolvedValueOnce({ data: 'test data' });
            (authService.getToken as any).mockReturnValueOnce('test-token');

            // Make request
            const result = await apiClient.get('/test');

            // Check apiCache.get was called correctly
            expect(apiCache.get).toHaveBeenCalledWith('/test', expect.objectContaining({
                params: undefined
            }), expect.objectContaining({
                ttl: expect.any(Number),
                forceRefresh: false,
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            }));

            // Check result
            expect(result).toEqual({ data: 'test data' });
        });

         */

        /*
        test('should pass query parameters correctly', async () => {
            // Setup mock
            (apiCache.get as any).mockResolvedValueOnce({ data: 'test data' });
            (authService.getToken as any).mockReturnValueOnce('test-token');

            // Make request with params
            await apiClient.get('/test', { page: 1, limit: 10 });

            // Check params were passed correctly
            expect(apiCache.get).toHaveBeenCalledWith('/test', expect.objectContaining({
                params: { page: 1, limit: 10 }
            }), expect.any(Object));
        });
        */

        test('should support force refresh option', async () => {
            // Setup mock
            vi.mocked(apiCache.get).mockResolvedValueOnce({
                data: 'test data',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });
            vi.mocked(authService.getToken).mockReturnValueOnce('test-token');

            // Make request with force refresh
            await apiClient.get('/test', null, true);

            // Check forceRefresh was set
            expect(apiCache.get).toHaveBeenCalledWith('/test', expect.any(Object), expect.objectContaining({
                forceRefresh: true
            }));
        });

        test('should use different TTL values based on URL', async () => {
            // Setup mock
            vi.mocked(apiCache.get).mockResolvedValueOnce({
                data: 'auth data',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });
            vi.mocked(apiCache.get).mockResolvedValueOnce({
                data: 'user data',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });
            vi.mocked(apiCache.get).mockResolvedValueOnce({
                data: 'settings data',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });
            vi.mocked(apiCache.get).mockResolvedValueOnce({
                data: 'entities data',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });
            vi.mocked(apiCache.get).mockResolvedValueOnce({
                data: 'other data',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });
            vi.mocked(authService.getToken).mockReturnValue('test-token');

            // Make requests to different URL paths
            await apiClient.get('/auth/verify');
            await apiClient.get('/users/me');
            await apiClient.get('/settings/theme');
            await apiClient.get('/settings/entities/1');
            await apiClient.get('/other/endpoint');

            // Extract ttl values from each call
            const authTtl = vi.mocked(apiCache.get).mock.calls[0][2]?.ttl;
            const userTtl = vi.mocked(apiCache.get).mock.calls[1][2]?.ttl;
            const settingsTtl = vi.mocked(apiCache.get).mock.calls[2][2]?.ttl;
            const entitiesTtl = vi.mocked(apiCache.get).mock.calls[3][2]?.ttl;
            const defaultTtl = vi.mocked(apiCache.get).mock.calls[4]?.[2]?.ttl;

            // Check different TTL values were used based on URL
            expect(authTtl).toBe(5 * 60 * 1000); // 5 minutes
            expect(userTtl).toBe(10 * 60 * 1000); // 10 minutes
            expect(settingsTtl).toBe(30 * 60 * 1000); // 30 minutes
            expect(entitiesTtl).toBe(60 * 60 * 1000); // 1 hour
            expect(defaultTtl).toBe(15 * 60 * 1000); // 15 minutes (default)
        });

        /*
        test('should work without auth token', async () => {
            // Setup mock - no token
            (apiCache.get as any).mockResolvedValueOnce({ data: 'test data' });
            (authService.getToken as any).mockReturnValueOnce(null);

            // Make request
            const result = await apiClient.get('/test');

            // Check apiCache.get was called without Authorization header
            expect(apiCache.get).toHaveBeenCalledWith('/test', expect.any(Object), expect.objectContaining({
                headers: {}
            }));

            // Check result
            expect(result).toEqual({ data: 'test data' });
        });
        */
    });

    describe('post', () => {
        test('should call apiCache.post with correct parameters', async () => {
            // Setup mock
            vi.mocked(apiCache.post).mockResolvedValueOnce({
                data: 'created',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });
            vi.mocked(authService.getToken).mockReturnValueOnce('test-token');

            const postData = { name: 'test', value: 123 };

            // Make request
            const result = await apiClient.post('/resource', postData);

            // Check apiCache.post was called correctly
            expect(apiCache.post).toHaveBeenCalledWith('/resource', postData, expect.objectContaining({
                ttl: 0, // Default for POST is no caching
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            }));

            // Check result includes all the expected properties
            expect(result).toEqual({
                data: 'created',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {}
            });
        });

        test('should support cacheable option for POST requests', async () => {
            // Setup mock
            vi.mocked(apiCache.post).mockResolvedValueOnce({
                data: 'created',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });
            vi.mocked(authService.getToken).mockReturnValueOnce('test-token');

            // Make request with cacheable option
            await apiClient.post('/resource', { id: 1 }, true);

            // Check ttl is set (non-zero)
            expect(apiCache.post).toHaveBeenCalledWith('/resource', { id: 1 }, expect.objectContaining({
                ttl: expect.any(Number)
            }));

            const ttl = vi.mocked(apiCache.post).mock.calls[0][2]?.ttl;
            expect(ttl).toBeGreaterThan(0);
        });

        test('should invalidate related GET caches after POST', async () => {
            // Setup mock
            vi.mocked(apiCache.post).mockResolvedValueOnce({
                data: 'created',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });
            vi.mocked(apiCache.clearCacheEntry).mockImplementation(() => {});
            vi.mocked(authService.getToken).mockReturnValueOnce('test-token');

            // Make request to a resource endpoint
            await apiClient.post('/resources/items', { name: 'new item' });

            // Check clearCacheEntry was called for the base path
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/resources', 'GET');
        });
    });

    describe('put', () => {
        test('should call apiCache.put with correct parameters', async () => {
            // Setup mock
            (apiCache.put as any).mockResolvedValueOnce({ data: 'updated' });
            (authService.getToken as any).mockReturnValueOnce('test-token');

            const updateData = { id: 1, name: 'updated' };

            // Make request
            const result = await apiClient.put('/resource/1', updateData);

            // Check apiCache.put was called correctly
            expect(apiCache.put).toHaveBeenCalledWith('/resource/1', updateData, expect.objectContaining({
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            }));

            // Check result
            expect(result).toEqual({ data: 'updated' });
        });

        test('should invalidate GET cache for the same URL', async () => {
            // Setup mock
            (apiCache.put as any).mockResolvedValueOnce({ data: 'updated' });
            (apiCache.clearCacheEntry as any).mockImplementation(() => {});
            (authService.getToken as any).mockReturnValueOnce('test-token');

            // Make request
            await apiClient.put('/resources/1', { name: 'updated' });

            // Check clearCacheEntry was called for both the specific URL and the base path
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/resources/1', 'GET');
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/resources', 'GET');
        });
    });

    describe('delete', () => {
        test('should call apiCache.delete with correct parameters', async () => {
            // Setup mock
            (apiCache.delete as any).mockResolvedValueOnce({ data: 'deleted' });
            (authService.getToken as any).mockReturnValueOnce('test-token');

            // Make request
            const result = await apiClient.delete('/resource/1');

            // Check apiCache.delete was called correctly
            expect(apiCache.delete).toHaveBeenCalledWith('/resource/1', undefined, expect.objectContaining({
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            }));

            // Check result
            expect(result).toEqual({ data: 'deleted' });
        });

        test('should support request body for DELETE', async () => {
            // Setup mock
            (apiCache.delete as any).mockResolvedValueOnce({ data: 'deleted' });
            (authService.getToken as any).mockReturnValueOnce('test-token');

            const deleteData = { reason: 'no longer needed' };

            // Make request with data
            await apiClient.delete('/resource/1', deleteData);

            // Check data was passed
            expect(apiCache.delete).toHaveBeenCalledWith('/resource/1', deleteData, expect.any(Object));
        });

        test('should invalidate GET cache for the same URL', async () => {
            // Setup mock
            (apiCache.delete as any).mockResolvedValueOnce({ data: 'deleted' });
            (apiCache.clearCacheEntry as any).mockImplementation(() => {});
            (authService.getToken as any).mockReturnValueOnce('test-token');

            // Make request
            await apiClient.delete('/resources/1');

            // Check clearCacheEntry was called for both the specific URL and the base path
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/resources/1', 'GET');
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/resources', 'GET');
        });
    });

    describe('Cache management methods', () => {
        test('clearCache should call apiCache.clearCache', () => {
            apiClient.clearCache();
            expect(apiCache.clearCache).toHaveBeenCalled();
        });

        test('clearCacheEntry should call apiCache.clearCacheEntry with correct parameters', () => {
            apiClient.clearCacheEntry('/test', 'GET', { param: 'value' }, { body: 'data' });
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/test', 'GET', { param: 'value' }, { body: 'data' });
        });

        test('clearAuthCache should clear auth endpoint caches', () => {
            apiClient.clearAuthCache();
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/auth/login', 'GET');
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/auth/verify', 'GET');
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/auth/refresh', 'POST');
        });

        test('clearUserCache should clear user endpoint caches', () => {
            apiClient.clearUserCache();
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/users/me', 'GET');
        });

        test('clearSettingsCache should clear settings endpoint caches', () => {
            apiClient.clearSettingsCache();
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/settings', 'GET');
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/settings/patterns', 'GET');
            expect(apiCache.clearCacheEntry).toHaveBeenCalledWith('/settings/ban-list', 'GET');
        });

        test('setDebugMode should call apiCache.setDebugMode', () => {
            apiClient.setDebugMode(true);
            expect(apiCache.setDebugMode).toHaveBeenCalledWith(true);
        });

        test('getAxiosInstance should return apiCache.getAxiosInstance result', () => {
            const mockInstance = { request: vi.fn() };
            (apiCache.getAxiosInstance as any).mockReturnValueOnce(mockInstance);

            const result = apiClient.getAxiosInstance();
            expect(apiCache.getAxiosInstance).toHaveBeenCalled();
            expect(result).toBe(mockInstance);
        });
    });
});