import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import authStateManager from '../managers/authStateManager';

// Constants from authStateManager.ts (used for testing)
const AUTH_STATE_KEY = 'auth_state';
const AUTH_STATE_TIMESTAMP_KEY = 'auth_state_timestamp';
const MAX_CACHED_STATE_AGE = 5 * 60 * 1000; // 5 minutes in milliseconds

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        })
    };
})();

// Replace the global localStorage with our mock
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('authStateManager', () => {
    beforeEach(() => {
        // Clear the mock localStorage before each test
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('saveState', () => {
        test('should save auth state to localStorage', () => {
            const authState = { isAuthenticated: true, userId: '123', username: 'testuser' };
            authStateManager.saveState(authState);

            expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(AUTH_STATE_KEY, JSON.stringify(authState));
            expect(localStorageMock.setItem).toHaveBeenCalledWith(AUTH_STATE_TIMESTAMP_KEY, expect.any(String));
        });

        test('should save minimal auth state with only isAuthenticated field', () => {
            const authState = { isAuthenticated: false };
            authStateManager.saveState(authState);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(AUTH_STATE_KEY, JSON.stringify(authState));
            expect(localStorageMock.setItem).toHaveBeenCalledWith(AUTH_STATE_TIMESTAMP_KEY, expect.any(String));
        });

        test('should handle localStorage errors', () => {
            // Mock localStorage.setItem to throw an error
            localStorageMock.setItem.mockImplementationOnce(() => {
                throw new Error('localStorage error');
            });

            // Spy on console.error
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const authState = { isAuthenticated: true };
            authStateManager.saveState(authState);

            expect(consoleSpy).toHaveBeenCalledWith('Failed to save auth state:', expect.any(Error));
        });
    });

    describe('getCachedState', () => {
        test('should return null when no cached state exists', () => {
            const result = authStateManager.getCachedState();

            expect(result).toBeNull();
            expect(localStorageMock.getItem).toHaveBeenCalledWith(AUTH_STATE_KEY);
            expect(localStorageMock.getItem).toHaveBeenCalledWith(AUTH_STATE_TIMESTAMP_KEY);
        });

        test('should return null when auth state exists but timestamp is missing', () => {
            const authState = { isAuthenticated: true };
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === AUTH_STATE_KEY) {
                    return JSON.stringify(authState);
                }
                return null;
            });

            const result = authStateManager.getCachedState();
            expect(result).toBeNull();
        });

        test('should return null and clear state when cached state is expired', () => {
            const authState = { isAuthenticated: true };
            // Set timestamp to slightly more than MAX_CACHED_STATE_AGE ago
            const expiredTimestamp = Date.now() - (MAX_CACHED_STATE_AGE + 1000);

            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === AUTH_STATE_KEY) {
                    return JSON.stringify(authState);
                }
                if (key === AUTH_STATE_TIMESTAMP_KEY) {
                    return expiredTimestamp.toString();
                }
                return null;
            });

            // Spy on clearState method
            const clearStateSpy = vi.spyOn(authStateManager, 'clearState');

            const result = authStateManager.getCachedState();

            expect(result).toBeNull();
            expect(clearStateSpy).toHaveBeenCalled();
        });

        test('should return cached state when valid and not expired', () => {
            const authState = { isAuthenticated: true, userId: '123', username: 'testuser' };
            // Set timestamp to slightly less than MAX_CACHED_STATE_AGE ago
            const validTimestamp = Date.now() - (MAX_CACHED_STATE_AGE - 1000);

            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === AUTH_STATE_KEY) {
                    return JSON.stringify(authState);
                }
                if (key === AUTH_STATE_TIMESTAMP_KEY) {
                    return validTimestamp.toString();
                }
                return null;
            });

            const result = authStateManager.getCachedState();

            expect(result).toEqual(authState);
        });

        test('should handle JSON parse errors', () => {
            // Mock localStorage to return invalid JSON
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === AUTH_STATE_KEY) {
                    return 'invalid json';
                }
                if (key === AUTH_STATE_TIMESTAMP_KEY) {
                    return Date.now().toString();
                }
                return null;
            });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = authStateManager.getCachedState();

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to get cached auth state:', expect.any(Error));
        });

        test('should calculate state age correctly', () => {
            const authState = { isAuthenticated: true };
            const threeMinutesAgo = Date.now() - (3 * 60 * 1000); // 3 minutes ago

            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === AUTH_STATE_KEY) {
                    return JSON.stringify(authState);
                }
                if (key === AUTH_STATE_TIMESTAMP_KEY) {
                    return threeMinutesAgo.toString();
                }
                return null;
            });

            const result = authStateManager.getCachedState();

            expect(result).toEqual(authState);
        });
    });

    describe('clearState', () => {
        test('should clear auth state from localStorage', () => {
            authStateManager.clearState();

            expect(localStorageMock.removeItem).toHaveBeenCalledTimes(2);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STATE_KEY);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STATE_TIMESTAMP_KEY);
        });

        test('should handle localStorage errors during clearing', () => {
            // Mock localStorage.removeItem to throw an error
            localStorageMock.removeItem.mockImplementationOnce(() => {
                throw new Error('localStorage error');
            });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            authStateManager.clearState();

            expect(consoleSpy).toHaveBeenCalledWith('Failed to clear auth state:', expect.any(Error));
        });
    });

    describe('Integration tests', () => {
        test('should maintain state consistency across operations', () => {
            // First save a state
            const initialState = { isAuthenticated: true, userId: '123', username: 'testuser' };
            authStateManager.saveState(initialState);

            // Retrieve it to verify it was saved
            const retrievedState = authStateManager.getCachedState();
            expect(retrievedState).toEqual(initialState);

            // Clear the state
            authStateManager.clearState();

            // Verify it was cleared
            const stateAfterClearing = authStateManager.getCachedState();
            expect(stateAfterClearing).toBeNull();
        });

        test('should update existing state when saving new state', () => {
            // Save initial state
            const initialState = { isAuthenticated: true, userId: '123', username: 'testuser' };
            authStateManager.saveState(initialState);

            // Save updated state
            const updatedState = { isAuthenticated: true, userId: '123', username: 'newusername' };
            authStateManager.saveState(updatedState);

            // Verify updated state is retrieved
            const retrievedState = authStateManager.getCachedState();
            expect(retrievedState).toEqual(updatedState);
        });
    });
});