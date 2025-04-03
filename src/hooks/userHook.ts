/**
 * userHook.ts
 * --------------------------------------
 * A comprehensive custom hook that provides advanced user authentication and profile management.
 * This hook serves as the central hub for all user-related functionality in the application,
 * abstracting away the complexity of API calls, token management, and state persistence.
 *
 * This hook exposes functions for:
 * - Authentication (login, register, logout)
 * - User profile management
 * - Settings management
 * - Session management
 * - Ban list management
 * - Search pattern management
 * - Model entity management
 * - API key management
 *
 * Key features:
 * - Automatic token refresh to maintain authentication
 * - Initial data loading when user authenticates
 * - Comprehensive error handling and reporting
 * - Performance logging and metrics
 * - State management for all user-related data
 *
 * Usage:
 * ```
 * const
 *   user,
 *   isAuthenticated,
 *   login,
 *   logout,
 *   // other functions and state...
 *  = useUser();
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useUserContext } from '../contexts/UserContext';
import userService, { UserUpdate, PasswordChange, AccountDeletion, ActiveSession } from '../services/userService';
import settingsService, {
    UserSettings,
    UserSettingsUpdate,
    BanListWithWords,
    SearchPattern,
    SearchPatternCreate,
    SearchPatternUpdate,
    ModelEntity,
    ModelEntityBatch
} from '../services/settingsService';
import authService, { APIKey, APIKeyCreationRequest } from '../services/authService';

/**
 * Interface defining the return type for the useUser hook.
 * This provides a comprehensive set of user-related state and functions
 * that can be used throughout the application.
 */
export interface UseUserReturn {
    // Context values
    /** The current authenticated user or null if not logged in */
    user: ReturnType<typeof useUserContext>['user'];
    /** Whether the user is currently authenticated */
    isAuthenticated: ReturnType<typeof useUserContext>['isAuthenticated'];
    /** Whether any user-related operation is in progress */
    isLoading: boolean;
    /** Error message from the most recent operation, if any */
    error: string | null;

    // Auth functions
    /** Authenticates a user with their credentials */
    login: ReturnType<typeof useUserContext>['login'];
    /** Registers a new user account */
    register: ReturnType<typeof useUserContext>['register'];
    /** Logs the current user out */
    logout: ReturnType<typeof useUserContext>['logout'];

    // User profile functions
    /** Fetches the current user's profile information */
    getUserProfile: () => Promise<void>;
    /** Updates the current user's profile information */
    updateUserProfile: (data: UserUpdate) => Promise<void>;
    /** Changes the current user's password */
    changePassword: (data: PasswordChange) => Promise<void>;
    /** Deletes the current user's account */
    deleteAccount: (data: AccountDeletion) => Promise<void>;

    // Session functions
    /** Retrieves all active sessions for the current user */
    getActiveSessions: () => Promise<ActiveSession[]>;
    /** Invalidates a specific session by ID */
    invalidateSession: (sessionId: string) => Promise<void>;

    // Settings functions
    /** The current user's application settings */
    settings: UserSettings | null;
    /** Fetches the current user's application settings */
    getSettings: () => Promise<void>;
    /** Updates the current user's application settings */
    updateSettings: (data: UserSettingsUpdate) => Promise<void>;

    // Ban list functions
    /** The current user's word ban list */
    banList: BanListWithWords | null;
    /** Fetches the current user's word ban list */
    getBanList: () => Promise<void>;
    /** Adds words to the current user's ban list */
    addBanListWords: (words: string[]) => Promise<void>;
    /** Removes words from the current user's ban list */
    removeBanListWords: (words: string[]) => Promise<void>;

    // Search pattern functions
    /** The current user's search patterns */
    searchPatterns: SearchPattern[];
    /** Fetches the current user's search patterns */
    getSearchPatterns: () => Promise<void>;
    /** Creates a new search pattern */
    createSearchPattern: (data: SearchPatternCreate) => Promise<void>;
    /** Updates an existing search pattern */
    updateSearchPattern: (patternId: number, data: SearchPatternUpdate) => Promise<void>;
    /** Deletes a search pattern */
    deleteSearchPattern: (patternId: number) => Promise<void>;

    // Model entity functions
    /** The current user's model entities organized by method ID */
    modelEntities: Record<number, ModelEntity[]>;
    /** Fetches model entities for a specific method */
    getModelEntities: (methodId: number) => Promise<void>;
    /** Adds new model entities */
    addModelEntities: (data: ModelEntityBatch) => Promise<void>;
    /** Deletes a model entity */
    deleteModelEntity: (entityId: number) => Promise<void>;

    // API key functions
    /** The current user's API keys */
    apiKeys: APIKey[];
    /** Fetches the current user's API keys */
    getAPIKeys: () => Promise<void>;
    /** Creates a new API key */
    createAPIKey: (data: APIKeyCreationRequest) => Promise<APIKey>;
    /** Deletes an API key */
    deleteAPIKey: (keyId: string) => Promise<void>;

    // Utility functions
    /** Clears any current error message */
    clearError: () => void;
}

/**
 * Internal hook that implements direct authentication functionality.
 * This hook is used by the main useUser hook and avoids circular dependencies
 * by not relying on the UserContext.
 *
 * It handles:
 * - Verifying existing tokens on mount
 * - Automatic token refresh
 * - Login, register, and logout operations
 * - Authentication state management
 *
 * @returns Authentication state and functions
 */
const useDirectAuth = () => {
    // User and authentication state
    const [user, setUser] = useState<ReturnType<typeof useUserContext>['user']>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    /**
     * Effect to verify token and establish initial authentication state when the component mounts.
     * Checks for an existing token in storage, verifies it with the API,
     * and sets up the user state accordingly.
     */
    useEffect(() => {
        console.log('🔍 [USE_USER] Checking for existing authentication');

        const verifyToken = async () => {
            const startTime = performance.now();
            const token = authService.getToken();

            if (!token) {
                console.log('⚠️ [USE_USER] No token found in storage');
                setIsLoading(false);
                setIsInitialized(true);
                return;
            }

            console.log('🔍 [USE_USER] Token found, verifying validity');
            setIsLoading(true);

            try {
                // Verify token validity with the backend
                const verification = await authService.verifyToken();

                if (verification.authenticated) {
                    console.log('✅ [USE_USER] Token verified as valid', {
                        userId: verification.user_id,
                        username: verification.username
                    });

                    // Get full user profile if token is valid
                    console.log('👤 [USE_USER] Loading full user profile');
                    const userProfile = await userService.getCurrentUser();

                    setUser(userProfile);
                    setIsAuthenticated(true);

                    console.log('✅ [USE_USER] User authenticated from stored token', {
                        userId: userProfile.id,
                        username: userProfile.username
                    });
                } else {
                    console.warn('⚠️ [USE_USER] Token verification failed - not authenticated');
                    // If verification fails, clear token
                    authService.clearToken();
                }
            } catch (err: any) {
                const errorMessage = err.message || 'Unknown error';

                console.error('❌ [USE_USER] Token verification failed with error', {
                    error: errorMessage,
                    status: err.response?.status,
                    data: err.response?.data
                });

                // Clear token if verification fails
                authService.clearToken();
                setError('Your session has expired. Please log in again.');
            } finally {
                const duration = performance.now() - startTime;
                setIsLoading(false);
                setIsInitialized(true);
                console.log(`⏱️ [USE_USER] Authentication verification completed in ${duration.toFixed(2)}ms`);
            }
        };
        verifyToken().then(r => console.log("[USER HOOK] refreshed token!!!"));

    }, []);

    /**
     * Effect to set up automatic token refresh when user is authenticated.
     * Refreshes the token every 14 minutes to prevent expiry (assuming 15 min expiry).
     * Clears refresh interval when component unmounts or user logs out.
     */
    useEffect(() => {
        let refreshInterval: NodeJS.Timeout;

        if (isAuthenticated && user) {
            console.log('🔄 [USE_USER] Setting up automatic token refresh', {
                userId: user.id,
                username: user.username
            });

            // Refresh token every 14 minutes to prevent expiry (assuming 15 min expiry)
            refreshInterval = setInterval(async () => {
                console.log('⏰ [USE_USER] Automatic token refresh triggered');

                try {
                    const startTime = performance.now();
                    const response = await authService.refreshToken();
                    const duration = performance.now() - startTime;

                    // Update user if it's changed
                    if (response.user && response.user.id !== user.id) {
                        setUser(response.user);
                    }

                    console.log('✅ [USE_USER] Automatic token refresh successful', {
                        duration: `${duration.toFixed(2)}ms`
                    });
                } catch (err: any) {
                    console.error('❌ [USE_USER] Automatic token refresh failed', {
                        error: err.message || 'Unknown error',
                        status: err.response?.status,
                        data: err.response?.data
                    });

                    // Handle logout on token refresh failure
                    setUser(null);
                    setIsAuthenticated(false);
                    authService.clearToken();
                }
            }, 14 * 60 * 1000); // 14 minutes

            console.log('⏱️ [USE_USER] Automatic token refresh scheduled', {
                interval: '14 minutes',
                nextRefreshAt: new Date(Date.now() + 14 * 60 * 1000).toISOString()
            });
        }

        // Clean up interval on unmount or auth state change
        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
                console.log('🛑 [USE_USER] Automatic token refresh cleared');
            }
        };
    }, [isAuthenticated, user]);

    /**
     * Logs in a user with their username/email and password.
     *
     * @param usernameOrEmail - Username or email for login
     * @param password - User's password
     */
    const login = useCallback(async (usernameOrEmail: string, password: string): Promise<void> => {
        console.log('🔑 [USE_USER] Login initiated', {
            identifier: usernameOrEmail,
            isEmail: usernameOrEmail.includes('@')
        });

        const startTime = performance.now();
        setIsLoading(true);
        setError(null);

        try {
            // Determine if input is email or username
            const isEmail = usernameOrEmail.includes('@');
            const credentials = isEmail
                ? { email: usernameOrEmail, password }
                : { username: usernameOrEmail, password };

            const response = await authService.login(credentials);
            const duration = performance.now() - startTime;

            setUser(response.user);
            setIsAuthenticated(true);

            console.log('✅ [USE_USER] Login successful', {
                userId: response.user.id,
                username: response.user.username,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';

            console.error('❌ [USE_USER] Login failed', {
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Registers a new user and automatically logs them in upon success.
     *
     * @param username - Desired username for the new account
     * @param email - Email address for the new account
     * @param password - Password for the new account
     * @param confirmPassword - Password confirmation to prevent typos
     */
    const register = useCallback(async (username: string, email: string, password: string, confirmPassword: string): Promise<void> => {
        console.log('📝 [USE_USER] Registration initiated', {
            username,
            email,
            passwordLength: password.length,
            passwordsMatch: password === confirmPassword
        });

        const startTime = performance.now();
        setIsLoading(true);
        setError(null);

        try {
            console.log('🔄 [USE_USER] Submitting registration request');
            await authService.register({ username, email, password, confirm_password: confirmPassword });

            const registerDuration = performance.now() - startTime;
            console.log('✅ [USE_USER] Registration successful, proceeding to auto-login', {
                username,
                duration: `${registerDuration.toFixed(2)}ms`
            });

            // Auto-login after successful registration
            await login(username, password);
        } catch (err: any) {
            const duration = performance.now() - startTime;

            // Extract the most useful error message
            let errorMessage = 'Registration failed. Please try again.';
            if (err.response?.data?.message) {
                // API returned an error message
                errorMessage = err.response.data.message;
            } else if (err.message) {
                // JavaScript Error object
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                // String error
                errorMessage = err;
            }

            console.error('❌ [USE_USER] Registration failed', {
                username,
                email,
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [login]);

    /**
     * Logs out the current user, clearing authentication state and token.
     * Attempts to call the logout API endpoint, but will clear local state
     * even if the API call fails to ensure consistent UI state.
     */
    const logout = useCallback(async (): Promise<void> => {
        console.log('🚪 [USE_USER] Logout initiated', {
            userId: user?.id,
            username: user?.username
        });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            await authService.logout();
            console.log('✅ [USE_USER] Logout API call successful');
        } catch (err: any) {
            console.error('⚠️ [USE_USER] Logout API call failed, but proceeding with local logout', {
                error: err.message || 'Unknown error',
                status: err.response?.status,
                data: err.response?.data
            });
        } finally {
            // Always clear local state even if API call fails
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);

            const duration = performance.now() - startTime;
            console.log(`✅ [USE_USER] User state cleared in ${duration.toFixed(2)}ms`);
        }
    }, [user]);

    /**
     * Clears any current error message in the auth state.
     * Useful for clearing errors before retrying operations.
     */
    const clearError = useCallback((): void => {
        console.log('🧹 [USE_USER] Clearing error state');
        setError(null);
    }, []);

    return {
        user,
        isAuthenticated,
        isLoading,
        isInitialized,
        error,
        login,
        register,
        logout,
        clearError
    };
};

/**
 * Main hook that provides comprehensive user functionality.
 * Combines authentication state with additional user-related features like
 * profile management, settings, sessions, and more.
 *
 * This hook serves as the central hub for all user-related functionality
 * in the application, abstracting away the complexity of API calls, token
 * management, and state persistence.
 *
 * @returns A comprehensive set of user-related state and functions
 */
export const useUser = (): UseUserReturn => {
    console.log('🔧 [USE_USER] Initializing useUser hook');

    // Use the direct auth implementation to avoid circular dependencies
    const {
        user,
        isAuthenticated,
        isLoading: authLoading,
        error: authError,
        login,
        register,
        logout,
        clearError: clearAuthError
    } = useDirectAuth();

    // Local states for hook operations
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [banList, setBanList] = useState<BanListWithWords | null>(null);
    const [searchPatterns, setSearchPatterns] = useState<SearchPattern[]>([]);
    const [modelEntities, setModelEntities] = useState<Record<number, ModelEntity[]>>({});
    const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
    const initialDataLoadedRef = useRef<boolean>(false);

    /**
     * Clears both local and authentication errors.
     * Useful for resetting error state before operations or when switching views.
     */
    const clearError = useCallback(() => {
        console.log('🧹 [USE_USER] Clearing local and auth errors');
        setError(null);
        clearAuthError();
    }, [clearAuthError]);

    /**
     * Fetches the current user's profile information.
     * Updates the user state with the latest data from the server.
     * Only works when the user is authenticated.
     */
    const getUserProfile = useCallback(async () => {
        if (!isAuthenticated) {
            console.warn('⚠️ [USE_USER] getUserProfile called but user is not authenticated');
            return;
        }

        console.log('👤 [USE_USER] Fetching user profile');
        const startTime = performance.now();
        setIsLoading(true);

        try {
            const profile = await userService.getCurrentUser();
            const duration = performance.now() - startTime;

            console.log('✅ [USE_USER] User profile fetched successfully', {
                userId: profile.id,
                username: profile.username,
                email: profile.email,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to fetch user profile';

            console.error('❌ [USE_USER] Failed to fetch user profile', {
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    /**
     * Updates the current user's profile information.
     * Can update username, email, and/or password.
     *
     * @param data - Object containing fields to update
     */
    const updateUserProfile = useCallback(async (data: UserUpdate) => {
        console.log('✏️ [USE_USER] Updating user profile', {
            fieldsToUpdate: Object.keys(data),
            hasUsername: !!data.username,
            hasEmail: !!data.email,
            hasPassword: !!data.password
        });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const updatedUser = await userService.updateUser(data);
            const updateDuration = performance.now() - startTime;

            console.log('✅ [USE_USER] User profile updated successfully', {
                userId: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                duration: `${updateDuration.toFixed(2)}ms`
            });

            // Refresh user data after update
            console.log('🔄 [USE_USER] Refreshing user profile after update');
            await getUserProfile();

            const totalDuration = performance.now() - startTime;
            console.log(`⏱️ [USE_USER] Total profile update operation completed in ${totalDuration.toFixed(2)}ms`);
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to update profile';

            console.error('❌ [USE_USER] Failed to update user profile', {
                fieldsAttempted: Object.keys(data),
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [getUserProfile]);

    /**
     * Changes the current user's password.
     *
     * @param data - Object containing current password, new password, and confirmation
     */
    const changePassword = useCallback(async (data: PasswordChange) => {
        console.log('🔐 [USE_USER] Changing user password');

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const response = await userService.changePassword(data);
            const duration = performance.now() - startTime;

            console.log('✅ [USE_USER] Password changed successfully', {
                message: response.message,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to change password';

            console.error('❌ [USE_USER] Failed to change password', {
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Deletes the current user's account.
     * This is a permanent action that cannot be undone.
     *
     * @param data - Object containing password and confirmation text
     */
    const deleteAccount = useCallback(async (data: AccountDeletion) => {
        console.log('⚠️ [USE_USER] Account deletion initiated');

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const response = await userService.deleteAccount(data);
            const duration = performance.now() - startTime;

            console.log('✅ [USE_USER] Account deleted successfully', {
                message: response.message,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to delete account';

            console.error('❌ [USE_USER] Failed to delete account', {
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Retrieves all active sessions for the current user.
     * Sessions represent active login instances across devices.
     *
     * @returns Array of active sessions
     */
    const getActiveSessions = useCallback(async () => {
        console.log('🔍 [USE_USER] Fetching active sessions');

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const sessions = await userService.getActiveSessions();
            const duration = performance.now() - startTime;

            console.log('✅ [USE_USER] Active sessions fetched successfully', {
                sessionCount: sessions.length,
                duration: `${duration.toFixed(2)}ms`
            });

            return sessions;
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to get active sessions';

            console.error('❌ [USE_USER] Failed to fetch active sessions', {
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Invalidates a specific session by ID.
     * This logs the user out of that specific device/session.
     *
     * @param sessionId - ID of the session to invalidate
     */
    const invalidateSession = useCallback(async (sessionId: string) => {
        console.log('🗑️ [USE_USER] Invalidating session', { sessionId });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const response = await userService.invalidateSession(sessionId);
            const duration = performance.now() - startTime;

            console.log('✅ [USE_USER] Session invalidated successfully', {
                sessionId,
                message: response.message,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to invalidate session';

            console.error('❌ [USE_USER] Failed to invalidate session', {
                sessionId,
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetches the current user's application settings.
     * Settings contain user preferences like theme, auto-detection, etc.
     * Only works when the user is authenticated.
     */
    const getSettings = useCallback(async () => {
        if (!isAuthenticated) {
            console.warn('⚠️ [USE_USER] getSettings called but user is not authenticated');
            return;
        }

        console.log('⚙️ [USE_USER] Fetching user settings');

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const userSettings = await settingsService.getSettings();
            const duration = performance.now() - startTime;

            setSettings(userSettings);

            console.log('✅ [USE_USER] User settings fetched successfully', {
                settingsId: userSettings.id,
                theme: userSettings.theme,
                autoDetect: userSettings.auto_detect,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to fetch settings';

            console.error('❌ [USE_USER] Failed to fetch user settings', {
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    /**
     * Updates the current user's application settings.
     *
     * @param data - Object containing settings to update
     */
    const updateSettings = useCallback(async (data: UserSettingsUpdate) => {
        console.log('⚙️ [USE_USER] Updating user settings', {
            fieldsToUpdate: Object.keys(data)
        });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const updatedSettings = await settingsService.updateSettings(data);
            const duration = performance.now() - startTime;

            setSettings(updatedSettings);

            console.log('✅ [USE_USER] User settings updated successfully', {
                settingsId: updatedSettings.id,
                fieldsUpdated: Object.keys(data),
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to update settings';

            console.error('❌ [USE_USER] Failed to update user settings', {
                fieldsAttempted: Object.keys(data),
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetches the current user's word ban list.
     * The ban list contains words that the user wants to automatically redact.
     * Only works when the user is authenticated.
     */
    const getBanList = useCallback(async () => {
        if (!isAuthenticated) {
            console.warn('⚠️ [USE_USER] getBanList called but user is not authenticated');
            return;
        }

        console.log('📋 [USE_USER] Fetching ban list');

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const list = await settingsService.getBanList();
            const duration = performance.now() - startTime;

            setBanList(list);

            console.log('✅ [USE_USER] Ban list fetched successfully', {
                banListId: list.id,
                wordCount: list.words.length,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to fetch ban list';

            console.error('❌ [USE_USER] Failed to fetch ban list', {
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    /**
     * Adds words to the current user's ban list.
     *
     * @param words - Array of words to add to the ban list
     */
    const addBanListWords = useCallback(async (words: string[]) => {
        console.log('➕ [USE_USER] Adding words to ban list', {
            wordCount: words.length
        });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const updatedList = await settingsService.addBanListWords({ words });
            const duration = performance.now() - startTime;

            setBanList(updatedList);

            console.log('✅ [USE_USER] Words added to ban list successfully', {
                banListId: updatedList.id,
                addedCount: words.length,
                totalWords: updatedList.words.length,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to add words to ban list';

            console.error('❌ [USE_USER] Failed to add words to ban list', {
                wordCount: words.length,
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Removes words from the current user's ban list.
     *
     * @param words - Array of words to remove from the ban list
     */
    const removeBanListWords = useCallback(async (words: string[]) => {
        console.log('➖ [USE_USER] Removing words from ban list', {
            wordCount: words.length
        });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const updatedList = await settingsService.removeBanListWords({ words });
            const duration = performance.now() - startTime;

            setBanList(updatedList);

            console.log('✅ [USE_USER] Words removed from ban list successfully', {
                banListId: updatedList.id,
                removedCount: words.length,
                remainingWords: updatedList.words.length,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to remove words from ban list';

            console.error('❌ [USE_USER] Failed to remove words from ban list', {
                wordCount: words.length,
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetches the current user's search patterns.
     * Search patterns are used for regular expression or text pattern matching.
     * Only works when the user is authenticated.
     */
    const getSearchPatterns = useCallback(async () => {
        if (!isAuthenticated) {
            console.warn('⚠️ [USE_USER] getSearchPatterns called but user is not authenticated');
            return;
        }

        console.log('🔍 [USE_USER] Fetching search patterns');

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const patterns = await settingsService.getSearchPatterns();
            const duration = performance.now() - startTime;

            setSearchPatterns(patterns);

            console.log('✅ [USE_USER] Search patterns fetched successfully', {
                patternCount: patterns.length,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to fetch search patterns';

            console.error('❌ [USE_USER] Failed to fetch search patterns', {
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    /**
     * Creates a new search pattern for the current user.
     *
     * @param data - Search pattern data including type and text
     */
    const createSearchPattern = useCallback(async (data: SearchPatternCreate) => {
        console.log('➕ [USE_USER] Creating search pattern', {
            patternType: data.pattern_type,
            patternTextLength: data.pattern_text.length
        });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const newPattern = await settingsService.createSearchPattern(data);
            const duration = performance.now() - startTime;

            setSearchPatterns(prev => [...prev, newPattern]);

            console.log('✅ [USE_USER] Search pattern created successfully', {
                patternId: newPattern.id,
                patternType: newPattern.pattern_type,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to create search pattern';

            console.error('❌ [USE_USER] Failed to create search pattern', {
                patternType: data.pattern_type,
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Updates an existing search pattern.
     *
     * @param patternId - ID of the pattern to update
     * @param data - Updated pattern data
     */
    const updateSearchPattern = useCallback(async (patternId: number, data: SearchPatternUpdate) => {
        console.log('✏️ [USE_USER] Updating search pattern', {
            patternId,
            fieldsToUpdate: Object.keys(data)
        });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const updatedPattern = await settingsService.updateSearchPattern(patternId, data);
            const duration = performance.now() - startTime;

            setSearchPatterns(prev =>
                prev.map(pattern => pattern.id === patternId ? updatedPattern : pattern)
            );

            console.log('✅ [USE_USER] Search pattern updated successfully', {
                patternId: updatedPattern.id,
                patternType: updatedPattern.pattern_type,
                fieldsUpdated: Object.keys(data),
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to update search pattern';

            console.error('❌ [USE_USER] Failed to update search pattern', {
                patternId,
                fieldsAttempted: Object.keys(data),
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Deletes a search pattern.
     *
     * @param patternId - ID of the pattern to delete
     */
    const deleteSearchPattern = useCallback(async (patternId: number) => {
        console.log('🗑️ [USE_USER] Deleting search pattern', { patternId });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            await settingsService.deleteSearchPattern(patternId);
            const duration = performance.now() - startTime;

            setSearchPatterns(prev => prev.filter(pattern => pattern.id !== patternId));

            console.log('✅ [USE_USER] Search pattern deleted successfully', {
                patternId,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to delete search pattern';

            console.error('❌ [USE_USER] Failed to delete search pattern', {
                patternId,
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetches model entities for a specific detection method.
     * Model entities are predefined patterns for entity detection like "PERSON", "EMAIL", etc.
     *
     * @param methodId - ID of the detection method to fetch entities for
     */
    const getModelEntities = useCallback(async (methodId: number) => {
        if (!isAuthenticated) {
            console.warn('⚠️ [USE_USER] getModelEntities called but user is not authenticated');
            return;
        }

        console.log('🔍 [USE_USER] Fetching model entities', { methodId });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const entities = await settingsService.getModelEntities(methodId);
            const duration = performance.now() - startTime;

            setModelEntities(prev => ({
                ...prev,
                [methodId]: entities
            }));

            console.log('✅ [USE_USER] Model entities fetched successfully', {
                methodId,
                entityCount: entities.length,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to fetch model entities';

            console.error('❌ [USE_USER] Failed to fetch model entities', {
                methodId,
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    /**
     * Adds new model entities for a specific detection method.
     *
     * @param data - Batch of model entities to add, including method ID and entity texts
     */
    const addModelEntities = useCallback(async (data: ModelEntityBatch) => {
        console.log('➕ [USE_USER] Adding model entities', {
            methodId: data.method_id,
            entityCount: data.entity_texts.length
        });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const newEntities = await settingsService.addModelEntities(data);
            const duration = performance.now() - startTime;

            setModelEntities(prev => {
                const currentEntities = prev[data.method_id] || [];
                return {
                    ...prev,
                    [data.method_id]: [...currentEntities, ...newEntities]
                };
            });

            console.log('✅ [USE_USER] Model entities added successfully', {
                methodId: data.method_id,
                addedCount: newEntities.length,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to add model entities';

            console.error('❌ [USE_USER] Failed to add model entities', {
                methodId: data.method_id,
                entityCount: data.entity_texts.length,
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Deletes a model entity.
     *
     * @param entityId - ID of the entity to delete
     */
    const deleteModelEntity = useCallback(async (entityId: number) => {
        console.log('🗑️ [USE_USER] Deleting model entity', { entityId });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            await settingsService.deleteModelEntity(entityId);
            const duration = performance.now() - startTime;

            // Update modelEntities state by removing the deleted entity
            setModelEntities(prev => {
                const newState = { ...prev };

                // Find the method ID containing this entity
                for (const [methodId, entities] of Object.entries(newState)) {
                    const numMethodId = Number(methodId);
                    newState[numMethodId] = entities.filter(entity => entity.id !== entityId);
                }

                return newState;
            });

            console.log('✅ [USE_USER] Model entity deleted successfully', {
                entityId,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to delete model entity';

            console.error('❌ [USE_USER] Failed to delete model entity', {
                entityId,
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetches the current user's API keys.
     * API keys are used for programmatic access to the application.
     * Only works when the user is authenticated.
     */
    const getAPIKeys = useCallback(async () => {
        if (!isAuthenticated) {
            console.warn('⚠️ [USE_USER] getAPIKeys called but user is not authenticated');
            return;
        }

        console.log('🔑 [USE_USER] Fetching API keys');

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const keys = await authService.listAPIKeys();
            const duration = performance.now() - startTime;

            setApiKeys(keys);

            console.log('✅ [USE_USER] API keys fetched successfully', {
                keyCount: keys.length,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to fetch API keys';

            console.error('❌ [USE_USER] Failed to fetch API keys', {
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    /**
     * Creates a new API key for the current user.
     *
     * @param data - API key creation data including name and duration
     * @returns The newly created API key
     */
    const createAPIKey = useCallback(async (data: APIKeyCreationRequest): Promise<APIKey> => {
        console.log('🔑 [USE_USER] Creating API key', {
            name: data.name,
            duration: data.duration
        });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            const newKey = await authService.createAPIKey(data);
            const duration = performance.now() - startTime;

            setApiKeys(prev => [...prev, newKey]);

            console.log('✅ [USE_USER] API key created successfully', {
                keyId: newKey.id,
                name: newKey.name,
                expiresAt: newKey.expiresAt,
                duration: `${duration.toFixed(2)}ms`
            });

            return newKey; // Return the new key
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to create API key';

            console.error('❌ [USE_USER] Failed to create API key', {
                name: data.name,
                duration: data.duration,
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                requestDuration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Deletes an API key.
     *
     * @param keyId - ID of the API key to delete
     */
    const deleteAPIKey = useCallback(async (keyId: string) => {
        console.log('🗑️ [USE_USER] Deleting API key', { keyId });

        const startTime = performance.now();
        setIsLoading(true);

        try {
            await authService.deleteAPIKey(keyId);
            const duration = performance.now() - startTime;

            setApiKeys(prev => prev.filter(key => key.id !== keyId));

            console.log('✅ [USE_USER] API key deleted successfully', {
                keyId,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (err: any) {
            const duration = performance.now() - startTime;
            const errorMessage = err.response?.data?.message || 'Failed to delete API key';

            console.error('❌ [USE_USER] Failed to delete API key', {
                keyId,
                error: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                duration: `${duration.toFixed(2)}ms`
            });

            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Effect to load initial user data when authenticated.
     * Fetches settings, ban list, search patterns, and API keys.
     * Only runs once per session when the user becomes authenticated.
     */
    useEffect(() => {
        if (isAuthenticated && !initialDataLoadedRef.current) {
            console.log('🔄 [USE_USER] Authentication detected, loading initial user data');
            initialDataLoadedRef.current = true;

            const loadInitialData = async () => {
                const startTime = performance.now();

                try {
                    await Promise.all([
                        getSettings(),
                        getBanList(),
                        getSearchPatterns(),
                        getAPIKeys()
                    ]);

                    const duration = performance.now() - startTime;
                    console.log(`✅ [USE_USER] Initial data loaded successfully in ${duration.toFixed(2)}ms`);
                } catch (err) {
                    const duration = performance.now() - startTime;
                    console.error(`❌ [USE_USER] Error loading initial data (${duration.toFixed(2)}ms)`, err);
                }
            };

            // Handle the promise properly
            loadInitialData().catch(err => {
                console.error('❌ [USE_USER] Unhandled error during initial data loading:', err);
                setError('Failed to load user data. Please refresh the page and try again.');
            });
        }
    }, [isAuthenticated, getSettings, getBanList, getSearchPatterns, getAPIKeys]);

    // Construct the return object with all state and functions
    return {
        // Context values
        user,
        isAuthenticated,
        isLoading: isLoading || authLoading,
        error: error ?? authError,

        // Auth functions
        login,
        register,
        logout,

        // User profile functions
        getUserProfile,
        updateUserProfile,
        changePassword,
        deleteAccount,

        // Session functions
        getActiveSessions,
        invalidateSession,

        // Settings functions
        settings,
        getSettings,
        updateSettings,

        // Ban list functions
        banList,
        getBanList,
        addBanListWords,
        removeBanListWords,

        // Search pattern functions
        searchPatterns,
        getSearchPatterns,
        createSearchPattern,
        updateSearchPattern,
        deleteSearchPattern,

        // Model entity functions
        modelEntities,
        getModelEntities,
        addModelEntities,
        deleteModelEntity,

        // API key functions
        apiKeys,
        getAPIKeys,
        createAPIKey,
        deleteAPIKey,

        // Utility functions
        clearError
    };
};

export default useUser;
