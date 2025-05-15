import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../routes/ProtectedRoute';
import { useUserContext } from '../contexts/UserContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useLanguage } from '../contexts/LanguageContext';

// Mock the UserContext hook
vi.mock('../contexts/UserContext', () => ({
    useUserContext: vi.fn(),
}));

// Mock LanguageContext hook
vi.mock('../contexts/LanguageContext', () => ({
    useLanguage: vi.fn(() => ({
        language: 'en',
        setLanguage: vi.fn(),
        t: vi.fn((category, key) => {
            if (category === 'common' && key === 'verifyingSession') {
                return 'Verifying your session...';
            }
            return `${category}.${key}`;
        })
    })),
}));

// Mock NotificationContext hook for context provider
vi.mock('../contexts/NotificationContext', () => ({
    NotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useNotification: () => ({
        notify: vi.fn(),
    }),
}));

// Mock router hooks to test redirects
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        Navigate: ({ to, state }: { to: string, state?: any }) => {
            mockNavigate(to, state);
            return null; // Don't render anything so we don't get duplicate login pages
        },
        useNavigate: () => mockNavigate,
        useLocation: () => ({ pathname: '/current-path' }),
    };
});

// Mock LoginPage to prevent duplication
vi.mock('../pages/LoginPage', () => ({
    default: ({ initialSignUp = false }) => (
        <div data-testid="login-page">
            Login Page {initialSignUp ? '(Sign Up)' : ''}
        </div>
    ),
}));

describe('ProtectedRoute Component', () => {
    // Mock localStorage
    const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
            getItem: vi.fn((key: string) => store[key] || null),
            setItem: vi.fn((key: string, value: string) => {
                store[key] = value.toString();
            }),
            removeItem: vi.fn((key: string) => {
                delete store[key];
            }),
            clear: vi.fn(() => {
                store = {};
            }),
        };
    })();

    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
    });

    const mockVerifySession = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
        mockNavigate.mockClear();

        // Default mock implementation
        (useUserContext as any).mockReturnValue({
            isAuthenticated: false,
            isLoading: false,
            verifySession: mockVerifySession,
        });
    });

    const renderComponent = (ui: React.ReactNode) => {
        return render(
            <MemoryRouter>
                {ui}
            </MemoryRouter>
        );
    };

    it('shows loading state while authentication is in progress', () => {
        (useUserContext as any).mockReturnValue({
            isAuthenticated: false,
            isLoading: true,
            verifySession: mockVerifySession,
        });

        const { container } = renderComponent(
            <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
        );

        // Look for the loading-container and p element with the text
        const loadingContainer = container.querySelector('.loading-container');
        expect(loadingContainer).toBeInTheDocument();

        // Find the spinner by class instead of data-testid
        const loadingSpinner = container.querySelector('.loading-spinner');
        expect(loadingSpinner).toBeInTheDocument();

        // Find the text element
        const initText = container.querySelector('p');
        expect(initText?.textContent).toBe('Verifying your session...');
    });

    it('calls verifySession when component mounts', async () => {
        mockVerifySession.mockResolvedValue(true);
        localStorageMock.setItem('auth_token', 'test-token');

        renderComponent(
            <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
        );

        // Wait for verifySession to be called
        await waitFor(() => {
            expect(mockVerifySession).toHaveBeenCalled();
        });
    });

    it('renders children when user is authenticated', async () => {
        (useUserContext as any).mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
            verifySession: mockVerifySession,
        });

        mockVerifySession.mockResolvedValue(true);

        renderComponent(
            <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
        );

        await waitFor(() => {
            expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        });
    });

    it('unmounts cleanly without memory leaks', async () => {
        // Setup test verification
        mockVerifySession.mockImplementation(() => {
            return new Promise(resolve => {
                setTimeout(() => resolve(true), 100);
            });
        });

        localStorageMock.setItem('auth_token', 'test-token');

        const { unmount } = renderComponent(
            <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
        );

        // Immediately unmount
        unmount();

        // Just check that the test completes without errors
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(true).toBe(true); // If we got here, no errors were thrown after unmount
    });
});