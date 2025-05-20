/**
 * Auth Service Adapter
 *
 * This is a compatibility adapter that uses the new API client
 * but maintains the original authService interface.
 *
 * For new code, use the specialized hooks directly.
 */

import apiClient from '../api-services/apiClient';
import {
    User,
    LoginCredentials,
    LoginResponse,
    RegistrationData,
    TokenVerification,
    RefreshResponse,
    APIKey,
    APIKeyCreationRequest
} from '../../types';
import {ApiKey} from "../api-services/batchEncryptionService";
import { mapBackendErrorToMessage } from '../../utils/errorUtils';

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
            throw new Error(mapBackendErrorToMessage('Login failed: No token received'));
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
            throw new Error(mapBackendErrorToMessage('No token to refresh'));
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
            throw new Error(mapBackendErrorToMessage('No token available'));
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

    // Add this function to the userService object
    /**
     * Creates a new API key for encryption
     *
     * @returns {Promise<ApiKey>} Promise resolving to API key data
     * @throws {Error} If creation fails
     */
    async createApiKey(): Promise<ApiKey> {
        console.log('🔑 [USER] Creating new API key');
        const startTime = performance.now();

        try {
            const payload = {
                name: 'Temporary Key',
                duration: "15m" // 15 minutes in seconds
            };
            const response = await apiClient.post('/keys', payload);
            const duration = performance.now() - startTime;

            console.log(`✅ [USER] API key created successfully`, {
                keyId: response.data.data.id,
                expiresAt: response.data.data.expires_at,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [USER] Failed to create API key`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw new Error(mapBackendErrorToMessage(error));
        }
    },

    /**
     * Deletes an API key 
     * 
     * @param {string} keyId The ID of the API key to delete
     * @returns {Promise<void>}
     * @throws {Error} If deletion fails
     */
    async deleteApiKey(keyId: string): Promise<void> {
        if (!keyId) {
            console.warn('⚠️ [USER] Cannot delete API key: No key ID provided');
            return;
        }
        
        console.log(`🔑 [USER] Deleting API key: ${keyId}`);
        const startTime = performance.now();
        
        try {
            await apiClient.delete(`/keys/${keyId}`);
            const duration = performance.now() - startTime;
            
            console.log(`✅ [USER] API key deleted successfully`, {
                keyId,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (error: any) {
            const duration = performance.now() - startTime;
            
            console.error(`❌ [USER] Failed to delete API key`, {
                keyId,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });
            
            // Don't throw the error to prevent cascading failures
            // Just log it since key deletion is a cleanup operation
        }
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
