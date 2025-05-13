
interface ScrollOptions {
    behavior?: ScrollBehavior;
    alignToTop?: boolean;
    highlightThumbnail?: boolean;
    preservePosition?: boolean;
    forceElementSelection?: boolean;
}

/**
 * A centralized service to handle PDF scrolling coordination
 * between the main viewer, thumbnails, and sidebar controls
 */
class UnifiedScrollingService {
    private static instance: UnifiedScrollingService;

    // Core state management
    private isScrolling: boolean = false;
    private scrollTimeout: NodeJS.Timeout | null = null;
    private readonly scrollListeners: Map<string, ((pageNumber: number, fileKey: string, source: string) => void)[]> = new Map();

    // Scroll position tracking
    private readonly scrollPositions: Map<string, number> = new Map();
    private isFileChangeScroll: boolean = false;
    private readonly fileVisibilityChecks: Map<string, number> = new Map();

    // Enhanced scroll behavior settings
    private readonly scrollDebounceDelay: number = 100;
    private readonly scrollAnimationDelay: number = 50;
    private readonly scrollCompletionDelay: number = 300;

    // Element cache for performance
    private readonly elementCache: Map<string, HTMLElement | null> = new Map();
    private readonly elementCacheTimeout: number = 2000; // Clear cache after 2 seconds
    private lastCacheClear: number = Date.now();

    // Event tracking for debugging
    private readonly eventHistory: {event: string, timestamp: number, details: any}[] = [];
    private readonly maxEvents: number = 20;
    
    // Method to record events for debugging
    private recordEvent(event: string, details?: any): void {
        // Add the event to history
        this.eventHistory.unshift({
            event,
            timestamp: Date.now(),
            details: details || {}
        });
        
        // Trim history to keep it from growing too large
        if (this.eventHistory.length > this.maxEvents) {
            this.eventHistory.pop();
        }
    }

    // Prevent external instantiation
    private constructor() {
        // Start a cache cleanup interval
        setInterval(() => {
            // Clear element cache periodically to prevent stale references
            const now = Date.now();
            if (now - this.lastCacheClear > this.elementCacheTimeout) {
                this.elementCache.clear();
                this.lastCacheClear = now;
            }
        }, this.elementCacheTimeout);
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): UnifiedScrollingService {
        if (!UnifiedScrollingService.instance) {
            UnifiedScrollingService.instance = new UnifiedScrollingService();
        }
        return UnifiedScrollingService.instance;
    }

    /**
     * Save the scroll position for a specific file
     */
    public saveScrollPosition(fileKey: string, position: number): void {
        this.scrollPositions.set(fileKey, position);
    }

    /**
     * Get the saved scroll position for a file
     */
    public getSavedScrollPosition(fileKey: string): number | undefined {
        return this.scrollPositions.get(fileKey);
    }

    /**
     * Set whether the current scroll is triggered by a file change
     */
    public setFileChangeScroll(value: boolean): void {
        this.isFileChangeScroll = value;
        // Auto-reset after a delay
        if (value) {
            setTimeout(() => {
                this.isFileChangeScroll = false;
            }, 1000);
        }
    }

    /**
     * Check if the current scroll is triggered by a file change
     */
    public isFileChangeScrollActive(): boolean {
        return this.isFileChangeScroll;
    }

    /**
     * Find a page element in the DOM by its file key and page number
     * With caching for better performance
     */
    private findPageElement(fileKey: string, pageNumber: number, forceRefresh: boolean = false): HTMLElement | null {
        const cacheKey = `${fileKey}-page-${pageNumber}`;

        // Use cached element if available and not forced to refresh
        if (!forceRefresh && this.elementCache.has(cacheKey)) {
            const cachedElement = this.elementCache.get(cacheKey);
            if (cachedElement) {
                return cachedElement;
            }
        }

        // Find the page element in the main viewer
        const pageElement = document.querySelector(
            `.pdf-file-container[data-file-key="${fileKey}"] [data-page-number="${pageNumber}"]`
        ) as HTMLElement | null;

        // Cache the result
        this.elementCache.set(cacheKey, pageElement);

        return pageElement;
    }

    /**
     * Find a thumbnail element by its file key and page number
     * With caching for better performance
     */
    private findThumbnailElement(fileKey: string, pageNumber: number, forceRefresh: boolean = false): HTMLElement | null {
        const cacheKey = `thumbnail-${fileKey}-page-${pageNumber}`;

        // Use cached element if available
        if (!forceRefresh && this.elementCache.has(cacheKey)) {
            const cachedElement = this.elementCache.get(cacheKey);
            if (cachedElement) {
                return cachedElement;
            }
        }

        // Find the thumbnail element
        const thumbnailElement = document.getElementById(`thumbnail-${fileKey}-${pageNumber}`);

        // Cache the result
        this.elementCache.set(cacheKey, thumbnailElement);

        return thumbnailElement;
    }

    /**
     * Find the main container element
     */
    private getMainContainer(): HTMLElement | null {
        // Try to get from cache first
        if (this.elementCache.has('main-container')) {
            return this.elementCache.get('main-container') as HTMLElement | null;
        }

        // Otherwise find it in the DOM
        const container = document.querySelector('.pdf-viewer-container') as HTMLElement | null;

        if (!container) {
            console.warn('[ScrollService] Could not find main container element, using fallback');
            // Try alternative selectors as fallback
            const fallbackContainer = document.querySelector('.pdf-container') as HTMLElement | null;
            
            if (fallbackContainer) {
                this.elementCache.set('main-container', fallbackContainer);
                return fallbackContainer;
            }
        }

        // Cache the result
        this.elementCache.set('main-container', container);
        
        // Add a DOM change listener to invalidate cache when the DOM changes
        const observer = new MutationObserver(() => {
            // Clear the container cache when DOM changes
            this.elementCache.delete('main-container');
            // Stop observing
            observer.disconnect();
        });
        
        if (container) {
            // Observe changes to the container
            observer.observe(container, { 
                childList: true, 
                subtree: true 
            });
        }

        return container;
    }

    /**
     * Enhanced scroll to page implementation with more reliable behavior
     */
    public scrollToPage(
        pageNumber: number,
        fileKey: string,
        source: string = 'viewport-scroll',
        options: ScrollOptions = {}
    ): void {
        // Set default options
        const scrollOptions = {
            behavior: options.behavior ?? 'smooth',
            alignToTop: options.alignToTop ?? false,
            highlightThumbnail: options.highlightThumbnail ?? true,
            preservePosition: options.preservePosition ?? false,
            forceElementSelection: options.forceElementSelection ?? false
        };

        // Set flag to prevent scroll feedback loops
        this.isScrolling = true;

        // Find the page element
        const pageElement = this.findPageElement(
            fileKey,
            pageNumber,
            scrollOptions.forceElementSelection
        );

        const container = this.getMainContainer();

        // Handle scroll to page in main container
        if (container && pageElement) {
            // Calculate the exact scroll position based on viewport
            const scrollTop = this.calculateScrollPosition(
                pageElement,
                container,
                scrollOptions.alignToTop
            );

            // Add a slight animation delay for better coordination
            setTimeout(() => {
                // Scroll the main container to the calculated position
                container.scrollTo({
                    top: scrollTop,
                    behavior: scrollOptions.behavior
                });
                // Highlight the page as active
                this.highlightPageAsActive(fileKey, pageNumber);

                // Add additional visual feedback - pulse animation
                pageElement.classList.add('just-activated');
                setTimeout(() => {
                    pageElement.classList.remove('just-activated');
                }, 1500);
            }, this.scrollAnimationDelay);
        } else {
            // Fall back to the regular scrollToPage method
            this.scrollToPage(pageNumber, fileKey, source, scrollOptions);
        }

        // Find and scroll the thumbnail if needed
        if (scrollOptions.highlightThumbnail && source !== 'thumbnails') {
            // Use a slightly longer delay for thumbnail scrolling
            setTimeout(() => {
                const thumbnailElement = this.findThumbnailElement(fileKey, pageNumber, true);

                if (thumbnailElement) {
                    thumbnailElement.scrollIntoView({
                        behavior: scrollOptions.behavior,
                        block: 'center'
                    });

                    // Add extra highlight class
                    thumbnailElement.classList.add('highlight-pulse');

                    // Remove the highlight class after animation
                    setTimeout(() => {
                        thumbnailElement.classList.remove('highlight-pulse');
                    }, 2000);
                }
            }, this.scrollAnimationDelay * 2);
        }

        // Notify all listeners except the source
        this.notifyScrollListeners(pageNumber, fileKey, source);

        // Reset the scrolling flag after a delay to prevent rapid loops
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }

        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;

            // Dispatch a completion event
            window.dispatchEvent(new CustomEvent('pdf-viewport-scroll-complete', {
                detail: {
                    fileKey,
                    pageNumber,
                    source: 'viewport-scroll-completion',
                    success: true
                }
            }));
        }, this.scrollCompletionDelay);
    }
    /**
     * Calculate exact scroll position for a page element
     * @param pageElement The page element to scroll to
     * @param container The scrollable container
     * @param alignToTop Whether to align the page to the top of the container
     * @returns The calculated scroll position
     */
    public calculateScrollPosition(
        pageElement: HTMLElement,
        container: HTMLElement,
        alignToTop: boolean = false
    ): number {
        try {
            const containerRect = container.getBoundingClientRect();
            const pageRect = pageElement.getBoundingClientRect();

            // Calculate position relative to the container's scrollTop
            let scrollPosition = container.scrollTop +
                (pageRect.top - containerRect.top);

            // If not aligning to top, center the page in the viewport
            if (!alignToTop) {
                scrollPosition = scrollPosition -
                    (containerRect.height / 2) +
                    (pageRect.height / 2);
            } else {
                // When aligning to top, add a small offset
                scrollPosition = scrollPosition - (containerRect.height * 0.05);
            }

            // Ensure position is within bounds
            scrollPosition = Math.max(0, scrollPosition);
            return scrollPosition;
        } catch (error) {
            console.error('[ScrollService] Error calculating scroll position:', error);
            return 0;
        }
    }

    /**
     * Helper method to add active class to page element
     */
    private highlightPageAsActive(fileKey: string, pageNumber: number): void {
        // Remove active class from all pages in this file
        const filePages = document.querySelectorAll(`.pdf-file-container[data-file-key="${fileKey}"] .pdf-page-wrapper`);
        filePages.forEach(page => page.classList.remove('active'));

        // Add active class to the target page
        const pageElement = this.findPageElement(fileKey, pageNumber, true);
        if (pageElement) {
            pageElement.classList.add('active');
        }
    }

    /**
     * Check if scrolling is currently active
     */
    public isCurrentlyScrolling(): boolean {
        return this.isScrolling;
    }

    /**
     * Register a listener for scroll events
     */
    public addScrollListener(
        id: string,
        callback: (pageNumber: number, fileKey: string, source: string) => void,
        fileKey?: string
    ): void {
        const key = fileKey ?? 'global';

        if (!this.scrollListeners.has(key)) {
            this.scrollListeners.set(key, []);
        }

        const listeners = this.scrollListeners.get(key)!;

        // Create a wrapper function to handle errors
        const wrappedCallback = (pageNumber: number, fileKey: string, source: string) => {
            try {
                callback(pageNumber, fileKey, source);
            } catch (error) {
                console.error(`[ScrollService] Error in scroll listener ${id}:`, error);
            }
        };

        // Add additional property to identify this listener
        Object.defineProperty(wrappedCallback, 'listenerId', { value: id });

        listeners.push(wrappedCallback);

    }

    /**
     * Remove a listener for scroll events
     */
    public removeScrollListener(id: string, fileKey?: string): void {
        const key = fileKey ?? 'global';

        if (!this.scrollListeners.has(key)) return;

        const listeners = this.scrollListeners.get(key)!;
        const index = listeners.findIndex(listener =>
            (listener as any).listenerId === id
        );

        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Notify all registered listeners about a scroll event
     */
    private notifyScrollListeners(pageNumber: number, fileKey: string, source: string): void {

        // Call file-specific listeners
        if (this.scrollListeners.has(fileKey)) {
            const listeners = this.scrollListeners.get(fileKey)!;
            listeners.forEach(listener => {
                listener(pageNumber, fileKey, source);
            });
        }

        // Call global listeners
        if (this.scrollListeners.has('global')) {
            const globalListeners = this.scrollListeners.get('global')!;
            globalListeners.forEach(listener => {
                listener(pageNumber, fileKey, source);
            });
        }
    }

    /**
     * Enhanced helper method to find the most visible page with visibility ratio
     */
    public findMostVisiblePageWithThreshold(
        visibilityThreshold: number = 0.5
    ): { fileKey: string | null, pageNumber: number | null, visibilityRatio: number } {
        const container = this.getMainContainer();

        if (!container) {
            return { fileKey: null, pageNumber: null, visibilityRatio: 0 };
        }

        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;
        const containerHeight = containerRect.height;

        let maxVisibleArea = 0;
        let maxVisibilityRatio = 0;
        let mostVisibleFileKey = null;
        let mostVisiblePage = null;

        // Find all file containers
        const fileContainers = document.querySelectorAll('.pdf-file-container');
        const currentTime = Date.now();

        fileContainers.forEach(fileContainer => {
            const fileKey = fileContainer.getAttribute('data-file-key');
            if (!fileKey) return;

            // Skip if file container is not visible in viewport
            const fileRect = fileContainer.getBoundingClientRect();
            if (fileRect.bottom < containerRect.top || fileRect.top > containerRect.bottom) return;

            // Calculate how much of the file is visible
            const fileVisibleTop = Math.max(fileRect.top, containerRect.top);
            const fileVisibleBottom = Math.min(fileRect.bottom, containerRect.bottom);
            const fileVisibleHeight = fileVisibleBottom - fileVisibleTop;
            const fileVisibilityRatio = fileVisibleHeight / fileRect.height;

            // Check when we last processed this file
            const lastChecked = this.fileVisibilityChecks.get(fileKey) || 0;
            const timeSinceLastCheck = currentTime - lastChecked;

            // Only process files that weren't checked too recently
            // This prevents rapid checks on the same file
            if (timeSinceLastCheck > this.scrollDebounceDelay || fileVisibilityRatio > 0.8) {
                this.fileVisibilityChecks.set(fileKey, currentTime);

                // Find all pages in this file
                const pages = fileContainer.querySelectorAll('.pdf-page-wrapper');

                pages.forEach(pageEl => {
                    const pageNumber = parseInt(pageEl.getAttribute('data-page-number') ?? '1', 10);
                    const pageRect = pageEl.getBoundingClientRect();

                    // Calculate visible area of this page
                    const visibleTop = Math.max(pageRect.top, containerRect.top);
                    const visibleBottom = Math.min(pageRect.bottom, containerRect.bottom);

                    if (visibleBottom <= visibleTop) return; // Not visible

                    const visibleHeight = visibleBottom - visibleTop;
                    const visibleArea = visibleHeight * pageRect.width;

                    // Calculate visibility ratio for this page
                    const pageVisibilityRatio = visibleHeight / pageRect.height;

                    // Distance from center affects priority
                    const distanceFromCenter = Math.abs(
                        (pageRect.top + pageRect.height / 2) - containerCenter
                    );
                    const centerFactor = 1 - (distanceFromCenter / containerHeight);

                    // Adjusted area takes into account both visibility and center position
                    const adjustedArea = visibleArea * centerFactor;

                    // Extra visibility debugging for troubleshooting scroll issues
                    if (pageVisibilityRatio > 0.5) {
                        // Store the page element ID in cache for faster access later
                        const pageElementId = `page-${fileKey}-${pageNumber}`;
                        this.elementCache.set(pageElementId, pageEl as HTMLElement);
                        
                        console.debug(`Page ${pageNumber} visibility: ${(pageVisibilityRatio * 100).toFixed(0)}% (${adjustedArea.toFixed(0)})`);
                    }

                    // Only consider pages that meet the visibility threshold
                    if (pageVisibilityRatio >= visibilityThreshold && adjustedArea > maxVisibleArea) {
                        maxVisibleArea = adjustedArea;
                        maxVisibilityRatio = pageVisibilityRatio;
                        mostVisibleFileKey = fileKey;
                        mostVisiblePage = pageNumber;
                        
                        // Add this data to our lastEvent history for debugging
                        this.recordEvent('page-visibility-change', { 
                            fileKey, 
                            pageNumber, 
                            visibilityRatio: pageVisibilityRatio,
                            area: adjustedArea
                        });
                    }
                });
            }
        });


        return {
            fileKey: mostVisibleFileKey,
            pageNumber: mostVisiblePage,
            visibilityRatio: maxVisibilityRatio
        };
    }

    /**
     * Original method to find the most visible page (maintained for backward compatibility)
     */
    public findMostVisiblePage(): { fileKey: string | null, pageNumber: number | null } {
        const result = this.findMostVisiblePageWithThreshold(0.3);
        return {
            fileKey: result.fileKey,
            pageNumber: result.pageNumber
        };
    }
}

// Export the singleton instance
export const scrollingService = UnifiedScrollingService.getInstance();
export default scrollingService;
