import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationProvider, useNotification, NotificationType } from '../contexts/NotificationContext';
import {runInThisContext} from "node:vm";

// Mock the LanguageContext
vi.mock('../contexts/LanguageContext', () => ({
    useLanguage: vi.fn(() => ({
        t: (category: string, key: string, params?: Record<string, string | number>) => key,
        language: 'en',
        setLanguage: vi.fn()
    }))
}));

// Mock timers
beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.restoreAllMocks();
});

// Test component to consume the context
const TestConsumer = () => {
    const { toasts, notify, removeToast, clearToasts, confirmation, confirm, closeConfirmation } = useNotification();

    return (
        <div>
            <button
                data-testid="add-success-toast"
                onClick={() => notify({ type: 'success', message: 'Success message' })}
            >
                Add Success Toast
            </button>
            <button
                data-testid="add-error-toast"
                onClick={() => notify({ type: 'error', message: 'Error message', duration: 1000 })}
            >
                Add Error Toast
            </button>
            <button
                data-testid="add-info-toast"
                onClick={() => notify({ type: 'info', message: 'Info message', position: 'bottom-center' })}
            >
                Add Info Toast
            </button>
            <button
                data-testid="add-infinite-toast"
                onClick={() => notify({ type: 'warning', message: 'Warning message', duration: Infinity })}
            >
                Add Infinite Toast
            </button>
            <button
                data-testid="remove-first-toast"
                onClick={() => toasts[0] && removeToast(toasts[0].id)}
            >
                Remove First Toast
            </button>
            <button data-testid="clear-toasts" onClick={clearToasts}>Clear All Toasts</button>
            <button
                data-testid="show-confirm"
                onClick={() => confirm({
                    type: 'confirm',
                    title: 'Confirmation Title',
                    message: 'Confirmation message'
                })}
            >
                Show Confirmation
            </button>
            <button
                data-testid="show-delete-confirm"
                onClick={() => confirm({
                    type: 'delete',
                    title: 'Delete Confirmation',
                    message: 'Are you sure you want to delete this?'
                })}
            >
                Show Delete Confirmation
            </button>
            <button
                data-testid="show-custom-buttons-confirm"
                onClick={() => confirm({
                    type: 'warning',
                    title: 'Custom Buttons',
                    message: 'Custom buttons confirmation',
                    confirmButton: { label: 'Custom Confirm', variant: 'warning' },
                    cancelButton: { label: 'Custom Cancel', variant: 'secondary' }
                })}
            >
                Show Custom Buttons Confirmation
            </button>
            <button data-testid="close-confirmation" onClick={closeConfirmation}>Close Confirmation</button>
            <div data-testid="toast-count">{toasts.length}</div>
            <div data-testid="has-confirmation">{confirmation ? 'true' : 'false'}</div>
            <pre data-testid="toasts-data">{JSON.stringify(toasts)}</pre>
            <pre data-testid="confirmation-data">{confirmation ? JSON.stringify({
                type: confirmation.type,
                title: confirmation.title,
                message: confirmation.message
            }) : 'null'}</pre>
        </div>
    );
};

// Component that will cause an error by using the hook outside the provider
const ErrorComponent = () => {
    try {
        useNotification();
        return <div>No error</div>;
    } catch (error) {
        return <div data-testid="context-error">Context error occurred</div>;
    }
};

describe('NotificationContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('provides notification context to children with initial state', () => {
        render(
            <NotificationProvider>
                <TestConsumer />
            </NotificationProvider>
        );

        // Initial state should have no toasts or confirmation
        expect(screen.getByTestId('toast-count').textContent).toBe('0');
        expect(screen.getByTestId('has-confirmation').textContent).toBe('false');
        expect(screen.getByTestId('toasts-data').textContent).toBe('[]');
        expect(screen.getByTestId('confirmation-data').textContent).toBe('null');
    });

    test('adds toast notification with notify method', () => {
        render(
            <NotificationProvider>
                <TestConsumer />
            </NotificationProvider>
        );

        // Add a success toast
        fireEvent.click(screen.getByTestId('add-success-toast'));

        // Check that the toast was added
        expect(screen.getByTestId('toast-count').textContent).toBe('1');

        const toasts = JSON.parse(screen.getByTestId('toasts-data').textContent || '[]');
        expect(toasts.length).toBe(1);
        expect(toasts[0].type).toBe('success');
        expect(toasts[0].message).toBe('Success message');
    });

    test('removes toast notification with removeToast method', () => {
        render(
            <NotificationProvider>
                <TestConsumer />
            </NotificationProvider>
        );

        // Add a toast
        fireEvent.click(screen.getByTestId('add-success-toast'));

        // Verify toast was added
        expect(screen.getByTestId('toast-count').textContent).toBe('1');

        // Remove the toast
        fireEvent.click(screen.getByTestId('remove-first-toast'));

        // Check that the toast was removed
        expect(screen.getByTestId('toast-count').textContent).toBe('0');
    });

    test('clears all toast notifications with clearToasts method', () => {
        render(
            <NotificationProvider>
                <TestConsumer />
            </NotificationProvider>
        );

        // Add multiple toasts
        fireEvent.click(screen.getByTestId('add-success-toast'));
        fireEvent.click(screen.getByTestId('add-error-toast'));
        fireEvent.click(screen.getByTestId('add-info-toast'));

        // Verify toasts were added
        expect(screen.getByTestId('toast-count').textContent).toBe('3');

        // Clear all toasts
        fireEvent.click(screen.getByTestId('clear-toasts'));

        // Check that all toasts were removed
        expect(screen.getByTestId('toast-count').textContent).toBe('0');
    });

    test('automatically removes toast after duration', async () => {
        render(
            <NotificationProvider>
                <TestConsumer />
            </NotificationProvider>
        );

        // Add a toast with 1000ms duration
        fireEvent.click(screen.getByTestId('add-error-toast'));

        // Verify toast was added
        expect(screen.getByTestId('toast-count').textContent).toBe('1');

        // Fast-forward time by 1000ms
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        // Check that the toast was automatically removed
        expect(screen.getByTestId('toast-count').textContent).toBe('0');
    });

    test('does not automatically remove toast with infinite duration', async () => {
        render(
            <NotificationProvider>
                <TestConsumer />
            </NotificationProvider>
        );

        // Add a toast with Infinity duration
        fireEvent.click(screen.getByTestId('add-infinite-toast'));

        // Verify toast was added
        expect(screen.getByTestId('toast-count').textContent).toBe('1');

        // Fast-forward time by a long period
        act(() => {
            vi.advanceTimersByTime(100000);
        });

        // Check that the toast was not automatically removed
        expect(screen.getByTestId('toast-count').textContent).toBe('1');
    });

    /*
    test('creates confirmation with confirm method', async () => {
        const confirmationResult = vi.fn();

        render(
            <NotificationProvider>
                <TestConsumer />
            </NotificationProvider>
        );

        // Create a promise that will resolve with the confirmation result
        let resolvePromise: (value: boolean) => void;
        const confirmPromise = new Promise<boolean>((resolve) => {
            resolvePromise = resolve;
        });



        // Mock the Promise.prototype.then method to capture the result
 const originalThen = Promise.prototype.then;
 Promise.prototype.then = function<TResult1 = any, TResult2 = never>(
     onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null | undefined,
     onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
 ): Promise<TResult1 | TResult2> {
     if (onfulfilled) {
         const originalOnFulfilled = onfulfilled;
         onfulfilled = function(value) {
             confirmationResult(value);
             resolvePromise(value);
             return originalOnFulfilled(value);
         } as typeof originalOnFulfilled;
     }
     return originalThen.call(this, onfulfilled, onrejected) as Promise<TResult1 | TResult2>;
 };

        // Show a confirmation
        fireEvent.click(screen.getByTestId('show-confirm'));

        // Check that the confirmation is shown
        expect(screen.getByTestId('has-confirmation').textContent).toBe('true');

        const confirmation = JSON.parse(screen.getByTestId('confirmation-data').textContent || '{}');
        expect(confirmation.type).toBe('confirm');
        expect(confirmation.title).toBe('Confirmation Title');
        expect(confirmation.message).toBe('Confirmation message');

        // Simulate clicking the confirm button by calling its onClick
        const confirmButton = JSON.parse(screen.getByTestId('toasts-data').textContent || '[]')[0]?.confirmButton;
        if (confirmButton) {
            act(() => {
                confirmButton.onClick();
            });
        }

        // Wait for the confirmation promise to resolve
        await confirmPromise;

        // Check that the confirmation was resolved with true and then closed
        expect(confirmationResult).toHaveBeenCalledWith(true);
        expect(screen.getByTestId('has-confirmation').textContent).toBe('false');

        // Restore the original Promise.prototype.then
        Promise.prototype.then = originalThen;
    });
    */

    test('closes confirmation with closeConfirmation method', () => {
        render(
            <NotificationProvider>
                <TestConsumer />
            </NotificationProvider>
        );

        // Show a confirmation
        fireEvent.click(screen.getByTestId('show-confirm'));

        // Verify confirmation is shown
        expect(screen.getByTestId('has-confirmation').textContent).toBe('true');

        // Close the confirmation
        fireEvent.click(screen.getByTestId('close-confirmation'));

        // Check that the confirmation was closed
        expect(screen.getByTestId('has-confirmation').textContent).toBe('false');
    });

    test('creates delete confirmation with customized button', () => {
        render(
            <NotificationProvider>
                <TestConsumer />
            </NotificationProvider>
        );

        // Show a delete confirmation
        fireEvent.click(screen.getByTestId('show-delete-confirm'));

        // Check that the confirmation is shown with delete type
        expect(screen.getByTestId('has-confirmation').textContent).toBe('true');

        const confirmation = JSON.parse(screen.getByTestId('confirmation-data').textContent || '{}');
        expect(confirmation.type).toBe('delete');
        expect(confirmation.title).toBe('Delete Confirmation');

        // Close the confirmation
        fireEvent.click(screen.getByTestId('close-confirmation'));
    });

    test('creates confirmation with custom buttons', () => {
        render(
            <NotificationProvider>
                <TestConsumer />
            </NotificationProvider>
        );

        // Show a confirmation with custom buttons
        fireEvent.click(screen.getByTestId('show-custom-buttons-confirm'));

        // Check that the confirmation is shown
        expect(screen.getByTestId('has-confirmation').textContent).toBe('true');

        const confirmation = JSON.parse(screen.getByTestId('confirmation-data').textContent || '{}');
        expect(confirmation.type).toBe('warning');

        // Close the confirmation
        fireEvent.click(screen.getByTestId('close-confirmation'));
    });

    test('supports different toast types and positions', () => {
        render(
            <NotificationProvider>
                <TestConsumer />
            </NotificationProvider>
        );

        // Add toasts with different types and positions
        fireEvent.click(screen.getByTestId('add-success-toast')); // type: success, default position
        fireEvent.click(screen.getByTestId('add-error-toast')); // type: error, default position
        fireEvent.click(screen.getByTestId('add-info-toast')); // type: info, position: bottom-center

        // Verify toasts were added with correct types and positions
        const toasts = JSON.parse(screen.getByTestId('toasts-data').textContent || '[]');
        expect(toasts.length).toBe(3);

        // Check first toast (success)
        expect(toasts[0].type).toBe('success');
        expect(toasts[0].position).toBe('top-right'); // default position

        // Check second toast (error)
        expect(toasts[1].type).toBe('error');

        // Check third toast (info with custom position)
        expect(toasts[2].type).toBe('info');
        expect(toasts[2].position).toBe('bottom-center');
    });

    test('throws error when used outside provider', () => {
        render(<ErrorComponent />);
        expect(screen.getByTestId('context-error')).toBeInTheDocument();
    });
});