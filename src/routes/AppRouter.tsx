/**
 * @fileoverview Main application router that handles route configuration and protection
 *
 * This component defines all application routes and applies authentication checks
 * where needed. It integrates with the authentication context to determine user state
 * and handles redirects for authenticated and unauthenticated routes.
 */
import React, { JSX, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import LandingPage from '../pages/static-pages/LandingPage'
import LoginPage from '../pages/dynamic-pages/LoginPage'
import ForgotPasswordPage from '../pages/dynamic-pages/ForgotPasswordPage'
import ResetPasswordPage from '../pages/dynamic-pages/ResetPasswordPage'
import PDFViewerPage from "../pages/dynamic-pages/PDFViewerPage";
import HowToPage from "../pages/static-pages/HowToPage";
import FeaturesPage from "../pages/static-pages/FeaturesPage";
import AboutPage from "../pages/static-pages/AboutPage";
import UserSettingsPage from "../pages/dynamic-pages/SettingsPage";
import ProtectedRoute from './ProtectedRoute';
import { useUserContext } from '../contexts/UserContext';
import { useLanguage } from '../contexts/LanguageContext';
import MiroPage from "../pages/static-pages/Miro";

/**
 * Main router component that defines all application routes
 *
 * Handles:
 * - Public routes that are always accessible
 * - Authentication routes with redirects when already logged in
 * - Protected routes that require authentication
 * - Fallback route for unmatched paths
 *
 * @returns {JSX.Element} The configured router component
 */
const AppRouter = (): JSX.Element => {
    const { isAuthenticated, isLoading } = useUserContext();
    const [authChecked, setAuthChecked] = useState(false);
    const { t } = useLanguage();

    // Wait for authentication state to stabilize before rendering routes that depend on it
    useEffect(() => {
        if (!isLoading) {
            setAuthChecked(true);
        }
    }, [isLoading]);

    // Show a loading indicator until authentication check is complete
    if (!authChecked) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>{t('common', 'initializingApp')}</p>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />

            {/* Authentication routes with redirect if already logged in */}
            <Route
                path="/login"
                element={
                    isAuthenticated ?
                        <Navigate to="/playground" replace /> :
                        <LoginPage />
                }
            />
            <Route
                path="/signup"
                element={
                    isAuthenticated ?
                        <Navigate to="/playground" replace /> :
                        <LoginPage initialSignUp={true} />
                }
            />
            {/* Password reset routes */}
            <Route
                path="/forgot-password"
                element={
                    isAuthenticated ?
                        <Navigate to="/playground" replace /> :
                        <ForgotPasswordPage />
                }
            />
            <Route
                path="/reset-password"
                element={
                    isAuthenticated ?
                        <Navigate to="/playground" replace /> :
                        <ResetPasswordPage />
                }
            />

            {/* Protected route that requires authentication */}
            <Route
                path="/playground"
                element={
                    <ProtectedRoute>
                        <PDFViewerPage />
                    </ProtectedRoute>
                }
            />

            {/* User settings route (protected) */}
            <Route
                path="/user/settings"
                element={
                    <ProtectedRoute>
                        <UserSettingsPage />
                    </ProtectedRoute>
                }
            />

            {/* Public routes */}
            <Route path="/how-to" element={<HowToPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/miro" element={<MiroPage />} />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default AppRouter
