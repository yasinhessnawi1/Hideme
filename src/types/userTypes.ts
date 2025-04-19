/**
 * User and Authentication Type Definitions
 *
 * This file contains types related to user profiles, authentication,
 * and account management. It consolidates types previously defined
 * in authService.ts and userService.ts.
 */

/**
 * User profile information
 */
export interface User {
        id: number;
        username: string;
        email: string;
        created_at: string;
        updated_at: string;
}

/**
 * Login credentials - email or username with password
 */
export interface LoginCredentials {
    username?: string;
    email?: string;
    password: string;
}

/**
 * Login response from the API
 */
export interface LoginResponse {
    success: boolean;
    data: {
        user: User;
        expires_in: number; // Token expiration time in seconds
        access_token: string; // Optional access token for OAuth
    }
}

/**
 * Registration data for new account
 */
export interface RegistrationData {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
}

/**
 * Token verification response
 */
export interface TokenVerification {
    success: boolean;
    data: User;
}

/**
 * Token refresh response
 */
export interface RefreshResponse {
    success: boolean;
    data: {
    access_token: string;
    user: User;
    expires_in: number; // Token expiration time in seconds
    };
}

/**
 * API key information
 */
export interface APIKey {
    id: string;
    name: string;
    prefix: string;
    key?: string;  // Only included when creating a new key
    createdAt: string;
    expiresAt?: string;
}

/**
 * API key creation request
 */
export interface APIKeyCreationRequest {
    name: string;
    duration?: number;  // Duration in days
}

/**
 * User profile update data
 */
export interface UserUpdate {
    username?: string;
    email?: string;
    password?: string;
}

/**
 * Password change request data
 */
export interface PasswordChange {
    current_password: string;
    new_password: string;
    confirm_password: string;
}

/**
 * Account deletion request data
 */
export interface AccountDeletion {
    password: string;
    confirm: string; // Must be "DELETE"
}

/**
 * Active user session information
 */
export interface ActiveSession {
    id: string;
    createdAt: string;
    expiresAt: string;
}
