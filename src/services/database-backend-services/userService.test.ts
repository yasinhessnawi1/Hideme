import { describe, test, expect, vi, beforeEach } from 'vitest';
import userService from '../../services/database-backend-services/userService';
import apiClient from '../../services/api-services/apiClient';
import authService from '../../services/database-backend-services/authService';
import authStateManager from '../../managers/authStateManager';

// Mock dependencies
vi.mock('../../services/api-services/apiClient', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
        clearCache: vi.fn()
    }
}));

vi.mock('../../services/database-backend-services/authService', () => ({
    default: {
        clearToken: vi.fn(),
        getToken: vi.fn()
    }
}));

vi.mock('../../managers/authStateManager', () => ({
    default: {
        clearState: vi.fn()
    }
}));

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        clear: vi.fn(() => {
            store = {};
        }),
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('userService', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.resetAllMocks();
        // Mock performance.now for consistent timing measurements
        vi.spyOn(performance, 'now').mockImplementation(() => 1000);
        // Reset localStorage mock
        localStorageMock.clear.mockClear();
    });

    describe('getCurrentUser', () => {
        test('should fetch user profile successfully', async () => {
            // Mock successful API response
            const mockUser = {
                id: 123,
                username: 'testuser',
                email: 'test@example.com',
                created_at: '2023-01-01',
                updated_at: '2023-01-02'
            };

            vi.mocked(apiClient.get).mockResolvedValue({
                data: {
                    data: mockUser
                }
            });

            // Call the function
            const result = await userService.getCurrentUser();

            // Check API was called correctly
            expect(apiClient.get).toHaveBeenCalledWith('/users/me');

            // Check result
            expect(result).toEqual(mockUser);
        });

        test('should handle API error', async () => {
            // Mock API error
            const mockError = new Error('API error');
            vi.mocked(apiClient.get).mockRejectedValue(mockError);

            // Call and expect error
            await expect(userService.getCurrentUser()).rejects.toThrow();

            // Check API was called
            expect(apiClient.get).toHaveBeenCalledWith('/users/me');
        });
    });

    describe('updateUser', () => {
        test('should update user profile successfully', async () => {
            // Mock data
            const updateData = {
                username: 'newusername',
                email: 'newemail@example.com'
            };

            const mockResponse = {
                id: 123,
                username: 'newusername',
                email: 'newemail@example.com',
                created_at: '2023-01-01',
                updated_at: '2023-01-03'
            };

            // Mock API response
            vi.mocked(apiClient.put).mockResolvedValue({
                data: mockResponse
            });

            // Call the function
            const result = await userService.updateUser(updateData);

            // Check API was called correctly
            expect(apiClient.put).toHaveBeenCalledWith('/users/me', updateData);

            // Check result
            expect(result).toEqual(mockResponse);
        });

        test('should handle API error during update', async () => {
            // Mock data
            const updateData = {
                username: 'newusername'
            };

            // Mock API error
            const mockError = new Error('API error');
            vi.mocked(apiClient.put).mockRejectedValue(mockError);

            // Call and expect error
            await expect(userService.updateUser(updateData)).rejects.toThrow();

            // Check API was called
            expect(apiClient.put).toHaveBeenCalledWith('/users/me', updateData);
        });
    });

    describe('changePassword', () => {
        test('should change password successfully', async () => {
            // Mock data
            const passwordData = {
                current_password: 'oldpass',
                new_password: 'newpass',
                confirm_password: 'newpass'
            };

            // Mock API response
            vi.mocked(apiClient.post).mockResolvedValue({
                data: {
                    message: 'Password changed successfully'
                }
            });

            // Call the function
            const result = await userService.changePassword(passwordData);

            // Check API was called correctly
            expect(apiClient.post).toHaveBeenCalledWith('/users/me/change-password', passwordData);

            // Check result
            expect(result).toEqual({ message: 'Password changed successfully' });
        });

        test('should handle API error during password change', async () => {
            // Mock data
            const passwordData = {
                current_password: 'wrongpass',
                new_password: 'newpass',
                confirm_password: 'newpass'
            };

            // Mock API error
            const mockError = new Error('Current password is incorrect');
            vi.mocked(apiClient.post).mockRejectedValue(mockError);

            // Call and expect error
            await expect(userService.changePassword(passwordData)).rejects.toThrow();

            // Check API was called
            expect(apiClient.post).toHaveBeenCalledWith('/users/me/change-password', passwordData);
        });
    });

    describe('deleteAccount', () => {
        test('should delete account successfully', async () => {
            // Mock data
            const deleteData = {
                password: 'password123',
                confirm: 'DELETE'
            };

            // Mock API response
            vi.mocked(apiClient.delete).mockResolvedValue({
                data: {
                    message: 'Account deleted successfully'
                }
            });

            // Mock window.location.reload
            const originalLocation = window.location as unknown as Location;
            Object.defineProperty(window, 'location', {
                writable: true,
                value: { reload: vi.fn() }
            });

            // Call the function
            const result = await userService.deleteAccount(deleteData);

            // Check API was called correctly
            expect(apiClient.delete).toHaveBeenCalledWith('/users/me', { ...deleteData });

            // Check cleanup actions were called
            expect(authService.clearToken).toHaveBeenCalled();
            expect(apiClient.clearCache).toHaveBeenCalled();
            expect(authStateManager.clearState).toHaveBeenCalled();
            expect(localStorageMock.clear).toHaveBeenCalled();
            expect(window.location.reload).toHaveBeenCalled();

            // Check result
            expect(result).toEqual({ message: 'Account deleted successfully' });

            // Restore window.location
            Object.defineProperty(window, 'location', {
                writable: true,
                value: originalLocation
            });
        });

        test('should handle API error during account deletion', async () => {
            // Mock data
            const deleteData = {
                password: 'wrongpass',
                confirm: 'DELETE'
            };

            // Mock API error
            const mockError = new Error('Password is incorrect');
            vi.mocked(apiClient.delete).mockRejectedValue(mockError);

            // Call and expect error
            await expect(userService.deleteAccount(deleteData)).rejects.toThrow();

            // Check API was called
            expect(apiClient.delete).toHaveBeenCalledWith('/users/me', { ...deleteData });

            // Cleanup actions should not be called
            expect(authService.clearToken).not.toHaveBeenCalled();
            expect(apiClient.clearCache).not.toHaveBeenCalled();
            expect(authStateManager.clearState).not.toHaveBeenCalled();
            expect(localStorageMock.clear).not.toHaveBeenCalled();
        });
    });

    describe('checkUsername', () => {
        test('should check username availability successfully', async () => {
            // Mock API response for available username
            vi.mocked(apiClient.get).mockResolvedValue({
                data: {
                    username: 'testuser',
                    available: true
                }
            });

            // Call the function
            const result = await userService.checkUsername('testuser');

            // Check API was called correctly
            expect(apiClient.get).toHaveBeenCalledWith(`/users/check/username?username=testuser`);

            // Check result
            expect(result).toEqual({
                username: 'testuser',
                available: true
            });
        });

        test('should handle API error during username check', async () => {
            // Mock API error
            const mockError = new Error('API error');
            vi.mocked(apiClient.get).mockRejectedValue(mockError);

            // Call and expect error
            await expect(userService.checkUsername('testuser')).rejects.toThrow();

            // Check API was called
            expect(apiClient.get).toHaveBeenCalledWith(`/users/check/username?username=testuser`);
        });

        test('should handle username with special characters', async () => {
            const username = 'test@user+name';
            const encodedUsername = encodeURIComponent(username);

            vi.mocked(apiClient.get).mockResolvedValue({
                data: {
                    username: username,
                    available: true
                }
            });

            await userService.checkUsername(username);

            expect(apiClient.get).toHaveBeenCalledWith(`/users/check/username?username=${encodedUsername}`);
        });
    });

    describe('checkEmail', () => {
        test('should check email availability successfully', async () => {
            // Mock API response for available email
            vi.mocked(apiClient.get).mockResolvedValue({
                data: {
                    email: 'test@example.com',
                    available: true
                }
            });

            // Call the function
            const result = await userService.checkEmail('test@example.com');

            // Check API was called correctly
            expect(apiClient.get).toHaveBeenCalledWith(`/users/check/email?email=test%40example.com`);

            // Check result
            expect(result).toEqual({
                email: 'test@example.com',
                available: true
            });
        });

        test('should handle API error during email check', async () => {
            // Mock API error
            const mockError = new Error('API error');
            vi.mocked(apiClient.get).mockRejectedValue(mockError);

            // Call and expect error
            await expect(userService.checkEmail('test@example.com')).rejects.toThrow();

            // Check API was called
            expect(apiClient.get).toHaveBeenCalledWith(`/users/check/email?email=test%40example.com`);
        });
    });

    describe('getActiveSessions', () => {
        test('should get active sessions successfully', async () => {
            // Mock API response
            const mockSessions = [
                {
                    id: 'session1',
                    createdAt: '2023-01-01T00:00:00Z',
                    expiresAt: '2023-01-02T00:00:00Z'
                },
                {
                    id: 'session2',
                    createdAt: '2023-01-01T12:00:00Z',
                    expiresAt: '2023-01-02T12:00:00Z'
                }
            ];

            vi.mocked(apiClient.get).mockResolvedValue({
                data: mockSessions
            });

            // Call the function
            const result = await userService.getActiveSessions();

            // Check API was called correctly
            expect(apiClient.get).toHaveBeenCalledWith('/users/me/sessions');

            // Check result
            expect(result).toEqual(mockSessions);
        });

        test('should handle API error during session fetch', async () => {
            // Mock API error
            const mockError = new Error('API error');
            vi.mocked(apiClient.get).mockRejectedValue(mockError);

            // Call and expect error
            await expect(userService.getActiveSessions()).rejects.toThrow();

            // Check API was called
            expect(apiClient.get).toHaveBeenCalledWith('/users/me/sessions');
        });

        test('should return empty array when server returns no sessions', async () => {
            vi.mocked(apiClient.get).mockResolvedValue({
                data: []
            });

            const result = await userService.getActiveSessions();

            expect(result).toEqual([]);
            expect(apiClient.get).toHaveBeenCalledWith('/users/me/sessions');
        });
    });

    describe('invalidateSession', () => {
        test('should invalidate session successfully', async () => {
            // Mock session ID
            const sessionId = 'session1';

            // Mock API response
            vi.mocked(apiClient.delete).mockResolvedValue({
                data: {
                    message: 'Session invalidated successfully'
                }
            });

            // Call the function
            const result = await userService.invalidateSession(sessionId);

            // Check API was called correctly
            expect(apiClient.delete).toHaveBeenCalledWith('/users/me/sessions', {
                data: { session_id: sessionId }
            });

            // Check result
            expect(result).toEqual({ message: 'Session invalidated successfully' });
        });

        test('should handle API error during session invalidation', async () => {
            // Mock session ID
            const sessionId = 'invalid-session';

            // Mock API error
            const mockError = new Error('Invalid session ID');
            vi.mocked(apiClient.delete).mockRejectedValue(mockError);

            // Call and expect error
            await expect(userService.invalidateSession(sessionId)).rejects.toThrow();

            // Check API was called
            expect(apiClient.delete).toHaveBeenCalledWith('/users/me/sessions', {
                data: { session_id: sessionId }
            });
        });

        test('should handle empty session ID', async () => {
            // Empty session ID
            const sessionId = '';

            vi.mocked(apiClient.delete).mockResolvedValue({
                data: {
                    message: 'No session specified'
                }
            });

            await userService.invalidateSession(sessionId);

            expect(apiClient.delete).toHaveBeenCalledWith('/users/me/sessions', {
                data: { session_id: sessionId }
            });
        });
    });

    // Test console logging functionality
        /*
        test('should log initialization message', () => {
            const spy = vi.spyOn(console, 'log');

            // Re-import the module to trigger the initialization log
            vi.resetModules();
            require('../services/userService');

            expect(spy).toHaveBeenCalledWith(expect.stringContaining('[USER] User Service initialized'));

            spy.mockRestore();
        });
        */

        /*
        test('should log success and error messages', async () => {
            const logSpy = vi.spyOn(console, 'log');
            const errorSpy = vi.spyOn(console, 'error');

            // Mock successful API call
            (apiClient.get as any).mockResolvedValue({
                data: {
                    data: { id: 123, username: 'testuser' }
                }
            });

            await userService.getCurrentUser();

            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[USER] Fetching current user profile'));
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[USER] User profile fetched successfully'));

            // Mock failed API call
            (apiClient.get as any).mockRejectedValue(new Error('API error'));

            try {
                await userService.getCurrentUser();
            } catch (error) {
                // Expected error
            }

            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[USER] Failed to fetch user profile'));

            logSpy.mockRestore();
            errorSpy.mockRestore();
        });
        */
});