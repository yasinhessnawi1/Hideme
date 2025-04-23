/**
 * @fileoverview Authentication state manager utility
 *
 * Provides persistent storage and management of authentication state
 * to prevent flickering between authenticated and unauthenticated states
 * during page refreshes and initial loading.
 */

// Keys for storing authentication state in localStorage
const AUTH_STATE_KEY = 'auth_state';
const AUTH_STATE_TIMESTAMP_KEY = 'auth_state_timestamp';

// Maximum age of cached state (5 minutes)
const MAX_CACHED_STATE_AGE = 5 * 60 * 1000;

interface AuthState {
    isAuthenticated: boolean;
    userId?: string | number;
    username?: string;
}

/**
 * Authentication state manager
 */
const authStateManager = {
    /**
     * Store authentication state in localStorage
     *
     * @param state Current authentication state to store
     */
    saveState(state: AuthState): void {
        try {
            localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
            localStorage.setItem(AUTH_STATE_TIMESTAMP_KEY, Date.now().toString());
        } catch (error) {
            console.error('Failed to save auth state:', error);
        }
    },

    /**
     * Get cached authentication state if available and not expired
     *
     * @returns Cached auth state or null if not available or expired
     */
    getCachedState(): AuthState | null {
        try {
            const cachedState = localStorage.getItem(AUTH_STATE_KEY);
            const timestamp = localStorage.getItem(AUTH_STATE_TIMESTAMP_KEY);

            // If no cached state or timestamp, return null
            if (!cachedState || !timestamp) {
                return null;
            }

            // Check if cached state is expired
            const stateAge = Date.now() - parseInt(timestamp, 10);
            if (stateAge > MAX_CACHED_STATE_AGE) {
                // Clear expired state
                this.clearState();
                return null;
            }

            return JSON.parse(cachedState) as AuthState;
        } catch (error) {
            console.error('Failed to get cached auth state:', error);
            return null;
        }
    },

    /**
     * Clear cached authentication state
     */
    clearState(): void {
        try {
            localStorage.removeItem(AUTH_STATE_KEY);
            localStorage.removeItem(AUTH_STATE_TIMESTAMP_KEY);
        } catch (error) {
            console.error('Failed to clear auth state:', error);
        }
    },
};

export default authStateManager;
