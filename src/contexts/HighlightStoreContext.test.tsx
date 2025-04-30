import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { HighlightStoreProvider, useHighlightStore } from '../contexts/HighlightStoreContext';
import { highlightStore } from '../store/HighlightStore';
import { HighlightType } from '../types';

// Mock the highlight store
vi.mock('../store/HighlightStore', () => {
    const unsubscribeMock = vi.fn();
    return {
        highlightStore: {
            addHighlight: vi.fn().mockResolvedValue('highlight-id-1'),
            removeHighlight: vi.fn().mockResolvedValue(true),
            addMultipleHighlights: vi.fn().mockResolvedValue(['highlight-id-1', 'highlight-id-2']),
            removeMultipleHighlights: vi.fn().mockResolvedValue(true),
            getHighlightsForPage: vi.fn().mockReturnValue([{ id: 'highlight-id-1', page: 1 }]),
            addHighlightsToPage: vi.fn().mockResolvedValue(['highlight-id-1']),
            removeHighlightsFromPage: vi.fn().mockResolvedValue(true),
            getHighlightsForFile: vi.fn().mockReturnValue([{ id: 'highlight-id-1', page: 1 }]),
            addHighlightsToFile: vi.fn().mockResolvedValue(['highlight-id-1']),
            removeHighlightsFromFile: vi.fn().mockResolvedValue(true),
            getHighlightsByType: vi.fn().mockReturnValue([{ id: 'highlight-id-1', type: 'search' }]),
            addHighlightsByType: vi.fn().mockResolvedValue(['highlight-id-1']),
            removeHighlightsByType: vi.fn().mockResolvedValue(true),
            getHighlightsByProperty: vi.fn().mockReturnValue([{ id: 'highlight-id-1', custom: 'value' }]),
            removeHighlightsByProperty: vi.fn().mockResolvedValue(true),
            removeHighlightsByPropertyFromAllFiles: vi.fn().mockResolvedValue(true),
            getHighlightsByText: vi.fn().mockReturnValue([{ id: 'highlight-id-1', text: 'search text' }]),
            removeHighlightsByText: vi.fn().mockResolvedValue(true),
            removeAllHighlights: vi.fn().mockResolvedValue(true),
            removeAllHighlightsByType: vi.fn().mockResolvedValue(true),
            removeHighlightsByPosition: vi.fn().mockResolvedValue(true),
            subscribe: vi.fn(() => ({
                unsubscribe: unsubscribeMock
            }))
        },
        unsubscribeMock
    };
});

// Test component to consume the context
const TestConsumer = () => {
    const {
        addHighlight,
        removeHighlight,
        getHighlightsForPage,
        getHighlightsForFile,
        removeHighlightsFromFile,
        getHighlightsByType,
        refreshTrigger
    } = useHighlightStore();

    return (
        <div>
            <button data-testid="add-highlight" onClick={() => addHighlight({
                id: 'test', page: 1, type: HighlightType.MANUAL,
                x: 0, y: 0, w: 0, h: 0, fileKey: ''
            })} />
            <button data-testid="remove-highlight" onClick={() => removeHighlight('test')} />
            <button
                data-testid="get-page-highlights"
                onClick={() => getHighlightsForPage('file-key', 1)}
            />
            <button
                data-testid="get-file-highlights"
                onClick={() => getHighlightsForFile('file-key')}
            />
            <button
                data-testid="remove-file-highlights"
                onClick={() => removeHighlightsFromFile('file-key')}
            />
            <button
                data-testid="get-type-highlights"
                onClick={() => getHighlightsByType('file-key', HighlightType.SEARCH)}
            />
            <div data-testid="refresh-counter">{refreshTrigger}</div>
        </div>
    );
};

// Component that will cause an error by using the hook outside the provider
const ErrorComponent = () => {
    try {
        useHighlightStore();
        return <div>No error</div>;
    } catch (error) {
        return <div data-testid="context-error">Context error occurred</div>;
    }
};

describe('HighlightStoreContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('provides highlight store context to children', () => {
        render(
            <HighlightStoreProvider>
                <TestConsumer />
            </HighlightStoreProvider>
        );

        // Verify refresh counter is rendered
        expect(screen.getByTestId('refresh-counter')).toBeInTheDocument();
    });

    /*
    test('subscribes to store changes on mount and unsubscribes on unmount', () => {
        const { unmount } = render(
            <HighlightStoreProvider>
                <TestConsumer />
            </HighlightStoreProvider>
        );

        // Check that subscribe was called
        expect(highlightStore.subscribe).toHaveBeenCalled();

        // Unmount the component
        unmount();

        // The unsubscribe method should be called during unmount
        const { unsubscribeMock } = require('../store/HighlightStore');
        expect(unsubscribeMock).toHaveBeenCalled();
    });

     */

    test('addHighlight calls the store method with correct arguments', async () => {
        render(
            <HighlightStoreProvider>
                <TestConsumer />
            </HighlightStoreProvider>
        );

        // Click the button to call addHighlight
        await act(async () => {
            screen.getByTestId('add-highlight').click();
        });

        // Verify the store method was called with the expected object structure
        expect(highlightStore.addHighlight).toHaveBeenCalledWith({
            id: 'test',
            page: 1,
            type: HighlightType.MANUAL,
            x: 0,
            y: 0,
            w: 0,
            h: 0,
            fileKey: ''
        });
    });

    test('removeHighlight calls the store method with correct arguments', async () => {
        render(
            <HighlightStoreProvider>
                <TestConsumer />
            </HighlightStoreProvider>
        );

        await act(async () => {
            screen.getByTestId('remove-highlight').click();
        });

        expect(highlightStore.removeHighlight).toHaveBeenCalledWith('test');
    });

    test('getHighlightsForPage calls the store method with correct arguments', async () => {
        render(
            <HighlightStoreProvider>
                <TestConsumer />
            </HighlightStoreProvider>
        );

        await act(async () => {
            screen.getByTestId('get-page-highlights').click();
        });

        expect(highlightStore.getHighlightsForPage).toHaveBeenCalledWith('file-key', 1);
    });

    test('getHighlightsForFile calls the store method with correct arguments', async () => {
        render(
            <HighlightStoreProvider>
                <TestConsumer />
            </HighlightStoreProvider>
        );

        await act(async () => {
            screen.getByTestId('get-file-highlights').click();
        });

        expect(highlightStore.getHighlightsForFile).toHaveBeenCalledWith('file-key');
    });

    test('removeHighlightsFromFile calls the store method with correct arguments', async () => {
        render(
            <HighlightStoreProvider>
                <TestConsumer />
            </HighlightStoreProvider>
        );

        await act(async () => {
            screen.getByTestId('remove-file-highlights').click();
        });

        expect(highlightStore.removeHighlightsFromFile).toHaveBeenCalledWith('file-key');
    });

    test('getHighlightsByType calls the store method with correct arguments', async () => {
        render(
            <HighlightStoreProvider>
                <TestConsumer />
            </HighlightStoreProvider>
        );

        await act(async () => {
            screen.getByTestId('get-type-highlights').click();
        });

        expect(highlightStore.getHighlightsByType).toHaveBeenCalledWith('file-key', HighlightType.SEARCH);
    });

    /*
    test('throws error when used outside provider', () => {
        // Using try/catch directly in the test to handle the expected error
        try {
            render(<ErrorComponent />);
            // If we reach here, the test should fail
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toContain('useHighlightStore must be used within a HighlightStoreProvider');
        }
    });

     */
});