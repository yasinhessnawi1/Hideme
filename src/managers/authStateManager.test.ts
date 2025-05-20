import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import authStateManager from './authStateManager';

// Mock localStorage
const mockLocalStorage = (() => {
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
    }),
    _getStore: () => store
  };
})();

describe('authStateManager', () => {
  // We need to spy on console.error inside each test to capture the calls properly
  let consoleSpy: any;

  beforeEach(() => {
    // Setup mocks
    vi.stubGlobal('localStorage', mockLocalStorage);
    mockLocalStorage.clear();
    
    // Create a spy on console.error before each test
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    consoleSpy.mockRestore();
  });

  describe('saveState', () => {
    test('should store authentication state in localStorage', () => {
      // Arrange
      const state = { isAuthenticated: true, userId: 'user123', username: 'testuser' };
      
      // Act
      authStateManager.saveState(state);
      
      // Assert
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_state', JSON.stringify(state));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_state_timestamp', expect.any(String));
    });
    
    test('should log error when localStorage throws exception', () => {
      // Arrange
      const state = { isAuthenticated: true };
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      // Act
      authStateManager.saveState(state);
      
      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save auth state:', expect.any(Error));
    });
  });

  describe('getCachedState', () => {
    test('should return cached state when available and not expired', () => {
      // Arrange
      const state = { isAuthenticated: true, userId: 'user123' };
      const timestamp = Date.now().toString();
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'auth_state') return JSON.stringify(state);
        if (key === 'auth_state_timestamp') return timestamp;
        return null;
      });
      
      // Act
      const result = authStateManager.getCachedState();
      
      // Assert
      expect(result).toEqual(state);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_state');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_state_timestamp');
    });
    
    test('should return null when no cached state exists', () => {
      // Act
      const result = authStateManager.getCachedState();
      
      // Assert
      expect(result).toBeNull();
    });
    
    test('should return null and clear state when cached state is expired', () => {
      // Arrange
      const state = { isAuthenticated: true };
      // Set timestamp to > 5 minutes ago (MAX_CACHED_STATE_AGE)
      const timestamp = (Date.now() - (6 * 60 * 1000)).toString();
      
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'auth_state') return JSON.stringify(state);
        if (key === 'auth_state_timestamp') return timestamp;
        return null;
      });
      
      // Spy on clearState
      const clearStateSpy = vi.spyOn(authStateManager, 'clearState');
      
      // Act
      const result = authStateManager.getCachedState();
      
      // Assert
      expect(result).toBeNull();
      expect(clearStateSpy).toHaveBeenCalled();
    });
    
    test('should handle JSON parsing error', () => {
      // Arrange
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'auth_state') return '{invalid:json';
        if (key === 'auth_state_timestamp') return Date.now().toString();
        return null;
      });
      
      // Act
      const result = authStateManager.getCachedState();
      
      // Assert
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get cached auth state:', expect.any(Error));
    });
    
    test('should handle missing timestamp', () => {
      // Arrange
      const state = { isAuthenticated: true };
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'auth_state') return JSON.stringify(state);
        if (key === 'auth_state_timestamp') return null;
        return null;
      });
      
      // Act
      const result = authStateManager.getCachedState();
      
      // Assert
      expect(result).toBeNull();
    });
  });

  describe('clearState', () => {
    test('should remove authentication state from localStorage', () => {
      // Act
      authStateManager.clearState();
      
      // Assert
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_state');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_state_timestamp');
    });
    
    test('should log error when removeItem throws exception', () => {
      // Arrange
      mockLocalStorage.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      // Act
      authStateManager.clearState();
      
      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear auth state:', expect.any(Error));
    });
  });
});
