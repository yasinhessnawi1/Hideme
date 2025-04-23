/**
 * Core Authentication Hook
 *
 * Manages user authentication state including:
 * - Login/logout functionality
 * - User registration
 * - Token verification and refresh
 * - Authentication error handling
 *
 * This hook provides the foundation for all user-related functionality.
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import apiClient from '../../services/apiClient';
import {User} from "../../types";
import authService from '../../services/authService';
import authStateManager from '../../managers/authStateManager';

export interface UseAuthReturn {
    // Authentication state
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Authentication methods
    login: (usernameOrEmail: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string, confirmPassword: string) => Promise<void>;
    logout: () => Promise<void>;

    // Utility methods
    clearError: () => void;
    verifySession: () => Promise<boolean>;

    //user context
    setUser: (user: User | null) => void;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
}

/**
 * Hook for managing user authentication state
 */
export const useAuth = (): UseAuthReturn => {
    // Check for cached auth state when initializing
    const cachedState = authStateManager.getCachedState();
    const hasToken = !!authService.getToken();

    // Authentication state - initialize from cache when available
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
        cachedState?.isAuthenticated || false
    );
    const [isLoading, setIsLoading] = useState<boolean>(hasToken); // Start loading if we have a token
    const [error, setError] = useState<string | null>(null);

    // Track token verification status
    const verificationRef = useRef<{
        inProgress: boolean;
        completed: boolean;
        lastVerified: number;
    }>({
        inProgress: false,
        completed: false,
        lastVerified: 0
    });

    const initialVerificationAttemptedRef = useRef(false);

    /**
     * Verify existing authentication token
     * Returns true if successfully authenticated, false otherwise
     */
    const verifySession = useCallback(async (): Promise<boolean> => {
        const VERIFICATION_COOLDOWN = 60000; // 60 seconds

        // Prevent duplicate verification requests
        if (verificationRef.current.inProgress) {
            console.log("[useAuth] Verification already in progress, returning current state");
            return isAuthenticated;
        }

        // Skip verification if recently completed
        const now = Date.now();
        if (
            verificationRef.current.completed &&
            now - verificationRef.current.lastVerified < VERIFICATION_COOLDOWN
        ) {
            console.log("[useAuth] Using cached verification status");
            return isAuthenticated;
        }

        // Check if a token exists
        const token = authService.getToken();
        if (!token) {
            if (isAuthenticated) {
                // Only log and update if there's an actual change to avoid rerenders
                console.log("[useAuth] No token found, setting not authenticated");
                setIsLoading(false);
                setIsAuthenticated(false);

                // Update auth state manager
                authStateManager.saveState({isAuthenticated: false});
            }

            verificationRef.current.completed = true;
            verificationRef.current.lastVerified = now;
            return false;
        }

        // Set in-progress flag before any async operations
        verificationRef.current.inProgress = true;

        // Only set loading if not already loading
        if (!isLoading) {
            setIsLoading(true);
        }

        try {
            console.log("[useAuth] Verifying token...");
            // Verify token validity with the backend
            const response = await apiClient.get('/auth/verify');
            const verification = response.data.data;

            if (verification.authenticated) {
                console.log("[useAuth] Token verification successful, fetching user profile");
                // Get full user profile if token is valid
                const userProfile = await authService.getCurrentUser();
                setUser(userProfile);
                setIsAuthenticated(true);

                // Store user data for resilience during connection issues
                localStorage.setItem('user_data', JSON.stringify(userProfile));

                // Update auth state manager
                authStateManager.saveState({
                    isAuthenticated: true,
                    userId: userProfile.id,
                    username: userProfile.username
                });

                verificationRef.current.completed = true;
                verificationRef.current.lastVerified = now;
                setIsLoading(false);
                return true;
            } else {
                console.warn("[useAuth] Token verification failed");
                // Token verification failed, clear it
                authService.clearToken();
                localStorage.removeItem('user_data');

                // Update auth state manager
                authStateManager.clearState();

                setUser(null);
                setIsAuthenticated(false);

                verificationRef.current.completed = true;
                verificationRef.current.lastVerified = now;
                setIsLoading(false);
                return false;
            }
        } catch (err: any) {
            console.error("[useAuth] Error during token verification:", err.message);

            // For network errors, try to use stored user data
            if (!err.response) {
                console.warn("[useAuth] Connection issue during token verification - maintaining session");

                const storedUser = localStorage.getItem('user_data');
                if (storedUser) {
                    try {
                        const userData = JSON.parse(storedUser);
                        setUser(userData);
                        setIsAuthenticated(true);
                        setError(null);

                        // Update auth state manager with offline state
                        authStateManager.saveState({
                            isAuthenticated: true,
                            userId: userData.id,
                            username: userData.username
                        });

                        verificationRef.current.completed = true;
                        verificationRef.current.lastVerified = now;
                        setIsLoading(false);
                        return true;
                    } catch (e) {
                        setError("Unable to verify your session due to connection issues");
                    }
                } else {
                    setError("Connection issue detected");
                }
            } else {
                // For other errors, clear token and log out
                console.error("[useAuth] Token error status:", err.response?.status);
                authService.clearToken();
                localStorage.removeItem('user_data');

                // Clear auth state
                authStateManager.clearState();

                setUser(null);
                setIsAuthenticated(false);
                setError("Your session has expired");
            }

            verificationRef.current.completed = true;
            verificationRef.current.lastVerified = now;
            setIsLoading(false);
            return false;
        } finally {
            verificationRef.current.inProgress = false;
            setIsLoading(false);
        }
    }, [isAuthenticated, isLoading]);

    /**
     * Verify token on component mount
     */
    useEffect(() => {
        // Use a ref to track if initial verification was attempted
        if (!initialVerificationAttemptedRef.current) {
            initialVerificationAttemptedRef.current = true;
            console.log("[useAuth] Initial token verification");

            // If we have a cached auth state and token, set authenticated while verifying
            const cachedState = authStateManager.getCachedState();
            const hasToken = !!authService.getToken();

            if (cachedState?.isAuthenticated && hasToken) {
                // Pre-emptively set authenticated to avoid flicker
                setIsAuthenticated(true);

                // Try to load cached user data
                try {
                    const storedUser = localStorage.getItem('user_data');
                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    }
                } catch (e) {
                    console.error("[useAuth] Error loading cached user data:", e);
                }
            }

            // Verify the session in the background
            verifySession().then(result => {
                if (result) {
                    console.log("[useAuth] Session verified successfully");
                } else {
                    console.log("[useAuth] Not authenticated or session expired");
                }
            });
        }
    }, [verifySession]);

    /**
     * Set up token refresh interval when authenticated
     */
    useEffect(() => {
        let refreshInterval: NodeJS.Timeout;

        if (isAuthenticated && user) {
            // Refresh token every 14 minutes (assuming 15-minute expiry)
            refreshInterval = setInterval(async () => {
                try {
                    console.log("[useAuth] Refreshing token...");
                    const response = await authService.refreshToken();
                    console.log("[useAuth] Token refreshed successfully");

                    // Update auth state manager
                    authStateManager.saveState({
                        isAuthenticated: true,
                    });
                    if (response.data.access_token !== authService.getToken()) {
                        authService.setToken(response.data.access_token);
                    }
                } catch (err: any) {
                    console.error("[useAuth] Token refresh failed:", err.message);

                    // Check if this is a network/connection error
                    if (!err.response) {
                        // For connection errors, show a warning but keep the session
                        console.warn("[useAuth] Connection issue during token refresh - maintaining session");
                        setError("Connection issue detected. Some features may be limited until connection is restored.");
                    } else {
                        // For other errors, log the user out
                        setUser(null);
                        setIsAuthenticated(false);
                        authService.clearToken();
                        localStorage.removeItem('user_data');

                        // Clear auth state
                        authStateManager.clearState();

                        setError("Your session expired while you were inactive. Please sign in again to continue.");
                    }
                }
            }, 14 * 60 * 1000); // 14 minutes
        }

        // Clean up interval on unmount or when auth state changes
        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [isAuthenticated]);

    /**
     * Log in with username/email and password
     */
    const login = useCallback(async (usernameOrEmail: string, password: string): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            console.log("[useAuth] Attempting login...");
            // Determine if input is email or username
            const isEmail = usernameOrEmail.includes('@');
            const credentials = isEmail
                ? {email: usernameOrEmail, password}
                : {username: usernameOrEmail, password};

            // Attempt login
            const response = await authService.login(credentials);

            if (!response.data.access_token) {
                throw new Error("Login response did not include a token");
            }

            console.log("[useAuth] Login successful, token received");

            // Update authentication state
            setUser(response.data.user);
            setIsAuthenticated(true);

            // Store user data for resilience
            localStorage.setItem('user_data', JSON.stringify(response.data.user));

            // Update auth state manager
            authStateManager.saveState({
                isAuthenticated: true,
                userId: response.data.user.id,
                username: response.data.user.username
            });

            // Reset verification tracking
            verificationRef.current.completed = true;
            verificationRef.current.lastVerified = Date.now();

            // Clear any existing caches
            apiClient.clearCache();
        } catch (err: any) {
            console.error("[useAuth] Login error:", err);
            const errorMessage = err.userMessage || "Login failed. Please check your credentials.";
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Register a new user account
     */
    const register = useCallback(async (
        username: string,
        email: string,
        password: string,
        confirmPassword: string
    ): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            // Register the user
            await authService.register({
                username,
                email,
                password,
                confirm_password: confirmPassword
            });

            console.log("[useAuth] Registration successful, proceeding to auto-login");

            // Auto-login after successful registration
            await login(username, password);
        } catch (err: any) {
            console.error("[useAuth] Registration error:", err);
            const errorMessage = err.userMessage || "Registration failed";
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [login]);

    /**
     * Log out the current user
     */
    const logout = useCallback(async (): Promise<void> => {
        setIsLoading(true);

        try {
            console.log("[useAuth] Logging out...");
            // Call logout API endpoint
            await authService.logout();
            console.log("[useAuth] Logout API call successful");
        } catch (err: any) {
            console.error('[useAuth] Logout API call failed, but proceeding with local logout', err);
        } finally {
            // Clear user data
            localStorage.removeItem('user_data');

            // Clear auth state
            authStateManager.clearState();

            // Clear authentication state
            setUser(null);
            setIsAuthenticated(false);

            // Reset verification status
            verificationRef.current.completed = false;
            verificationRef.current.lastVerified = 0;

            // Clear all cached data
            apiClient.clearCache();

            setIsLoading(false);
            console.log("[useAuth] Logout completed");
        }
    }, []);

    /**
     * Clear any error messages
     */
    const clearError = useCallback((): void => {
        setError(null);
    }, []);

    return {
        // Authentication state
        user,
        isAuthenticated,
        isLoading,
        error,

        // Authentication methods
        login,
        register,
        logout,

        // Utility methods
        clearError,
        verifySession,

        //user context
        setUser,
        setIsAuthenticated,
        setIsLoading,
        setError,
    };
};

export default useAuth;
