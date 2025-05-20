import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, useThemeContext } from '../contexts/ThemeContext';
import { useTheme } from '../hooks/general/useTheme';

// Mock the useTheme hook
vi.mock('../hooks/general/useTheme', () => ({
    useTheme: vi.fn(),
    ThemePreference: {
        LIGHT: 'light',
        DARK: 'dark',
        SYSTEM: 'system'
    },
    AppliedTheme: {
        LIGHT: 'light',
        DARK: 'dark'
    }
}));

// Test component to consume the context
const TestConsumer = () => {
    const { preference, setPreference, appliedTheme } = useThemeContext();

    return (
        <div>
            <div data-testid="theme-preference">{preference}</div>
            <div data-testid="applied-theme">{appliedTheme}</div>
            <button
                data-testid="set-light-theme"
                onClick={() => setPreference('light')}
            >
                Set Light Theme
            </button>
            <button
                data-testid="set-dark-theme"
                onClick={() => setPreference('dark')}
            >
                Set Dark Theme
            </button>
            <button
                data-testid="set-system-theme"
                onClick={() => setPreference('system')}
            >
                Set System Theme
            </button>
        </div>
    );
};

// Component that will cause an error by using the hook outside the provider
const ErrorComponent = () => {
    try {
        useThemeContext();
        return <div>No error</div>;
    } catch (error) {
        return <div data-testid="context-error">Context error occurred</div>;
    }
};

describe('ThemeContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementation for useTheme
        vi.mocked(useTheme).mockReturnValue({
            preference: 'system',
            setPreference: vi.fn(),
            appliedTheme: 'light'
        });
    });

    test.skip('provides theme context to children with initial state', () => {
        render(
            <ThemeProvider>
                <TestConsumer />
            </ThemeProvider>
        );

        // Check that initial state is rendered
        expect(screen.getByTestId('theme-preference').textContent).toBe('system');
        expect(screen.getByTestId('applied-theme').textContent).toBe('light');

        // Verify useTheme was called with system as default
        expect(useTheme).toHaveBeenCalledWith('system');
    });

    test.skip('throws error when used outside provider', () => {
        render(<ErrorComponent />);
        expect(screen.getByTestId('context-error')).toBeInTheDocument();
    });

    test.skip('changes theme preference to light', () => {
        // Prepare mock implementation
        const setPreferenceMock = vi.fn();
        vi.mocked(useTheme).mockReturnValue({
            preference: 'system',
            setPreference: setPreferenceMock,
            appliedTheme: 'light'
        });

        render(
            <ThemeProvider>
                <TestConsumer />
            </ThemeProvider>
        );

        // Click to change theme
        fireEvent.click(screen.getByTestId('set-light-theme'));

        // Should call setPreference
        expect(setPreferenceMock).toHaveBeenCalledWith('light');
    });

    test.skip('changes theme preference to dark', () => {
        // Prepare mock implementation
        const setPreferenceMock = vi.fn();
        vi.mocked(useTheme).mockReturnValue({
            preference: 'system',
            setPreference: setPreferenceMock,
            appliedTheme: 'light'
        });

        render(
            <ThemeProvider>
                <TestConsumer />
            </ThemeProvider>
        );

        // Click to change theme
        fireEvent.click(screen.getByTestId('set-dark-theme'));

        // Should call setPreference
        expect(setPreferenceMock).toHaveBeenCalledWith('dark');
    });

    test.skip('changes theme preference to system', () => {
        // Prepare mock implementation with dark preference
        const setPreferenceMock = vi.fn();
        vi.mocked(useTheme).mockReturnValue({
            preference: 'dark',
            setPreference: setPreferenceMock,
            appliedTheme: 'dark'
        });

        render(
            <ThemeProvider>
                <TestConsumer />
            </ThemeProvider>
        );

        // Initial state should be dark
        expect(screen.getByTestId('theme-preference').textContent).toBe('dark');

        // Click to change theme to system
        fireEvent.click(screen.getByTestId('set-system-theme'));

        // Should call setPreference
        expect(setPreferenceMock).toHaveBeenCalledWith('system');
    });

    test.skip('renders with dark theme when system preference is dark', () => {
        // Mock dark system theme
        vi.mocked(useTheme).mockReturnValue({
            preference: 'system',
            setPreference: vi.fn(),
            appliedTheme: 'dark'
        });

        render(
            <ThemeProvider>
                <TestConsumer />
            </ThemeProvider>
        );

        // Check that theme is dark
        expect(screen.getByTestId('theme-preference').textContent).toBe('system');
        expect(screen.getByTestId('applied-theme').textContent).toBe('dark');
    });

    test.skip('renders with light theme when preference is light', () => {
        // Mock light user preference
        vi.mocked(useTheme).mockReturnValue({
            preference: 'light',
            setPreference: vi.fn(),
            appliedTheme: 'light'
        });

        render(
            <ThemeProvider>
                <TestConsumer />
            </ThemeProvider>
        );

        // Check that theme is light
        expect(screen.getByTestId('theme-preference').textContent).toBe('light');
        expect(screen.getByTestId('applied-theme').textContent).toBe('light');
    });

    test.skip('renders with dark theme when preference is dark', () => {
        // Mock dark user preference
        vi.mocked(useTheme).mockReturnValue({
            preference: 'dark',
            setPreference: vi.fn(),
            appliedTheme: 'dark'
        });

        render(
            <ThemeProvider>
                <TestConsumer />
            </ThemeProvider>
        );

        // Check that theme is dark
        expect(screen.getByTestId('theme-preference').textContent).toBe('dark');
        expect(screen.getByTestId('applied-theme').textContent).toBe('dark');
    });

    test.skip('handles case where system theme differs from applied theme', () => {
        // Mock system preference but with applied theme overridden
        vi.mocked(useTheme).mockReturnValue({
            preference: 'system',
            setPreference: vi.fn(),
            appliedTheme: 'dark' // System theme is dark
        });

        render(
            <ThemeProvider>
                <TestConsumer />
            </ThemeProvider>
        );

        // Check that preference is system but applied theme is dark
        expect(screen.getByTestId('theme-preference').textContent).toBe('system');
        expect(screen.getByTestId('applied-theme').textContent).toBe('dark');
    });

    test.skip('handles theme change through context value updates', () => {
        // Start with light theme
        const setPreferenceMock = vi.fn();
        vi.mocked(useTheme).mockReturnValue({
            preference: 'light',
            setPreference: setPreferenceMock,
            appliedTheme: 'light'
        });

        const { rerender } = render(
            <ThemeProvider>
                <TestConsumer />
            </ThemeProvider>
        );

        // Initial state should be light
        expect(screen.getByTestId('theme-preference').textContent).toBe('light');
        expect(screen.getByTestId('applied-theme').textContent).toBe('light');

        // Now change the mock to return dark theme
        vi.mocked(useTheme).mockReturnValue({
            preference: 'dark',
            setPreference: setPreferenceMock,
            appliedTheme: 'dark'
        });

        // Rerender with the new context values
        rerender(
            <ThemeProvider>
                <TestConsumer />
            </ThemeProvider>
        );

        // Should now show dark theme
        expect(screen.getByTestId('theme-preference').textContent).toBe('dark');
        expect(screen.getByTestId('applied-theme').textContent).toBe('dark');
    });
});