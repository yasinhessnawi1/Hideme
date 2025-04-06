/**
 * @fileoverview Authentication service handling user authentication operations
 *
 * This service provides methods for user authentication, token management,
 * and API key operations including:
 * - Login/logout functionality
 * - Token and cookie storage, retrieval, and verification
 * - User registration
 * - API key management
 */
import axios from 'axios';
import apiClient from './apiClient';

const API_URL = 'https://goapi.hidemeai.com/api';
const AUTH_URL = `${API_URL}/auth`;

/**
 * User credentials for login requests
 *
 * @interface
 * @property {string} [username] - Optional username for login
 * @property {string} [email] - Optional email for login
 * @property {string} password - User password
 */
export interface UserCredentials {
    username?: string;
    email?: string;
    password: string;
}

/**
 * User registration data
 *
 * @interface
 * @property {string} username - Username for new account
 * @property {string} email - Email address for new account
 * @property {string} password - Password for new account
 * @property {string} confirm_password - Password confirmation
 */
export interface RegisterData {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
}

/**
 * Server response after successful authentication
 *
 * @interface
 * @property {User} user - User information
 * @property {string} access_token - JWT access token
 * @property {string} token_type - Token type (usually "Bearer")
 * @property {number} expires_in - Token expiration time in seconds
 */
export interface AuthResponse {
    user: User;
    access_token: string;
    token_type: string;
    expires_in: number;
}

/**
 * Server response after successful registration
 *
 * @interface
 * @property {boolean} success - Whether registration was successful
 * @property {Object} data - Registration result data
 * @property {number} [data.id] - User ID if registration successful
 * @property {string} [data.username] - Username if registration successful
 * @property {string} [data.email] - Email if registration successful
 * @property {string} [data.created_at] - Creation timestamp if registration successful
 * @property {string} [data.updated_at] - Update timestamp if registration successful
 * @property {string} [data.message] - Success or error message
 */
export interface RegistrationResponse {
    success: boolean;
    data: {
        id?: number;
        username?: string;
        email?: string;
        created_at?: string;
        updated_at?: string;
        message?: string;
    };
}

/**
 * User information
 *
 * @interface
 * @property {number} id - User's unique identifier
 * @property {string} username - User's username
 * @property {string} email - User's email address
 * @property {string} created_at - Account creation timestamp
 * @property {string} updated_at - Account last update timestamp
 */
export interface User {
    id: number;
    username: string;
    email: string;
    created_at: string;
    updated_at: string;
}

/**
 * API key information
 *
 * @interface
 * @property {string} id - API key unique identifier
 * @property {string} name - Human-readable name for the key
 * @property {string} [key] - The actual API key value (only returned on creation)
 * @property {string} expiresAt - Expiration timestamp
 * @property {string} createdAt - Creation timestamp
 */
export interface APIKey {
    id: string;
    name: string;
    key?: string;
    expiresAt: string;
    createdAt: string;
}

/**
 * Request data for creating a new API key
 *
 * @interface
 * @property {string} name - Human-readable name for the key
 * @property {string} duration - Duration string (e.g., "1h", "30d", "90d")
 */
export interface APIKeyCreationRequest {
    name: string;
    duration: string; // "1h", "30d", "90d", etc.
}

/**
 * Authentication service implementation
 * Provides methods for authentication, token management, and API key operations
 */
const authService = {
    API_URL: API_URL,

    /**
     * Stores authentication token in localStorage
     *
     * @param {string} token - JWT access token to store
     */
    setToken(token: string) {
        console.log(`🔐 [AUTH] Storing authentication token`, {
            tokenLength: token.length,
            preview: `${token.substring(0, 5)}...${token.substring(token.length - 5)}`
        });
        localStorage.setItem('access_token', token);
        console.log(`✅ [AUTH] Token successfully stored in localStorage`);
    },

    /**
     * Retrieves authentication token from localStorage
     *
     * @returns {string|null} The stored token or null if not found
     */
    getToken(): string | null {
        const token = localStorage.getItem('access_token');
        if (token) {
            console.log(`🔑 [AUTH] Retrieved token from localStorage`, {
                tokenLength: token.length,
                preview: `${token.substring(0, 5)}...${token.substring(token.length - 5)}`
            });
        } else {
            console.log(`⚠️ [AUTH] No token found in localStorage`);
        }
        return token;
    },

    /**
     * Removes authentication token from localStorage
     */
    clearToken() {
        console.log(`🧹 [AUTH] Clearing authentication token from localStorage`);
        localStorage.removeItem('access_token');
        console.log(`✅ [AUTH] Token removed from localStorage`);
    },

    /**
     * Gets current user profile information
     *
     * @returns {Promise<User>} Promise resolving to user profile data
     * @throws {Error} If the request fails
     */
    async getCurrentUser(): Promise<User> {
        console.log(`👤 [AUTH] Getting current user profile`);

        const startTime = performance.now();

        try {
            // Use apiClient for authenticated requests
            const response = await apiClient.get(`/users/me`);
            const duration = performance.now() - startTime;

            console.log(`✅ [AUTH] User profile fetched successfully`, {
                userId: response.data.id,
                username: response.data.username,
                email: response.data.email,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [AUTH] Failed to fetch user profile`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Registers a new user account
     *
     * @param {RegisterData} data - Registration information
     * @returns {Promise<RegistrationResponse>} Promise resolving to registration response
     * @throws {Error} If registration fails
     */
    async register(data: RegisterData): Promise<RegistrationResponse> {
        console.log(`📝 [AUTH] Registration attempt`, {
            username: data.username,
            email: data.email,
            passwordLength: data.password.length
        });

        const startTime = performance.now();

        try {
            // Use direct axios call to avoid circular dependency with apiClient
            const response = await axios.post(`${AUTH_URL}/signup`, data);
            const duration = performance.now() - startTime;

            // Log success based on the response structure
            console.log(`✅ [AUTH] Registration successful`, {
                username: data.username,
                email: data.email,
                response: response.data,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [AUTH] Registration failed`, {
                username: data.username,
                email: data.email,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Authenticates a user with username/email and password
     *
     * @param {UserCredentials} credentials - User login credentials
     * @returns {Promise<AuthResponse>} Promise resolving to authentication data
     * @throws {Error} If authentication fails
     */
    async login(credentials: UserCredentials): Promise<AuthResponse> {
        const loginIdentifier = credentials.email ?? credentials.username;
        const loginMethod = credentials.email ? 'email' : 'username';

        console.log(`🔑 [AUTH] Login attempt`, {
            method: loginMethod,
            identifier: loginIdentifier,
            passwordProvided: !!credentials.password
        });

        const startTime = performance.now();

        try {
            // Use direct axios call to avoid circular dependency with apiClient
            // Set withCredentials to true to ensure cookies are saved
            const response = await axios.post(`${AUTH_URL}/login`, credentials, {
                withCredentials: true // Enable cookie handling
            });
            const duration = performance.now() - startTime;

            // Extract data from the response
            const responseData = response.data.data;

            console.log(`✅ [AUTH] Login successful`, {
                method: loginMethod,
                userId: responseData.user.id,
                username: responseData.user.username,
                email: responseData.user.email,
                tokenExpiry: `${responseData.expires_in}s`,
                cookiesReceived: !!document.cookie.length,
                duration: `${duration.toFixed(2)}ms`
            });

            this.setToken(responseData.access_token);

            return responseData;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [AUTH] Login failed`, {
                method: loginMethod,
                identifier: loginIdentifier,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Logs out the current user
     *
     * @returns {Promise<void>} Promise that resolves when logout is complete
     * @throws {Error} If the logout request fails (but still clears local token)
     */
    async logout(): Promise<void> {
        console.log(`🚪 [AUTH] Logout initiated`);

        const startTime = performance.now();

        try {
            // Use apiClient for authenticated requests with cookie support
            await apiClient.post(`/auth/logout`, {}, {
                withCredentials: true // Include cookies in the request
            });
            const duration = performance.now() - startTime;

            console.log(`✅ [AUTH] Logout API call successful`, {
                duration: `${duration.toFixed(2)}ms`
            });

            this.clearToken();

            // Clear any authentication cookies by setting them to expire
            // This is a fallback in case the server doesn't properly clear cookies
            document.cookie.split(";").forEach(cookie => {
                const cookieName = cookie.split("=")[0].trim();
                // Set each cookie to expire in the past
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            });

            console.log(`🍪 [AUTH] Authentication cookies cleared`);
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`⚠️ [AUTH] Logout API call failed`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            // Still clear token and cookies on error
            console.log(`🧹 [AUTH] Clearing token and cookies despite API error`);
            this.clearToken();

            // Clear auth cookies by expiring them
            document.cookie.split(";").forEach(cookie => {
                const cookieName = cookie.split("=")[0].trim();
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            });

            throw error;
        }
    },

    /**
     * Refreshes the authentication token
     *
     * @returns {Promise<AuthResponse>} Promise resolving to new authentication data
     * @throws {Error} If token refresh fails
     */
    async refreshToken(): Promise<AuthResponse> {
        console.log(`🔄 [AUTH] Token refresh initiated`);

        const startTime = performance.now();

        try {
            // Use direct axios call with cookie support
            const response = await axios.post(`${AUTH_URL}/refresh`, {}, {
                withCredentials: true // Include cookies in the request
            });
            const duration = performance.now() - startTime;

            // Extract data from the response
            const responseData = response.data.data;

            console.log(`✅ [AUTH] Token refresh successful`, {
                newExpiresIn: `${responseData.expires_in}s`,
                duration: `${duration.toFixed(2)}ms`
            });

            this.setToken(responseData.access_token);

            return responseData;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [AUTH] Token refresh failed`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Verifies the current authentication token
     *
     * @returns {Promise<{ authenticated: boolean; user_id: number; username: string; email: string }>}
     *          Promise resolving to token verification data
     * @throws {Error} If verification request fails
     */
    async verifyToken(): Promise<{ authenticated: boolean; user_id: number; username: string; email: string }> {
        console.log(`🔍 [AUTH] Token verification initiated`);

        const startTime = performance.now();

        try {
            // Use apiClient for authenticated requests with cookie support
            const response = await apiClient.get(`/auth/verify`, {
                withCredentials: true // Include cookies in the request
            });
            const duration = performance.now() - startTime;

            // Extract data from the response
            const responseData = response.data.data;

            console.log(`✅ [AUTH] Token verification successful`, {
                authenticated: responseData.authenticated,
                userId: responseData.user_id,
                username: responseData.username,
                duration: `${duration.toFixed(2)}ms`
            });

            return responseData;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [AUTH] Token verification failed`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Creates a new API key
     *
     * @param {APIKeyCreationRequest} data - API key creation data
     * @returns {Promise<APIKey>} Promise resolving to created API key
     * @throws {Error} If key creation fails
     */
    async createAPIKey(data: APIKeyCreationRequest): Promise<APIKey> {
        console.log(`🔑 [API KEY] Creating new API key`, {
            name: data.name,
            duration: data.duration
        });

        const startTime = performance.now();

        try {
            const response = await apiClient.post(`/keys`, data, {
                withCredentials: true // Include cookies in the request
            });
            const duration = performance.now() - startTime;

            console.log(`✅ [API KEY] API key created successfully`, {
                keyId: response.data.id,
                name: response.data.name,
                expiresAt: response.data.expiresAt,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [API KEY] API key creation failed`, {
                name: data.name,
                duration: data.duration,
                requestDuration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Lists all API keys for the current user
     *
     * @returns {Promise<APIKey[]>} Promise resolving to array of API keys
     * @throws {Error} If request fails
     */
    async listAPIKeys(): Promise<APIKey[]> {
        console.log(`📋 [API KEY] Fetching API keys list`);

        const startTime = performance.now();

        try {
            const response = await apiClient.get(`/keys`, {
                withCredentials: true // Include cookies in the request
            });
            const duration = performance.now() - startTime;

            console.log(`✅ [API KEY] API keys fetched successfully`, {
                count: response.data.length,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [API KEY] Failed to fetch API keys`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Deletes an API key by ID
     *
     * @param {string} keyId - ID of the API key to delete
     * @returns {Promise<void>} Promise that resolves when deletion is complete
     * @throws {Error} If deletion fails
     */
    async deleteAPIKey(keyId: string): Promise<void> {
        console.log(`🗑️ [API KEY] Deleting API key`, { keyId });

        const startTime = performance.now();

        try {
            await apiClient.delete(`/keys/${keyId}`, {
                withCredentials: true // Include cookies in the request
            });
            const duration = performance.now() - startTime;

            console.log(`✅ [API KEY] API key deleted successfully`, {
                keyId,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [API KEY] Failed to delete API key`, {
                keyId,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.status,
                error: error.response?.data || error.message
            });

            throw error;
        }
    },
};


export default authService;
