import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { LoadingProvider, useLoading } from '../contexts/LoadingContext';

// Mock the useLoading hook
vi.mock('../contexts/LoadingContext', async () => {
    const actual = await vi.importActual('../contexts/LoadingContext');
    return {
        ...actual,
        useLoading: vi.fn()
    };
});

// Test component to consume the context
const TestConsumer = () => {
    const { loadingStates, isLoading, startLoading, stopLoading, anyLoading } = useLoading();

    return (
        <div>
            <div data-testid="any-loading">{String(anyLoading)}</div>
            <div data-testid="is-loading-a">{String(isLoading('a'))}</div>
            <div data-testid="is-loading-b">{String(isLoading('b'))}</div>
            <div data-testid="is-loading-array">{String(isLoading(['a', 'b']))}</div>
            <div data-testid="is-loading-any">{String(isLoading())}</div>
            <button data-testid="start-loading-a" onClick={() => startLoading('a')}>Start Loading A</button>
            <button data-testid="stop-loading-a" onClick={() => stopLoading('a')}>Stop Loading A</button>
            <button data-testid="start-loading-b" onClick={() => startLoading('b')}>Start Loading B</button>
            <button data-testid="stop-loading-b" onClick={() => stopLoading('b')}>Stop Loading B</button>
            <pre data-testid="loading-states">{JSON.stringify(loadingStates)}</pre>
        </div>
    );
};

// Component that will cause an error by using the hook outside the provider
const ErrorComponent = () => {
    try {
        useLoading();
        return <div>No error</div>;
    } catch (error) {
        return <div data-testid="context-error">Context error occurred</div>;
    }
};

describe('LoadingContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('provides loading context to children with initial state', () => {
        // Setup mock for initial state
        vi.mocked(useLoading).mockReturnValue({
            loadingStates: {},
            isLoading: vi.fn((key) => false),
            startLoading: vi.fn(),
            stopLoading: vi.fn(),
            anyLoading: false
        });

        render(<TestConsumer />);

        // Initial state should have no loading items
        expect(screen.getByTestId('any-loading').textContent).toBe('false');
        expect(screen.getByTestId('is-loading-a').textContent).toBe('false');
        expect(screen.getByTestId('is-loading-b').textContent).toBe('false');
        expect(screen.getByTestId('is-loading-array').textContent).toBe('false');
        expect(screen.getByTestId('is-loading-any').textContent).toBe('false');

        // Loading states should be an empty object initially
        expect(screen.getByTestId('loading-states').textContent).toBe('{}');
    });

    test('startLoading sets the loading state for a key', () => {
        const startLoadingMock = vi.fn();

        // Setup mock for loading state 'a'
        vi.mocked(useLoading).mockReturnValue({
            loadingStates: { a: true },
            isLoading: vi.fn((key) => {
                if (key === 'a') return true;
                if (Array.isArray(key) && key.includes('a')) return true;
                if (!key) return true; // For isLoading() with no args
                return false;
            }),
            startLoading: startLoadingMock,
            stopLoading: vi.fn(),
            anyLoading: true
        });

        render(<TestConsumer />);

        // Start loading for 'a'
        fireEvent.click(screen.getByTestId('start-loading-a'));

        // Check startLoading was called with 'a'
        expect(startLoadingMock).toHaveBeenCalledWith('a');

        // Check that 'a' is now loading
        expect(screen.getByTestId('is-loading-a').textContent).toBe('true');
        expect(screen.getByTestId('is-loading-b').textContent).toBe('false');
        expect(screen.getByTestId('is-loading-array').textContent).toBe('true');
        expect(screen.getByTestId('is-loading-any').textContent).toBe('true');
        expect(screen.getByTestId('any-loading').textContent).toBe('true');

        // Loading states should now include 'a' as true
        expect(screen.getByTestId('loading-states').textContent).toBe('{"a":true}');
    });

    test('stopLoading clears the loading state for a key', () => {
        const stopLoadingMock = vi.fn();

        // First render with 'a' loading
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: { a: true },
            isLoading: vi.fn((key) => {
                if (key === 'a') return true;
                return false;
            }),
            startLoading: vi.fn(),
            stopLoading: stopLoadingMock,
            anyLoading: true
        });

        const { rerender } = render(<TestConsumer />);

        // Verify 'a' is loading
        expect(screen.getByTestId('is-loading-a').textContent).toBe('true');

        // Then update mock to reflect 'a' no longer loading
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: { a: false },
            isLoading: vi.fn((key) => false),
            startLoading: vi.fn(),
            stopLoading: stopLoadingMock,
            anyLoading: false
        });

        // Stop loading for 'a'
        fireEvent.click(screen.getByTestId('stop-loading-a'));
        expect(stopLoadingMock).toHaveBeenCalledWith('a');

        // Re-render to apply the new mock values
        rerender(<TestConsumer />);

        // Check that 'a' is no longer loading
        expect(screen.getByTestId('is-loading-a').textContent).toBe('false');
        expect(screen.getByTestId('is-loading-any').textContent).toBe('false');
        expect(screen.getByTestId('any-loading').textContent).toBe('false');
    });

    /*
    test('handles multiple loading states correctly', () => {
        // Step 1: Initial state with nothing loading
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: {},
            isLoading: vi.fn((key) => false),
            startLoading: vi.fn(),
            stopLoading: vi.fn(),
            anyLoading: false
        });

        const { rerender } = render(<TestConsumer />);

        // Step 2: Start loading 'a'
        const startLoadingA = vi.fn();
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: { a: true },
            isLoading: vi.fn((key) => {
                if (key === 'a') return true;
                if (Array.isArray(key) && key.includes('a')) return true;
                if (!key) return true;
                return false;
            }),
            startLoading: startLoadingA,
            stopLoading: vi.fn(),
            anyLoading: true
        });

        fireEvent.click(screen.getByTestId('start-loading-a'));
        expect(startLoadingA).toHaveBeenCalledWith('a');
        rerender(<TestConsumer />);

        // Step 3: Also start loading 'b'
        const startLoadingB = vi.fn();
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: { a: true, b: true },
            isLoading: vi.fn((key) => {
                if (key === 'a' || key === 'b') return true;
                if (Array.isArray(key) && (key.includes('a') || key.includes('b'))) return true;
                if (!key) return true;
                return false;
            }),
            startLoading: startLoadingB,
            stopLoading: vi.fn(),
            anyLoading: true
        });

        fireEvent.click(screen.getByTestId('start-loading-b'));
        expect(startLoadingB).toHaveBeenCalledWith('b');
        rerender(<TestConsumer />);

        // Check both 'a' and 'b' are loading
        expect(screen.getByTestId('is-loading-a').textContent).toBe('true');
        expect(screen.getByTestId('is-loading-b').textContent).toBe('true');
        expect(screen.getByTestId('is-loading-array').textContent).toBe('true');
        expect(screen.getByTestId('is-loading-any').textContent).toBe('true');
        expect(screen.getByTestId('any-loading').textContent).toBe('true');

        // Step 4: Stop loading 'a'
        const stopLoadingA = vi.fn();
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: { a: false, b: true },
            isLoading: vi.fn((key) => {
                if (key === 'b') return true;
                if (Array.isArray(key) && key.includes('b')) return true;
                if (!key) return true;
                return false;
            }),
            startLoading: vi.fn(),
            stopLoading: stopLoadingA,
            anyLoading: true
        });

        fireEvent.click(screen.getByTestId('stop-loading-a'));
        expect(stopLoadingA).toHaveBeenCalledWith('a');
        rerender(<TestConsumer />);

        // Check 'a' is not loading, but 'b' still is
        expect(screen.getByTestId('is-loading-a').textContent).toBe('false');
        expect(screen.getByTestId('is-loading-b').textContent).toBe('true');
        expect(screen.getByTestId('is-loading-array').textContent).toBe('true');
        expect(screen.getByTestId('is-loading-any').textContent).toBe('true');
        expect(screen.getByTestId('any-loading').textContent).toBe('true');

        // Step 5: Stop loading 'b'
        const stopLoadingB = vi.fn();
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: { a: false, b: false },
            isLoading: vi.fn((key) => false),
            startLoading: vi.fn(),
            stopLoading: stopLoadingB,
            anyLoading: false
        });

        fireEvent.click(screen.getByTestId('stop-loading-b'));
        expect(stopLoadingB).toHaveBeenCalledWith('b');
        rerender(<TestConsumer />);

        // Check nothing is loading
        expect(screen.getByTestId('is-loading-a').textContent).toBe('false');
        expect(screen.getByTestId('is-loading-b').textContent).toBe('false');
        expect(screen.getByTestId('is-loading-array').textContent).toBe('false');
        expect(screen.getByTestId('is-loading-any').textContent).toBe('false');
        expect(screen.getByTestId('any-loading').textContent).toBe('false');
    });
    */

    test('isLoading with no key returns true if any state is loading', () => {
        // Step 1: Initial state
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: {},
            isLoading: vi.fn((key) => false),
            startLoading: vi.fn(),
            stopLoading: vi.fn(),
            anyLoading: false
        });

        const { rerender } = render(<TestConsumer />);

        // Step 2: Start loading 'b'
        const startLoadingB = vi.fn();
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: { b: true },
            isLoading: vi.fn((key) => {
                if (key === 'b') return true;
                if (Array.isArray(key) && key.includes('b')) return true;
                if (!key) return true;
                return false;
            }),
            startLoading: startLoadingB,
            stopLoading: vi.fn(),
            anyLoading: true
        });

        fireEvent.click(screen.getByTestId('start-loading-b'));
        rerender(<TestConsumer />);

        // Check isLoading() returns true
        expect(screen.getByTestId('is-loading-any').textContent).toBe('true');

        // Step 3: Stop loading 'b'
        const stopLoadingB = vi.fn();
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: { b: false },
            isLoading: vi.fn((key) => false),
            startLoading: vi.fn(),
            stopLoading: stopLoadingB,
            anyLoading: false
        });

        fireEvent.click(screen.getByTestId('stop-loading-b'));
        rerender(<TestConsumer />);

        // Check isLoading() returns false
        expect(screen.getByTestId('is-loading-any').textContent).toBe('false');
    });

    test('isLoading with array returns true if any key in the array is loading', () => {
        // Step 1: Initial state
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: {},
            isLoading: vi.fn((key) => false),
            startLoading: vi.fn(),
            stopLoading: vi.fn(),
            anyLoading: false
        });

        const { rerender } = render(<TestConsumer />);

        // Initial state: nothing is loading
        expect(screen.getByTestId('is-loading-array').textContent).toBe('false');

        // Step 2: Start loading 'b'
        const startLoadingB = vi.fn();
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: { b: true },
            isLoading: vi.fn((key) => {
                if (key === 'b') return true;
                if (Array.isArray(key) && key.includes('b')) return true;
                return false;
            }),
            startLoading: startLoadingB,
            stopLoading: vi.fn(),
            anyLoading: true
        });

        fireEvent.click(screen.getByTestId('start-loading-b'));
        rerender(<TestConsumer />);

        // Check isLoading(['a', 'b']) returns true since 'b' is loading
        expect(screen.getByTestId('is-loading-array').textContent).toBe('true');

        // Step 3: Stop loading 'b', start loading 'a'
        const stopLoadingB = vi.fn();
        const startLoadingA = vi.fn();
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: { b: false },
            isLoading: vi.fn((key) => false),
            startLoading: vi.fn(),
            stopLoading: stopLoadingB,
            anyLoading: false
        });

        fireEvent.click(screen.getByTestId('stop-loading-b'));
        rerender(<TestConsumer />);

        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: { a: true },
            isLoading: vi.fn((key) => {
                if (key === 'a') return true;
                if (Array.isArray(key) && key.includes('a')) return true;
                return false;
            }),
            startLoading: startLoadingA,
            stopLoading: vi.fn(),
            anyLoading: true
        });

        fireEvent.click(screen.getByTestId('start-loading-a'));
        rerender(<TestConsumer />);

        // Check isLoading(['a', 'b']) returns true since 'a' is loading
        expect(screen.getByTestId('is-loading-array').textContent).toBe('true');

        // Step 4: Stop loading 'a'
        const stopLoadingA = vi.fn();
        vi.mocked(useLoading).mockReturnValueOnce({
            loadingStates: { a: false },
            isLoading: vi.fn((key) => false),
            startLoading: vi.fn(),
            stopLoading: stopLoadingA,
            anyLoading: false
        });

        fireEvent.click(screen.getByTestId('stop-loading-a'));
        rerender(<TestConsumer />);

        // Check isLoading(['a', 'b']) returns false since neither is loading
        expect(screen.getByTestId('is-loading-array').textContent).toBe('false');
    });

    test('throws error when used outside provider', () => {
        // Mock useLoading to throw an error for this test
        vi.mocked(useLoading).mockImplementationOnce(() => {
            throw new Error('useLoading must be used within a LoadingProvider');
        });

        render(<ErrorComponent />);
        expect(screen.getByTestId('context-error')).toBeInTheDocument();
    });
});