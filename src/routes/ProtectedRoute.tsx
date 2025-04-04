/**
 * @fileoverview Protected route component that implements authentication-based access control
 *
 * This component wraps routes that should only be accessible to authenticated users.
 * It redirects unauthenticated users to the login page and preserves the original
 * target path for post-login navigation.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';

/**
 * Props for the ProtectedRoute component
 *
 * @interface
 * @property {React.ReactNode} children - The protected content to render if authenticated
 * @property {string} [redirectPath='/login'] - Optional custom redirect path for unauthenticated users
 */
interface ProtectedRouteProps {
    children: React.ReactNode;
    redirectPath?: string;
}

/**
 * ProtectedRoute component - Controls access to routes based on authentication state.
 *
 * This component uses the useUserContext hook to check if a user is authenticated.
 * If authentication is still being verified (loading), it shows a loading indicator.
 * If the user is not authenticated, they are redirected to the login page.
 *
 * @param {ProtectedRouteProps} props - Component props including children and optional redirect path
 * @returns {JSX.Element} Loading indicator, redirect component, or the protected content
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
                                                           children,
                                                           redirectPath = '/login'
                                                       }) => {
    const { isAuthenticated, isLoading } = useUserContext();
    const location = useLocation();

    // Show loading indicator while checking authentication
    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    // Redirect if not authenticated
    if (!isAuthenticated) {
        return <Navigate to={redirectPath} state={{ from: location.pathname }} replace />;
    }

    // Render children if authenticated
    return <>{children}</>;
};

export default ProtectedRoute;