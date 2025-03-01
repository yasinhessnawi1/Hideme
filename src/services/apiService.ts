// src/services/apiService.ts

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiRequestOptions {
    method: HttpMethod;
    url: string;
    body?: any;
    headers?: Record<string, string>;
    responseType?: 'json' | 'blob';
}

/**
 * Generic API request helper.
 * It automatically sets JSON headers if a body is provided and handles errors.
 */
export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
    const { method, url, body, headers = {}, responseType = 'json' } = options;

    const config: RequestInit = {
        method,
        headers: {
            'Accept': 'application/json',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    };

    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Request failed with status ${response.status}: ${errorText}`);
        }
        if (responseType === 'blob') {
            return (await response.blob()) as unknown as T;
        } else {
            return (await response.json()) as T;
        }
    } catch (err: any) {
        console.error('[apiRequest] Error:', err);
        throw err;
    }
}
