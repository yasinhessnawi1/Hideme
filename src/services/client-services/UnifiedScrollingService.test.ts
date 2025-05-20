import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import scrollManager from '../../services/client-services/ScrollManagerService';

// Create a mock for window.dispatchEvent
vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);

// Mock IntersectionObserver
class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
    }
    callback: IntersectionObserverCallback;
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    // Method to simulate intersection changes
    simulateIntersection(entries: IntersectionObserverEntry[]) {
        this.callback(entries, this as unknown as IntersectionObserver);
    }
}

// Mock document.querySelector and related DOM methods
vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
    if (selector.includes('pdf-viewer-container')) {
        return {
            getBoundingClientRect: () => ({
                top: 0,
                bottom: 500,
                left: 0,
                right: 800,
                width: 800,
                height: 500
            }),
            scrollTo: vi.fn(),
            scrollTop: 0
        } as unknown as Element;
    }
    return null;
});

// Mock document.querySelectorAll
vi.spyOn(document, 'querySelectorAll').mockReturnValue([] as unknown as NodeListOf<Element>);

describe('ScrollManagerService', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.resetAllMocks();

        // Restore original IntersectionObserver
        global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

        // Reset the scrollManager internal state
        // @ts-ignore - Accessing private properties for testing
        scrollManager['isScrolling'] = false;
        // @ts-ignore
        scrollManager['isFileChanging'] = false;
        // @ts-ignore
        scrollManager['pageObservers'] = new Map();
        // @ts-ignore
        scrollManager['mostVisiblePage'] = { fileKey: null, pageNumber: null, visibilityRatio: 0 };
    });

    // Clean up after each test
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('isScrollingInProgress', () => {
        test('should return the current scrolling state', () => {
            // Initial state should be false
            expect(scrollManager.isScrollingInProgress()).toBe(false);

            // Set internal state to true
            // @ts-ignore - Accessing private property for testing
            scrollManager['isScrolling'] = true;

            // Should now return true
            expect(scrollManager.isScrollingInProgress()).toBe(true);
        });
    });

    describe('setFileChanging', () => {
        test('should set the file changing state', () => {
            // Set to true
            scrollManager.setFileChanging(true);
            expect(scrollManager.isFileChangeInProgress()).toBe(true);

            // Set to false
            scrollManager.setFileChanging(false);
            expect(scrollManager.isFileChangeInProgress()).toBe(false);
        });

        test('should auto-reset to false after delay', () => {
            // Use fake timers
            vi.useFakeTimers();

            // Set to true
            scrollManager.setFileChanging(true);
            expect(scrollManager.isFileChangeInProgress()).toBe(true);

            // Advance time
            vi.advanceTimersByTime(1100);

            // Should be auto-reset to false
            expect(scrollManager.isFileChangeInProgress()).toBe(false);

            // Restore real timers
            vi.useRealTimers();
        });
    });

    describe('saveScrollPosition and getSavedScrollPosition', () => {
        test('should save and retrieve scroll positions for a file', () => {
            const fileKey = 'test-file.pdf';
            const position = 250;

            // Initially position should be undefined
            expect(scrollManager.getSavedScrollPosition(fileKey)).toBeUndefined();

            // Save a position
            scrollManager.saveScrollPosition(fileKey, position);

            // Now it should return the saved position
            expect(scrollManager.getSavedScrollPosition(fileKey)).toBe(position);

            // Save a different position
            scrollManager.saveScrollPosition(fileKey, position + 100);

            // Should return the updated position
            expect(scrollManager.getSavedScrollPosition(fileKey)).toBe(position + 100);
        });
    });

    describe('findMostVisiblePage', () => {
        test('should return null values when no pages are visible', () => {
            const result = scrollManager.findMostVisiblePage();

            expect(result).toEqual({
                fileKey: null,
                pageNumber: null,
                visibilityRatio: 0
            });
        });

        test('should return the most visible page', () => {
            // @ts-ignore - Setting private property for test
            scrollManager['pageVisibilityMap'] = new Map([
                ['file1-1', 0.3],  // fileKey-pageNumber -> visibility ratio
                ['file1-2', 0.7],
                ['file2-1', 0.5]
            ]);

            const result = scrollManager.findMostVisiblePage();

            expect(result).toEqual({
                fileKey: 'file1',
                pageNumber: 2,
                visibilityRatio: 0.7
            });
        });
    });

    describe('refreshObservers', () => {
        test('should call initializeVisibilityDetection', () => {
            // Mock the method we expect to be called
            const initializeVisibilityDetectionSpy = vi.spyOn(
                scrollManager,
                'initializeVisibilityDetection'
            ).mockImplementation(() => {});

            // Call refreshObservers
            scrollManager.refreshObservers();

            // Verify initializeVisibilityDetection was called
            expect(initializeVisibilityDetectionSpy).toHaveBeenCalled();
        });
    });

    describe('initializeVisibilityDetection', () => {
        test('should set up IntersectionObserver and observe pages', () => {
            // Mock observeAllPages method
            const observeAllPagesSpy = vi.spyOn(
                scrollManager,
                'observeAllPages'
            ).mockImplementation(() => {});

            // Call the method
            scrollManager.initializeVisibilityDetection();

            // Verify observer was created
            // @ts-ignore - Checking private property
            expect(scrollManager['visibilityObserver']).not.toBeNull();

            // Verify observeAllPages was called
            expect(observeAllPagesSpy).toHaveBeenCalled();
        });
    });

    describe('observeAllPages', () => {
        test('should do nothing if visibilityObserver is null', () => {
            // Set observer to null
            // @ts-ignore
            scrollManager['visibilityObserver'] = null;

            // Mock document.querySelectorAll to ensure it's not called
            const querySelectorAllSpy = vi.spyOn(document, 'querySelectorAll');

            // Call the method
            scrollManager.observeAllPages();

            // querySelectorAll should not be called
            expect(querySelectorAllSpy).not.toHaveBeenCalled();
        });

        test('should observe all page elements', () => {
            // Create mock elements
            const mockElements = [
                { hasAttribute: () => true, getAttribute: () => '1' },
                { hasAttribute: () => true, getAttribute: () => '2' }
            ];

            // Mock querySelectorAll to return our elements
            vi.spyOn(document, 'querySelectorAll').mockReturnValue(
                mockElements as unknown as NodeListOf<Element>
            );

            // Create mock observer
            const mockObserver = {
                observe: vi.fn(),
                disconnect: vi.fn()
            };

            // @ts-ignore
            scrollManager['visibilityObserver'] = mockObserver;

            // Call the method
            scrollManager.observeAllPages();

            // Observer should have been called for each element
            expect(mockObserver.observe).toHaveBeenCalledTimes(2);
        });
    });
});

describe('ScrollManagerService - Edge Cases', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    test('should handle scrollToPage with invalid fileKey', () => {
        // Mock findPageElementRobust to return null (element not found)
        // @ts-ignore - Mocking private method
        scrollManager['findPageElementRobust'] = vi.fn().mockReturnValue(null);

        // Set spy on handleScrollFailure
        // @ts-ignore - Spy on private method
        const handleScrollFailureSpy = vi.spyOn(scrollManager, 'handleScrollFailure');

        // Call scrollToPage with vi.useFakeTimers to control setTimeout
        vi.useFakeTimers();
        scrollManager.scrollToPage(2, 'non-existent-file.pdf');

        // Advance timer to let the setTimeout fire
        vi.advanceTimersByTime(60);

        // handleScrollFailure should be called
        expect(handleScrollFailureSpy).toHaveBeenCalledWith(
            2, 'non-existent-file.pdf',
            expect.anything(), // options
            expect.anything(), // attempts
            'Element not found'
        );

        vi.useRealTimers();
    });

    test('should handle IntersectionObserver disconnect', () => {
        // Initialize observer
        scrollManager.initializeVisibilityDetection();

        // Get the observer
        // @ts-ignore - Access private property
        const observer = scrollManager['visibilityObserver'];

        // Spy on disconnect
        const disconnectSpy = vi.spyOn(observer as IntersectionObserver, 'disconnect');

        // Call initializeVisibilityDetection again to disconnect previous observer
        scrollManager.initializeVisibilityDetection();

        // Disconnect should have been called
        expect(disconnectSpy).toHaveBeenCalled();
    });
});
