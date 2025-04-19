/**
 * @fileoverview Enhanced Axios client with caching for API requests
 *
 * This module extends the existing API client with caching capabilities.
 * It maintains the same authentication, error handling, and user-friendly
 * message features while adding:
 * - Request deduplication
 * - Response caching with TTL
 * - Cache invalidation on mutations
 */
import apiCache from './apiCacheService';
import authService from './authService';
import { AxiosRequestConfig } from 'axios';

// Configure TTL (time-to-live) for different endpoint groups
const TTL_CONFIG = {
    // Auth endpoints (shorter TTL)
    AUTH: 5 * 60 * 1000, // 5 minutes

    // User profile (medium TTL)
    USER: 10 * 60 * 1000, // 10 minutes

    // Settings (longer TTL)
    SETTINGS: 30 * 60 * 1000, // 30 minutes

    // Entity definitions (very long TTL as they rarely change)
    ENTITIES: 60 * 60 * 1000, // 1 hour

    // Default TTL for other endpoints
    DEFAULT: 15 * 60 * 1000 // 15 minutes
};

// Helper to determine TTL based on URL path
const getTtlForUrl = (url: string): number => {
    if (url.includes('/auth/')) {
        return TTL_CONFIG.AUTH;
    }
    if (url.includes('/users/')) {
        return TTL_CONFIG.USER;
    }
    if (url.includes('/settings/entities/')) {
        return TTL_CONFIG.ENTITIES;
    }
    if (url.includes('/settings/')) {
        return TTL_CONFIG.SETTINGS;
    }
    return TTL_CONFIG.DEFAULT;
};

// Define an interface for our config object to fix TypeScript errors
interface RequestConfig {
    params?: any;
    data?: any;
    headers?: Record<string, string>;
}

// Create request config with auth token
const createAuthConfig = (config: RequestConfig = {}): RequestConfig => {
    const token = authService.getToken();
    if (token) {
        return {
            ...config,
            headers: {
                ...(config.headers || {}),
                'Authorization': `Bearer ${token}`
            }
        };
    }
    return config;
};

/**
 * Enhanced API client with caching, deduplication, and TTL settings
 * while maintaining the existing error handling and authentication.
 */
const apiClient = {
    /**
     * GET request with caching
     * @param url - API endpoint path
     * @param params - Query parameters
     * @param forceRefresh - Whether to bypass cache
     */
    get: <T = any>(url: string, params?: any, forceRefresh = false) => {
        // Apply auth token to request
        const config = createAuthConfig({ params });

        return apiCache.get<T>(url, config.params, {
            ttl: getTtlForUrl(url),
            forceRefresh,
            headers: config.headers
        });
    },

    /**
     * POST request (non-cached by default)
     * @param url - API endpoint path
     * @param data - Request body
     * @param cacheable - Whether to cache this POST request
     */
    post: <T = any>(url: string, data?: any, cacheable = false) => {
        // Apply auth token to request
        const config = createAuthConfig({ data });

        const result = apiCache.post<T>(url, config.data, {
            // Only cache certain POST requests if explicitly marked cacheable
            ttl: cacheable ? getTtlForUrl(url) : 0,
            headers: config.headers
        });

        // Invalidate related GET caches if this might change their data
        if (!url.includes('/auth/')) {
            const basePath = url.split('/').slice(0, -1).join('/');
            apiCache.clearCacheEntry(basePath, 'GET');
        }

        return result;
    },

    /**
     * PUT request (invalidates related GET caches)
     * @param url - API endpoint path
     * @param data - Request body
     */
    put: <T = any>(url: string, data?: any) => {
        // Apply auth token to request
        const config = createAuthConfig({ data });

        const result = apiCache.put<T>(url, config.data, {
            headers: config.headers
        });

        // Invalidate GET cache for the same URL and related patterns
        const basePath = url.split('/').slice(0, -1).join('/');
        apiCache.clearCacheEntry(url, 'GET');
        apiCache.clearCacheEntry(basePath, 'GET');

        return result;
    },

    /**
     * DELETE request (invalidates related GET caches)
     * @param url - API endpoint path
     * @param data - Request body
     */
    delete: <T = any>(url: string, data?: any) => {
        // Apply auth token to request
        const config = createAuthConfig({ data });

        const result = apiCache.delete<T>(url, config.data, {
            headers: config.headers
        });

        // Invalidate GET cache for related patterns
        const basePath = url.split('/').slice(0, -1).join('/');
        apiCache.clearCacheEntry(url, 'GET');
        apiCache.clearCacheEntry(basePath, 'GET');

        return result;
    },

    // Utility methods for cache management

    /**
     * Clear the entire cache
     */
    clearCache: () => {
        apiCache.clearCache();
    },
    /**
     * Clear a specific cache entry
     * @param url - API endpoint path to clear from cache
     * @param method - HTTP method (default: 'GET')
     * @param params - Query parameters (if applicable)
     * @param data - Request body (if applicable)
     */
    clearCacheEntry: (url: string, method: string = 'GET', params?: any, data?: any) => {
        apiCache.clearCacheEntry(url, method, params, data);
    },

    /**
     * Clear auth-related caches
     */
    clearAuthCache: () => {
        // Clear all auth endpoint caches
        apiCache.clearCacheEntry('/auth/login', 'GET');
        apiCache.clearCacheEntry('/auth/verify', 'GET');
        apiCache.clearCacheEntry('/auth/refresh', 'POST');
    },

    /**
     * Clear user-related caches
     */
    clearUserCache: () => {
        apiCache.clearCacheEntry('/users/me', 'GET');
    },

    /**
     * Clear settings-related caches
     */
    clearSettingsCache: () => {
        apiCache.clearCacheEntry('/settings', 'GET');
        apiCache.clearCacheEntry('/settings/patterns', 'GET');
        apiCache.clearCacheEntry('/settings/ban-list', 'GET');
    },

    /**
     * Enable or disable debug mode
     */
    setDebugMode: (enabled: boolean) => {
        apiCache.setDebugMode(enabled);
    },

    /**
     * Get the raw axios instance for advanced use cases
     */
    getAxiosInstance: () => {
        return apiCache.getAxiosInstance();
    }
};

export default apiClient;
