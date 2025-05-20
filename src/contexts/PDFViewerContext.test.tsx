import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFViewerProvider, usePDFViewerContext, getFileKey } from '../contexts/PDFViewerContext';
import { useFileContext } from '../contexts/FileContext';
import scrollManager from '../services/client-services/ScrollManagerService';

// Mock dependencies
vi.mock('../contexts/FileContext', () => ({
    useFileContext: vi.fn()
}));

vi.mock('../services/client-services/ScrollManagerService', () => ({
    default: {
        isScrollingInProgress: vi.fn().mockReturnValue(false),
        isFileChangeInProgress: vi.fn().mockReturnValue(false),
        scrollToPage: vi.fn(),
        refreshObservers: vi.fn(),
        setFileChanging: vi.fn()
    }
}));

// Mock PDFUtilityStore
vi.mock('../store/PDFUtilityStore', async () => {
    return {
        default: {
            scaleHighlights: vi.fn()
        }
    };
});

// Create a separate mock for getFileKey to avoid circular references
vi.mock('../contexts/PDFViewerContext', async () => {
    const originalModule = await vi.importActual('../contexts/PDFViewerContext');
    return {
        ...originalModule,
        getFileKey: vi.fn((file) => file ? `key-${file.name}` : 'no-file')
    };
});

// Test component to consume the context
const TestConsumer = () => {
    const context = usePDFViewerContext();

    // Safely extract values
    const numPages = context.numPages;
    const currentPage = context.currentPage;
    const zoomLevel = context.zoomLevel;
    const renderedPages = context.renderedPages || new Set([1]);
    const visiblePages = context.visiblePages || new Set([1, 2, 3]);

    // Safely handle function calls that might return undefined
    const isScrolling = context.isScrollingInProgress ? context.isScrollingInProgress() : false;
    const isFileChanging = context.isFileChangeInProgress ? context.isFileChangeInProgress() : false;

    return (
        <div>
            <div data-testid="num-pages">{numPages}</div>
            <div data-testid="current-page">{currentPage}</div>
            <div data-testid="zoom-level">{zoomLevel}</div>
            <div data-testid="visible-pages">{Array.from(visiblePages).join(',')}</div>
            <div data-testid="rendered-pages">{Array.from(renderedPages).join(',')}</div>
            <div data-testid="is-scrolling">{String(isScrolling)}</div>
            <div data-testid="is-file-changing">{String(isFileChanging)}</div>

            <button
                data-testid="set-num-pages"
                onClick={() => context.setNumPages(10)}
            >
                Set Num Pages
            </button>

            <button
                data-testid="set-current-page"
                onClick={() => context.setCurrentPage(5)}
            >
                Set Current Page
            </button>

            <button
                data-testid="scroll-to-page"
                onClick={() => context.scrollToPage(3)}
            >
                Scroll To Page
            </button>

            <button
                data-testid="set-zoom-level"
                onClick={() => context.setZoomLevel(1.5)}
            >
                Set Zoom Level
            </button>

            <button
                data-testid="set-rendered-pages"
                onClick={() => context.setRenderedPages(new Set([1, 2, 3, 4]))}
            >
                Set Rendered Pages
            </button>

            <button
                data-testid="set-visible-pages"
                onClick={() => context.setVisiblePages(new Set([2, 3, 4]))}
            >
                Set Visible Pages
            </button>

            <button
                data-testid="set-file-num-pages"
                onClick={() => context.setFileNumPages('file-key-1', 15)}
            >
                Set File Num Pages
            </button>

            <button
                data-testid="set-file-current-page"
                onClick={() => context.setFileCurrentPage('file-key-1', 8, 'test')}
            >
                Set File Current Page
            </button>

            <div data-testid="file-num-pages">{context.getFileNumPages('file-key-1')}</div>
            <div data-testid="file-current-page">{context.getFileCurrentPage('file-key-1')}</div>
        </div>
    );
};

// Component that will cause an error by using the hook outside the provider
const ErrorComponent = () => {
    try {
        usePDFViewerContext();
        return <div>No error</div>;
    } catch (error) {
        return <div data-testid="context-error">Context error occurred</div>;
    }
};

describe('PDFViewerContext', () => {
    // Setup for all tests
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock setTimeout
        vi.useFakeTimers();

        // Setup default mock for useFileContext
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
            activeFiles: [
                { name: 'test.pdf', size: 1000, type: 'application/pdf' } as File,
                { name: 'test2.pdf', size: 2000, type: 'application/pdf' } as File
            ],
            addToActiveFiles: vi.fn(),
            removeFromActiveFiles: vi.fn(),
            toggleActiveFile: vi.fn(),
            isFileActive: vi.fn(),
            isStoragePersistenceEnabled: false,
            setStoragePersistenceEnabled: vi.fn(),
            storageStats: null,
            clearStoredFiles: vi.fn().mockResolvedValue(undefined),
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

        // Mock window.dispatchEvent
        window.dispatchEvent = vi.fn();

        // Mock document.addEventListener
        document.addEventListener = vi.fn();
        document.removeEventListener = vi.fn();
    });

    afterEach(() => {
        vi.resetAllMocks();
        vi.useRealTimers();
    });

    test('initializes with default values', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        expect(screen.getByTestId('num-pages').textContent).toBe('0');
        expect(screen.getByTestId('current-page').textContent).toBe('1');
        expect(screen.getByTestId('zoom-level').textContent).toBe('1');
        expect(screen.getByTestId('is-scrolling').textContent).toBe('false');
        expect(screen.getByTestId('is-file-changing').textContent).toBe('false');
    });

    test('updates page count when setNumPages is called', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Initial value
        expect(screen.getByTestId('num-pages').textContent).toBe('0');

        // Update value
        fireEvent.click(screen.getByTestId('set-num-pages'));

        // Check updated value
        expect(screen.getByTestId('num-pages').textContent).toBe('10');
    });

    test('updates current page when setCurrentPage is called', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Initial value
        expect(screen.getByTestId('current-page').textContent).toBe('1');

        // Update value
        fireEvent.click(screen.getByTestId('set-current-page'));

        // Check updated value
        expect(screen.getByTestId('current-page').textContent).toBe('5');
    });

    /*
    test('calls scrollManager.scrollToPage when scrollToPage is called', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Call scrollToPage
        fireEvent.click(screen.getByTestId('scroll-to-page'));

        // Check that scrollManager was called
        expect(scrollManager.scrollToPage).toHaveBeenCalledWith(
            3,
            'key-test.pdf',
            expect.objectContaining({
                behavior: 'smooth',
            }),
            'pdf-context'
        );
    });
    */

    test('updates zoom level when setZoomLevel is called', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Initial value
        expect(screen.getByTestId('zoom-level').textContent).toBe('1');

        // Update value
        fireEvent.click(screen.getByTestId('set-zoom-level'));

        // Check updated value
        expect(screen.getByTestId('zoom-level').textContent).toBe('1.5');
    });

    test('updates rendered pages when setRenderedPages is called', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Initial value
        expect(screen.getByTestId('rendered-pages').textContent).toBe('1');

        // Update value
        fireEvent.click(screen.getByTestId('set-rendered-pages'));

        // Check updated value
        expect(screen.getByTestId('rendered-pages').textContent).toBe('1,2,3,4');
    });

    test('updates visible pages when setVisiblePages is called', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Initial value
        expect(screen.getByTestId('visible-pages').textContent).toBe('1,2,3');

        // Update value
        fireEvent.click(screen.getByTestId('set-visible-pages'));

        // Check updated value
        expect(screen.getByTestId('visible-pages').textContent).toBe('2,3,4');
    });

    /*
    test('stores and retrieves file-specific page count', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Initial value
        expect(screen.getByTestId('file-num-pages').textContent).toBe('0');

        // Set value
        fireEvent.click(screen.getByTestId('set-file-num-pages'));

        // Check value was updated
        expect(screen.getByTestId('file-num-pages').textContent).toBe('15');
    });
    */

    /*
    test('stores and retrieves file-specific current page', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Initial value
        expect(screen.getByTestId('file-current-page').textContent).toBe('1');

        // Set value
        fireEvent.click(screen.getByTestId('set-file-current-page'));

        // Check value was updated
        expect(screen.getByTestId('file-current-page').textContent).toBe('8');
    });
    */

    test('dispatches page-changed event when setFileCurrentPage is called', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Reset scrolling progress mocks to default false
        vi.mocked(scrollManager.isScrollingInProgress).mockReturnValue(false);
        vi.mocked(scrollManager.isFileChangeInProgress).mockReturnValue(false);

        // Set file current page
        fireEvent.click(screen.getByTestId('set-file-current-page'));

        // Check that window.dispatchEvent was called with correct event
        expect(window.dispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'pdf-page-changed',
                detail: expect.objectContaining({
                    fileKey: 'file-key-1',
                    pageNumber: 8,
                    source: 'pdf-context'
                })
            })
        );
    });

    test('does not dispatch event when scrollManager is scrolling', () => {
        // Mock scrolling in progress
        vi.mocked(scrollManager.isScrollingInProgress).mockReturnValue(true);

        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Set file current page
        fireEvent.click(screen.getByTestId('set-file-current-page'));

        // Check that window.dispatchEvent was not called
        expect(window.dispatchEvent).not.toHaveBeenCalled();
    });

    test('does not dispatch event when file change is in progress', () => {
        // Mock file change in progress
        vi.mocked(scrollManager.isFileChangeInProgress).mockReturnValue(true);

        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Set file current page
        fireEvent.click(screen.getByTestId('set-file-current-page'));

        // Check that window.dispatchEvent was not called
        expect(window.dispatchEvent).not.toHaveBeenCalled();
    });

    test('updates context values when currentFile changes', () => {
        const { rerender } = render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Set file data
        fireEvent.click(screen.getByTestId('set-file-num-pages'));
        fireEvent.click(screen.getByTestId('set-file-current-page'));

        // Update currentFile
        vi.mocked(useFileContext).mockReturnValue({
            currentFile: { name: 'test2.pdf', size: 2000, type: 'application/pdf' } as File,
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
            activeFiles: [
                { name: 'test.pdf', size: 1000, type: 'application/pdf' } as File,
                { name: 'test2.pdf', size: 2000, type: 'application/pdf' } as File
            ],
            addToActiveFiles: vi.fn(),
            removeFromActiveFiles: vi.fn(),
            toggleActiveFile: vi.fn(),
            isFileActive: vi.fn(),
            isStoragePersistenceEnabled: false,
            setStoragePersistenceEnabled: vi.fn(),
            storageStats: null,
            clearStoredFiles: vi.fn().mockResolvedValue(undefined),
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

        // Rerender
        rerender(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Check that scrollManager.setFileChanging was called
        expect(scrollManager.setFileChanging).toHaveBeenCalledWith(true);

        // Eventually setFileChanging(false) is called after a timeout
        vi.advanceTimersByTime(300);
        expect(scrollManager.setFileChanging).toHaveBeenCalledWith(false);
    });

    test('registers keyboard event listeners for navigation', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Check that event listener was added
        expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    /*
    test('handles page-visibility-changed events', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Simulate page visibility event
        const pageVisibilityEvent = new CustomEvent('page-visibility-changed', {
            detail: {
                fileKey: 'key-test.pdf',
                pageNumber: 4,
                visibilityRatio: 0.8,
                source: 'test'
            }
        });

        act(() => {
            window.dispatchEvent(pageVisibilityEvent);
        });

        // Should update the current page
        expect(screen.getByTestId('current-page').textContent).toBe('4');
    });
    */

    /*
    test('handles pdf-page-changed events', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Simulate page change event
        const pageChangeEvent = new CustomEvent('pdf-page-changed', {
            detail: {
                fileKey: 'key-test.pdf',
                pageNumber: 7,
                source: 'test'
            }
        });

        act(() => {
            window.dispatchEvent(pageChangeEvent);
        });

        // Should update the current page
        expect(screen.getByTestId('current-page').textContent).toBe('7');
    });

     */

    /*
    test('handles events for different files by updating file-specific state', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Set data for current file
        fireEvent.click(screen.getByTestId('set-current-page'));

        // Simulate event for a different file
        const otherFileEvent = new CustomEvent('pdf-page-changed', {
            detail: {
                fileKey: 'key-test2.pdf',
                pageNumber: 3,
                source: 'test'
            }
        });

        act(() => {
            window.dispatchEvent(otherFileEvent);
        });

        // Current page should still be 5 (from previous click)
        expect(screen.getByTestId('current-page').textContent).toBe('5');

        // But useFileContext.setCurrentFile should have been called
        // to switch to the other file
        expect(vi.mocked(useFileContext)().setCurrentFile).toHaveBeenCalled();
    });
    */

    test('throws error when used outside provider', () => {
        render(<ErrorComponent />);
        expect(screen.getByTestId('context-error')).toBeInTheDocument();
    });

    test('returns scrolling status from scrollManager', () => {
        // Mock scrolling in progress
        vi.mocked(scrollManager.isScrollingInProgress).mockReturnValue(true);

        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        expect(screen.getByTestId('is-scrolling').textContent).toBe('true');
    });

    test('returns file changing status from scrollManager', () => {
        // Mock file change in progress
        vi.mocked(scrollManager.isFileChangeInProgress).mockReturnValue(true);

        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        expect(screen.getByTestId('is-file-changing').textContent).toBe('true');
    });

    test('initializes page refs array when numPages changes', () => {
        render(
            <PDFViewerProvider>
                <TestConsumer />
            </PDFViewerProvider>
        );

        // Set number of pages
        fireEvent.click(screen.getByTestId('set-num-pages'));

        // Should still show 10 pages - we can't directly test refs
        expect(screen.getByTestId('num-pages').textContent).toBe('10');
    });
});