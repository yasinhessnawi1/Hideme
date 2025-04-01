/**
 * @fileoverview User service for managing user profiles and accounts
 *
 * This service provides methods for managing user accounts and profiles, including:
 * - Retrieving and updating user information
 * - Password management
 * - Account deletion
 * - Session management
 */
import apiClient from './apiClient';
import authService from './authService';
import { User } from './authService';

/**
 * User profile update data
 *
 * @interface
 * @property {string} [username] - Optional new username
 * @property {string} [email] - Optional new email
 * @property {string} [password] - Optional new password
 */
export interface UserUpdate {
    username?: string;
    email?: string;
    password?: string;
}

/**
 * Password change request data
 *
 * @interface
 * @property {string} currentPassword - Current user password
 * @property {string} newPassword - New password to set
 * @property {string} confirmPassword - Confirmation of new password
 */
export interface PasswordChange {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

/**
 * Account deletion request data
 *
 * @interface
 * @property {string} password - User password for verification
 * @property {string} confirm - Confirmation text (must be "DELETE")
 */
export interface AccountDeletion {
    password: string;
    confirm: string; // Must be "DELETE"
}

/**
 * Active user session information
 *
 * @interface
 * @property {string} id - Session unique identifier
 * @property {string} createdAt - Session creation timestamp
 * @property {string} expiresAt - Session expiration timestamp
 */
export interface ActiveSession {
    id: string;
    createdAt: string;
    expiresAt: string;
}

/**
 * User service for profile and account management
 */
const userService = {
    /**
     * Gets the current user's profile information
     *
     * @returns {Promise<User>} Promise resolving to user profile data
     * @throws {Error} If the request fails
     */
    async getCurrentUser(): Promise<User> {
        console.log('👤 [USER] Fetching current user profile');
        const startTime = performance.now();

        try {
            const response = await apiClient.get('/users/me');
            const duration = performance.now() - startTime;

            console.log(`✅ [USER] User profile fetched successfully`, {
                userId: response.data.id,
                username: response.data.username,
                email: response.data.email,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [USER] Failed to fetch user profile`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Updates the current user's profile information
     *
     * @param {UserUpdate} data - Profile fields to update
     * @returns {Promise<User>} Promise resolving to updated user profile
     * @throws {Error} If update fails
     */
    async updateUser(data: UserUpdate): Promise<User> {
        console.log('✏️ [USER] Updating user profile', {
            fieldsToUpdate: Object.keys(data),
            hasUsername: !!data.username,
            hasEmail: !!data.email,
            hasPassword: !!data.password
        });

        const startTime = performance.now();

        try {
            const response = await apiClient.put('/users/me', data);
            const duration = performance.now() - startTime;

            console.log(`✅ [USER] User profile updated successfully`, {
                userId: response.data.id,
                username: response.data.username,
                email: response.data.email,
                fieldsUpdated: Object.keys(data),
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [USER] Failed to update user profile`, {
                fieldsAttempted: Object.keys(data),
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Changes the current user's password
     *
     * @param {PasswordChange} data - Password change data
     * @returns {Promise<{ message: string }>} Promise resolving to success message
     * @throws {Error} If password change fails
     */
    async changePassword(data: PasswordChange): Promise<{ message: string }> {
        console.log('🔐 [USER] Changing user password');
        const startTime = performance.now();

        try {
            const response = await apiClient.post('/users/me/change-password', data);
            const duration = performance.now() - startTime;

            console.log(`✅ [USER] Password changed successfully`, {
                message: response.data.message,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [USER] Failed to change password`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Deletes the current user's account
     *
     * @param {AccountDeletion} data - Account deletion verification data
     * @returns {Promise<{ message: string }>} Promise resolving to success message
     * @throws {Error} If deletion fails
     */
    async deleteAccount(data: AccountDeletion): Promise<{ message: string }> {
        console.log('⚠️ [USER] Account deletion initiated');
        const startTime = performance.now();

        try {
            const response = await apiClient.delete('/users/me', { data });
            const duration = performance.now() - startTime;

            console.log(`✅ [USER] Account deleted successfully`, {
                message: response.data.message,
                duration: `${duration.toFixed(2)}ms`
            });

            // Clear token after successful deletion
            authService.clearToken();

            return response.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [USER] Failed to delete account`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Checks if a username is available for registration
     *
     * @param {string} username - The username to check
     * @returns {Promise<{ username: string; available: boolean }>} Promise with availability status
     * @throws {Error} If check fails
     * @deprecated This function is currently unused but maintained for API completeness
     */
    async checkUsername(username: string): Promise<{ username: string; available: boolean }> {
        console.log('🔍 [USER] Checking username availability', { username });
        const startTime = performance.now();

        try {
            const response = await apiClient.get(`/users/check/username?username=${encodeURIComponent(username)}`);
            const duration = performance.now() - startTime;

            console.log(`✅ [USER] Username availability check completed`, {
                username,
                available: response.data.available,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [USER] Failed to check username availability`, {
                username,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Checks if an email is available for registration
     *
     * @param {string} email - The email to check
     * @returns {Promise<{ email: string; available: boolean }>} Promise with availability status
     * @throws {Error} If check fails
     * @deprecated This function is currently unused but maintained for API completeness
     */
    async checkEmail(email: string): Promise<{ email: string; available: boolean }> {
        console.log('🔍 [USER] Checking email availability', { email });
        const startTime = performance.now();

        try {
            const response = await apiClient.get(`/users/check/email?email=${encodeURIComponent(email)}`);
            const duration = performance.now() - startTime;

            console.log(`✅ [USER] Email availability check completed`, {
                email,
                available: response.data.available,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [USER] Failed to check email availability`, {
                email,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Gets active sessions for the current user
     *
     * @returns {Promise<ActiveSession[]>} Promise resolving to array of active sessions
     * @throws {Error} If request fails
     */
    async getActiveSessions(): Promise<ActiveSession[]> {
        console.log('🔍 [USER] Fetching active sessions');
        const startTime = performance.now();

        try {
            const response = await apiClient.get('/users/me/sessions');
            const duration = performance.now() - startTime;

            console.log(`✅ [USER] Active sessions fetched successfully`, {
                sessionCount: response.data.length,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [USER] Failed to fetch active sessions`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Invalidates (logs out) a specific session
     *
     * @param {string} sessionId - ID of the session to invalidate
     * @returns {Promise<{ message: string }>} Promise resolving to success message
     * @throws {Error} If invalidation fails
     */
    async invalidateSession(sessionId: string): Promise<{ message: string }> {
        console.log('🗑️ [USER] Invalidating session', { sessionId });
        const startTime = performance.now();

        try {
            const response = await apiClient.delete('/users/me/sessions', {
                data: { session_id: sessionId }
            });
            const duration = performance.now() - startTime;

            console.log(`✅ [USER] Session invalidated successfully`, {
                sessionId,
                message: response.data.message,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [USER] Failed to invalidate session`, {
                sessionId,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    }
};

// Log service initialization
console.log('🚀 [USER] User Service initialized');

export default userService;