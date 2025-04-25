import {IDBPDatabase, openDB} from 'idb';
import {HighlightRect, HighlightType} from '../types/pdfTypes';
import {v4 as uuidv4} from 'uuid';

export interface HighlightStoreSubscription {
    unsubscribe: () => void;
}

/**
 * Central store for all highlight data with direct database integration
 */
export class HighlightStore {
    private db: IDBPDatabase | null = null;
    private highlights: Map<string, Map<number, Map<string, HighlightRect>>> = new Map();
    private subscribers: Set<(fileKey?: string, page?: number, type?: HighlightType) => void> = new Set();
    private dbInitialized: boolean = false;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.initPromise = this.initDatabase();
    }

    /**
     * Initialize the database and load initial data
     */
    private async initDatabase(): Promise<void> {
        if (this.dbInitialized) return;

        try {
            this.db = await openDB('pdf-highlights-db', 1, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains('highlights')) {
                        const store = db.createObjectStore('highlights', { keyPath: 'id' });
                        store.createIndex('by-fileKey', 'fileKey');
                        store.createIndex('by-page', 'page');
                        store.createIndex('by-type', 'type');
                        store.createIndex('by-fileKey-page', ['fileKey', 'page']);
                        store.createIndex('by-fileKey-type', ['fileKey', 'type']);
                        store.createIndex('by-property', ['fileKey', 'property', 'value']);
                    }
                }
            });

            await this.loadAllHighlights();
            this.dbInitialized = true;
            console.log('[HighlightStore] Database initialized successfully');
        } catch (error) {
            console.error('[HighlightStore] Failed to initialize database:', error);
        }
    }

    /**
     * Load all highlights from the database into memory
     */
    private async loadAllHighlights(): Promise<void> {
        if (!this.db) return;

        try {
            const allHighlights = await this.db.getAll('highlights');

            // Clear current highlights
            this.highlights.clear();

            // Populate highlights map with database content
            allHighlights.forEach(highlight => {
                this.addToMemoryStore(highlight);
            });

            console.log(`[HighlightStore] Loaded ${allHighlights.length} highlights from database`);
        } catch (error) {
            console.error('[HighlightStore] Failed to load highlights from database:', error);
        }
    }

    /**
     * Add a highlight to the in-memory store without database update
     */
    private addToMemoryStore(highlight: HighlightRect): void {
        const fileKey = highlight.fileKey || '_default';
        const page = highlight.page || 0;

        // Ensure maps exist for this file and page
        if (!this.highlights.has(fileKey)) {
            this.highlights.set(fileKey, new Map());
        }

        const fileMap = this.highlights.get(fileKey)!;

        if (!fileMap.has(page)) {
            fileMap.set(page, new Map());
        }

        const pageMap = fileMap.get(page)!;

        // Store highlight by ID
        pageMap.set(highlight.id, highlight);
    }

    /**
     * Save a highlight to the database
     */
    private async saveToDatabase(highlight: HighlightRect): Promise<void> {
        if (!this.db) await this.ensureDatabaseInitialized();
        if (!this.db) return;

        try {
            await this.db.put('highlights', highlight);
        } catch (error) {
            console.error('[HighlightStore] Failed to save highlight to database:', error);
        }
    }

    /**
     * Remove a highlight from the database
     */
    private async removeFromDatabase(id: string): Promise<void> {
        if (!this.db) await this.ensureDatabaseInitialized();
        if (!this.db) return;

        try {
            await this.db.delete('highlights', id);
        } catch (error) {
            console.error(`[HighlightStore] Failed to remove highlight ${id} from database:`, error);
        }
    }

    /**
     * Ensure database is initialized before operations
     */
    private async ensureDatabaseInitialized(): Promise<void> {
        if (this.dbInitialized) return;
        if (this.initPromise) await this.initPromise;
    }

    /**
     * Generate a unique ID for a highlight
     */
    private generateUniqueId(type: HighlightType = HighlightType.MANUAL): string {
        const typePrefix = type.toLowerCase();
        const timestamp = Date.now();
        const uuid = uuidv4();
        return `${typePrefix}-${timestamp}-${uuid}`;
    }

    /**
     * Notify subscribers of changes
     */
    private notifySubscribers(fileKey?: string, page?: number, type?: HighlightType): void {
        for (const subscriber of this.subscribers) {
            subscriber(fileKey, page, type);
        }
    }

    // ==========================================
    // PUBLIC API - LEVEL 1: CORE OPERATIONS
    // ==========================================

    /**
     * Add a single highlight to the store
     */
    async addHighlight(highlight: HighlightRect): Promise<string> {
        await this.ensureDatabaseInitialized();

        // Ensure highlight has an ID
        if (!highlight.id) {
            highlight.id = this.generateUniqueId(highlight.type);
        }

        // Ensure highlight has a timestamp
        if (!highlight.timestamp) {
            highlight.timestamp = Date.now();
        }

        // Add to memory store
        this.addToMemoryStore(highlight);

        // Save to database
        await this.saveToDatabase(highlight);

        // Notify subscribers
        this.notifySubscribers(highlight.fileKey, highlight.page, highlight.type);

        return highlight.id;
    }

    /**
     * Remove a single highlight by ID
     */
    async removeHighlight(id: string): Promise<boolean> {
        await this.ensureDatabaseInitialized();

        // Find the highlight in memory
        let foundHighlight: HighlightRect | null = null;
        let foundFileKey: string | null = null;
        let foundPage: number | null = null;

        for (const [fileKey, fileMap] of this.highlights.entries()) {
            for (const [page, pageMap] of fileMap.entries()) {
                if (pageMap.has(id)) {
                    foundHighlight = pageMap.get(id)!;
                    foundFileKey = fileKey;
                    foundPage = page;

                    // Remove from memory
                    pageMap.delete(id);

                    // Clean up empty maps
                    if (pageMap.size === 0) {
                        fileMap.delete(page);

                        if (fileMap.size === 0) {
                            this.highlights.delete(fileKey);
                        }
                    }

                    break;
                }
            }

            if (foundHighlight) break;
        }

        if (!foundHighlight) return false;

        // Remove from database
        await this.removeFromDatabase(id);

        // Notify subscribers
        this.notifySubscribers(foundFileKey || undefined, foundPage || undefined, foundHighlight.type);

        // Dispatch a global event that a highlight was removed
        window.dispatchEvent(new CustomEvent('highlight-removed', {
            detail: {
                id,
                fileKey: foundFileKey,
                page: foundPage,
                type: foundHighlight.type,
                timestamp: Date.now()
            }
        }));

        return true;
    }

    // ==========================================
    // PUBLIC API - LEVEL 2: BATCH OPERATIONS
    // ==========================================

    /**
     * Add multiple highlights in a single transaction
     */
    async addMultipleHighlights(highlights: HighlightRect[]): Promise<string[]> {
        if (highlights.length === 0) return [];

        await this.ensureDatabaseInitialized();

        const ids: string[] = [];

        // Group highlights by file and page for efficient notifications
        const filePageMap = new Map<string, Set<number>>();
        const typeSet = new Set<HighlightType>();

        // Add all highlights
        for (const highlight of highlights) {
            // Ensure highlight has an ID and timestamp
            if (!highlight.id) {
                highlight.id = this.generateUniqueId(highlight.type);
            }

            if (!highlight.timestamp) {
                highlight.timestamp = Date.now();
            }
            this.getHighlightsForFile(highlight.fileKey ).forEach(h => {
                if (h.x === highlight.x && h.y === highlight.y && h.w === highlight.w && h.h === highlight.h) {
                    this.removeHighlight(h.id);
                }});


            // Add to memory store
            this.addToMemoryStore(highlight);

            // Save to database (we don't await here for better performance)
            this.saveToDatabase(highlight).catch(error => {
                console.error('[HighlightStore] Failed to save highlight to database:', error);
            });

            ids.push(highlight.id);

            // Track fileKey and page for notifications
            const fileKey = highlight.fileKey || '_default';
            const page = highlight.page || 0;

            if (!filePageMap.has(fileKey)) {
                filePageMap.set(fileKey, new Set());
            }

            filePageMap.get(fileKey)!.add(page);
            if (highlight.type) {
                typeSet.add(highlight.type);
            }
        }

        // Notify subscribers for each affected file/page combination
        for (const [fileKey, pages] of filePageMap.entries()) {
            for (const page of pages) {
                for (const type of typeSet) {
                    this.notifySubscribers(fileKey, page, type);
                }
            }
        }

        return ids;
    }

    /**
     * Remove multiple highlights by ID
     */
    async removeMultipleHighlights(ids: string[]): Promise<boolean> {
        if (ids.length === 0) return true;

        await this.ensureDatabaseInitialized();

        // Group highlights by file and page for efficient notifications
        const filePageMap = new Map<string, Set<number>>();
        const typeSet = new Set<HighlightType>();

        // Process each ID
        for (const id of ids) {
            // Find the highlight in memory
            let foundHighlight: HighlightRect | null = null;
            let foundFileKey: string | null = null;
            let foundPage: number | null = null;

            for (const [fileKey, fileMap] of this.highlights.entries()) {
                for (const [page, pageMap] of fileMap.entries()) {
                    if (pageMap.has(id)) {
                        foundHighlight = pageMap.get(id)!;
                        foundFileKey = fileKey;
                        foundPage = page;

                        // Remove from memory
                        pageMap.delete(id);

                        // Clean up empty maps
                        if (pageMap.size === 0) {
                            fileMap.delete(page);

                            if (fileMap.size === 0) {
                                this.highlights.delete(fileKey);
                            }
                        }

                        break;
                    }
                }

                if (foundHighlight) break;
            }

            if (foundHighlight) {
                // Remove from database (we don't await here for better performance)
                this.removeFromDatabase(id).catch(error => {
                    console.error(`[HighlightStore] Failed to remove highlight ${id} from database:`, error);
                });

                // Track for notifications
                if (foundFileKey && foundPage !== null) {
                    if (!filePageMap.has(foundFileKey)) {
                        filePageMap.set(foundFileKey, new Set());
                    }

                    filePageMap.get(foundFileKey)!.add(foundPage);
                    if (foundHighlight.type) {
                        typeSet.add(foundHighlight.type);
                    }
                }
            }
        }

        // Notify subscribers for each affected file/page combination
        for (const [fileKey, pages] of filePageMap.entries()) {
            for (const page of pages) {
                for (const type of typeSet) {
                    this.notifySubscribers(fileKey, page, type);
                }
            }
        }

        return true;
    }

    // ==========================================
    // PUBLIC API - LEVEL 3: PAGE OPERATIONS
    // ==========================================

    /**
     * Get all highlights for a specific page
     */
    getHighlightsForPage(fileKey: string, page: number): HighlightRect[] {
        const fileMap = this.highlights.get(fileKey);
        if (!fileMap) return [];

        const pageMap = fileMap.get(page);
        if (!pageMap) return [];

        return Array.from(pageMap.values());
    }

    /**
     * Add highlights to a specific page
     */
    async addHighlightsToPage(fileKey: string, page: number, highlights: HighlightRect[]): Promise<string[]> {
        // Ensure all highlights have the correct fileKey and page
        const processedHighlights = highlights.map(highlight => ({
            ...highlight,
            fileKey,
            page
        }));

        return this.addMultipleHighlights(processedHighlights);
    }

    /**
     * Remove all highlights from a specific page
     */
    async removeHighlightsFromPage(fileKey: string, page: number): Promise<boolean> {
        await this.ensureDatabaseInitialized();

        const fileMap = this.highlights.get(fileKey);
        if (!fileMap) return true; // No highlights for this file

        const pageMap = fileMap.get(page);
        if (!pageMap) return true; // No highlights for this page

        // Get all highlight IDs for this page
        const ids = Array.from(pageMap.keys());

        // Remove all highlights
        const result = await this.removeMultipleHighlights(ids);

        // Notify subscribers
        this.notifySubscribers(fileKey, page);

        return result;
    }

    // ==========================================
    // PUBLIC API - LEVEL 4: FILE OPERATIONS
    // ==========================================

    /**
     * Get all highlights for a specific file
     */
    getHighlightsForFile(fileKey: string): HighlightRect[] {
        const fileMap = this.highlights.get(fileKey);
        if (!fileMap) return [];

        const allHighlights: HighlightRect[] = [];

        for (const pageMap of fileMap.values()) {
            allHighlights.push(...pageMap.values());
        }

        return allHighlights;
    }

    /**
     * Add highlights to a specific file
     */
    async addHighlightsToFile(fileKey: string, highlights: HighlightRect[]): Promise<string[]> {
        // Ensure all highlights have the correct fileKey
        const processedHighlights = highlights.map(highlight => ({
            ...highlight,
            fileKey
        }));

        return this.addMultipleHighlights(processedHighlights);
    }

    /**
     * Remove all highlights from a specific file
     */
    async removeHighlightsFromFile(fileKey: string): Promise<boolean> {
        await this.ensureDatabaseInitialized();

        const fileMap = this.highlights.get(fileKey);
        if (!fileMap) return true; // No highlights for this file

        // Get all highlight IDs for this file
        const ids: string[] = [];

        for (const pageMap of fileMap.values()) {
            ids.push(...pageMap.keys());
        }

        // Remove all highlights
        const result = await this.removeMultipleHighlights(ids);

        // Notify subscribers
        this.notifySubscribers(fileKey);

        return result;
    }

    // ==========================================
    // PUBLIC API - LEVEL 5: TYPE OPERATIONS
    // ==========================================

    /**
     * Get all highlights of a specific type for a file
     */
    getHighlightsByType(fileKey: string, type: HighlightType): HighlightRect[] {
        return this.getHighlightsForFile(fileKey).filter(highlight => highlight.type === type);
    }

    /**
     * Add highlights of a specific type to a file
     */
    async addHighlightsByType(fileKey: string, type: HighlightType, highlights: HighlightRect[]): Promise<string[]> {
        // Ensure all highlights have the correct fileKey and type
        const processedHighlights = highlights.map(highlight => ({
            ...highlight,
            fileKey,
            type
        }));

        return this.addMultipleHighlights(processedHighlights);
    }

    /**
     * Remove all highlights of a specific type from a file
     */
    async removeHighlightsByType(fileKey: string, type: HighlightType): Promise<boolean> {
        await this.ensureDatabaseInitialized();

        // Get all highlights for this file
        const highlights = this.getHighlightsForFile(fileKey);

        // Filter to only the specified type
        const highlightsToRemove = highlights.filter(highlight => highlight.type === type);

        // Get IDs
        const ids = highlightsToRemove.map(highlight => highlight.id);

        // Remove all highlights
        const result = await this.removeMultipleHighlights(ids);

        // Notify subscribers
        this.notifySubscribers(fileKey, undefined, type);

        return result;
    }

    // ==========================================
    // PUBLIC API - LEVEL 6: PROPERTY OPERATIONS
    // ==========================================

    /**
     * Find highlights by a specific property value
     */
    getHighlightsByProperty(fileKey: string, property: string, value: any): HighlightRect[] {
        return this.getHighlightsForFile(fileKey).filter(highlight =>
            highlight[property as keyof HighlightRect] === value
        );
    }

    /**
     * Remove highlights by a specific property value
     */
    async removeHighlightsByProperty(fileKey: string, property: string, value: any): Promise<boolean> {
        await this.ensureDatabaseInitialized();

        // Get all highlights with this property value
        const highlights = this.getHighlightsByProperty(fileKey, property, value);

        // Get IDs
        const ids = highlights.map(highlight => highlight.id);

        // Remove all highlights
        const result = await this.removeMultipleHighlights(ids);

        return result;
    }

    /**
     * Remove highlights by property from all files
     */
    async removeHighlightsByPropertyFromAllFiles(property: string, value: any , files : File[]): Promise<boolean> {
        await this.ensureDatabaseInitialized();
        let result = false;
        for (const file of files) {
            result = await this.removeHighlightsByProperty(file.name, property, value);
        }

        return result;
    }

    /**
     * Remove highlights by position with optimized bounding box similarity matching
     *
     * @param fileKey - File identifier
     * @param x0 - Left coordinate of the query bounding box
     * @param y0 - Top coordinate of the query bounding box
     * @param x1 - Right coordinate of the query bounding box
     * @param y1 - Bottom coordinate of the query bounding box
     * @param options - Optional configuration for similarity matching
     * @returns Promise resolving to true if highlights were removed
     */
    async removeHighlightsByPosition(
        files: File[],
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        options: {
            iouThreshold?: number;       // Threshold for Intersection over Union (0-1)
            centerDistThreshold?: number; // Max distance between centers in absolute pixels
            textMatchRequired?: boolean;  // Whether text matching is required
            sizeRatioDifference?: number; // Max allowed difference in size ratio
            debug?: boolean;              // Enable detailed logging
        } = {}
    ): Promise<boolean> {
        await this.ensureDatabaseInitialized();

        // Set default options with less restrictive parameters
        const {
            iouThreshold = 0.05,          // Very permissive IoU threshold
            centerDistThreshold = 50,     // Absolute pixel distance (not normalized)
            textMatchRequired = false,    // Don't require text matching by default
            sizeRatioDifference = 0.7,    // Allow size difference up to 70%
            debug = true                  // Enable debug by default for troubleshooting
        } = options;

        // Get all highlights for this file
        const highlights = files.flatMap(file => this.getHighlightsForFile(file.name));

        // Query box properties
        const queryBox = { x0, y0, x1, y1 };
        const queryWidth = x1 - x0;
        const queryHeight = y1 - y0;
        const queryArea = queryWidth * queryHeight;
        const queryCenter = {
            x: x0 + queryWidth / 2,
            y: y0 + queryHeight / 2
        };

        if (debug) {
            console.log(`[removeHighlightsByPosition] Query box: (${x0.toFixed(2)}, ${y0.toFixed(2)}) -> (${x1.toFixed(2)}, ${y1.toFixed(2)})`);
            console.log(`[removeHighlightsByPosition] Query center: (${queryCenter.x.toFixed(2)}, ${queryCenter.y.toFixed(2)})`);
            console.log(`[removeHighlightsByPosition] Query dimensions: ${queryWidth.toFixed(2)} × ${queryHeight.toFixed(2)}`);
            console.log(`[removeHighlightsByPosition] Query area: ${queryArea.toFixed(2)}`);
        }

        // Filter to highlights that match the position criteria
        const highlightsToRemove = highlights.filter(highlight => {
            // Ensure highlight has required properties
            if (!highlight.x && highlight.x !== 0 || !highlight.y && highlight.y !== 0 ||
                !highlight.w && highlight.w !== 0 || !highlight.h && highlight.h !== 0) {
                if (debug) console.log(`Highlight ${highlight.id} missing position data`);
                return false;
            }

            // Convert highlight to a bounding box format
            const highlightBox = {
                x0: highlight.x,
                y0: highlight.y,
                x1: highlight.x + highlight.w,
                y1: highlight.y + highlight.h
            };

            // Calculate highlight properties
            const highlightWidth = highlightBox.x1 - highlightBox.x0;
            const highlightHeight = highlightBox.y1 - highlightBox.y0;
            const highlightArea = highlightWidth * highlightHeight;
            const highlightCenter = {
                x: highlightBox.x0 + highlightWidth / 2,
                y: highlightBox.y0 + highlightHeight / 2
            };

            // 1. Calculate absolute center distance in pixels (not normalized)
            const centerDistance = Math.sqrt(
                Math.pow(queryCenter.x - highlightCenter.x, 2) +
                Math.pow(queryCenter.y - highlightCenter.y, 2)
            );

            if (centerDistance > centerDistThreshold) {
                if (debug) console.log(`Highlight ${highlight.id} failed center distance check: ${centerDistance.toFixed(2)} pixels`);
                return false;
            }

            // 2. Check if areas are significantly different
            const areaRatio = Math.min(queryArea, highlightArea) / Math.max(queryArea, highlightArea);
            if (areaRatio < (1 - sizeRatioDifference)) {
                if (debug) console.log(`Highlight ${highlight.id} failed area ratio check: ${areaRatio.toFixed(4)}`);
                return false;
            }

            // 3. Calculate intersection for IoU
            const xOverlap = Math.max(0, Math.min(highlightBox.x1, queryBox.x1) - Math.max(highlightBox.x0, queryBox.x0));
            const yOverlap = Math.max(0, Math.min(highlightBox.y1, queryBox.y1) - Math.max(highlightBox.y0, queryBox.y0));

            // If no overlap at all, we can still consider it based on center distance
            let iou = 0;
            if (xOverlap > 0 && yOverlap > 0) {
                const overlapArea = xOverlap * yOverlap;
                const unionArea = highlightArea + queryArea - overlapArea;
                iou = overlapArea / unionArea;
            }

            // Log all metrics for debugging
            if (debug) {
                console.log(
                    `Highlight ID: ${highlight.id}, ` +
                    `Center Distance: ${centerDistance.toFixed(2)} pixels, ` +
                    `Area Ratio: ${areaRatio.toFixed(4)}, ` +
                    `IoU: ${iou.toFixed(4)}, ` +
                    `Text: "${highlight.text?.substring(0, 30) || 'none'}"` +
                    `Type: ${highlight.type || 'unknown'}`
                );
            }

            // The highlight passes if the center distance check passed (already checked)
            // AND either the iou is sufficient OR the highlight has very similar area
            const passesIoUCheck = iou >= iouThreshold;
            const passesAreaCheck = areaRatio > 0.9; // Very similar area as fallback

            // Accept if either IoU or area is very similar
            return passesIoUCheck || passesAreaCheck;
        });

        // Log summary if in debug mode
        if (debug) {
            console.log(`[removeHighlightsByPosition] Found ${highlightsToRemove.length} matching highlights out of ${highlights.length} total`);
            if (highlightsToRemove.length > 0) {
                console.table(highlightsToRemove.map(h => ({
                    id: h.id,
                    x: h.x.toFixed(2),
                    y: h.y.toFixed(2),
                    width: h.w.toFixed(2),
                    height: h.h.toFixed(2),
                    text: h.text?.substring(0, 20) || 'No text'
                })));
            }
        }

        // Get IDs and remove matching highlights
        const ids = highlightsToRemove.map(highlight => highlight.id);
        return ids.length > 0 ? await this.removeMultipleHighlights(ids) : false;
    }

    /**
     * Find highlights containing a specific text
     */
    getHighlightsByText(fileKey: string, text: string): HighlightRect[] {
        const normalizedText = text.toLowerCase().trim();

        return this.getHighlightsForFile(fileKey).filter(highlight => {
            const highlightText = highlight.text?.toLowerCase().trim() || '';
            return highlightText === normalizedText;
        });
    }

    /**
     * Remove highlights containing a specific text
     */
    async removeHighlightsByText(fileKey: string, text: string): Promise<boolean> {
        await this.ensureDatabaseInitialized();

        // Get all highlights with this text
        const highlights = this.getHighlightsByText(fileKey, text);

        // Get IDs
        const ids = highlights.map(highlight => highlight.id);

        // Remove all highlights
        const result = await this.removeMultipleHighlights(ids);

        return result;
    }

    // ==========================================
    // PUBLIC API - LEVEL 7: GLOBAL OPERATIONS
    // ==========================================

    /**
     * Remove all highlights from all files
     */
    async removeAllHighlights(): Promise<boolean> {
        await this.ensureDatabaseInitialized();

        if (!this.db) return false;

        try {
            // Clear database
            await this.db.clear('highlights');

            // Clear memory store
            this.highlights.clear();

            // Notify subscribers
            this.notifySubscribers();

            return true;
        } catch (error) {
            console.error('[HighlightStore] Failed to remove all highlights:', error);
            return false;
        }
    }
    /**
     * Remove all highlights of a specific type from all files
     */
    async removeAllHighlightsByType(type: HighlightType): Promise<boolean> {
        await this.ensureDatabaseInitialized();

        // Get all highlights of this type
        const highlights = Array.from(this.highlights.values()).flatMap(fileMap =>
            Array.from(fileMap.values()).flatMap(pageMap => Array.from(pageMap.values()))
        ).filter(highlight => highlight.type === type);

        // Get IDs
        const ids = highlights.map(highlight => highlight.id);

        // Remove all highlights
        const result = await this.removeMultipleHighlights(ids);

        // Notify subscribers
        this.notifySubscribers(undefined, undefined, type);

        return result;
    }

    // ==========================================
    // PUBLIC API - SUBSCRIPTION MANAGEMENT
    // ==========================================

    /**
     * Subscribe to highlight changes
     * @param callback Function to call when highlights change
     * @returns Subscription object with unsubscribe method
     */
    subscribe(callback: (fileKey?: string, page?: number, type?: HighlightType) => void): HighlightStoreSubscription {
        this.subscribers.add(callback);

        return {
            unsubscribe: () => {
                this.subscribers.delete(callback);
            }
        };
    }
}

// Export singleton instance
export const highlightStore = new HighlightStore();
