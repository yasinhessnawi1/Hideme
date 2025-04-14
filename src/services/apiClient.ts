/**
 * @fileoverview Axios client configuration for API requests
 *
 * This module configures an Axios instance with base URL, default headers,
 * and interceptors for authentication. It handles:
 * - Adding authentication tokens to requests
 * - Automatic token refresh on 401 responses
 * - Redirect to log in on authentication failures
 * - Transforming technical errors into user-friendly messages
 */
import axios from 'axios';
import authService from './authService';
export const API_URL = 'https://goapi.hidemeai.com/api';
//export const API_URL = 'http://localhost:8080/api';
/**
 * Transforms technical API errors into user-friendly messages
 *
 * @param {any} error - The error object from axios
 * @returns {string} User-friendly error message
 */
const getUserFriendlyErrorMessage = (error: any): string => {
    // Extract response data if available
    const responseData = error.response?.data;
    const statusCode = error.response?.status;

    // If the API returned a specific error message, use it
    if (responseData?.message) {
        return responseData.message;
    }

    // Handle common status codes with friendly messages
    switch (statusCode) {
        case 400:
            return "The information you provided was invalid. Please check your entries and try again.";
        case 401:
            return "Your session has expired or you're not authorized. Please log in again.";
        case 403:
            return "You don't have permission to access this resource.";
        case 404:
            return "The requested information couldn't be found. Please try again later.";
        case 422:
            return "The provided information couldn't be processed. Please check your entries.";
        case 429:
            return "You've made too many requests. Please wait a moment and try again.";
        case 500:
        case 502:
        case 503:
        case 504:
            return "We're experiencing technical difficulties. Please try again later.";
        default:
            // If API is completely unreachable
            if (!error.response) {
                return "Unable to connect to the server. Please check your internet connection and try again.";
            }
            return "Something went wrong. Please try again later.";
    }
};

/**
 * Axios instance configured with base URL and default headers
 *
 * Uses interceptors to:
 * 1. Add authentication token to request headers when available
 * 2. Handle 401 errors by attempting token refresh
 * 3. Redirect to login page if token refresh fails
 * 4. Transform technical errors into user-friendly messages
 */
const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',

    }
});

/**
 * Request interceptor to add authentication token to all requests
 *
 * Retrieves the token from authService and adds it to the Authorization header
 * if a token exists
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = authService.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        // Transform request errors into user-friendly messages
        error.userMessage = getUserFriendlyErrorMessage(error);
        return Promise.reject(error);
    }
);

/**
 * Response interceptor to handle token expiration and refresh
 *
 * When receiving a 401 Unauthorized response, attempts to refresh the token
 * and retry the original request. If refresh fails, redirects to login page.
 * Also transforms technical errors into user-friendly messages.
 */
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Add user-friendly error message to the error object
        error.userMessage = getUserFriendlyErrorMessage(error);

        // If error is 401 Unauthorized we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Try to refresh the token
                await authService.refreshToken();

                // Set the new token in the header
                const token = authService.getToken();
                originalRequest.headers.Authorization = `Bearer ${token}`;

                // Retry the original request with the new token
                return axios(originalRequest);
            } catch (refreshError) {
                // If refresh fails, redirect to log in page with expired flag
                authService.clearToken();
                window.location.href = '/login?expired=true';
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
