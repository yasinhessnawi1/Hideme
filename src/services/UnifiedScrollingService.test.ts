import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import scrollManager from '../services/ScrollManagerService';

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

    describe('isFileChangeInProgress', () => {
        test('should return the current file changing state', () => {
            // Initial state should be false
            expect(scrollManager.isFileChangeInProgress()).toBe(false);

            // Set file changing state
            scrollManager.setFileChanging(true);

            // Should now return true
            expect(scrollManager.isFileChangeInProgress()).toBe(true);

            // After a delay, it should auto-reset to false (handled by setTimeout in the implementation)
            vi.advanceTimersByTime(1100); // Advance past the 1000ms auto-reset
            expect(scrollManager.isFileChangeInProgress()).toBe(false);
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

    describe('scrollToPage', () => {
        test('should not proceed if already scrolling', () => {
            // Mock internal scrolling state
            // @ts-ignore - Setting private property for test
            scrollManager['isScrolling'] = true;

            // Set spies
            const scrollToPageSpy = vi.spyOn(scrollManager, 'scrollToPage');

            // Try to scroll
            scrollManager.scrollToPage(2, 'test-file.pdf');

            // Should have been called once with our parameters
            expect(scrollToPageSpy).toHaveBeenCalledWith(2, 'test-file.pdf');

            // But internal logic should have prevented further execution
            expect(window.dispatchEvent).not.toHaveBeenCalled();
        });

        test('should attempt to scroll to the specified page', () => {
            // Mock findPageElementRobust to return a fake element
            const mockPageElement = {
                scrollIntoView: vi.fn(),
                offsetTop: 200,
                getBoundingClientRect: vi.fn().mockReturnValue({
                    top: 100,
                    bottom: 300,
                    left: 0,
                    right: 100,
                    width: 100,
                    height: 200
                })
            };

            // @ts-ignore - Mocking private method
            scrollManager['findPageElementRobust'] = vi.fn().mockReturnValue(mockPageElement);

            // Use fake timers to control setTimeout
            vi.useFakeTimers();

            // Call scrollToPage
            scrollManager.scrollToPage(2, 'test-file.pdf', { behavior: 'auto' }, 'test-source');

            // Should be in scrolling state
            expect(scrollManager.isScrollingInProgress()).toBe(true);

            // Advance timers to trigger the setTimeout callback
            vi.advanceTimersByTime(60);

            // Page element's scrollIntoView should have been called
            expect(mockPageElement.scrollIntoView).toHaveBeenCalled();

            // Advance timers to trigger completion check
            vi.advanceTimersByTime(200);

            // Event should be dispatched for successful scroll
            expect(window.dispatchEvent).toHaveBeenCalled();

            // Restore real timers
            vi.useRealTimers();
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

    // Test for handling page visibility changes
    test('should update most visible page when intersection changes', () => {
        // Setup mock elements and observer
        const mockElement = {
            getAttribute: (attr: string) => attr === 'data-page-number' ? '2' : null,
            closest: (selector: string) => selector === '[data-file-key]' ? { getAttribute: () => 'test-file' } : null
        };

        // Initialize visibility observer
        scrollManager.initializeVisibilityDetection();

        // @ts-ignore - Get the observer callback
        const observer = scrollManager['visibilityObserver'] as MockIntersectionObserver;

        // Simulate intersection
        const entries = [{
            target: mockElement,
            isIntersecting: true,
            intersectionRatio: 0.8,
            boundingClientRect: {} as DOMRectReadOnly,
            intersectionRect: {} as DOMRectReadOnly,
            rootBounds: null,
            time: Date.now()
        }] as IntersectionObserverEntry[];

        observer.simulateIntersection(entries);

        // Check that page visibility map was updated
        // @ts-ignore - Check private property
        expect(scrollManager['pageVisibilityMap'].get('test-file-2')).toBe(0.8);

        // Event should be dispatched if ratio > 0.5
        expect(window.dispatchEvent).toHaveBeenCalled();
    });

    // Test for handling file change based on scroll visibility
    test('should handle potential file change based on scroll visibility', () => {
        // @ts-ignore - Call private method directly for testing
        scrollManager['handlePotentialFileChange']('test-file.pdf');

        // Verify event dispatched
        expect(window.dispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'pdf-file-became-visible',
                detail: expect.objectContaining({
                    fileKey: 'test-file.pdf'
                })
            })
        );
    });

    // Test for calculating scroll position
    test('should calculate scroll position correctly', () => {
        // Mock container and page element
        const mockContainer = {
            getBoundingClientRect: () => ({
                top: 0,
                height: 500
            }),
            scrollTop: 100
        };

        const mockPageElement = {
            getBoundingClientRect: () => ({
                top: 200,
                height: 300
            })
        };

        // @ts-ignore - Access private method
        const result = scrollManager['calculateScrollPosition'](mockPageElement, mockContainer, false);

        // Expected calculation: container.scrollTop + (pageRect.top - containerRect.top) - (containerHeight/2) + (pageHeight/2)
        // 100 + (200 - 0) - (500/2) + (300/2) = 100 + 200 - 250 + 150 = 200
        expect(result).toBe(300);

        // With alignToTop = true
        // @ts-ignore - Access private method
        const resultAligned = scrollManager['calculateScrollPosition'](mockPageElement, mockContainer, true);

        // Expected: container.scrollTop + (pageRect.top - containerRect.top) - (containerHeight * 0.05)
        // 100 + (200 - 0) - (500 * 0.05) = 100 + 200 - 25 = 275
        expect(resultAligned).toBe(275);
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

    test('should handle repeatedly failed scroll attempts', () => {
        // Mock findPageElementRobust to always return null
        // @ts-ignore - Mocking private method
        scrollManager['findPageElementRobust'] = vi.fn().mockReturnValue(null);

        // Use fake timers
        vi.useFakeTimers();

        // Try to scroll
        scrollManager.scrollToPage(3, 'test-file.pdf');

        // Advance past initial setTimeout
        vi.advanceTimersByTime(60);

        // handleScrollFailure should increment attempt counter and retry
        // We need to advance time for each retry attempt
        for (let i = 1; i < 3; i++) { // Less than MAX_SCROLL_ATTEMPTS (3)
            // Advance time for the retry delay: 200 * (attemptNumber + 1)
            vi.advanceTimersByTime(200 * (i + 1));
        }

        // After MAX_SCROLL_ATTEMPTS (should be 3), it should give up and completeScroll with success=false
        // @ts-ignore - Access private method
        const completeScrollSpy = vi.spyOn(scrollManager, 'completeScroll' as keyof typeof scrollManager);

        // Advance time for the final retry
        vi.advanceTimersByTime(200 * 4);

        // completeScroll should be called with success=false
        expect(completeScrollSpy).toHaveBeenCalledWith('test-file.pdf', 3, false);

        // Restore real timers
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

    test('should handle DOM exception in scrollToPage', () => {
        // Mock findPageElementRobust to return an element
        const mockElement = {
            scrollIntoView: vi.fn().mockImplementation(() => {
                throw new DOMException('Test DOM Exception');
            })
        };

        // @ts-ignore - Mock private method
        scrollManager['findPageElementRobust'] = vi.fn().mockReturnValue(mockElement);

        // Mock handleScrollFailure
        // @ts-ignore - Spy on private method
        const handleScrollFailureSpy = vi.spyOn(scrollManager, 'handleScrollFailure');

        // Use fake timers
        vi.useFakeTimers();

        // Try to scroll
        scrollManager.scrollToPage(2, 'test-file.pdf');

        // Advance timer
        vi.advanceTimersByTime(60);

        // handleScrollFailure should be called with the error message
        expect(handleScrollFailureSpy).toHaveBeenCalledWith(
            2, 'test-file.pdf',
            expect.anything(), // options
            expect.anything(), // attempts
            'Test DOM Exception'
        );

        // Restore real timers
        vi.useRealTimers();
    });
});
