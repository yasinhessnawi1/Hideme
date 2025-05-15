import { describe, test, expect, vi, beforeEach } from 'vitest';
import { apiRequest, HttpMethod } from '../../services/api-services/apiService';

// Mock fetch
global.fetch = vi.fn();

describe('apiService', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('apiRequest', () => {
        test('should make a GET request with correct parameters', async () => {
            // Setup mock
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: 'test data' })
            });

            // Make request
            const result = await apiRequest({
                method: 'GET',
                url: 'https://example.com/api/test'
            });

            // Check fetch was called correctly
            expect(global.fetch).toHaveBeenCalledWith('https://example.com/api/test', expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    'Accept': 'application/json'
                })
            }));

            // Check result
            expect(result).toEqual({ data: 'test data' });
        });

        test('should make a POST request with JSON body', async () => {
            // Setup mock
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            const requestBody = { name: 'test', value: 123 };

            // Make request
            const result = await apiRequest({
                method: 'POST',
                url: 'https://example.com/api/test',
                body: requestBody
            });

            // Check fetch was called correctly
            expect(global.fetch).toHaveBeenCalledWith('https://example.com/api/test', expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify(requestBody)
            }));

            // Check result
            expect(result).toEqual({ success: true });
        });

        test('should make a POST request with FormData', async () => {
            // Setup mock
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            const formData = new FormData();
            formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test.txt');

            // Make request
            const result = await apiRequest({
                method: 'POST',
                url: 'https://example.com/api/upload',
                formData: formData
            });

            // Check fetch was called correctly
            expect(global.fetch).toHaveBeenCalledWith('https://example.com/api/upload', expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Accept': 'application/json'
                }),
                body: formData
            }));

            // Verify Content-Type is NOT set for FormData requests (browser handles it)
            const fetchCall = (global.fetch as any).mock.calls[0][1];
            expect(fetchCall.headers['Content-Type']).toBeUndefined();

            // Check result
            expect(result).toEqual({ success: true });
        });

        test('should handle PUT method', async () => {
            // Setup mock
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ updated: true })
            });

            const requestBody = { id: 1, name: 'updated' };

            // Make request
            const result = await apiRequest({
                method: 'PUT',
                url: 'https://example.com/api/resource/1',
                body: requestBody
            });

            // Check fetch was called correctly
            expect(global.fetch).toHaveBeenCalledWith('https://example.com/api/resource/1', expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify(requestBody)
            }));

            // Check result
            expect(result).toEqual({ updated: true });
        });

        test('should handle DELETE method', async () => {
            // Setup mock
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ deleted: true })
            });

            // Make request
            const result = await apiRequest({
                method: 'DELETE',
                url: 'https://example.com/api/resource/1'
            });

            // Check fetch was called correctly
            expect(global.fetch).toHaveBeenCalledWith('https://example.com/api/resource/1', expect.objectContaining({
                method: 'DELETE'
            }));

            // Check result
            expect(result).toEqual({ deleted: true });
        });

        test('should add custom headers if provided', async () => {
            // Setup mock
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: 'test data' })
            });

            // Make request with custom headers
            await apiRequest({
                method: 'GET',
                url: 'https://example.com/api/test',
                headers: {
                    'Authorization': 'Bearer token123',
                    'X-Custom-Header': 'custom value'
                }
            });

            // Check headers were included
            expect(global.fetch).toHaveBeenCalledWith('https://example.com/api/test', expect.objectContaining({
                headers: expect.objectContaining({
                    'Accept': 'application/json',
                    'Authorization': 'Bearer token123',
                    'X-Custom-Header': 'custom value'
                })
            }));
        });

        test('should handle blob response type', async () => {
            // Setup mock for blob response
            const mockBlob = new Blob(['test blob content'], { type: 'application/pdf' });
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                blob: async () => mockBlob
            });

            // Make request with blob responseType
            const result = await apiRequest({
                method: 'GET',
                url: 'https://example.com/api/file',
                responseType: 'blob'
            });

            // Check result is the blob
            expect(result).toBe(mockBlob);
        });

        test('should handle arraybuffer response type', async () => {
            // Setup mock for arraybuffer response
            const buffer = new ArrayBuffer(8);
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                arrayBuffer: async () => buffer
            });

            // Make request with arraybuffer responseType
            const result = await apiRequest({
                method: 'GET',
                url: 'https://example.com/api/binary',
                responseType: 'arraybuffer'
            });

            // Check result is the arraybuffer
            expect(result).toBe(buffer);
        });

        test('should handle non-ok response with JSON error', async () => {
            // Setup mock for error response
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ message: 'Invalid request' })
            });

            // Make request and expect it to throw
            await expect(apiRequest({
                method: 'GET',
                url: 'https://example.com/api/error'
            })).rejects.toThrow('Invalid request');
        });

        test('should handle non-ok response with non-JSON error', async () => {
            // Setup mock for error response that fails to parse as JSON
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: async () => { throw new Error('Invalid JSON'); }
            });

            // Make request and expect it to throw with status code and text
            await expect(apiRequest({
                method: 'GET',
                url: 'https://example.com/api/error'
            })).rejects.toThrow('Request failed with status 500: Internal Server Error');
        });

        test('should handle network errors', async () => {
            // Setup mock to reject with network error
            (global.fetch as any).mockRejectedValueOnce(new Error('Network failure'));

            // Make request and expect it to throw
            await expect(apiRequest({
                method: 'GET',
                url: 'https://example.com/api/test'
            })).rejects.toThrow('Network failure');
        });
    });
});