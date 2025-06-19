// src/services/apiService.ts

import {mapBackendErrorToMessage} from '../../utils/errorUtils';
import authService from '../database-backend-services/authService';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiRequestOptions {
    method: HttpMethod;
    url: string;
    body?: any;
    formData?: FormData;
    headers?: Record<string, string>;
    responseType?: 'json' | 'blob' | 'arraybuffer';
    signal?: AbortSignal;
}

/**
 * Enhanced API request helper that supports both JSON and FormData
 */
export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
    const {method, url, body, formData, headers = {}, responseType = 'json', signal} = options;

    const config: RequestInit = {
        method,
        headers: {
            'Accept': 'application/json',
            ...(!formData && body ? { 'Content-Type': 'application/json' } : {}),
            ...headers,
        },
        body: formData || (body ? JSON.stringify(body) : undefined),
        signal,
    };

    try {
        const response = await fetch(url, config);

        // Handle 204 No Content responses (common for DELETE operations)
        if (response.status === 204) {
            return {success: true, message: 'Operation completed successfully'} as unknown as T;
        }

        if (!response.ok) {
            // Handle 401 (Unauthorized) and 429 (Too Many Requests) by logging out the user
            if (response.status === 401 || response.status === 429) {
                console.warn(`[apiService] Received ${response.status} status, logging out user`);

                try {
                    // Clear authentication state
                    authService.clearToken();

                    // Clear any additional stored state
                    localStorage.clear();

                    console.log(`[apiService] User logged out due to ${response.status} status`);

                    // Dispatch a custom event that the app can listen for
                    const eventType = response.status === 401 ? 'auth:session-expired' : 'auth:too-many-requests';
                    window.dispatchEvent(new CustomEvent(eventType, {
                        detail: {
                            originalUrl: url,
                            status: response.status,
                            message: response.status === 401
                                ? 'Your session has expired. Please log in again.'
                                : 'Too many requests. Please log in again.'
                        }
                    }));

                    // For immediate redirect (can be disabled if app handles the event)
                    setTimeout(() => {
                        if (window.location.pathname !== '/login' && !window.location.pathname.includes('/auth')) {
                            window.location.href = '/login?expired=true';
                        }
                    }, 100);

                } catch (logoutError) {
                    console.error('[apiService] Error during forced logout:', logoutError);
                }
            }

            let errorMessage: string;
            const errorData = await response.json();
            try {
                const errorPayload = errorData.error || errorData.detail || errorData;
                errorMessage = mapBackendErrorToMessage(errorPayload);
            } catch {
                errorMessage = mapBackendErrorToMessage(`Request failed with status ${response.status}: ${response.statusText}`);
            }
            throw new Error(errorMessage);
        }

        if (responseType === 'blob') {
            return (await response.blob()) as unknown as T;
        } else if (responseType === 'arraybuffer') {
            return (await response.arrayBuffer()) as unknown as T;
        } else {
            return (await response.json()) as T;
        }
    } catch (err: any) {
        console.error('[apiRequest] Error:', err);

        // Check if it's an abort error
        if (err.name === 'AbortError') {
            console.log('[apiRequest] Request was aborted');
            throw new Error('Request cancelled by user');
        }
        
        // Check for network/CORS errors that might indicate auth issues
        if (err.message && (err.message.includes('fetch') || err.message.includes('NetworkError') || 
                           err.message.includes('CORS') || err.message.includes('Cross-Origin'))) {
            console.warn('[apiService] Network/CORS error detected, potentially logging out user');
            
            // Only log out for auth-related endpoints to avoid false positives
            if (url.includes('/auth/') || url.includes('/verify') || url.includes('/refresh')) {
                try {
                    // Clear authentication state
                    authService.clearToken();

                    // Clear only specific auth-related localStorage items
                    localStorage.removeItem('user_data');
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('auth_state');

                    console.log('[apiService] User logged out due to network/CORS error on auth endpoint');

                    // Dispatch CORS error event
                    window.dispatchEvent(new CustomEvent('auth:cors-error', {
                        detail: {
                            originalUrl: url,
                            message: 'Network/CORS error detected. Please log in again.',
                            error: err.message,
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
                    console.error('[apiService] Error during CORS-triggered logout:', logoutError);
                }
            }
        }
        
        throw new Error(mapBackendErrorToMessage(err));
    }
}
