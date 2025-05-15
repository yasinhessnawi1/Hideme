import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import scrollManager, { ScrollOptions } from '../../services/client-services/ScrollManagerService';

// Mock DOM elements and browser APIs
vi.mock('window', () => ({
    default: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
    }
}));

// Create a fake DOM environment for tests
const createMockDOMEnvironment = () => {
    // Mock container element
    const container = document.createElement('div');
    container.className = 'pdf-viewer-container';

    // Mock file container
    const fileContainer = document.createElement('div');
    fileContainer.className = 'pdf-file-container';
    fileContainer.setAttribute('data-file-key', 'test.pdf');
    container.appendChild(fileContainer);

    // Create mock pages
    for (let i = 1; i <= 3; i++) {
        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'pdf-page-wrapper';
        pageWrapper.setAttribute('data-page-number', String(i));
        fileContainer.appendChild(pageWrapper);
    }

    // Add to document
    document.body.appendChild(container);

    return {
        container,
        fileContainer,
        getPageElement: (pageNumber: number) =>
            document.querySelector(`.pdf-page-wrapper[data-page-number="${pageNumber}"]`) as HTMLElement
    };
};

describe('ScrollManagerService', () => {
    let mockDom: ReturnType<typeof createMockDOMEnvironment>;

    // Create a spy for dispatchEvent to track custom events
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    // Create mock IntersectionObserver
    const mockIntersectionObserver = vi.fn();
    const mockObserve = vi.fn();
    const mockDisconnect = vi.fn();
    const mockUnobserve = vi.fn();

    beforeEach(() => {
        // Set up DOM environment
        mockDom = createMockDOMEnvironment();

        // Reset mocks
        vi.resetAllMocks();
        dispatchEventSpy.mockClear();

        // Mock IntersectionObserver
        mockIntersectionObserver.mockImplementation((callback) => ({
            observe: mockObserve,
            disconnect: mockDisconnect,
            unobserve: mockUnobserve,
            takeRecords: vi.fn(),
            root: null,
            rootMargin: '',
            thresholds: []
        }));

        // Assign mock to global scope
        window.IntersectionObserver = mockIntersectionObserver;

        // Mock Element.prototype.getBoundingClientRect
        Element.prototype.getBoundingClientRect = vi.fn().mockImplementation(function(this: Element) {
            const pageNumber = this.getAttribute('data-page-number');
            return {
                top: pageNumber ? 100 * Number(pageNumber) : 0,
                bottom: pageNumber ? 100 * Number(pageNumber) + 80 : 100,
                left: 0,
                right: 100,
                width: 100,
                height: 80
            };
        });

        // Mock Element.prototype.scrollIntoView
        Element.prototype.scrollIntoView = vi.fn();

        // Mock scrollTo method
        window.HTMLElement.prototype.scrollTo = vi.fn();

        // Reset the scroll manager's state
        // Since it's a singleton, we need to access its private members
        Object.defineProperties(scrollManager, {
            isScrolling: { writable: true, value: false },
            isFileChanging: { writable: true, value: false },
            mainContainer: { writable: true, value: null }
        });
    });

    afterEach(() => {
        // Clean up the DOM
        document.body.innerHTML = '';

        // Restore mocks
        vi.restoreAllMocks();
    });

    describe('Core functionality', () => {
        test('getInstance should return the same instance', () => {
            const instance1 = scrollManager;
            const instance2 = scrollManager;

            expect(instance1).toBe(instance2);
        });

        test('setManualEventHandling should set the event handling mode', () => {
            // Access private property for testing
            const manualEventHandling = vi.spyOn(Object.getPrototypeOf(scrollManager), 'setManualEventHandling');

            scrollManager.setManualEventHandling(true);
            expect(manualEventHandling).toHaveBeenCalledWith(true);

            scrollManager.setManualEventHandling(false);
            expect(manualEventHandling).toHaveBeenCalledWith(false);
        });
    });

    describe('Scroll position management', () => {
        test('saveScrollPosition and getSavedScrollPosition should work together', () => {
            const fileKey = 'test.pdf';
            const position = 500;

            scrollManager.saveScrollPosition(fileKey, position);
            const savedPosition = scrollManager.getSavedScrollPosition(fileKey);

            expect(savedPosition).toBe(position);
        });

        test('getSavedScrollPosition should return undefined for unknown file', () => {
            const position = scrollManager.getSavedScrollPosition('unknown.pdf');
            expect(position).toBeUndefined();
        });
    });

    describe('File change tracking', () => {

        test('isFileChangeInProgress should return current file change state', () => {
            scrollManager.setFileChanging(true);
            expect(scrollManager.isFileChangeInProgress()).toBe(true);

            scrollManager.setFileChanging(false);
            expect(scrollManager.isFileChangeInProgress()).toBe(false);
        });
    });

    describe('Scroll state tracking', () => {
        test('isScrollingInProgress should return current scrolling state', () => {
            // Initially not scrolling
            expect(scrollManager.isScrollingInProgress()).toBe(false);

            // Set scrolling state (need to use Object.defineProperty since it's a private field)
            Object.defineProperty(scrollManager, 'isScrolling', { value: true });
            expect(scrollManager.isScrollingInProgress()).toBe(true);

            // Reset
            Object.defineProperty(scrollManager, 'isScrolling', { value: false });
        });
    });

    describe('calculateScrollPosition', () => {

        test('should return null if container or page element is null', () => {
            // Test with no container
            const originalGetMainContainer = Object.getPrototypeOf(scrollManager)['getMainContainer'];
            Object.getPrototypeOf(scrollManager)['getMainContainer'] = vi.fn().mockReturnValue(null);

            expect(scrollManager.calculateScrollPosition(mockDom.getPageElement(1), false)).toBeNull();

            // Restore original method
            Object.getPrototypeOf(scrollManager)['getMainContainer'] = originalGetMainContainer;

            // Test with no page element
            expect(scrollManager.calculateScrollPosition(null as any, false)).toBeNull();
        });
    });

    describe('scrollToPage', () => {
        test('should set scrolling state and execute scroll with options', () => {
            const fileKey = 'test.pdf';
            const pageNumber = 2;
            const options: ScrollOptions = {
                behavior: 'smooth',
                alignToTop: true,
                highlightThumbnail: true
            };

            // Mock executeScrollWithMultipleStrategies
            const executeScrollSpy = vi.spyOn(Object.getPrototypeOf(scrollManager) as any, 'executeScrollWithMultipleStrategies')
                .mockImplementation(() => {});

            const result = scrollManager.scrollToPage(pageNumber, fileKey, options, 'test-source');

            expect(result).toBe(true);
            expect(scrollManager.isScrollingInProgress()).toBe(true);
            expect(executeScrollSpy).toHaveBeenCalledWith(pageNumber, fileKey, options, 0);
        });

        test('should not scroll if already scrolling', () => {
            // Set scrolling state
            Object.defineProperty(scrollManager, 'isScrolling', { value: true });

            const result = scrollManager.scrollToPage(1, 'test.pdf');

            expect(result).toBe(false);

            // Reset scrolling state
            Object.defineProperty(scrollManager, 'isScrolling', { value: false });
        });

        test('should reset stuck scroll state after timeout', () => {
            // Set scrolling state with old timestamp
            Object.defineProperty(scrollManager, 'isScrolling', { value: true });
            Object.defineProperty(scrollManager, 'lastScrollStartTime', { value: Date.now() - 4000 });

            const result = scrollManager.scrollToPage(1, 'test.pdf');

            expect(result).toBe(true);
            expect(scrollManager.isScrollingInProgress()).toBe(true);

            // Reset scrolling state
            Object.defineProperty(scrollManager, 'isScrolling', { value: false });
        });
    });

    describe('Observer initialization', () => {
        test('initializeObservers should set up page visibility observers', () => {
            // Spy on observePage method
            const observePageSpy = vi.spyOn(Object.getPrototypeOf(scrollManager) as any, 'observePage')
                .mockImplementation(() => {});

            // Spy on clearAllObservers method
            const clearAllObserversSpy = vi.spyOn(Object.getPrototypeOf(scrollManager) as any, 'clearAllObservers')
                .mockImplementation(() => {});

            scrollManager.initializeObservers();

            expect(clearAllObserversSpy).toHaveBeenCalled();
            // We've created 3 mock pages, so observePage should be called 3 times
            expect(observePageSpy).toHaveBeenCalledTimes(3);
        });

        test('initializeVisibilityDetection should set up observers and observe pages', () => {
            // Mock observeAllPages
            const observeAllPagesSpy = vi.spyOn(scrollManager, 'observeAllPages')
                .mockImplementation(() => {});

            scrollManager.initializeVisibilityDetection();

            // Verify IntersectionObserver was created
            expect(mockIntersectionObserver).toHaveBeenCalled();
            // Verify observeAllPages was called
            expect(observeAllPagesSpy).toHaveBeenCalled();
        });

        test('observeAllPages should observe all page elements', () => {
            // Mock visibilityObserver
            Object.defineProperty(scrollManager, 'visibilityObserver', {
                value: { observe: mockObserve }
            });

            scrollManager.observeAllPages();

            // We've created 3 mock pages
            expect(mockObserve).toHaveBeenCalledTimes(3);
        });
    });

    describe('Event handling', () => {
        test('highlightActivePage should update page classes and dispatch event', () => {
            const fileKey = 'test.pdf';
            const pageNumber = 2;

            // Spy on dispatchPageChangeEvent
            const dispatchEventSpy = vi.spyOn(Object.getPrototypeOf(scrollManager) as any, 'dispatchPageChangeEvent')
                .mockImplementation(() => {});

            scrollManager.highlightActivePage(fileKey, pageNumber);

            // Check that the right page was highlighted
            const activePages = document.querySelectorAll('.active');
            expect(activePages.length).toBe(1);
            expect(activePages[0].getAttribute('data-page-number')).toBe(String(pageNumber));

            // Check that the event was dispatched
            expect(dispatchEventSpy).toHaveBeenCalledWith(pageNumber, fileKey, 'scroll-manager');
        });

        test('findMostVisiblePage should return the page with highest visibility', () => {
            // Set up mock visibility data
            // @ts-ignore: private property access
            scrollManager.pageVisibilityMap = new Map([
                ['test.pdf-1', 0.3],
                ['test.pdf-2', 0.7],
                ['test.pdf-3', 0.4]
            ]);

            const result = scrollManager.findMostVisiblePage();

            expect(result).toEqual({
                fileKey: 'test.pdf',
                pageNumber: 2,
                visibilityRatio: 0.7
            });
        });

        test('findMostVisiblePage should return null values when no pages are visible', () => {
            // Set up empty visibility data
            // @ts-ignore: private property access
            scrollManager.pageVisibilityMap = new Map();

            const result = scrollManager.findMostVisiblePage();

            expect(result).toEqual({
                fileKey: null,
                pageNumber: null,
                visibilityRatio: 0
            });
        });
    });

    describe('Private method tests', () => {
        test('completeScroll should reset scrolling state and dispatch event', () => {
            // Set up initial state
            Object.defineProperty(scrollManager, 'isScrolling', { value: true, writable: true });

            // Spy on dispatchPageChangeEvent
            const dispatchPageChangeEventSpy = vi.spyOn(Object.getPrototypeOf(scrollManager) as any, 'dispatchPageChangeEvent')
                .mockImplementation(() => {});

            // Call private method
            // @ts-ignore: private method access
            scrollManager['completeScroll']('test.pdf', 2, true);

            // Check state was reset and event was dispatched
            expect(scrollManager.isScrollingInProgress()).toBe(false);
            expect(dispatchPageChangeEventSpy).toHaveBeenCalledWith(2, 'test.pdf');
        });

        test('findPageElementRobust should try multiple selectors', () => {
            // Mock the document.querySelector to track calls
            const querySelectorSpy = vi.spyOn(document, 'querySelector');

            // @ts-ignore: private method access
            const result = scrollManager['findPageElementRobust']('test.pdf', 2);

            // Should find the element with our mocked DOM
            expect(result).not.toBeNull();
            // Should try selectors until it finds the element
            expect(querySelectorSpy).toHaveBeenCalled();
        });

        test('findScrollContainer should try multiple container selectors', () => {
            // Mock the document.querySelector to track calls
            const querySelectorSpy = vi.spyOn(document, 'querySelector');

            // @ts-ignore: private method access
            const result = scrollManager['findScrollContainer']();

            // Should find the container with our mocked DOM
            expect(result).not.toBeNull();
            // Should try selectors until it finds the container
            expect(querySelectorSpy).toHaveBeenCalled();
        });

    });
});