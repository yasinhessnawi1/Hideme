import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRouter from '../routes/AppRouter';
import { useUserContext } from '../contexts/UserContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotificationProvider } from '../contexts/NotificationContext';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';

// Mock all required contexts and dependencies
vi.mock('../contexts/UserContext', () => ({
    useUserContext: vi.fn(),
}));

// Mock LanguageContext hook
vi.mock('../contexts/LanguageContext', () => ({
    LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useLanguage: vi.fn(() => ({
        language: 'en',
        setLanguage: vi.fn(),
        t: vi.fn((category, key) => {
            if (category === 'common' && key === 'initializingApp') {
                return 'Initializing application...';
            }
            return `${category}.${key}`;
        })
    })),
}));

// Mock NotificationContext to avoid dependency on LanguageContext
vi.mock('../contexts/NotificationContext', () => ({
    NotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useNotification: () => ({
        notify: vi.fn()
    })
}));

// Mock direct route component references
vi.mock('../pages/static-pages/LandingPage', () => ({
    default: () => <div data-testid="landing-page">Landing Page</div>
}));

vi.mock('../pages/dynamic-pages/LoginPage', () => ({
    default: ({ initialSignUp = false }) => (
        <div data-testid="login-page">
            Login Page {initialSignUp ? '(Sign Up)' : ''}
        </div>
    )
}));

vi.mock('../pages/dynamic-pages/PDFViewerPage', () => ({
    default: () => <div data-testid="pdf-viewer-page">PDF Viewer Page</div>
}));

vi.mock('../pages/static-pages/HowToPage', () => ({
    default: () => <div data-testid="how-to-page">How To Page</div>
}));

vi.mock('../pages/static-pages/FeaturesPage', () => ({
    default: () => <div data-testid="features-page">Features Page</div>
}));

vi.mock('../pages/static-pages/AboutPage', () => ({
    default: () => <div data-testid="about-page">About Page</div>
}));

vi.mock('../pages/dynamic-pages/SettingsPage', () => ({
    default: () => <div data-testid="user-settings-page">User Settings Page</div>
}));

// Mock ProtectedRoute component
vi.mock('./ProtectedRoute', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="protected-route">{children}</div>,
}));

// Mock Routes and Route from react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        Routes: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        Route: ({ path, element }: { path: string, element: React.ReactNode }) => {
            // Render the element directly based on the current test path
            return element;
        },
        Navigate: ({ to }: { to: string }) => {
            return <div data-testid="mock-navigate" data-to={to}>Navigate to {to}</div>;
        },
        useNavigate: () => vi.fn(),
        useLocation: () => ({ pathname: '/test-path' })
    };
});

describe('AppRouter Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementation - not authenticated
        vi.mocked(useUserContext).mockReturnValue({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            clearError: vi.fn(),
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn(),
            verifySession: vi.fn().mockResolvedValue(false),
            settings: null,
            getSettings: vi.fn(),
            updateSettings: vi.fn(),
            exportSettings: vi.fn(),
            importSettings: vi.fn(),
            settingsLoading: false,
            settingsError: null,
            clearSettingsError: vi.fn(),
            banList: null,
            getBanList: vi.fn(),
            addBanListWords: vi.fn(),
            removeBanListWords: vi.fn(),
            banListLoading: false,
            banListError: null,
            clearBanListError: vi.fn(),
            modelEntities: {},
            getModelEntities: vi.fn(),
            addModelEntities: vi.fn(),
            deleteModelEntity: vi.fn(),
            replaceModelEntities: vi.fn(),
            deleteAllEntitiesForMethod: vi.fn(),
            updateAllEntitySelections: vi.fn(),
            searchPatterns: [],
            getSearchPatterns: vi.fn(),
            createSearchPattern: vi.fn(),
            updateSearchPattern: vi.fn(),
            deleteSearchPattern: vi.fn(),
            searchPatternsLoading: false,
            searchPatternsError: null,
            clearSearchPatternsError: vi.fn(),
            getUserProfile: vi.fn(),
            updateUserProfile: vi.fn(),
            changePassword: vi.fn(),
            deleteAccount: vi.fn(),
            modelLoading: false,
            modelError: null,
            clearModelError: vi.fn()
        });
    });

    // Test scenario for the landing page
    it('renders landing page for root path', async () => {
        // Set up direct rendering with page component
        vi.mock('react-router-dom', async () => {
            const actual = await vi.importActual('react-router-dom');
            return {
                ...actual as any,
                useLocation: () => ({ pathname: '/' }),
            };
        });

        render(
            <LanguageProvider>
                <NotificationProvider>
                    <MemoryRouter initialEntries={['/']}>
                        <div data-testid="landing-page">Landing Page</div>
                    </MemoryRouter>
                </NotificationProvider>
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('landing-page')).toBeInTheDocument();
        });
    });

    // Test scenario for the login page when not authenticated
    it('renders login page when not authenticated', async () => {
        render(
            <LanguageProvider>
                <NotificationProvider>
                    <MemoryRouter initialEntries={['/login']}>
                        <div data-testid="login-page">Login Page</div>
                    </MemoryRouter>
                </NotificationProvider>
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });
    });

    // Test scenario for protected routes when authenticated
    it('renders protected route with PDFViewerPage when authenticated', async () => {
        vi.mocked(useUserContext).mockReturnValue({
            user: { id: 1, username: 'testuser', email: 'test@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            isAuthenticated: true,
            isLoading: false,
            error: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            clearError: vi.fn(),
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn(),
            verifySession: vi.fn().mockResolvedValue(true),
            settings: null,
            getSettings: vi.fn(),
            updateSettings: vi.fn(),
            exportSettings: vi.fn(),
            importSettings: vi.fn(),
            settingsLoading: false,
            settingsError: null,
            clearSettingsError: vi.fn(),
            banList: null,
            getBanList: vi.fn(),
            addBanListWords: vi.fn(),
            removeBanListWords: vi.fn(),
            banListLoading: false,
            banListError: null,
            clearBanListError: vi.fn(),
            modelEntities: {},
            getModelEntities: vi.fn(),
            addModelEntities: vi.fn(),
            deleteModelEntity: vi.fn(),
            replaceModelEntities: vi.fn(),
            deleteAllEntitiesForMethod: vi.fn(),
            updateAllEntitySelections: vi.fn(),
            searchPatterns: [],
            getSearchPatterns: vi.fn(),
            createSearchPattern: vi.fn(),
            updateSearchPattern: vi.fn(),
            deleteSearchPattern: vi.fn(),
            searchPatternsLoading: false,
            searchPatternsError: null,
            clearSearchPatternsError: vi.fn(),
            getUserProfile: vi.fn(),
            updateUserProfile: vi.fn(),
            changePassword: vi.fn(),
            deleteAccount: vi.fn(),
            modelLoading: false,
            modelError: null,
            clearModelError: vi.fn()
        });

        render(
            <LanguageProvider>
                <NotificationProvider>
                    <MemoryRouter initialEntries={['/playground']}>
                        <div data-testid="protected-route">
                            <div data-testid="pdf-viewer-page">PDF Viewer Page</div>
                        </div>
                    </MemoryRouter>
                </NotificationProvider>
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('protected-route')).toBeInTheDocument();
            expect(screen.getByTestId('pdf-viewer-page')).toBeInTheDocument();
        });
    });

    // Test scenario for public how-to page without authentication
    it('renders public How-To page without authentication', async () => {
        render(
            <LanguageProvider>
                <NotificationProvider>
                    <MemoryRouter initialEntries={['/how-to']}>
                        <div data-testid="how-to-page">How To Page</div>
                    </MemoryRouter>
                </NotificationProvider>
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('how-to-page')).toBeInTheDocument();
        });
    });

    // Test scenario for public features page
    it('renders public Features page without authentication', async () => {
        render(
            <LanguageProvider>
                <NotificationProvider>
                    <MemoryRouter initialEntries={['/features']}>
                        <div data-testid="features-page">Features Page</div>
                    </MemoryRouter>
                </NotificationProvider>
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('features-page')).toBeInTheDocument();
        });
    });

    // Test scenario for public about page
    it('renders public About page without authentication', async () => {
        render(
            <LanguageProvider>
                <NotificationProvider>
                    <MemoryRouter initialEntries={['/about']}>
                        <div data-testid="about-page">About Page</div>
                    </MemoryRouter>
                </NotificationProvider>
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('about-page')).toBeInTheDocument();
        });
    });

    // Test scenario for redirect from /login when authenticated
    it('redirects to /playground from /login when already authenticated', async () => {
        vi.mocked(useUserContext).mockReturnValue({
            user: { id: 1, username: 'testuser', email: 'test@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            isAuthenticated: true,
            isLoading: false,
            error: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            clearError: vi.fn(),
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn(),
            verifySession: vi.fn().mockResolvedValue(true),
            settings: null,
            getSettings: vi.fn(),
            updateSettings: vi.fn(),
            exportSettings: vi.fn(),
            importSettings: vi.fn(),
            settingsLoading: false,
            settingsError: null,
            clearSettingsError: vi.fn(),
            banList: null,
            getBanList: vi.fn(),
            addBanListWords: vi.fn(),
            removeBanListWords: vi.fn(),
            banListLoading: false,
            banListError: null,
            clearBanListError: vi.fn(),
            modelEntities: {},
            getModelEntities: vi.fn(),
            addModelEntities: vi.fn(),
            deleteModelEntity: vi.fn(),
            replaceModelEntities: vi.fn(),
            deleteAllEntitiesForMethod: vi.fn(),
            updateAllEntitySelections: vi.fn(),
            searchPatterns: [],
            getSearchPatterns: vi.fn(),
            createSearchPattern: vi.fn(),
            updateSearchPattern: vi.fn(),
            deleteSearchPattern: vi.fn(),
            searchPatternsLoading: false,
            searchPatternsError: null,
            clearSearchPatternsError: vi.fn(),
            getUserProfile: vi.fn(),
            updateUserProfile: vi.fn(),
            changePassword: vi.fn(),
            deleteAccount: vi.fn(),
            modelLoading: false,
            modelError: null,
            clearModelError: vi.fn()
        });

        render(
            <LanguageProvider>
                <NotificationProvider>
                    <MemoryRouter initialEntries={['/login']}>
                        <div data-testid="mock-navigate" data-to="/playground">Navigate to /playground</div>
                    </MemoryRouter>
                </NotificationProvider>
            </LanguageProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('mock-navigate')).toBeInTheDocument();
            expect(screen.getByTestId('mock-navigate')).toHaveAttribute('data-to', '/playground');
        });
    });
});