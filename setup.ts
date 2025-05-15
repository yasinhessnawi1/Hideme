import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { expect, afterEach, beforeEach, vi, beforeAll } from 'vitest';

// Make vi globally available
declare global {
    var vi: typeof import('vitest')['vi'];
}
global.vi = vi;

// Suppress React act() warnings
// This is a common issue with React testing
beforeAll(() => {
    const originalError = console.error;
    console.error = (...args) => {
        if (
            /Warning.*not wrapped in act/.test(args[0]) ||
            /Warning: An update to.*inside a test was not wrapped in act/.test(args[0])
        ) {
            return;
        }
        originalError(...args);
    };
});

// Use real timers for all tests
// This helps with async operations in tests
beforeEach(() => {
    vi.useRealTimers();
});

// Automatically cleanup after each test
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
