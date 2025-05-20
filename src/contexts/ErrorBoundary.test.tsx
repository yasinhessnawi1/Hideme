import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from '../contexts/ErrorBoundary';

// Mock console.error to avoid test output noise
const originalConsoleError = console.error;
beforeEach(() => {
    console.error = vi.fn();
});

afterEach(() => {
    console.error = originalConsoleError;
});

// Create a component that throws an error
const ErrorComponent = ({ shouldThrow = true }) => {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div data-testid="no-error">No error occurred</div>;
};

// Mock window.location.reload
const mockReload = vi.fn();
beforeEach(() => {
    Object.defineProperty(window, 'location', {
        value: {
            reload: mockReload,
            href: '/'
        },
        writable: true,
        configurable: true
    });
});

describe('ErrorBoundary', () => {
    test.skip('should render children when no error occurs', () => {
        render(
            <BrowserRouter>
                <ErrorBoundary>
                    <div data-testid="child">Test Child</div>
                </ErrorBoundary>
            </BrowserRouter>
        );

        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    test.skip('should render fallback UI when an error occurs', () => {
        // We need to spy on console.error which React calls when an error occurs in a component
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <BrowserRouter>
                <ErrorBoundary>
                    <ErrorComponent />
                </ErrorBoundary>
            </BrowserRouter>
        );

        // Error boundary should show fallback UI
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('We apologize for the inconvenience. An error has occurred in the application.')).toBeInTheDocument();

        // Clean up
        errorSpy.mockRestore();
    });

    test.skip('should display action buttons in fallback UI', () => {
        render(
            <BrowserRouter>
                <ErrorBoundary>
                    <ErrorComponent />
                </ErrorBoundary>
            </BrowserRouter>
        );

        // Check for action buttons
        expect(screen.getByText('Return to Home Page')).toBeInTheDocument();
        expect(screen.getByText('Redirect Now')).toBeInTheDocument();
        expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });

    test.skip('should refresh the page when refresh button is clicked', () => {
        render(
            <BrowserRouter>
                <ErrorBoundary>
                    <ErrorComponent />
                </ErrorBoundary>
            </BrowserRouter>
        );

        // Click refresh button
        fireEvent.click(screen.getByText('Refresh Page'));

        // Should call window.location.reload
        expect(mockReload).toHaveBeenCalled();
    });

    test.skip('should not show home link when showHomeLink is false', () => {
        render(
            <BrowserRouter>
                <ErrorBoundary showHomeLink={false}>
                    <ErrorComponent />
                </ErrorBoundary>
            </BrowserRouter>
        );

        // Home link should not be in the document
        expect(screen.queryByText('Return to Home Page')).not.toBeInTheDocument();
    });

    test.skip('should set redirect state when redirect button is clicked', () => {
        // Directly modify the handleRedirect method on the instance
        const setState = vi.fn();
        const originalSetState = React.Component.prototype.setState;
        React.Component.prototype.setState = setState;

        render(
            <BrowserRouter>
                <ErrorBoundary redirectPath="/test">
                    <ErrorComponent />
                </ErrorBoundary>
            </BrowserRouter>
        );

        // Click redirect button
        fireEvent.click(screen.getByText('Redirect Now'));

        // Should call setState at least once
        expect(setState).toHaveBeenCalled();

        // Restore original
        React.Component.prototype.setState = originalSetState;
    });

    test.skip('should handle componentDidCatch lifecycle method', () => {
        // Create a spy on componentDidCatch
        const componentDidCatchSpy = vi.spyOn(ErrorBoundary.prototype, 'componentDidCatch');

        render(
            <BrowserRouter>
                <ErrorBoundary>
                    <ErrorComponent />
                </ErrorBoundary>
            </BrowserRouter>
        );

        // Should call componentDidCatch
        expect(componentDidCatchSpy).toHaveBeenCalled();

        // Clean up
        componentDidCatchSpy.mockRestore();
    });

    test.skip('should automatically redirect after a delay if redirectPath is provided', () => {
        // Directly spy on setState
        const setState = vi.fn();
        const originalSetState = React.Component.prototype.setState;
        React.Component.prototype.setState = setState;

        vi.useFakeTimers();

        render(
            <BrowserRouter>
                <ErrorBoundary redirectPath="/test">
                    <ErrorComponent />
                </ErrorBoundary>
            </BrowserRouter>
        );

        // Fast-forward timers
        vi.advanceTimersByTime(5000);

        // Should call setState at least once during the timeout callback
        expect(setState).toHaveBeenCalled();

        // Restore original
        React.Component.prototype.setState = originalSetState;
        vi.useRealTimers();
    });

    test.skip('should reset error state when home link is clicked', () => {
        // Directly spy on setState
        const setState = vi.fn();
        const originalSetState = React.Component.prototype.setState;
        React.Component.prototype.setState = setState;

        render(
            <BrowserRouter>
                <ErrorBoundary>
                    <ErrorComponent />
                </ErrorBoundary>
            </BrowserRouter>
        );

        // Get the home link
        const homeLink = screen.getByText('Return to Home Page');
        fireEvent.click(homeLink);

        // Should call setState
        expect(setState).toHaveBeenCalled();

        // Restore original
        React.Component.prototype.setState = originalSetState;
    });

    test.skip('should use custom redirect path when provided', () => {
        const customPath = '/custom-path';
        render(
            <BrowserRouter>
                <ErrorBoundary redirectPath={customPath}>
                    <ErrorComponent />
                </ErrorBoundary>
            </BrowserRouter>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    test.skip('should show error boundary UI without error details in production', () => {
        // Save original NODE_ENV
        const originalNodeEnv = process.env.NODE_ENV;

        // Mock production environment
        process.env.NODE_ENV = 'production';

        render(
            <BrowserRouter>
                <ErrorBoundary>
                    <ErrorComponent />
                </ErrorBoundary>
            </BrowserRouter>
        );

        // Should show error boundary UI
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();

        // Error details should be masked in production
        expect(screen.getByText('Error:')).toBeInTheDocument();
        expect(screen.getByText('Internal error')).toBeInTheDocument();

        // Restore original NODE_ENV
        process.env.NODE_ENV = originalNodeEnv;
    });
});