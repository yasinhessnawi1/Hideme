import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import authService from '../../services/database-backend-services/authService';
import apiClient from '../../services/api-services/apiClient';
import authStateManager from '../../managers/authStateManager';
import {Key} from "lucide-react";

// Mock dependencies
vi.mock('../../services/api-services/apiClient', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        clearCache: vi.fn()
    }
}));

vi.mock('../../managers/authStateManager', () => ({
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

            vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

            const credentials = { username: 'testuser', password: 'password123' };

            await expect(authService.login(credentials)).rejects.toThrow('Login failed: No token received');
            expect(localStorageMock.setItem).not.toHaveBeenCalled();
        });

        test('login should propagate API errors', async () => {
            const error = new Error('Login failed');
            vi.mocked(apiClient.post).mockRejectedValue(error);

            const credentials = { username: 'testuser', password: 'password123' };

            await expect(authService.login(credentials)).rejects.toThrow('Login failed');
            expect(localStorageMock.setItem).not.toHaveBeenCalled();
        });
    });

    describe('register', () => {
        test('successful registration', async () => {
            const mockResponse = { data: { success: true } };
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

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
            vi.mocked(apiClient.post).mockRejectedValue(error);

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
        test('logout without token should skip API call', async () => {
            localStorageMock.getItem.mockReturnValueOnce(null);

            await authService.logout();

            expect(apiClient.post).not.toHaveBeenCalled();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
        });
    });

    describe('refreshToken', () => {
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

            vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

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
            vi.mocked(apiClient.post).mockRejectedValue(error);

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

            vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

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
            localStorageMock.getItem.mockReturnValueOnce('old-token');

            const error = new Error('User fetch failed');
            vi.mocked(apiClient.get).mockRejectedValue(error);

            await expect(authService.getCurrentUser()).rejects.toThrow('User fetch failed');
        });
    });

    describe('API key management', () => {
        test('createAPIKey should create a new API key', async () => {
            localStorageMock.getItem.mockReturnValueOnce('test-token');

            const keyData = { name: 'Temporary Key', duration: '15m' };
            const mockResponse = {
                data: {
                    data: {
                        id: 'new-api-key-123',
                        key: 'new-api-key-123',
                        name: 'Test API Key',
                        expires_at: '2023-12-31T23:59:59Z'
                    }
                }
            };

            vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

            const result = await authService.createApiKey();

            expect(apiClient.post).toHaveBeenCalledWith('/keys', expect.objectContaining({
                name: 'Temporary Key',
                duration: '15m'
            }));
            expect(result).toEqual(mockResponse.data.data);
        });

        test('deleteAPIKey should delete an API key', async () => {
            localStorageMock.getItem.mockReturnValueOnce('test-token');
            const keyId = 'key-123';

            vi.mocked(apiClient.delete).mockResolvedValue({});

            await authService.deleteApiKey(keyId);

            expect(apiClient.delete).toHaveBeenCalledWith(`/keys/${keyId}`);
        });
    });
});