/**
 * API Request Cache Service
 *
 * This service implements request deduplication, response caching,
 * and automatic cache invalidation for API requests.
 *
 * Features:
 * - Prevents duplicate in-flight requests to the same endpoint (for GET only)
 * - Caches successful responses with configurable TTL
 * - Automatically invalidates related caches after mutations
 * - Provides hooks for tracking loading state and errors
 * - Supports forced refresh when needed
 */

import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios';
import authService from '../database-backend-services/authService';
import {mapBackendErrorToMessage} from '../../utils/errorUtils';

export const API_URL = 'https://goapi.hidemeai.com/api';
//export const API_URL = 'http://localhost:8080/api';

type CacheItem = {
    data: any;
    expiry: number;
};

type PendingRequest = {
    promise: Promise<any>;
    controller: AbortController;
};

interface CacheOptions {
    ttl?: number; // Time to live in milliseconds
    forceRefresh?: boolean; // Force a refresh regardless of cache
    cacheKey?: string; // Custom cache key (useful for requests with same URL but different bodies)
    headers?: Record<string, string>; // Custom headers to include
}

// Default TTL for cached items (5 minutes)
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Transforms technical API errors into user-friendly messages
 *
 * @param {any} error - The error object from axios
 * @returns {string} User-friendly error message
 */
const getUserFriendlyErrorMessage = (error: any): string => {
    // Use the shared error mapping utility for all error mapping
    return mapBackendErrorToMessage(error.response?.data?.error || error.response?.data?.detail || error);
};

class ApiCacheService {
    private static instance: ApiCacheService;
    private client: AxiosInstance;
    private cache: Map<string, CacheItem> = new Map();
    private pendingRequests: Map<string, PendingRequest> = new Map();

    // Debug mode can be controlled via localStorage or a constant
    private debugMode: boolean = localStorage.getItem('API_DEBUG') === 'true' || false;

    private constructor() {
        // Create axios instance with default config
        this.client = axios.create({
            baseURL: API_URL,
            timeout: 30000, // 30 seconds timeout
            withCredentials: true, // Always send cookies for CORS requests
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add request interceptor for auth token
        this.client.interceptors.request.use(
            (config) => {
                // Always include credentials
                config.withCredentials = true;

                // Add auth token if available
                const token = authService.getToken();
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;

                    if (this.debugMode) {
                        console.log(`[ApiCache] Adding auth token to request for ${config.url}`);
                    }
                } else if (this.debugMode && !token) {
                    console.warn(`[ApiCache] No auth token available for request to ${config.url}`);
                }

                return config;
            },
            (error) => {
                // Transform request errors into user-friendly messages
                error.userMessage = getUserFriendlyErrorMessage(error);
                return Promise.reject(error);
            }
        );

        // Add response interceptor for error handling and token refresh
        this.client.interceptors.response.use(
            (response) => {
                if (this.debugMode) {
                    console.log(`[ApiCache] Successful response from ${response.config.url}`);
                }
                return response;
            },
            async (error) => {
                const originalRequest = error.config;

                // Add user-friendly error message to the error object
                error.userMessage = getUserFriendlyErrorMessage(error);

                // Enhanced error logging
                if (this.debugMode) {
                    console.error('[ApiCache] Request error:', {
                        url: originalRequest?.url,
                        method: originalRequest?.method,
                        status: error.response?.status,
                        message: error.message,
                        data: error.response?.data
                    });
                }

                // Check for CORS errors (these typically don't have a response status)
                if (!error.response && error.message) {
                    const isCorsError = error.message.includes('CORS') || 
                                       error.message.includes('Cross-Origin') ||
                                       error.message.includes('cors') ||
                                       error.message.includes('cross-origin') ||
                                       error.code === 'ERR_NETWORK' ||
                                       (error.message.includes('Network Error') && originalRequest?.url?.includes('/auth/'));

                    if (isCorsError) {
                        if (this.debugMode) {
                            console.warn('[ApiCache] CORS error detected, logging out user');
                        }

                        try {
                            // Clear authentication state
                            authService.clearToken();

                            // Clear the entire cache to remove any stale data
                            this.clearCache();

                            // Cancel all pending requests
                            this.cancelAllRequests();

                            // Clear only specific auth-related localStorage items
                            localStorage.removeItem('user_data');
                            localStorage.removeItem('access_token');
                            localStorage.removeItem('auth_state');

                            if (this.debugMode) {
                                console.log('[ApiCache] User logged out due to CORS error');
                            }

                            // Dispatch CORS error event
                            window.dispatchEvent(new CustomEvent('auth:cors-error', {
                                detail: {
                                    originalUrl: originalRequest?.url,
                                    message: 'CORS error detected. Please log in again.',
                                    error: error.message,
                                    timestamp: Date.now()
                                }
                            }));

                            // Also dispatch network error event for additional handling
                            window.dispatchEvent(new CustomEvent('auth:network-error', {
                                detail: {
                                    originalUrl: originalRequest?.url,
                                    message: error.message,
                                    error: error.message,
                                    timestamp: Date.now()
                                }
                            }));

                            // For immediate redirect
                            setTimeout(() => {
                                if (window.location.pathname !== '/login' && !window.location.pathname.includes('/auth')) {
                                    window.location.href = '/login?cors=true';
                                }
                            }, 100);

                        } catch (logoutError) {
                            console.error('[ApiCache] Error during CORS-triggered logout:', logoutError);
                            // Even if logout fails, ensure we redirect to login
                            setTimeout(() => {
                                if (window.location.pathname !== '/login' && !window.location.pathname.includes('/auth')) {
                                    window.location.href = '/login?error=true';
                                }
                            }, 100);
                        }

                        return Promise.reject(error);
                    }
                }

                // Handle 401 (Unauthorized) and 429 (Too Many Requests) by logging out the user
                if (error.response?.status === 401 || error.response?.status === 429) {
                    if (this.debugMode) {
                        console.warn(`[ApiCache] Received ${error.response.status} status, logging out user`);
                    }

                    try {
                        // Clear authentication state
                        authService.clearToken();

                        // Clear the entire cache to remove any stale data
                        this.clearCache();

                        // Cancel all pending requests
                        this.cancelAllRequests();

                        // Clear only specific auth-related localStorage items instead of clearing everything
                        localStorage.removeItem('user_data');
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('auth_state');
                        
                        if (this.debugMode) {
                            console.log(`[ApiCache] User logged out due to ${error.response.status} status`);
                        }

                        // Dispatch multiple custom events for redundancy
                        const eventType = error.response.status === 401 ? 'auth:session-expired' : 'auth:too-many-requests';
                        const eventDetail = {
                            originalUrl: originalRequest?.url,
                            status: error.response.status,
                            message: error.response.status === 401
                                ? 'Your session has expired. Please log in again.'
                                : 'Too many requests. Please log in again.',
                            timestamp: Date.now()
                        };

                        // Dispatch the specific event
                        window.dispatchEvent(new CustomEvent(eventType, { detail: eventDetail }));
                        
                        // Also dispatch a general axios error event for the useAutoLogout hook
                        window.dispatchEvent(new CustomEvent('auth:axios-error', { 
                            detail: {
                                ...eventDetail,
                                config: originalRequest,
                                response: error.response
                            }
                        }));

                        // For immediate redirect (can be disabled if app handles the event)
                        setTimeout(() => {
                            if (window.location.pathname !== '/login' && !window.location.pathname.includes('/auth')) {
                                const targetPath = error.response.status === 429 ? '/login?ratelimited=true' : '/login?expired=true';
                                window.location.href = targetPath;
                            }
                        }, 100);

                    } catch (logoutError) {
                        console.error('[ApiCache] Error during forced logout:', logoutError);
                        // Even if logout fails, ensure we redirect to login
                        setTimeout(() => {
                            if (window.location.pathname !== '/login' && !window.location.pathname.includes('/auth')) {
                                window.location.href = '/login?error=true';
                            }
                        }, 100);
                    }
                }

                return Promise.reject(error);
            }
        );

        // Setup cache cleanup interval
        setInterval(() => this.cleanupCache(), 60000); // Run every minute
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ApiCacheService {
        if (!ApiCacheService.instance) {
            ApiCacheService.instance = new ApiCacheService();
        }
        return ApiCacheService.instance;
    }

    /**
     * Generate a unique key for the request
     */
    private getCacheKey(config: AxiosRequestConfig, customKey?: string): string {
        if (customKey) return customKey;

        const { method = 'GET', url = '', params, data } = config;

        // Create a unique key based on method, URL, params and data
        return `${method}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(data || {})}`;
    }

    /**
     * Check if a cached response is valid
     */
    private isCacheValid(cacheKey: string): boolean {
        const cached = this.cache.get(cacheKey);

        if (!cached) return false;

        const now = Date.now();
        return cached.expiry > now;
    }

    /**
     * Clean up expired cache entries
     */
    private cleanupCache(): void {
        const now = Date.now();

        for (const [key, value] of this.cache.entries()) {
            if (value.expiry <= now) {
                this.cache.delete(key);

                if (this.debugMode) {
                    console.log(`[ApiCache] Removed expired cache: ${key}`);
                }
            }
        }
    }

    /**
     * Invalidate related cache entries after a mutation
     */
    private invalidateRelatedCaches(url: string): void {
        // Extract the base resource path from the URL
        // e.g., '/settings/entities/1' becomes '/settings/entities'
        const urlParts = url.split('/');
        const resourcePath = urlParts.slice(0, -1).join('/');

        // Find all cache entries related to this resource path
        const invalidatedKeys: string[] = [];

        for (const [key, _] of this.cache.entries()) {
            if (key.includes(resourcePath)) {
                this.cache.delete(key);
                invalidatedKeys.push(key);
            }
        }

        if (this.debugMode && invalidatedKeys.length > 0) {
            console.log(`[ApiCache] Invalidated ${invalidatedKeys.length} related caches for: ${resourcePath}`);
            console.log(`[ApiCache] Invalidated keys: ${invalidatedKeys.join(', ')}`);
        }
    }

    /**
     * Make an API request with caching
     */
    public async request<T = any>(
        config: AxiosRequestConfig,
        options: CacheOptions = {}
    ): Promise<AxiosResponse<T>> {
        const { ttl = DEFAULT_TTL, forceRefresh = false, cacheKey: customKey, headers = {} } = options;

        // Merge custom headers with config headers
        if (Object.keys(headers).length > 0) {
            config.headers = {
                ...config.headers,
                ...headers
            };
        }

        // Generate cache key
        const cacheKey = this.getCacheKey(config, customKey);

        // Determine if this request is cacheable
        const method = config.method?.toUpperCase() || 'GET';
        const isCacheable = method === 'GET';

        // Determine if this is a mutation request
        const isMutation = method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH';

        // For mutation requests, we should bypass request deduplication
        // Only GET requests should benefit from pending request deduplication
        if (!isMutation && this.pendingRequests.has(cacheKey)) {
            if (this.debugMode) {
                console.log(`[ApiCache] Reusing pending GET request: ${cacheKey}`);
            }

            return this.pendingRequests.get(cacheKey)!.promise as Promise<AxiosResponse<T>>;
        }

        // Check cache if not forcing refresh and this is a cacheable request
        if (isCacheable && !forceRefresh && this.isCacheValid(cacheKey)) {
            const cached = this.cache.get(cacheKey)!;

            if (this.debugMode) {
                console.log(`[ApiCache] Cache hit: ${cacheKey}`);
            }

            return await Promise.resolve({
                ...cached.data,
                config,
                headers: {},
                status: 200,
                statusText: 'OK (from cache)',
            }) as AxiosResponse<T>;
        }

        // Create AbortController for cancellation support
        const controller = new AbortController();
        const { signal } = controller;

        // Make the request
        const requestPromise = this.client.request<T>({ ...config, signal })
            .then((response) => {
                // Cache successful responses if this is a cacheable request
                if (isCacheable && response.status >= 200 && response.status < 300) {
                    this.cache.set(cacheKey, {
                        data: response,
                        expiry: Date.now() + ttl,
                    });

                    if (this.debugMode) {
                        console.log(`[ApiCache] Cached: ${cacheKey} (expires in ${ttl/1000}s)`);
                    }
                }

                // If this was a successful mutation, invalidate related caches
                if (isMutation && response.status >= 200 && response.status < 300) {
                    this.invalidateRelatedCaches(config.url || '');

                    if (this.debugMode) {
                        console.log(`[ApiCache] Mutation succeeded, invalidated related caches for: ${config.url}`);
                    }
                }

                // Remove from pending requests
                this.pendingRequests.delete(cacheKey);

                return response;
            })
            .catch((error) => {
                // Remove from pending requests
                this.pendingRequests.delete(cacheKey);

                // Re-throw the error
                throw error;
            });

        // Only store the pending request for GET operations
        // This ensures all mutations always go through to the server
        if (!isMutation) {
            this.pendingRequests.set(cacheKey, {
                promise: requestPromise,
                controller,
            });
        }

        if (this.debugMode) {
            console.log(`[ApiCache] New ${method} request: ${cacheKey}`);
        }

        return requestPromise;
    }

    /**
     * GET request with caching
     */
    public async get<T = any>(
        url: string,
        params?: any,
        options?: CacheOptions
    ): Promise<AxiosResponse<T>> {
        return this.request<T>(
            {
                method: 'GET',
                url,
                params,
            },
            options
        );
    }

    /**
     * POST request with optional caching
     */
    public async post<T = any>(
        url: string,
        data?: any,
        options?: CacheOptions
    ): Promise<AxiosResponse<T>> {
        return this.request<T>(
            {
                method: 'POST',
                url,
                data,
            },
            options
        );
    }

    /**
     * PUT request with optional caching
     */
    public async put<T = any>(
        url: string,
        data?: any,
        options?: CacheOptions
    ): Promise<AxiosResponse<T>> {
        return this.request<T>(
            {
                method: 'PUT',
                url,
                data,
            },
            options
        );
    }

    /**
     * DELETE request with optional caching
     */
    public async delete<T = any>(
        url: string,
        data?: any,
        options?: CacheOptions
    ): Promise<AxiosResponse<T>> {
        return this.request<T>(
            {
                method: 'DELETE',
                url,
                data,
            },
            options
        );
    }

    /**
     * PATCH request with optional caching
     */
    public async patch<T = any>(
        url: string,
        data?: any,
        options?: CacheOptions
    ): Promise<AxiosResponse<T>> {
        return this.request<T>(
            {
                method: 'PATCH',
                url,
                data,
            },
            options
        );
    }

    /**
     * Clear the entire cache
     */
    public clearCache(): void {
        this.cache.clear();

        if (this.debugMode) {
            console.log('[ApiCache] Cache cleared');
        }
    }

    /**
     * Clear specific cache entry
     */
    public clearCacheEntry(url: string, method: string = 'GET', params?: any, data?: any): void {
        const cacheKey = this.getCacheKey({
            method,
            url,
            params,
            data,
        });

        this.cache.delete(cacheKey);

        if (this.debugMode) {
            console.log(`[ApiCache] Cache entry cleared: ${cacheKey}`);
        }
    }

    /**
     * Cancel all pending requests
     */
    public cancelAllRequests(): void {
        for (const [key, { controller }] of this.pendingRequests.entries()) {
            controller.abort();
            this.pendingRequests.delete(key);

            if (this.debugMode) {
                console.log(`[ApiCache] Request cancelled: ${key}`);
            }
        }
    }

    /**
     * Get the Axios instance for direct use
     * (bypassing cache when needed)
     */
    public getAxiosInstance(): AxiosInstance {
        return this.client;
    }

    /**
     * Enable or disable debug mode
     */
    public setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
        localStorage.setItem('API_DEBUG', enabled ? 'true' : 'false');
    }

    /**
     * View current cache contents (for debugging)
     */
    public logCacheContents(): void {
        console.log('[ApiCache] Current cache contents:');
        let count = 0;

        for (const [key, value] of this.cache.entries()) {
            const timeRemaining = Math.round((value.expiry - Date.now()) / 1000);
            console.log(`- ${key} (expires in ${timeRemaining}s)`);
            count++;
        }

        if (count === 0) {
            console.log('[ApiCache] Cache is empty');
        } else {
            console.log(`[ApiCache] Total cache entries: ${count}`);
        }
    }

    /**
     * Preload resources for faster access
     */
    public preloadResources(urls: string[]): void {
        if (this.debugMode) {
            console.log(`[ApiCache] Preloading ${urls.length} resources`);
        }

        urls.forEach(url => {
            this.get(url).catch(() => {
                // Silently ignore errors for preloading
            });
        });
    }
}

// Export a singleton instance
export const apiCache = ApiCacheService.getInstance();

// Export a default instance for direct imports
export default apiCache;
