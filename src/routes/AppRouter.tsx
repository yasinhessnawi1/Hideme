/**
 * @fileoverview Main application router that handles route configuration and protection
 *
 * This component defines all application routes and applies authentication checks
 * where needed. It integrates with the authentication context to determine user state
 * and handles redirects for authenticated and unauthenticated routes.
 */
import React, {JSX} from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import PDFViewerPage from "../pages/PDFViewerPage";
import HowToPage from "../pages/HowToPage";
import FeaturesPage from "../pages/FeaturesPage";
import AboutPage from "../pages/AboutPage";
import UserSettingsPage from "../pages/SettingsPage"; // We'll create this page next
import ProtectedRoute from './ProtectedRoute';
import { useUserContext } from '../contexts/UserContext';

/**
 * Props for the AppRouter component
 *
 * @interface
 * @property {string} theme - Current application theme ('light' or 'dark')
 * @property {function} toggleTheme - Function to toggle between light and dark themes
 */
interface AppRouterProps {
    theme: string
    toggleTheme: () => void
}

/**
 * Main router component that defines all application routes
 *
 * Handles:
 * - Public routes that are always accessible
 * - Authentication routes with redirects when already logged in
 * - Protected routes that require authentication
 * - Fallback route for unmatched paths
 *
 * @param {AppRouterProps} props - Component properties
 * @returns {JSX.Element} The configured router component
 */
const AppRouter = (): JSX.Element => {
    const { isAuthenticated } = useUserContext();

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
            <Route path="/features" element={<FeaturesPage  />} />
            <Route path="/about" element={<AboutPage  />} />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default AppRouter
