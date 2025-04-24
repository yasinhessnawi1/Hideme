/**
 * ScrollManagerService.ts
 *
 * A unified service to manage PDF scrolling, navigation, and synchronization
 * between different components of the PDF viewer application.
 */


// Core interface for scroll navigation options
export interface ScrollOptions {
    behavior?: ScrollBehavior;
    alignToTop?: boolean;
    highlightThumbnail?: boolean;
    forceFileChange?: boolean;
}

// Visibility result for page detection
export interface VisibilityResult {
    fileKey: string | null;
    pageNumber: number | null;
    visibilityRatio: number;
}

// Observer info for tracking page visibility
interface PageObserverInfo {
    element: HTMLElement;
    fileKey: string;
    pageNumber: number;
    observer: IntersectionObserver;
    isVisible: boolean;
    visibilityRatio: number;
}

/**
 * Singleton service to manage scrolling and navigation in the PDF viewer
 */
class ScrollManagerService {
    private static instance: ScrollManagerService;
    private manualEventHandling: boolean = false;
    private activeEventSources: Set<string> = new Set();
    private eventThrottleTimers: Map<string, NodeJS.Timeout> = new Map();
    private lastScrollStartTime: number = 0;
    private visibilityObserver: IntersectionObserver | null = null;
    private pageVisibilityMap: Map<string, number> = new Map();
    // State management
    private scrollPositions = new Map<string, number>();
    private scrollAttempts: Map<string, number> = new Map();
    private MAX_SCROLL_ATTEMPTS = 3;

    private isScrolling = false;
    private isFileChanging = false;


    // Element references for quick access
    private mainContainer: HTMLElement | null = null;
    private elementCache = new Map<string, HTMLElement | null>();
    private lastCacheClear = Date.now();

    // Visibility tracking
    private pageObservers = new Map<string, PageObserverInfo>();
    private mostVisiblePage: VisibilityResult = { fileKey: null, pageNumber: null, visibilityRatio: 0 };
    private visibilityThreshold = 0.5;

    // Event listeners
    private scrollListeners = new Map<string, ((pageNumber: number, fileKey: string, source: string) => void)[]>();

    // Private constructor to prevent direct instantiation
    private constructor() {
        // Clear element cache periodically to prevent memory leaks
        setInterval(() => {
            const now = Date.now();
            if (now - this.lastCacheClear > 10000) { // 10 seconds
                this.elementCache.clear();
                this.lastCacheClear = now;
            }
        }, 10000);
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ScrollManagerService {
        if (!ScrollManagerService.instance) {
            ScrollManagerService.instance = new ScrollManagerService();
        }
        return ScrollManagerService.instance;
    }

    /**
     * Initialize the intersection observers for tracking page visibility
     */
    public initializeObservers(): void {
        // Clear any existing observers
        this.clearAllObservers();

        // Get the main container
        const container = this.getMainContainer();
        if (!container) return;

        // Find all PDF page elements
        const allPageElements = document.querySelectorAll('.pdf-page-wrapper');

        allPageElements.forEach(pageElement => {
            const pageNumber = parseInt(pageElement.getAttribute('data-page-number') || '1', 10);
            const fileContainer = pageElement.closest('.pdf-file-container');
            if (!fileContainer) return;

            const fileKey = fileContainer.getAttribute('data-file-key');
            if (!fileKey) return;

            this.observePage(pageElement as HTMLElement, fileKey, pageNumber);
        });

        console.log(`[ScrollManager] Initialized observers for ${this.pageObservers.size} pages`);
    }
    public initializeVisibilityDetection(): void {
        // Clean up existing observer if any
        if (this.visibilityObserver) {
            this.visibilityObserver.disconnect();
        }

        // Create a new intersection observer for precise visibility tracking
        this.visibilityObserver = new IntersectionObserver(
            (entries) => {
                // Process all entries from this batch
                entries.forEach(entry => {
                    const pageElement = entry.target as HTMLElement;
                    const pageNumber = parseInt(pageElement.getAttribute('data-page-number') || '0', 10);
                    const fileKey = this.getFileKeyFromElement(pageElement);

                    if (!fileKey || !pageNumber) return;

                    // Store the visibility ratio for this page
                    const pageKey = `${fileKey}-${pageNumber}`;
                    this.pageVisibilityMap.set(pageKey, entry.intersectionRatio);

                    // Only process if visibility is high enough to consider it "in view"
                    if (entry.intersectionRatio > 0.5) {
                        console.log(`[ScrollManager] Page ${pageNumber} of ${fileKey} is visible (${Math.round(entry.intersectionRatio * 100)}%)`);

                        // Don't trigger events if we're programmatically scrolling
                        if (!this.isScrolling && !this.isFileChanging) {
                            this.handlePageBecameVisible(fileKey, pageNumber, entry.intersectionRatio);
                        }
                    }
                });
            },
            {
                // Configure the observer for precise visibility calculation
                threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
                rootMargin: '0px',
            }
        );

        // Observe all PDF pages
        this.observeAllPages();

        console.log('[ScrollManager] Enhanced visibility detection initialized');
    }
    /**
     * Handle potential file change based on scroll visibility
     */
    private handlePotentialFileChange(fileKey: string): void {
        // Implementation will depend on your app structure
        // This dispatches an event that FileContext can listen for
        window.dispatchEvent(new CustomEvent('pdf-file-became-visible', {
            detail: {
                fileKey,
                source: 'scroll-visibility-detection',
                timestamp: Date.now()
            }
        }));
    }
    private handlePageBecameVisible(fileKey: string, pageNumber: number, visibilityRatio: number): void {
        // Skip if we're already processing this page
        if (this.activeEventSources.has(`visibility-${fileKey}-${pageNumber}`)) {
            return;
        }

        try {
            // Track that we're handling this event
            this.activeEventSources.add(`visibility-${fileKey}-${pageNumber}`);

            // First, check if this is the most visible page
            const maxVisibility = this.findMostVisiblePage();

            // Only proceed if this is the most visible page or very clearly visible
            if (
                (maxVisibility.fileKey === fileKey && maxVisibility.pageNumber === pageNumber) ||
                visibilityRatio > 0.8
            ) {
                // Check if file needs to change
                this.handlePotentialFileChange(fileKey);

                // Dispatch page change event
                window.dispatchEvent(new CustomEvent('pdf-page-changed', {
                    detail: {
                        fileKey,
                        pageNumber,
                        source: 'scroll-visibility-detection',
                        visibilityRatio,
                        timestamp: Date.now()
                    }
                }));

                // Also dispatch an internal event for visibility tracking
                window.dispatchEvent(new CustomEvent('page-visibility-changed', {
                    detail: {
                        fileKey,
                        pageNumber,
                        visibilityRatio,
                        timestamp: Date.now()
                    }
                }));
            }
        } finally {
            // Clear after a short delay
            setTimeout(() => {
                this.activeEventSources.delete(`visibility-${fileKey}-${pageNumber}`);
            }, 250); // Longer delay to prevent rapid changes
        }
    }
    private getFileKeyFromElement(element: HTMLElement): string | null {
        // Try to find the file container parent
        const fileContainer = element.closest('[data-file-key]');
        if (fileContainer) {
            return fileContainer.getAttribute('data-file-key');
        }

        // Fallback - check for file-related classes and extract key
        const classNames = Array.from(element.classList);
        for (const className of classNames) {
            if (className.startsWith('file-')) {
                const potentialKey = className.replace('file-', '');
                if (potentialKey.length > 0) return potentialKey;
            }
        }

        return null;
    }
    public setManualEventHandling(value: boolean): void {
        this.manualEventHandling = value;
    }
    /**
     * Set up an observer for a specific page
     */
    private observePage(element: HTMLElement, fileKey: string, pageNumber: number): void {
        const observerId = `${fileKey}-page-${pageNumber}`;

        // Skip if already observing this page
        if (this.pageObservers.has(observerId)) return;

        const container = this.getMainContainer();
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const observerInfo = this.pageObservers.get(observerId);
                    if (!observerInfo) return;

                    // Update visibility information
                    observerInfo.isVisible = entry.isIntersecting;
                    observerInfo.visibilityRatio = entry.intersectionRatio;

                    // If this is more visible than our current most visible page, update
                    if (
                        entry.isIntersecting &&
                        entry.intersectionRatio > this.visibilityThreshold &&
                        entry.intersectionRatio > this.mostVisiblePage.visibilityRatio
                    ) {
                        this.mostVisiblePage = {
                            fileKey: observerInfo.fileKey,
                            pageNumber: observerInfo.pageNumber,
                            visibilityRatio: entry.intersectionRatio
                        };

                        // Only dispatch event if we're not currently scrolling programmatically
                        if (!this.isScrolling && !this.isFileChanging) {
                            // Dispatch custom events for page and file changes
                            this.dispatchPageChangeEvent(observerInfo.pageNumber, observerInfo.fileKey);
                        }
                    }
                });
            },
            {
                root: container,
                rootMargin: '0px',
                threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
            }
        );

        // Start observing this page
        observer.observe(element);

        // Store observer info
        this.pageObservers.set(observerId, {
            element,
            fileKey,
            pageNumber,
            observer,
            isVisible: false,
            visibilityRatio: 0
        });
    }

    /**
     * Clear all intersection observers
     */
    private clearAllObservers(): void {
        this.pageObservers.forEach(info => {
            info.observer.disconnect();
        });
        this.pageObservers.clear();
        this.mostVisiblePage = { fileKey: null, pageNumber: null, visibilityRatio: 0 };
    }

    /**
     * Refresh observers when DOM changes
     */
    public refreshObservers(): void {
        // Small delay to ensure DOM is updated
        this.initializeVisibilityDetection();
    }

    /**
     * Get the main container element
     */
    private getMainContainer(): HTMLElement | null {
        // Use cached value if available
        if (this.mainContainer) return this.mainContainer;

        // Otherwise find it in the DOM
        const container = document.querySelector('.pdf-viewer-container') as HTMLElement | null;
        if (container) {
            this.mainContainer = container;
            return container;
        }

        console.warn('[ScrollManager] Could not find main container');
        return null;
    }


    /**
     * Save scroll position for a specific file
     */
    public saveScrollPosition(fileKey: string, position: number): void {
        this.scrollPositions.set(fileKey, position);
    }

    /**
     * Get saved scroll position for a file
     */
    public getSavedScrollPosition(fileKey: string): number | undefined {
        return this.scrollPositions.get(fileKey);
    }

    /**
     * Set file change flag
     */
    public setFileChanging(isChanging: boolean): void {
        this.isFileChanging = isChanging;

        // Auto-reset after a delay to prevent deadlocks
        if (isChanging) {
            setTimeout(() => {
                this.isFileChanging = false;
            }, 1000);
        }
    }

    /**
     * Check if a file change is in progress
     */
    public isFileChangeInProgress(): boolean {
        return this.isFileChanging;
    }

    /**
     * Check if scrolling is in progress
     */
    public isScrollingInProgress(): boolean {
        return this.isScrolling;
    }

    /**
     * Calculate the best scroll position for a page
     */
    public calculateScrollPosition(pageElement: HTMLElement, alignToTop: boolean = false): number | null {
        const container = this.getMainContainer();
        if (!container || !pageElement) return null;

        try {
            const containerRect = container.getBoundingClientRect();
            const pageRect = pageElement.getBoundingClientRect();

            // Calculate position to center the page in viewport
            let scrollPosition = container.scrollTop +
                (pageRect.top - containerRect.top);

            if (!alignToTop) {
                // Center the page in the viewport
                scrollPosition = scrollPosition -
                    (containerRect.height / 2) +
                    (pageRect.height / 2);
            } else {
                // Align to top with small margin
                scrollPosition = scrollPosition -
                    (containerRect.height * 0.05);
            }

            return scrollPosition;
        } catch (error) {
            console.error('[ScrollManager] Error calculating scroll position:', error);
            return null;
        }
    }

    /**
     * Scroll to a specific page with options
     */
    public scrollToPage(
        pageNumber: number,
        fileKey: string,
        options: ScrollOptions = {},
        source: string = 'scroll-manager'
    ): boolean {
        const now = Date.now();
        const scrollKey = `${fileKey}-${pageNumber}`;

        // Reset stuck state
        if (this.isScrolling && now - this.lastScrollStartTime > 3000) {
            console.log('[ScrollManager] Force-resetting stuck scroll state');
            this.isScrolling = false;
        }

        // Skip if another scroll is in progress
        if (this.isScrolling) {
            console.log(`[ScrollManager] Skip scroll request from ${source} - already scrolling`);
            return false;
        }

        // Set scrolling state
        this.isScrolling = true;
        this.lastScrollStartTime = now;
        console.log(`[ScrollManager] Starting scroll to page ${pageNumber} in file ${fileKey}`);

        // Track scroll attempts for this page
        const attempts = this.scrollAttempts.get(scrollKey) || 0;
        this.scrollAttempts.set(scrollKey, attempts + 1);

        // Perform the scroll operation with multiple strategies
        this.executeScrollWithMultipleStrategies(pageNumber, fileKey, options, attempts);

        return true;
    }

// New method implementing multiple scroll strategies
    private executeScrollWithMultipleStrategies(
        pageNumber: number,
        fileKey: string,
        options: ScrollOptions,
        previousAttempts: number
    ): void {
        console.log(`[ScrollManager] Scroll attempt ${previousAttempts + 1} for ${fileKey} page ${pageNumber}`);

        // Wait for DOM to be ready
        setTimeout((pageElement: HTMLElement, alignToTop: boolean = false) => {
            try {
                // Find the target page using multiple strategies
                const pageElement = this.findPageElementRobust(fileKey, pageNumber);
                if (!pageElement) {
                    this.handleScrollFailure(pageNumber, fileKey, options, previousAttempts, 'Element not found');
                    return;
                }

                // Find scroll container using multiple strategies
                const container = this.findScrollContainer();
                if (!container) {
                    this.handleScrollFailure(pageNumber, fileKey, options, previousAttempts, 'Container not found');
                    return;
                }

                // STRATEGY 1: scrollIntoView (most reliable)
                console.log(`[ScrollManager] Using scrollIntoView for ${fileKey} page ${pageNumber}`);
                pageElement.scrollIntoView({
                    behavior: options.behavior || 'smooth',
                    block: options.alignToTop ? 'start' : 'center'
                });

                // STRATEGY 2: Calculate and set scrollTop (backup)
                try {
                    const scrollPosition = this.calculateScrollPosition(pageElement, options.alignToTop) || undefined;
                    console.log(`[ScrollManager] Calculated scroll position: ${scrollPosition}`);

                    // Use both immediate and animated scrolling for reliability
                    container.scrollTop = scrollPosition || 0; // Fallback to 0 if calculation fails
                    container.scrollTo({
                        top: scrollPosition,
                        behavior: options.behavior || 'smooth'
                    });
                } catch (error) {
                    console.warn('[ScrollManager] Position calculation failed, continuing with scrollIntoView');
                }

                // STRATEGY 3: Check if page is in standard viewer
                const standardViewer = document.querySelector('.pdf-viewer-container');
                if (standardViewer && standardViewer !== container) {
                    console.log('[ScrollManager] Also scrolling standard viewer container');
                    standardViewer.scrollTop = pageElement.offsetTop;
                }

                // Update visual state
                this.updatePageVisualState(fileKey, pageNumber);

                // Verify scroll success after animation
                setTimeout(() => {
                    // Check if the page is actually visible
                    if (this.isElementVisible(pageElement, container)) {
                        console.log(`[ScrollManager] Scroll successful - page ${pageNumber} is visible`);
                        this.completeScroll(fileKey, pageNumber, true);
                    } else {
                        // If page isn't visible, try more aggressive approaches
                        console.log(`[ScrollManager] Page not visible after scroll, trying more direct approach`);

                        // Force a direct, immediate scroll
                        container.scrollTop = pageElement.offsetTop - 100;

                        // Check again after a short delay
                        setTimeout(() => {
                            if (this.isElementVisible(pageElement, container)) {
                                console.log(`[ScrollManager] Direct scroll successful`);
                                this.completeScroll(fileKey, pageNumber, true);
                            } else {
                                this.handleScrollFailure(pageNumber, fileKey, options, previousAttempts, 'Element not visible');
                            }
                        }, 100);
                    }
                }, options.behavior === 'smooth' ? 500 : 100);
            } catch (error) {
                this.handleScrollFailure(pageNumber, fileKey, options, previousAttempts, error.message);
            }
        }, 50); // Small delay to let DOM update
    }

// Handle scroll failures with retry logic
    private handleScrollFailure(
        pageNumber: number,
        fileKey: string,
        options: ScrollOptions,
        previousAttempts: number,
        reason: string
    ): void {
        console.warn(`[ScrollManager] Scroll failed: ${reason}`);

        // Retry if we haven't exceeded maximum attempts
        if (previousAttempts < this.MAX_SCROLL_ATTEMPTS) {
            console.log(`[ScrollManager] Retrying scroll (attempt ${previousAttempts + 1}/${this.MAX_SCROLL_ATTEMPTS})`);

            // Wait a bit longer before retrying to allow DOM to update
            setTimeout(() => {
                this.executeScrollWithMultipleStrategies(pageNumber, fileKey, {
                    ...options,
                    behavior: 'auto' // Use immediate scrolling for retries
                }, previousAttempts + 1);
            }, 200 * (previousAttempts + 1)); // Increasing delay for each retry
        } else {
            console.error(`[ScrollManager] Maximum scroll attempts reached, giving up`);
            this.completeScroll(fileKey, pageNumber, false);
        }
    }

// Complete the scroll operation
    private completeScroll(fileKey: string, pageNumber: number, success: boolean): void {
        // Reset scrolling state
        this.isScrolling = false;

        // Dispatch appropriate event
        if (success) {
            this.dispatchPageChangeEvent(pageNumber, fileKey);
        } else {
            window.dispatchEvent(new CustomEvent('pdf-scroll-failed', {
                detail: {
                    fileKey,
                    pageNumber,
                    timestamp: Date.now()
                }
            }));
        }
    }

// Check if element is actually visible in the viewport
    private isElementVisible(element: HTMLElement, container: HTMLElement): boolean {
        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Element is visible if it's at least partially within the container's viewport
        return (
            elementRect.top < containerRect.bottom &&
            elementRect.bottom > containerRect.top &&
            elementRect.left < containerRect.right &&
            elementRect.right > containerRect.left
        );
    }

// Robust page element finder that tries multiple strategies
    private findPageElementRobust(fileKey: string, pageNumber: number): HTMLElement | null {
        // Try multiple selectors in order of specificity
        const selectors = [
            // Most specific selector
            `.pdf-file-container[data-file-key="${fileKey}"] .pdf-page-wrapper[data-page-number="${pageNumber}"]`,

            // Alternative attribute
            `.pdf-file-container[data-file-key="${fileKey}"] [data-page="${pageNumber}"]`,

            // Direct child selector
            `.pdf-file-container[data-file-key="${fileKey}"] > .pdf-page-wrapper[data-page-number="${pageNumber}"]`,

            // Canvas inside page wrapper
            `.pdf-file-container[data-file-key="${fileKey}"] .pdf-page-wrapper[data-page-number="${pageNumber}"] canvas`,

            // Class-based selector
            `.pdf-document-container[data-file-key="${fileKey}"] .page-${pageNumber}`,

            // More generic selector
            `[data-file-key="${fileKey}"] [data-page-number="${pageNumber}"]`,

            // Absolute fallback
            `.page-${pageNumber}`
        ];

        // Try each selector in turn
        for (const selector of selectors) {
            const element = document.querySelector(selector) as HTMLElement;
            if (element) {
                console.log(`[ScrollManager] Found page element with selector: ${selector}`);
                return element;
            }
        }

        console.warn(`[ScrollManager] Could not find element for ${fileKey} page ${pageNumber} with any selector`);
        return null;
    }

// Find the appropriate scroll container
    private findScrollContainer(): HTMLElement | null {
        // Try multiple container selectors
        const containerSelectors = [
            '.pdf-viewer-container',
            '.pdf-scroll-container',
            '.main-content',
            '.pdf-document-container',
            '.document-viewer'
        ];

        for (const selector of containerSelectors) {
            const container = document.querySelector(selector) as HTMLElement;
            if (container) {
                console.log(`[ScrollManager] Using scroll container: ${selector}`);
                return container;
            }
        }

        // Fallback to document body if no specific container found
        console.warn('[ScrollManager] No specific scroll container found, using document.body');
        return document.body;
    }

// Update visual state of the page
    private updatePageVisualState(fileKey: string, pageNumber: number): void {
        // Remove active class from all pages in this file
        const allPages = document.querySelectorAll(`[data-file-key="${fileKey}"] .pdf-page-wrapper`);
        allPages.forEach(page => {
            page.classList.remove('active');
            page.classList.remove('just-activated');
        });

        // Find the target page
        const pageElement = this.findPageElementRobust(fileKey, pageNumber);
        if (pageElement) {
            // Add active class for visual indication
            pageElement.classList.add('active');
            pageElement.classList.add('just-activated');

            // Remove animation class after delay
            setTimeout(() => {
                pageElement.classList.remove('just-activated');
            }, 1500);
        }
    }
    private findPageElement(fileKey: string, pageNumber: number): HTMLElement | null | undefined {
        const cacheKey = `page-${fileKey}-${pageNumber}`;

        // Check cache first
        if (this.elementCache.has(cacheKey)) {
            return this.elementCache.get(cacheKey);
        }

        // Otherwise find in DOM
        const pageElement = document.querySelector(
            `.pdf-file-container[data-file-key="${fileKey}"] .pdf-page-wrapper[data-page-number="${pageNumber}"]`
        ) as HTMLElement;

        // Cache for future use
        this.elementCache.set(cacheKey, pageElement);

        return pageElement;
    }

    /**
     * Highlight a page as active (visual update)
     */
    public highlightActivePage(fileKey: string, pageNumber: number, source: string = 'scroll-manager'): void {
        try {
            // Remove active class from all pages in this file
            const filePages = document.querySelectorAll(
                `.pdf-file-container[data-file-key="${fileKey}"] .pdf-page-wrapper`
            );

            filePages.forEach(page => page.classList.remove('active'));

            // Find the target page and add active class
            const pageElement = this.findPageElement(fileKey, pageNumber);
            if (pageElement) {
                pageElement.classList.add('active');

                // Add animation for visual feedback
                pageElement.classList.add('just-activated');
                setTimeout(() => {
                    pageElement.classList.remove('just-activated');
                }, 1500);

                // Only dispatch event if the source is not from a component that will receive this event
                if (!this.isScrolling && source !== 'pdf-context') {
                    this.dispatchPageChangeEvent(pageNumber, fileKey, source);
                }
            }
        } catch (error) {
            console.error('[ScrollManager] Error highlighting active page:', error);
        }
    }

    /**
     * Add a scroll listener
     */
    public addScrollListener(
        id: string,
        callback: (pageNumber: number, fileKey: string, source: string) => void
    ): void {
        if (!this.scrollListeners.has(id)) {
            this.scrollListeners.set(id, []);
        }

        const listeners = this.scrollListeners.get(id)!;
        listeners.push(callback);
    }

    /**
     * Remove a scroll listener
     */
    public removeScrollListener(id: string): void {
        this.scrollListeners.delete(id);
    }

    /**
     * Notify all scroll listeners
     */
    private notifyScrollListeners(pageNumber: number, fileKey: string, source: string): void {
        this.scrollListeners.forEach((listeners, id) => {
            if (id !== source) { // Don't notify the source of the scroll
                listeners.forEach(listener => {
                    try {
                        listener(pageNumber, fileKey, source);
                    } catch (error) {
                        console.error(`[ScrollManager] Error in scroll listener ${id}:`, error);
                    }
                });
            }
        });
    }
    /**
     * Observe all PDF pages for visibility tracking
     */
    public observeAllPages(): void {
        if (!this.visibilityObserver) return;

        // Find all page elements
        const pageElements = document.querySelectorAll('.pdf-page-wrapper, .pdf-page');

        pageElements.forEach(element => {
            // Only observe elements with a page number
            if (element.hasAttribute('data-page-number') && this.visibilityObserver) {
                this.visibilityObserver.observe(element);
            }
        });

        console.log(`[ScrollManager] Now observing ${pageElements.length} page elements`);
    }


    /**
     * Find the most visible page in the viewport
     */

    public findMostVisiblePage(): { fileKey: string | null, pageNumber: number | null, visibilityRatio: number } {
        let maxVisibility = 0;
        let maxFileKey: string | null = null;
        let maxPageNumber: number | null = null;

        // Find the page with the highest visibility ratio
        for (const [pageKey, visibilityRatio] of this.pageVisibilityMap.entries()) {
            if (visibilityRatio > maxVisibility) {
                maxVisibility = visibilityRatio;

                // Parse the page key back into fileKey and pageNumber
                const [fileKey, pageNum] = pageKey.split('-');
                maxFileKey = fileKey;
                maxPageNumber = parseInt(pageNum, 10);
            }
        }

        return {
            fileKey: maxFileKey,
            pageNumber: maxPageNumber,
            visibilityRatio: maxVisibility
        };
    }

    /**
     * Dispatch page change event
     */
    private dispatchPageChangeEvent(pageNumber: number, fileKey: string, source: string = 'scroll-manager'): void {
        // Skip if manual event handling is active or we're already handling events from this source
        if (this.manualEventHandling || this.activeEventSources.has(source)) {
            return;
        }

        // Throttle events from the same source
        if (this.eventThrottleTimers.has(source)) {
            clearTimeout(this.eventThrottleTimers.get(source)!);
        }

        // Set a timeout to prevent too many events
        this.eventThrottleTimers.set(source, setTimeout(() => {
            try {
                // Record that we're handling an event from this source
                this.activeEventSources.add(source);

                // Dispatch the event
                window.dispatchEvent(new CustomEvent('pdf-page-changed', {
                    detail: {
                        fileKey,
                        pageNumber,
                        source,
                        timestamp: Date.now()
                    }
                }));
            } finally {
                // Clear after a short delay
                setTimeout(() => {
                    this.activeEventSources.delete(source);
                    this.eventThrottleTimers.delete(source);
                }, 50);
            }
        }, 10));
    }
}

// Export singleton instance
const scrollManager = ScrollManagerService.getInstance();
export default scrollManager;
