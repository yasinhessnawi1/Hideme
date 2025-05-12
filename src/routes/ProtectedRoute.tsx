/**
 * @fileoverview Protected route component that implements authentication-based access control
 *
 * This component wraps routes that should only be accessible to authenticated users.
 * It redirects unauthenticated users to the login page and preserves the original
 * target path for post-login navigation.
 */
import React, { JSX, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';
import { useLanguage } from '../contexts/LanguageContext';

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
 * It handles the token verification process and properly shows loading state until
 * authentication is confirmed or denied.
 *
 * @param {ProtectedRouteProps} props - Component props including children and optional redirect path
 * @returns {JSX.Element} Loading indicator, redirect component, or the protected content
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
                                                           children,
                                                           redirectPath = '/login'
                                                       }: ProtectedRouteProps): JSX.Element => {
    const { isAuthenticated, isLoading, verifySession } = useUserContext();
    const location = useLocation();
    const [isVerifying, setIsVerifying] = useState(true);
    const [verificationComplete, setVerificationComplete] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const { t } = useLanguage();

    // Perform token verification when component mounts
    useEffect(() => {
        let isMounted = true;

        const checkAuthentication = async () => {
            try {
                // Start verification process
                setIsVerifying(true);

                // Get auth token from localStorage
                const token = localStorage.getItem('auth_token');

                // Skip verification if no token exists
                if (!token) {
                    if (isMounted) {
                        setIsVerified(false);
                        setVerificationComplete(true);
                        setIsVerifying(false);
                    }
                    return;
                }

                // Verify the token
                const verified = await verifySession();

                if (isMounted) {
                    setIsVerified(verified);
                    setVerificationComplete(true);
                    setIsVerifying(false);
                }
            } catch (error) {
                console.error("Authentication verification error:", error);
                if (isMounted) {
                    setIsVerified(false);
                    setVerificationComplete(true);
                    setIsVerifying(false);
                }
            }
        };

        checkAuthentication();

        return () => {
            isMounted = false;
        };
    }, [verifySession]);

    // Show loading state while verification is in progress
    if (isVerifying || isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>{t('common', 'verifyingSession')}</p>
            </div>
        );
    }

    // Redirect if verification completed and user is not authenticated
    if (verificationComplete && !isVerified && !isAuthenticated) {
        return <Navigate to={redirectPath} state={{ from: location.pathname }} />;
    }

    // Render children if authenticated or verification succeeded
    return <>{children}</>;
};

export default ProtectedRoute;
