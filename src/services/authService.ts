/**
 * Auth Service Adapter
 *
 * This is a compatibility adapter that uses the new API client
 * but maintains the original authService interface.
 *
 * For new code, use the specialized hooks directly.
 */

import apiClient from './apiClient';
import {
    User,
    LoginCredentials,
    LoginResponse,
    RegistrationData,
    TokenVerification,
    RefreshResponse,
    APIKey,
    APIKeyCreationRequest
} from '../types';

// Export all types for backward compatibility
export type {
    User,
    LoginCredentials,
    LoginResponse,
    RegistrationData,
    TokenVerification,
    RefreshResponse,
    APIKey,
    APIKeyCreationRequest
};

// Local storage keys
const TOKEN_KEY = 'auth_token';

const authService = {
    /**
     * Get the current authentication token from storage
     */
    getToken: (): string | null => {
        return localStorage.getItem(TOKEN_KEY);
    },

    /**
     * Save the token to storage
     */
    setToken: (token: string): void => {
        if (!token) {
            console.warn('[authService] Attempted to set empty token');
            return;
        }
        localStorage.setItem(TOKEN_KEY, token);
        console.log('[authService] Token saved to localStorage');
    },

    /**
     * Clear the token from storage
     */
    clearToken: (): void => {
        localStorage.removeItem(TOKEN_KEY);
        console.log('[authService] Token cleared from localStorage');
    },

    /**
     * Login with credentials
     */
    login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
        console.log('[authService] Login response:', response.data);
        // Validate token exists before saving
        if (!response.data.data.access_token) {
            console.error('[authService] Login successful but no token returned from server');
            throw new Error('Login failed: No token received');
        }

        // Save token to localStorage
        authService.setToken(response.data.data.access_token);
        console.log('[authService] Login successful, token saved');

        return response.data;
    },

    /**
     * Register a new user
     */
    register: async (data: RegistrationData): Promise<void> => {
        await apiClient.post('/auth/signup', data);
    },

    /**
     * Logout the current user
     */
    logout: async (): Promise<void> => {
        try {
            // Get the token before clearing it
            const token = authService.getToken();

            // Only call logout endpoint if we have a token
            if (token) {
                await apiClient.post('/auth/logout');
            }
            authService.clearToken();
        } catch (error) {
            console.error('[authService] Error during logout:', error);
        } finally {
            authService.clearToken();
        }
    },

    /**
     * Refresh the authentication token
     */
    refreshToken: async (): Promise<RefreshResponse> => {
        // Check if we have a token before attempting refresh
        const currentToken = authService.getToken();
        if (!currentToken) {
            console.warn('[authService] refreshToken called with no token');
            throw new Error('No token to refresh');
        }

        const response = await apiClient.post<RefreshResponse>('/auth/refresh');

        // Validate new token exists before saving
        if (response.data.data.access_token) {
            authService.setToken(response.data.data.access_token);
            console.log('[authService] Token refreshed and saved');
        } else {
            console.warn('[authService] Refresh response contained no token');
        }

        return response.data;
    },

    /**
     * Get the current user's profile
     */
    getCurrentUser: async (): Promise<User> => {
        // Get current token
        const token = authService.getToken();
        if (!token) {
            console.warn('[authService] getCurrentUser called with no token');
            throw new Error('No token available');
        }

        const response = await apiClient.get<TokenVerification>('/users/me');
        return response.data.data;
    },

    /**
     * Create a new API key
     */
    createAPIKey: async (data: APIKeyCreationRequest): Promise<APIKey> => {
        const response = await apiClient.post<APIKey>('/auth/api-keys', data);
        return response.data;
    },

    /**
     * Delete an API key
     */
    deleteAPIKey: async (keyId: string): Promise<void> => {
        await apiClient.delete(`/auth/api-keys/${keyId}`);
    },
    
    /**
     * Request a password reset link
     * @param email The user's email address
     */
    forgotPassword: async (email: string): Promise<void> => {
        await apiClient.post('/auth/forgot-password', { email });
        console.log('[authService] Password reset request sent for email:', email);
    },

    /**
     * Reset password using token received via email
     * @param token The password reset token
     * @param newPassword The new password
     * @param confirmPassword Password confirmation (must match newPassword)
     */
    resetPassword: async (token: string, newPassword: string): Promise<void> => {
        await apiClient.post('/auth/reset-password', {
            token,
            new_password: newPassword,
        });
        console.log('[authService] Password successfully reset');
    }
};

export default authService;
