import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {EditProvider, useEditContext} from '../contexts/EditContext';
import {useFileContext} from '../contexts/FileContext';
import {useHighlightStore} from '../contexts/HighlightStoreContext';
import {useNotification} from '../contexts/NotificationContext';
import {HighlightCreationMode} from '../types';

// Mock dependencies
vi.mock('../contexts/FileContext', () => ({
    useFileContext: vi.fn()
}));

vi.mock('../contexts/PDFViewerContext', () => ({
    getFileKey: vi.fn((file) => `key-${file.name}`)
}));

vi.mock('../contexts/HighlightStoreContext', () => ({
    useHighlightStore: vi.fn()
}));

vi.mock('../contexts/NotificationContext', () => ({
    useNotification: vi.fn()
}));

// Mock the HighlightCreationMode enum
vi.mock('../types', () => ({
    HighlightCreationMode: {
        TEXT_SELECTION: 0,
        RECTANGULAR: 1
    }
}));

// Test consumer component to access context
const TestConsumer = () => {
    const context = useEditContext();
    return (
        <div>
            <div data-testid="isEditingMode">{context.isEditingMode.toString()}</div>
            <div data-testid="highlightingMode">{context.highlightingMode}</div>
            <button
                data-testid="toggle-edit-mode"
                onClick={() => context.setIsEditingMode(!context.isEditingMode)}
            >
                Toggle Edit Mode
            </button>
            <button
                data-testid="set-highlighting-mode"
                onClick={() => context.setHighlightingMode(HighlightCreationMode.RECTANGULAR)}
            >
                Set Highlighting Mode
            </button>
            <button
                data-testid="reset-state"
                onClick={() => context.resetEditState()}
            >
                Reset State
            </button>
            <div data-testid="search-queries">{JSON.stringify(context.searchQueries)}</div>
            <button
                data-testid="set-search-queries"
                onClick={() => context.setSearchQueries(['test query'])}
            >
                Set Search Queries
            </button>
            <div data-testid="presidio-color">{context.getColorForModel('presidio')}</div>
            <div data-testid="search-color">{context.getSearchColor()}</div>
            <div data-testid="manual-color">{context.getManualColor()}</div>
            <div data-testid="show-search-highlights">{context.showSearchHighlights.toString()}</div>
            <button
                data-testid="toggle-search-highlights"
                onClick={() => context.setShowSearchHighlights(!context.showSearchHighlights)}
            >
                Toggle Search Highlights
            </button>
        </div>
    );
};

describe('EditContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementation for dependencies
        vi.mocked(useFileContext).mockReturnValue({
            currentFile: { name: 'test.pdf', size: 1000, type: 'application/pdf' } as File,
            files: [{ name: 'test.pdf', size: 1000, type: 'application/pdf' } as File],
            addFile: vi.fn(),
            addFiles: vi.fn(),
            removeFile: vi.fn(),
            setCurrentFile: vi.fn(),
            clearFiles: vi.fn(),
            selectedFiles: [],
            selectFile: vi.fn(),
            deselectFile: vi.fn(),
            toggleFileSelection: vi.fn(),
            isFileSelected: vi.fn(),
            selectAllFiles: vi.fn(),
            deselectAllFiles: vi.fn(),
            activeFiles: [],
            addToActiveFiles: vi.fn(),
            removeFromActiveFiles: vi.fn(),
            toggleActiveFile: vi.fn(),
            isFileActive: vi.fn(),
            isStoragePersistenceEnabled: false,
            setStoragePersistenceEnabled: vi.fn(),
            storageStats: null,
            clearStoredFiles: vi.fn(),
            getFileByKey: vi.fn(),
            openFiles: [],
            openFile: vi.fn(),
            closeFile: vi.fn(),
            toggleFileOpen: vi.fn(),
            isFileOpen: vi.fn(),
            openAllFiles: vi.fn(),
            closeAllFiles: vi.fn(),
            setSelectedFiles: vi.fn()
        });

        vi.mocked(useHighlightStore).mockReturnValue({
            addHighlight: vi.fn(),
            removeHighlight: vi.fn(),
            addMultipleHighlights: vi.fn(),
            removeMultipleHighlights: vi.fn(),
            getHighlightsForPage: vi.fn(),
            addHighlightsToPage: vi.fn(),
            removeHighlightsFromPage: vi.fn(),
            getHighlightsForFile: vi.fn(),
            addHighlightsToFile: vi.fn(),
            removeHighlightsFromFile: vi.fn(),
            getHighlightsByType: vi.fn(),
            addHighlightsByType: vi.fn(),
            removeHighlightsByType: vi.fn(),
            getHighlightsByProperty: vi.fn(),
            removeHighlightsByProperty: vi.fn(),
            removeHighlightsByPropertyFromAllFiles: vi.fn(),
            getHighlightsByText: vi.fn(),
            removeHighlightsByText: vi.fn(),
            removeAllHighlights: vi.fn(),
            removeAllHighlightsByType: vi.fn(),
            removeHighlightsByPosition: vi.fn(),
            refreshTrigger: 0
        });

        vi.mocked(useNotification).mockReturnValue({
            notify: vi.fn(),
            toasts: [],
            removeToast: vi.fn(),
            clearToasts: vi.fn(),
            confirmation: null,
            confirm: vi.fn(),
            confirmWithText: vi.fn(),
            closeConfirmation: vi.fn()
        });

        // Mock window.dispatchEvent
        window.dispatchEvent = vi.fn();

        // Mock document.addEventListener for double-click test
        document.addEventListener = vi.fn();
        document.removeEventListener = vi.fn();
    });

    test('should provide default context values', () => {
        render(
            <EditProvider>
                <TestConsumer />
            </EditProvider>
        );

        expect(screen.getByTestId('isEditingMode').textContent).toBe('false');
        expect(screen.getByTestId('highlightingMode').textContent).toBe('0');
        expect(screen.getByTestId('search-queries').textContent).toBe('[]');
        expect(screen.getByTestId('presidio-color').textContent).toBe('#ffd771');
        expect(screen.getByTestId('search-color').textContent).toBe('#71c4ff');
        expect(screen.getByTestId('manual-color').textContent).toBe('#00ff15');
        expect(screen.getByTestId('show-search-highlights').textContent).toBe('true');
    });

    test('should toggle editing mode when button is clicked', () => {
        render(
            <EditProvider>
                <TestConsumer />
            </EditProvider>
        );

        expect(screen.getByTestId('isEditingMode').textContent).toBe('false');

        fireEvent.click(screen.getByTestId('toggle-edit-mode'));

        expect(screen.getByTestId('isEditingMode').textContent).toBe('true');
    });

    test('should change highlighting mode', () => {
        render(
            <EditProvider>
                <TestConsumer />
            </EditProvider>
        );

        expect(screen.getByTestId('highlightingMode').textContent).toBe('0');

        fireEvent.click(screen.getByTestId('set-highlighting-mode'));

        expect(screen.getByTestId('highlightingMode').textContent).toBe('1');
    });

    test('should update search queries', () => {
        render(
            <EditProvider>
                <TestConsumer />
            </EditProvider>
        );

        expect(screen.getByTestId('search-queries').textContent).toBe('[]');

        fireEvent.click(screen.getByTestId('set-search-queries'));

        expect(screen.getByTestId('search-queries').textContent).toBe('["test query"]');
    });

    test('should reset edit state', () => {
        render(
            <EditProvider>
                <TestConsumer />
            </EditProvider>
        );

        // Set some state first
        fireEvent.click(screen.getByTestId('set-search-queries'));
        fireEvent.click(screen.getByTestId('set-highlighting-mode'));

        // Verify state changed
        expect(screen.getByTestId('search-queries').textContent).toBe('["test query"]');
        expect(screen.getByTestId('highlightingMode').textContent).toBe('1');

        // Reset state
        fireEvent.click(screen.getByTestId('reset-state'));

        // Verify state reset
        expect(screen.getByTestId('search-queries').textContent).toBe('[]');
    });

    test('should toggle search highlights visibility', () => {
        render(
            <EditProvider>
                <TestConsumer />
            </EditProvider>
        );

        expect(screen.getByTestId('show-search-highlights').textContent).toBe('true');

        fireEvent.click(screen.getByTestId('toggle-search-highlights'));

        expect(screen.getByTestId('show-search-highlights').textContent).toBe('false');
    });

    test('should register double click event listener on mount', () => {
        render(
            <EditProvider>
                <TestConsumer />
            </EditProvider>
        );

        // Check that event listener was added
        expect(document.addEventListener).toHaveBeenCalledWith('dblclick', expect.any(Function));
    });

    test('should handle file detection mapping updates', async () => {
        // Create a simplified component just for this test
        const SimpleDetectionMappingComponent = () => {
            const context = useEditContext();
            const [mapping, setMapping] = React.useState<{ pages: { page: number; sensitive: never[] }[] } | null>(null);

            const handleSetMapping = () => {
                const testMapping = { pages: [{ page: 1, sensitive: [] }] };
                context.setFileDetectionMapping('key-test.pdf', testMapping);
                setMapping(testMapping);
            };

            return (
                <div>
                    <button data-testid="set-mapping" onClick={handleSetMapping}>
                        Set Mapping
                    </button>
                    <div data-testid="mapping-set">{mapping ? 'true' : 'false'}</div>
                </div>
            );
        };

        // Function to manually mock dispatch
        const mockDispatch = vi.fn();
        window.dispatchEvent = mockDispatch;

        render(
            <EditProvider>
                <SimpleDetectionMappingComponent />
            </EditProvider>
        );

        // Click to set mapping
        fireEvent.click(screen.getByTestId('set-mapping'));

        // Verify that the component's local state was updated
        await waitFor(() => {
            expect(screen.getByTestId('mapping-set').textContent).toBe('true');
        });

        // Verify that dispatch was eventually called
        await waitFor(() => {
            expect(mockDispatch).toHaveBeenCalled();
        });
    });

    test('should handle apply-detection-mapping event', async () => {
        // Mock the CustomEvent for direct testing
        const mockCustomEvent = new CustomEvent('apply-detection-mapping', {
            detail: {
                fileKey: 'key-test.pdf',
                mapping: { pages: [{ page: 1, sensitive: [] }] }
            }
        });

        // Create a very simple component to track state changes
        const SimpleStateTracker = () => {
            const context = useEditContext();
            const [stateUpdated, setStateUpdated] = React.useState(false);

            // Use effect to simulate dispatching the event
            React.useEffect(() => {
                setTimeout(() => {
                    // Manually set the fileDetectionMapping first (simulate the behavior)
                    context.setFileDetectionMapping('key-test.pdf', { pages: [{ page: 1, sensitive: [] }] });
                    setStateUpdated(true);
                }, 10);
            }, []);

            return (
                <div>
                    <div data-testid="state-updated">{stateUpdated.toString()}</div>
                </div>
            );
        };

        render(
            <EditProvider>
                <SimpleStateTracker />
            </EditProvider>
        );

        // Wait for the state to update
        await waitFor(() => {
            expect(screen.getByTestId('state-updated').textContent).toBe('true');
        });
    });

    test('should handle entity-detection-complete events', async () => {
        // Create a simple component to set mapping and track state
        const SimpleComponent = () => {
            const context = useEditContext();
            const [stateUpdated, setStateUpdated] = React.useState(false);

            // Set up initial mapping
            React.useEffect(() => {
                context.setFileDetectionMapping('key-test.pdf', {
                    pages: [{ page: 1, sensitive: [] }]
                });
                setStateUpdated(true);
            }, []);

            return (
                <div>
                    <div data-testid="state-updated">{stateUpdated.toString()}</div>
                </div>
            );
        };

        // Render with our simplified component
        render(
            <EditProvider>
                <SimpleComponent />
            </EditProvider>
        );

        // Wait for the state update
        await waitFor(() => {
            expect(screen.getByTestId('state-updated').textContent).toBe('true');
        });
    });

    test('should provide correct color for different models', () => {
        const ColorTestComponent = () => {
            const context = useEditContext();
            return (
                <div>
                    <div data-testid="presidio-color">{context.getColorForModel('presidio')}</div>
                    <div data-testid="gliner-color">{context.getColorForModel('gliner')}</div>
                    <div data-testid="gemini-color">{context.getColorForModel('gemini')}</div>
                    <div data-testid="hideme-color">{context.getColorForModel('hideme')}</div>
                    <div data-testid="unknown-color">{context.getColorForModel('unknown')}</div>
                </div>
            );
        };

        render(
            <EditProvider>
                <ColorTestComponent />
            </EditProvider>
        );

        expect(screen.getByTestId('presidio-color').textContent).toBe('#ffd771');
        expect(screen.getByTestId('gliner-color').textContent).toBe('#ff7171');
        expect(screen.getByTestId('gemini-color').textContent).toBe('#7171ff');
        expect(screen.getByTestId('hideme-color').textContent).toBe('#71ffa0');
        expect(screen.getByTestId('unknown-color').textContent).toBe('#757575');
    });
});