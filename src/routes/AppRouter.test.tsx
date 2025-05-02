import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRouter from '../routes/AppRouter';
import { useUserContext } from '../contexts/UserContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotificationProvider } from '../contexts/NotificationContext';

// Mock all required contexts and dependencies
vi.mock('../contexts/UserContext', () => ({
    useUserContext: vi.fn(),
}));

// Mock each page component to simplify testing
vi.mock('../pages/LandingPage', () => ({
    default: () => <div data-testid="landing-page">Landing Page</div>,
}));

vi.mock('../pages/LoginPage', () => ({
    default: vi.fn(({ initialSignUp = false }) => (
        <div data-testid="login-page">
            Login Page {initialSignUp ? '(Sign Up)' : ''}
        </div>
    )),
}));

vi.mock('../pages/PDFViewerPage', () => ({
    default: () => <div data-testid="pdf-viewer-page">PDF Viewer Page</div>,
}));

vi.mock('../pages/HowToPage', () => ({
    default: () => <div data-testid="how-to-page">How To Page</div>,
}));

vi.mock('../pages/FeaturesPage', () => ({
    default: () => <div data-testid="features-page">Features Page</div>,
}));

vi.mock('../pages/AboutPage', () => ({
    default: () => <div data-testid="about-page">About Page</div>,
}));

vi.mock('../pages/SettingsPage', () => ({
    default: () => <div data-testid="user-settings-page">User Settings Page</div>,
}));

// Mock ProtectedRoute component
vi.mock('./ProtectedRoute', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="protected-route">{children}</div>,
}));

// Mock router hooks to test redirects
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        Navigate: ({ to }: { to: string }) => {
            mockNavigate(to);
            return <div data-testid="mock-navigate" data-to={to}>Navigate to {to}</div>;
        },
        useNavigate: () => mockNavigate,
    };
});

describe('AppRouter Component', () => {
    // Provide necessary context wrappers
    const renderWithProviders = (route: string) => {
        return render(
            <NotificationProvider>
                <MemoryRouter initialEntries={[route]}>
                    <AppRouter />
                </MemoryRouter>
            </NotificationProvider>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockClear();

        // Default mock implementation
        (useUserContext as any).mockReturnValue({
            isAuthenticated: false,
            isLoading: false
        });
    });

    it('renders LandingPage for the root path', async () => {
        renderWithProviders('/');

        await waitFor(() => {
            expect(screen.getByTestId('landing-page')).toBeInTheDocument();
        });
    });

    it('renders LoginPage for the /login path when not authenticated', async () => {
        renderWithProviders('/login');

        await waitFor(() => {
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
            expect(screen.queryByText('(Sign Up)')).not.toBeInTheDocument();
        });
    });

    it('redirects to /playground from /login when already authenticated', async () => {
        (useUserContext as any).mockReturnValue({
            isAuthenticated: true,
            isLoading: false
        });

        renderWithProviders('/login');

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/playground');
        });
    });

    it('renders SignupPage for the /signup path when not authenticated', async () => {
        renderWithProviders('/signup');

        await waitFor(() => {
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
            expect(screen.getByText(/\(Sign Up\)/)).toBeInTheDocument();
        });
    });

    it('redirects to /playground from /signup when already authenticated', async () => {
        (useUserContext as any).mockReturnValue({
            isAuthenticated: true,
            isLoading: false
        });

        renderWithProviders('/signup');

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/playground');
        });
    });

    it('renders protected routes with ProtectedRoute wrapper when authenticated', async () => {
        (useUserContext as any).mockReturnValue({
            isAuthenticated: true,
            isLoading: false
        });

        renderWithProviders('/playground');

        await waitFor(() => {
            expect(screen.getByTestId('protected-route')).toBeInTheDocument();
            expect(screen.getByTestId('pdf-viewer-page')).toBeInTheDocument();
        });
    });

    it('renders protected user settings route with ProtectedRoute wrapper when authenticated', async () => {
        (useUserContext as any).mockReturnValue({
            isAuthenticated: true,
            isLoading: false
        });

        renderWithProviders('/user/settings');

        await waitFor(() => {
            expect(screen.getByTestId('protected-route')).toBeInTheDocument();
            expect(screen.getByTestId('user-settings-page')).toBeInTheDocument();
        });
    });

    it('renders public How-To page without authentication', async () => {
        renderWithProviders('/how-to');

        await waitFor(() => {
            expect(screen.getByTestId('how-to-page')).toBeInTheDocument();
        });
    });

    it('renders public Features page without authentication', async () => {
        renderWithProviders('/features');

        await waitFor(() => {
            expect(screen.getByTestId('features-page')).toBeInTheDocument();
        });
    });

    it('renders public About page without authentication', async () => {
        renderWithProviders('/about');

        await waitFor(() => {
            expect(screen.getByTestId('about-page')).toBeInTheDocument();
        });
    });

    it('redirects to home page for unknown routes', async () => {
        renderWithProviders('/non-existent-route');

        // Check for Navigate component redirect
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });
});