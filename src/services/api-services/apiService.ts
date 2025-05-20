// src/services/apiService.ts

import { mapBackendErrorToMessage } from '../../utils/errorUtils';

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
            let errorMessage: string;
            const errorData = await response.json();
            try {
                const errorPayload = errorData.error || errorData.detail || errorData;
                errorMessage = mapBackendErrorToMessage(errorPayload);
            } catch {
                errorMessage = mapBackendErrorToMessage(`Request failed with status $ );
                }: ${response.statusText}`);
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
