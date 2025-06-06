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
}

/**
 * Enhanced API request helper that supports both JSON and FormData
 */
export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
    const { method, url, body, formData, headers = {}, responseType = 'json' } = options;

    const config: RequestInit = {
        method,
        headers: {
            'Accept': 'application/json',
            ...(!formData && body ? { 'Content-Type': 'application/json' } : {}),
            ...headers,
        },
        body: formData || (body ? JSON.stringify(body) : undefined),
    };

    try {
        const response = await fetch(url, config);

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
        throw new Error(mapBackendErrorToMessage(err));
    }
}
