import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import authService from '../services/database-backend-services/authService';
import authStateManager from '../managers/authStateManager';

interface AutoLogoutOptions {
    onLogout?: () => void;
}

/**
 * Hook to handle automatic logout on authentication failures
 * This ensures immediate logout on 401 (Unauthorized) and 429 (Too Many Requests) errors
 */
export const useAutoLogout = (options?: AutoLogoutOptions) => {
    const navigate = useNavigate();
    const { notify } = useNotification();
    const { t } = useLanguage();

    const performLogout = useCallback(async (reason: string, statusCode?: number) => {
        console.log(`[useAutoLogout] Performing logout due to ${reason} (${statusCode || 'N/A'})`);
        
        try {
            // Clear authentication token
            authService.clearToken();
            
            // Clear auth state
            authStateManager.clearState();
            
            // Clear user data from localStorage
            localStorage.removeItem('user_data');
            localStorage.removeItem('access_token');
            
            // Show appropriate notification based on the reason
            let message: string;
            let targetPath: string;
            
            if (statusCode === 429) {
                message = 'Too many requests. Please log in again.';
                targetPath = '/login?ratelimited=true';
            } else if (reason.includes('cors') || reason.includes('CORS')) {
                message = 'Connection issue detected. Please log in again.';
                targetPath = '/login?cors=true';
            } else {
                message = t('auth', 'sessionExpired') || 'Your session has expired. Please log in again.';
                targetPath = '/login?expired=true';
            }
                
            notify({
                message,
                type: 'error',
                duration: 5000
            });

            // Call optional callback
            if (options?.onLogout) {
                options.onLogout();
            }

            // Navigate to login page
            if (window.location.pathname !== '/login' && !window.location.pathname.includes('/auth')) {
                navigate(targetPath);
            }
            
        } catch (error) {
            console.error('[useAutoLogout] Error during logout:', error);
        }
    }, [navigate, notify, t, options]);

    useEffect(() => {
        const handleSessionExpired = (event: CustomEvent) => {
            const { status, message } = event.detail;
            console.log('[useAutoLogout] Handling session expired event:', event.detail);
            performLogout('session expired', status || 401);
        };

        const handleTooManyRequests = (event: CustomEvent) => {
            const { status, message } = event.detail;
            console.log('[useAutoLogout] Handling too many requests event:', event.detail);
            performLogout('too many requests', status || 429);
        };

        const handleAxiosError = (event: CustomEvent) => {
            const { status, config, error } = event.detail;
            
            // Handle auth-related errors and CORS errors
            if (status === 401 || status === 429) {
                console.log('[useAutoLogout] Handling axios error event:', event.detail);
                const reason = status === 429 ? 'too many requests' : 'unauthorized';
                performLogout(reason, status);
            }
        };

        const handleCorsError = (event: CustomEvent) => {
            console.log('[useAutoLogout] Handling CORS error event:', event.detail);
            performLogout('CORS error detected');
        };

        const handleNetworkError = (event: CustomEvent) => {
            const { error, message } = event.detail;
            
            // Check if this is a CORS-related network error
            if (message && (message.includes('CORS') || message.includes('cors') || 
                           message.includes('Cross-Origin') || message.includes('cross-origin'))) {
                console.log('[useAutoLogout] Handling network error with CORS indicators:', event.detail);
                performLogout('Network error (CORS related)');
            }
        };

        // Listen for custom auth events
        window.addEventListener('auth:session-expired', handleSessionExpired as EventListener);
        window.addEventListener('auth:too-many-requests', handleTooManyRequests as EventListener);
        window.addEventListener('auth:axios-error', handleAxiosError as EventListener);
        window.addEventListener('auth:cors-error', handleCorsError as EventListener);
        window.addEventListener('auth:network-error', handleNetworkError as EventListener);

        return () => {
            window.removeEventListener('auth:session-expired', handleSessionExpired as EventListener);
            window.removeEventListener('auth:too-many-requests', handleTooManyRequests as EventListener);
            window.removeEventListener('auth:axios-error', handleAxiosError as EventListener);
            window.removeEventListener('auth:cors-error', handleCorsError as EventListener);
            window.removeEventListener('auth:network-error', handleNetworkError as EventListener);
        };
    }, [performLogout]);

    return {
        performLogout
    };
}; 