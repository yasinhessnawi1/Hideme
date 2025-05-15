import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import authService from '../../services/database-backend-services/authService';
import apiClient from '../../services/api-services/apiClient';
import authStateManager from '../../managers/authStateManager';
import {Key} from "lucide-react";

// Mock dependencies
vi.mock('../services/apiClient', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        clearCache: vi.fn()
    }
}));

vi.mock('../managers/authStateManager', () => ({
    default: {
        saveState: vi.fn(),
        clearState: vi.fn()
    }
}));

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        })
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('authService', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.resetAllMocks();
        localStorageMock.clear();
    });

    describe('token management', () => {
        test('getToken should return token from localStorage', () => {
            localStorageMock.getItem.mockReturnValueOnce('test-token');

            const token = authService.getToken();

            expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token');
            expect(token).toBe('test-token');
        });

        test('setToken should store token in localStorage', () => {
            authService.setToken('new-test-token');

            expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'new-test-token');
        });

        test('setToken should not store empty tokens', () => {
            console.warn = vi.fn();

            authService.setToken('');

            expect(localStorageMock.setItem).not.toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Attempted to set empty token'));
        });

        test('clearToken should remove token from localStorage', () => {
            authService.clearToken();

            expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
        });
    });

    describe('login', () => {
        /*
        test('successful login should store token and return user data', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        user: { id: 1, username: 'testuser', email: 'test@example.com' },
                        access_token: 'valid-access-token',
                        expires_in: 3600
                    }
                }
            };

            (apiClient.post as any).mockResolvedValueOnce(mockResponse);

            const credentials = { username: 'testuser', password: 'password123' };
            const result = await authService.login(credentials);

            expect(apiClient.post).toHaveBeenCalledWith('/auth/login', credentials);
            expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'valid-access-token');
            expect(result).toEqual(mockResponse.data);
            expect(authStateManager.saveState).toHaveBeenCalled();
        });
        */

        test('login should handle missing token in response', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        user: { id: 1, username: 'testuser', email: 'test@example.com' },
                        expires_in: 3600
                        // No access_token
                    }
                }
            };

            (apiClient.post as any).mockResolvedValueOnce(mockResponse);

            const credentials = { username: 'testuser', password: 'password123' };

            await expect(authService.login(credentials)).rejects.toThrow('Login failed: No token received');
            expect(localStorageMock.setItem).not.toHaveBeenCalled();
        });

        test('login should propagate API errors', async () => {
            const error = new Error('Login failed');
            (apiClient.post as any).mockRejectedValueOnce(error);

            const credentials = { username: 'testuser', password: 'password123' };

            await expect(authService.login(credentials)).rejects.toThrow('Login failed');
            expect(localStorageMock.setItem).not.toHaveBeenCalled();
        });
    });

    describe('register', () => {
        test('successful registration', async () => {
            const mockResponse = { data: { success: true } };
            (apiClient.post as any).mockResolvedValueOnce(mockResponse);

            const registrationData = {
                username: 'newuser',
                email: 'new@example.com',
                password: 'password123',
                confirm_password: 'password123'
            };

            await authService.register(registrationData);

            expect(apiClient.post).toHaveBeenCalledWith('/auth/signup', registrationData);
        });

        test('registration should propagate errors', async () => {
            const error = new Error('Registration failed');
            (apiClient.post as any).mockRejectedValueOnce(error);

            const registrationData = {
                username: 'newuser',
                email: 'new@example.com',
                password: 'password123',
                confirm_password: 'password123'
            };

            await expect(authService.register(registrationData)).rejects.toThrow('Registration failed');
        });
    });

    describe('logout', () => {
        /*
        test('successful logout with token', async () => {
            localStorageMock.getItem.mockReturnValueOnce('test-token');
            (apiClient.post as any).mockResolvedValueOnce({});

            await authService.logout();

            expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
            expect(authStateManager.clearState).toHaveBeenCalled();
        });
        */

        test('logout without token should skip API call', async () => {
            localStorageMock.getItem.mockReturnValueOnce(null);

            await authService.logout();

            expect(apiClient.post).not.toHaveBeenCalled();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
        });

        /*
        test('logout should handle API errors', async () => {
            localStorageMock.getItem.mockReturnValueOnce('test-token');
            const error = new Error('Logout failed');
            (apiClient.post as any).mockRejectedValueOnce(error);

            console.error = vi.fn();

            await authService.logout();

            expect(console.error).toHaveBeenCalled();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
            expect(authStateManager.clearState).toHaveBeenCalled();
        });
        */
    });

    describe('refreshToken', () => {
        /*
        test('successful token refresh', async () => {
            localStorageMock.getItem.mockReturnValueOnce('old-token');

            const mockResponse = {
                data: {
                    data: {
                        access_token: 'new-refreshed-token',
                        user: { id: 1, username: 'testuser' },
                        expires_in: 3600
                    }
                }
            };

            (apiClient.post as any).mockResolvedValueOnce(mockResponse);

            const result = await authService.refreshToken();

            expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'new-refreshed-token');
            expect(result).toEqual(mockResponse.data);
            expect(authStateManager.saveState).toHaveBeenCalled();
        });
        */

        test('refresh should throw error when no token available', async () => {
            localStorageMock.getItem.mockReturnValueOnce(null);

            await expect(authService.refreshToken()).rejects.toThrow('No token to refresh');
            expect(apiClient.post).not.toHaveBeenCalled();
        });

        test('refresh should handle missing token in response', async () => {
            localStorageMock.getItem.mockReturnValueOnce('old-token');

            const mockResponse = {
                data: {
                    data: {
                        // No access_token
                        user: { id: 1, username: 'testuser' },
                        expires_in: 3600
                    }
                }
            };

            (apiClient.post as any).mockResolvedValueOnce(mockResponse);

            console.warn = vi.fn();

            const result = await authService.refreshToken();

            expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh');
            expect(localStorageMock.setItem).not.toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Refresh response contained no token'));
            expect(result).toEqual(mockResponse.data);
        });

        test('refresh should propagate API errors', async () => {
            localStorageMock.getItem.mockReturnValueOnce('old-token');

            const error = new Error('Refresh failed');
            (apiClient.post as any).mockRejectedValueOnce(error);

            await expect(authService.refreshToken()).rejects.toThrow('Refresh failed');
        });
    });

    describe('getCurrentUser', () => {
        test('successful user profile fetch', async () => {
            localStorageMock.getItem.mockReturnValueOnce('test-token');

            const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
            const mockResponse = {
                data: {
                    data: mockUser
                }
            };

            (apiClient.get as any).mockResolvedValueOnce(mockResponse);

            const result = await authService.getCurrentUser();

            expect(apiClient.get).toHaveBeenCalledWith('/users/me');
            expect(result).toEqual(mockUser);
        });

        test('getCurrentUser should throw error when no token available', async () => {
            localStorageMock.getItem.mockReturnValueOnce(null);

            await expect(authService.getCurrentUser()).rejects.toThrow('No token available');
            expect(apiClient.get).not.toHaveBeenCalled();
        });

        test('getCurrentUser should propagate API errors', async () => {
            localStorageMock.getItem.mockReturnValueOnce('test-token');

            const error = new Error('User fetch failed');
            (apiClient.get as any).mockRejectedValueOnce(error);

            await expect(authService.getCurrentUser()).rejects.toThrow('User fetch failed');
        });
    });

    describe('API key management', () => {
        test('createAPIKey should create a new API key', async () => {
            const keyData = { name: 'Test Key', duration: 30 };
            const mockResponse = {
                data: {
                    id: 'key-123',
                    name: 'Test Key',
                    prefix: 'abc',
                    key: 'abc.123456',
                    createdAt: '2023-01-01'
                }
            };

            (apiClient.post as any).mockResolvedValueOnce(mockResponse);

            const result = await authService.createAPIKey(keyData);

            expect(apiClient.post).toHaveBeenCalledWith('/auth/api-keys', keyData);
            expect(result).toEqual(mockResponse.data);
        });

        test('deleteAPIKey should delete an API key', async () => {
            const keyId = 'key-123';

            (apiClient.delete as any).mockResolvedValueOnce({});

            await authService.deleteApiKey(keyId);

            expect(apiClient.delete).toHaveBeenCalledWith(`/auth/api-keys/${keyId}`);
        });
    });
});