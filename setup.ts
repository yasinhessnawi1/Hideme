import '@testing-library/jest-dom/vitest';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi, beforeAll } from 'vitest';

// Make vi globally available
declare global {
    var vi: typeof import('vitest')['vi'];
}
global.vi = vi;

// React 19 testing environment setup
beforeAll(() => {
    // Set React environment flag
    (global as any).IS_REACT_ACT_ENVIRONMENT = true;

    // Suppress React warnings
    const originalConsoleError = console.error;
    console.error = (...args) => {
        // Filter out common testing warnings
        if (
            /Warning.*not wrapped in act/.test(args[0]) ||
            /Warning: An update to.*inside a test was not wrapped in act/.test(args[0]) ||
            /Target container is not a DOM element/.test(args[0]) ||
            /ReactDOM.render is no longer supported/.test(args[0])
        ) {
            return;
        }
        originalConsoleError(...args);
    };
});

// Set up DOM environment safely
beforeEach(() => {
    // Use real timers
    vi.useRealTimers();

    try {
        // Only run if we're in a browser-like environment
        if (typeof document !== 'undefined') {
            // Create test container if it doesn't exist
            if (!document.getElementById('test-root') && document.body) {
                const div = document.createElement('div');
                div.id = 'test-root';
                document.body.appendChild(div);
            }
        }
    } catch (e) {
        console.warn('Error setting up test environment:', e);
    }
});

// Cleanup after each test
afterEach(() => {
    cleanup();
    vi.resetAllMocks();
    vi.restoreAllMocks();

    try {
        // Reset the DOM container if it exists
        if (typeof document !== 'undefined' && document.getElementById('test-root')) {
            document.getElementById('test-root')!.innerHTML = '';
        }
    } catch (e) {
        console.warn('Error cleaning up test environment:', e);
    }
});

// Mock browser APIs that might be missing
if (typeof window !== 'undefined') {
    // Add matchMedia mock
    if (!window.matchMedia) {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    }

    // Add ResizeObserver mock
    if (!window.ResizeObserver) {
        window.ResizeObserver = class MockResizeObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    }

    // Add IntersectionObserver mock
    if (!window.IntersectionObserver) {
        window.IntersectionObserver = class MockIntersectionObserver {
            constructor(callback: IntersectionObserverCallback) { this.callback = callback; }
            callback: IntersectionObserverCallback;
            observe() {}
            unobserve() {}
            disconnect() {}
        } as any;
    }
}