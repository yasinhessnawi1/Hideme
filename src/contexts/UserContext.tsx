/**
 * UserContext.tsx
 * --------------------------------------
 * A React Context implementation that provides authentication state and functions
 * throughout the application. This context centralizes user authentication logic
 * and makes it available to any component in the component tree.
 *
 * Features:
 * - Manages user authentication state (login, logout, registration)
 * - Handles JWT token storage and automatic refresh
 * - Provides error state for authentication failures
 * - Exposes loading state for UI feedback during async operations
 * - Verifies existing tokens on application startup
 * - Maintains sessions during temporary connection issues
 *
 * Usage:
 * 1. Wrap your application with the UserContextProvider
 * 2. Use the useUserContext hook in components to access authentication state and methods
 */

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import authService, { User } from '../services/authService';

/**
 * Interface defining the shape of the UserContext.
 * This provides type safety for consumers of the context.
 */
export interface UserContextType {
    /** The current authenticated user or null if not authenticated */
    user: User | null;

    /** Boolean indicating if the user is currently authenticated */
    isAuthenticated: boolean;

    /** Boolean indicating if an authentication operation is in progress */
    isLoading: boolean;

    /** Error message from the most recent authentication operation or null */
    error: string | null;

    /**
     * Authenticates a user with their credentials.
     * @param usernameOrEmail - The username or email for login
     * @param password - The user's password
     * @returns A promise that resolves when login completes
     */
    login: (usernameOrEmail: string, password: string) => Promise<void>;

    /**
     * Registers a new user account.
     * @param username - The desired username
     * @param email - The user's email address
     * @param password - The desired password
     * @param confirmPassword - Password confirmation to ensure matching
     * @returns A promise that resolves when registration completes
     */
    register: (username: string, email: string, password: string, confirmPassword: string) => Promise<void>;

    /**
     * Logs out the current user and clears authentication state.
     * @returns A promise that resolves when logout completes
     */
    logout: () => Promise<void>;

    /**
     * Clears any authentication errors in the context.
     * Useful when switching between auth modes or forms.
     */
    clearError: () => void;
}

/**
 * Create context with default values.
 * The default values are overridden by the provider implementation.
 */
export const UserContext = createContext<UserContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
    clearError: () => {}
});

/**
 * Props interface for the UserContextProvider.
 * Allows the provider to accept children components.
 */
interface UserContextProviderProps {
    /** React children to be wrapped by the context provider */
    children: ReactNode;
}

/**
 * Provider component that makes authentication state and methods available
 * to all child components without prop drilling.
 *
 * This provider:
 * - Verifies existing auth tokens on mount
 * - Sets up automatic token refresh for session persistence
 * - Provides methods for login, registration, and logout
 * - Manages authentication loading and error states
 * - Handles connection issues gracefully to maintain sessions
 */
export function UserContextProvider({ children }: Readonly<UserContextProviderProps>) {
    // Authentication state
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Effect hook that verifies the existing token on component mount.
     * This ensures the authentication state is restored when the app loads
     * if a valid token exists in localStorage.
     *
     * Enhanced to maintain sessions during connection issues by:
     * - Not clearing tokens on network errors
     * - Using stored user data as fallback when API verification fails
     */
    useEffect(() => {
        const verifyToken = async () => {
            // Check if a token exists in storage
            const token = authService.getToken();
            if (!token) {
                // No token found, we're not in a loading state anymore
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // Verify token validity with the backend
                const verification = await authService.verifyToken();

                if (verification.authenticated) {
                    // If token is valid, fetch the full user profile
                    const userProfile = await authService.getCurrentUser();
                    setUser(userProfile);
                    setIsAuthenticated(true);

                    // Store user data for potential connection issues later
                    localStorage.setItem('user_data', JSON.stringify(userProfile));
                } else {
                    // Token verification failed, clear it
                    authService.clearToken();
                    setError("Your session is no longer valid. Please sign in again to continue.");
                }
            } catch (err: any) {
                // Check if this is a network/connection error
                if (!err.response) {
                    // For connection errors, DON'T clear the token or log the user out
                    console.warn("Connection issue during token verification - maintaining session");

                    // Assume token is still valid if we can't verify due to connection
                    // Get stored user data from localStorage if available
                    const storedUser = localStorage.getItem('user_data');
                    if (storedUser) {
                        try {
                            const userData = JSON.parse(storedUser);
                            setUser(userData);
                            setIsAuthenticated(true);
                            setError(null); // Clear any previous errors
                        } catch (e) {
                            console.error("Error parsing stored user data", e);
                            setError("Unable to verify your session due to connection issues. Please check your internet and try again.");
                        }
                    } else {
                        // Show a warning but don't log out
                        setError("Connection issue detected. Some features may be limited until connection is restored.");
                    }
                } else {
                    // For other errors (like 401 Unauthorized), clear token and log out
                    authService.clearToken();
                    localStorage.removeItem('user_data');
                    setError("Your session has expired. Please sign in again to continue.");
                }
            } finally {
                // Always stop loading state
                setIsLoading(false);
            }
        };

        // Run token verification on mount
        verifyToken().then( () => console.log("[TOKEN] Refreshed the token"));
    }, []);

    /**
     * Effect hook that sets up automatic token refresh.
     * Prevents session timeout by refreshing the token before it expires.
     * Only active when the user is authenticated.
     */
    useEffect(() => {
        let refreshInterval: NodeJS.Timeout;

        if (isAuthenticated && user) {
            // Set up refresh interval to run every 14 minutes
            // This assumes a 15-minute token expiration on the backend
            refreshInterval = setInterval(async () => {
                try {
                    const response = await authService.refreshToken();

                    // Update user data if it changed after token refresh
                    if (response.user && response.user.id !== user.id) {
                        setUser(response.user);
                        // Update stored user data
                        localStorage.setItem('user_data', JSON.stringify(response.user));
                    }
                } catch (err: any) {
                    // Check if this is a network/connection error
                    if (!err.response) {
                        // For connection errors, show a warning but keep the session
                        console.warn("Connection issue during token refresh - maintaining session");
                        setError("Connection issue detected. Some features may be limited until connection is restored.");
                    } else {
                        // For other errors, log the user out
                        setUser(null);
                        setIsAuthenticated(false);
                        authService.clearToken();
                        localStorage.removeItem('user_data');
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
    }, [isAuthenticated, user]);

    /**
     * Handles user login with username/email and password.
     * Updates auth state on success or sets error message on failure.
     * Now stores user data in localStorage for session recovery.
     *
     * @param usernameOrEmail - The username or email address
     * @param password - The user's password
     */
    const login = useCallback(async (usernameOrEmail: string, password: string): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            // Determine if the input is an email or username
            const isEmail = usernameOrEmail.includes('@');
            const credentials = isEmail
                ? { email: usernameOrEmail, password }
                : { username: usernameOrEmail, password };

            // Attempt with the auth service
            const response = await authService.login(credentials);

            // On success, update the user state and authentication flag
            setUser(response.user);
            setIsAuthenticated(true);

            // Store user data in localStorage for session recovery
            localStorage.setItem('user_data', JSON.stringify(response.user));
        } catch (err: any) {
            // Use the user-friendly message if available
            if (err.userMessage) {
                setError(err.userMessage);
            } else if (err.response?.status === 401) {
                setError("Incorrect email/username or password. Please try again.");
            } else if (err.response?.status === 429) {
                setError("Too many failed login attempts. Please wait a moment before trying again.");
            } else if (!err.response) {
                setError("Unable to connect to the authentication service. Please check your internet connection.");
            } else {
                setError("We couldn't sign you in. Please check your credentials and try again.");
            }

            // Re-throw to allow component-level error handling
            throw err;
        } finally {
            // Always set loading to false when operation completes
            setIsLoading(false);
        }
    }, []);

    /**
     * Handles user registration with new account details.
     * On success, automatically logs in the new user.
     *
     * @param username - The desired username
     * @param email - The user's email address
     * @param password - The desired password
     * @param confirmPassword - Password confirmation to ensure matching
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
            // Register with confirm_password format expected by the API
            await authService.register({
                username,
                email,
                password,
                confirm_password: confirmPassword
            });

            console.log("Registration successful, proceeding to auto-login");

            // Auto-login after successful registration using the login method
            await login(username, password);
        } catch (err: any) {
            // Use the user-friendly message if available
            if (err.userMessage) {
                setError(err.userMessage);
            } else if (err.response?.status === 409) {
                if (err.response.data?.field === 'email') {
                    setError("This email address is already registered. Please use a different email or try logging in.");
                } else if (err.response.data?.field === 'username') {
                    setError("This username is already taken. Please choose a different username.");
                } else {
                    setError("This account already exists. Please try logging in instead.");
                }
            } else if (err.response?.status === 400) {
                setError("Please check your registration details and try again.");
            } else if (!err.response) {
                setError("We couldn't complete your registration due to a connection issue. Please try again.");
            } else {
                setError("We couldn't create your account. Please try again with different information.");
            }

            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [login]); // Dependency on login method for auto-login

    /**
     * Handles user logout by calling the auth service and clearing local state.
     * Will clear local state even if the API call fails to ensure UI consistency.
     * Now also clears user data from localStorage.
     */
    const logout = useCallback(async (): Promise<void> => {
        setIsLoading(true);

        try {
            // Attempt to call logout API endpoint
            await authService.logout();
        } catch (err: any) {
            // Log the error but proceed with local logout
            console.error('Logout API call failed, but proceeding with local logout', err);
        } finally {
            // Clear user data from localStorage
            localStorage.removeItem('user_data');

            // Always clear local state to ensure user is logged out in the UI
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
        }
    }, []);

    /**
     * Utility function to clear any auth error messages.
     * Useful when switching between forms or retrying operations.
     */
    const clearError = useCallback((): void => {
        setError(null);
    }, []);

    // Construct the context value object with all state and methods
    const contextValue: UserContextType = {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError
    };

    // Provide the context value to all child components
    return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
}

/**
 * Custom hook that provides access to the UserContext.
 * Ensures the hook is used within a UserContextProvider.
 *
 * @returns The UserContext value with authentication state and methods
 * @throws Error if used outside a UserContextProvider
 */
export function useUserContext(): UserContextType {
    const context = useContext(UserContext);

    if (context === undefined) {
        throw new Error('useUserContext must be used within a UserContextProvider');
    }

    return context;
}
