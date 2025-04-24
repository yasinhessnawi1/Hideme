// src/services/SummaryPersistenceService.ts - Improved
import { getFileKey } from '../contexts/PDFViewerContext';
import {an} from "framer-motion/dist/types.d-B50aGbjN";

// Define common summary types
export interface FileSummaryBase {
    fileKey: string;
    fileName: string;
}

export interface EntityFileSummary extends FileSummaryBase {
    entities_detected: any;
    performance: any;
}

export interface SearchFileSummary extends FileSummaryBase {
    matchCount: number;
    pageMatches: Map<number, number> | Record<number, number>;
}

// Storage keys
const STORAGE_KEYS = {
    ENTITY_ANALYZED_FILES: 'entity-detection-analyzed-files',
    ENTITY_FILE_SUMMARIES: 'entity-detection-file-summaries',
    SEARCH_ANALYZED_FILES: 'search-analyzed-files',
    SEARCH_FILE_SUMMARIES: 'search-file-summaries',
    SEARCH_ACTIVE_QUERIES: 'search-active-queries'

};

/**
 * Service for managing persistence of file summaries and analyzed file sets
 * Provides consistent handling for both entity detection and search functionality
 */
class SummaryPersistenceService {
    private static instance: SummaryPersistenceService;

    // Track file events to prevent duplicate handling
    private fileEventHandlersRegistered = false;

    // Keep cached versions of analyzed files to handle initialization edge cases
    private cachedEntityAnalyzedFiles: Set<string> | null = null;
    private cachedSearchAnalyzedFiles: Set<string> | null = null;

    // Subscribers for changes
    private subscribers: Map<string, Set<Function>> = new Map();

    // Initial loading in progress flags to prevent premature reconciliation
    private initialLoadInProgress = {
        entity: true,
        search: true
    };

    private constructor() {
        this.registerFileEventHandlers();
        this.preloadCachedData();
    }

    public static getInstance(): SummaryPersistenceService {
        if (!this.instance) {
            this.instance = new SummaryPersistenceService();
        }
        return this.instance;
    }

    /**
     * Preload cached data from localStorage to handle initialization
     */
    private preloadCachedData(): void {
        try {
            // Preload entity analyzed files
            const savedEntityFiles = localStorage.getItem(STORAGE_KEYS.ENTITY_ANALYZED_FILES);
            if (savedEntityFiles) {
                this.cachedEntityAnalyzedFiles = new Set(JSON.parse(savedEntityFiles));
                console.log(`[SummaryPersistenceService] Preloaded ${this.cachedEntityAnalyzedFiles.size} entity analyzed files`);
            }

            // Preload search analyzed files
            const savedSearchFiles = localStorage.getItem(STORAGE_KEYS.SEARCH_ANALYZED_FILES);
            if (savedSearchFiles) {
                this.cachedSearchAnalyzedFiles = new Set(JSON.parse(savedSearchFiles));
                console.log(`[SummaryPersistenceService] Preloaded ${this.cachedSearchAnalyzedFiles.size} search analyzed files`);
            }

            // Mark initial load as complete after a delay
            setTimeout(() => {
                this.initialLoadInProgress = {
                    entity: false,
                    search: false
                };
                console.log(`[SummaryPersistenceService] Initial load complete`);
            }, 1000); // Short delay to allow component initialization
        } catch (error) {
            console.error(`[SummaryPersistenceService] Error preloading cached data:`, error);
        }
    }

    /**
     * Register global event handlers for file changes
     */
    private registerFileEventHandlers(): void {
        if (this.fileEventHandlersRegistered) return;

        // Handle file removal
        const handleFileRemoved = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey } = customEvent.detail || {};

            if (fileKey) {
                console.log(`[SummaryPersistenceService] File removed: ${fileKey}`);

                // Remove file from both entity and search tracking
                this.removeFileFromSummaries('entity', fileKey);
                this.removeFileFromSummaries('search', fileKey);
            }
        };

        // Listen for both events for maximum compatibility
        window.addEventListener('processed-file-removed', handleFileRemoved);
        window.addEventListener('file-removed', handleFileRemoved);

        this.fileEventHandlersRegistered = true;
        console.log('[SummaryPersistenceService] File event handlers registered');
    }
    /**
     * Save active search queries to localStorage
     */
    public saveActiveSearchQueries(queries: any[]): void {
        try {
            localStorage.setItem(STORAGE_KEYS.SEARCH_ACTIVE_QUERIES, JSON.stringify(queries));
            console.log(`[SummaryPersistenceService] Saved ${queries.length} active search queries`);
        } catch (error) {
            console.error('[SummaryPersistenceService] Error saving active search queries:', error);
        }
    }

    /**
     * Get active search queries from localStorage
     */
    public getActiveSearchQueries(): any[] {
        try {
            const savedQueries = localStorage.getItem(STORAGE_KEYS.SEARCH_ACTIVE_QUERIES);
            if (savedQueries) {
                const parsedQueries = JSON.parse(savedQueries);
                console.log(`[SummaryPersistenceService] Loaded ${parsedQueries.length} active search queries`);
                return parsedQueries;
            }
        } catch (error) {
            console.error('[SummaryPersistenceService] Error loading active search queries:', error);
        }
        return [];
    }

    /**
     * Remove a single search
     */
    public removeSearchQuery(query: any, fileKey : string = ''): void {
        const queries = this.getActiveSearchQueries();
        let filteredQueries : any[] = [];
        if (fileKey === '') {
             filteredQueries  = queries.filter(q => q.query !== query.query);

        }else {
             filteredQueries = queries.filter(q => q.query !== query.query && q.fileKey !== fileKey);
        }

        if (filteredQueries.length !== queries.length) {
            this.saveActiveSearchQueries(filteredQueries);
            console.log(`[SummaryPersistenceService] Removed search query: ${query.query}`);
        }


    }
    /**
     * Clear all search queries
     */
    public clearSearchQueries(fileKey : string , clearSearch: Function): void {
        // Remove from analyzed files
        this.removeAnalyzedFile('search', fileKey);
        // Remove from file summaries
        this.removeFileFromSummaries('search', fileKey);
        // Remove from active search queries
        const queries = this.getActiveSearchQueries();
        const filteredQueries = queries.filter(q => q.fileKey !== fileKey);
        if (filteredQueries.length !== queries.length) {
            filteredQueries.forEach(query => {
                    clearSearch(query);
            });
            console.log(`[SummaryPersistenceService] Cleared search queries for file: ${fileKey}`);
        }
        localStorage.removeItem(STORAGE_KEYS.SEARCH_ACTIVE_QUERIES);
        console.log('[SummaryPersistenceService] Cleared all search queries');
    }


    /**
     * Get analyzed files from localStorage
     * Uses cached version during initialization
     */
    public getAnalyzedFiles(type: 'entity' | 'search'): Set<string> {
        try {
            // If initial load is in progress, use cached data to prevent empty sets
            if (this.initialLoadInProgress[type]) {
                if (type === 'entity' && this.cachedEntityAnalyzedFiles) {
                    return new Set(this.cachedEntityAnalyzedFiles);
                } else if (type === 'search' && this.cachedSearchAnalyzedFiles) {
                    return new Set(this.cachedSearchAnalyzedFiles);
                }
            }

            const key = type === 'entity' ? STORAGE_KEYS.ENTITY_ANALYZED_FILES : STORAGE_KEYS.SEARCH_ANALYZED_FILES;
            const savedFiles = localStorage.getItem(key);

            if (savedFiles) {
                const parsedFiles = JSON.parse(savedFiles) as string[];
                return new Set(parsedFiles);
            }
        } catch (error) {
            console.error(`[SummaryPersistenceService] Error loading ${type} analyzed files:`, error);
        }

        return new Set();
    }

    /**
     * Save analyzed files to localStorage
     */
    public saveAnalyzedFiles(type: 'entity' | 'search', fileSet: Set<string>): void {
        try {
            const key = type === 'entity' ? STORAGE_KEYS.ENTITY_ANALYZED_FILES : STORAGE_KEYS.SEARCH_ANALYZED_FILES;
            const fileArray = [...fileSet];

            localStorage.setItem(key, JSON.stringify(fileArray));
            console.log(`[SummaryPersistenceService] Saved ${fileSet.size} ${type} analyzed files: ${fileArray.join(', ')}`);

            // Update our cache
            if (type === 'entity') {
                this.cachedEntityAnalyzedFiles = new Set(fileSet);
            } else {
                this.cachedSearchAnalyzedFiles = new Set(fileSet);
            }

            // Notify subscribers
            this.notifySubscribers(`${type}-analyzed-files-updated`, fileSet);
        } catch (error) {
            console.error(`[SummaryPersistenceService] Error saving ${type} analyzed files:`, error);
        }
    }

    /**
     * Add a file to the analyzed set
     */
    public addAnalyzedFile(type: 'entity' | 'search', fileKey: string): Set<string> {
        const fileSet = this.getAnalyzedFiles(type);

        if (!fileSet.has(fileKey)) {
            fileSet.add(fileKey);
            this.saveAnalyzedFiles(type, fileSet);
        }

        return fileSet;
    }

    /**
     * Remove a file from the analyzed set
     */
    public removeAnalyzedFile(type: 'entity' | 'search', fileKey: string): Set<string> {
        const fileSet = this.getAnalyzedFiles(type);

        if (fileSet.has(fileKey)) {
            fileSet.delete(fileKey);
            this.saveAnalyzedFiles(type, fileSet);
        }

        return fileSet;
    }

    /**
     * Filter analyzed files to only include existing files
     * Skip if initial load is in progress to prevent premature filtering
     */
    public reconcileAnalyzedFiles(type: 'entity' | 'search', availableFileKeys: string[]): Set<string> {
        // Skip reconciliation if no files provided or initial load in progress
        if (availableFileKeys.length === 0 || this.initialLoadInProgress[type]) {
            return this.getAnalyzedFiles(type);
        }

        const fileSet = this.getAnalyzedFiles(type);
        const availableSet = new Set(availableFileKeys);

        let changed = false;
        const newSet = new Set<string>();

        fileSet.forEach(fileKey => {
            if (availableSet.has(fileKey)) {
                newSet.add(fileKey);
            } else {
                changed = true;
            }
        });

        if (changed) {
            this.saveAnalyzedFiles(type, newSet);
            console.log(`[SummaryPersistenceService] Reconciled ${type} analyzed files, removed ${fileSet.size - newSet.size} files`);
        }

        return newSet;
    }

    /**
     * Get file summaries from localStorage
     */
    public getFileSummaries<T extends FileSummaryBase>(type: 'entity' | 'search'): T[] {
        try {
            const key = type === 'entity' ? STORAGE_KEYS.ENTITY_FILE_SUMMARIES : STORAGE_KEYS.SEARCH_FILE_SUMMARIES;
            const savedSummaries = localStorage.getItem(key);

            if (savedSummaries) {
                const parsedSummaries = JSON.parse(savedSummaries) as T[];
                return parsedSummaries;
            }
        } catch (error) {
            console.error(`[SummaryPersistenceService] Error loading ${type} file summaries:`, error);
        }

        return [];
    }

    /**
     * Save file summaries to localStorage
     */
    public saveFileSummaries<T extends FileSummaryBase>(type: 'entity' | 'search', summaries: T[]): void {
        try {
            // Ensure unique summaries by fileKey
            const uniqueSummaries = this.ensureUniqueSummaries(summaries);

            const key = type === 'entity' ? STORAGE_KEYS.ENTITY_FILE_SUMMARIES : STORAGE_KEYS.SEARCH_FILE_SUMMARIES;
            localStorage.setItem(key, JSON.stringify(uniqueSummaries));
            console.log(`[SummaryPersistenceService] Saved ${uniqueSummaries.length} ${type} file summaries`);

            // Notify subscribers
            this.notifySubscribers(`${type}-summaries-updated`, uniqueSummaries);
        } catch (error) {
            console.error(`[SummaryPersistenceService] Error saving ${type} file summaries:`, error);
        }
    }

    /**
     * Add or update a file summary
     */
    public updateFileSummary<T extends FileSummaryBase>(type: 'entity' | 'search', summary: T): T[] {
        const summaries = this.getFileSummaries<T>(type);

        // Remove any existing summary for this file
        const filteredSummaries = summaries.filter(s => s.fileKey !== summary.fileKey);

        // Add the new summary
        const updatedSummaries = [...filteredSummaries, summary];

        // Save the updated summaries
        this.saveFileSummaries(type, updatedSummaries);

        return updatedSummaries;
    }

    /**
     * Remove a file from summaries and analyzed files
     * Enhanced to properly update all states and notify components
     */
    public removeFileFromSummaries(type: 'entity' | 'search', fileKey: string): void {
        console.log(`[SummaryPersistenceService] Removing ${type} data for file ${fileKey}`);

        // Remove from analyzed files set
        const analyzedFiles = this.getAnalyzedFiles(type);
        if (analyzedFiles.has(fileKey)) {
            analyzedFiles.delete(fileKey);
            this.saveAnalyzedFiles(type, analyzedFiles);
            console.log(`[SummaryPersistenceService] Removed ${fileKey} from ${type} analyzed files`);
        }

        // Remove from file summaries
        const summaries = this.getFileSummaries<FileSummaryBase>(type);
        const filteredSummaries = summaries.filter(s => s.fileKey !== fileKey);

        if (filteredSummaries.length !== summaries.length) {
            this.saveFileSummaries(type, filteredSummaries);
            console.log(`[SummaryPersistenceService] Removed ${type} summary for file ${fileKey}`);
        }

        // If this is a search file, also clean up search queries
        if (type === 'search') {
            const searchQueries = this.getActiveSearchQueries();
            const filteredQueries = searchQueries.filter(q => !q.fileKey || q.fileKey !== fileKey);

            if (filteredQueries.length !== searchQueries.length) {
                this.saveActiveSearchQueries(filteredQueries);
                console.log(`[SummaryPersistenceService] Removed search queries for file ${fileKey}`);
            }
        }

        // Notify subscribers
        this.notifySubscribers(`${type}-file-removed`, { fileKey });
        this.notifySubscribers(`${type}-summaries-updated`, filteredSummaries);

        // Dispatch additional event for components to update
        window.dispatchEvent(new CustomEvent(`${type}-file-removed`, {
            detail: {
                fileKey,
                timestamp: Date.now()
            }
        }));
    }

    /**
     * Clear all data for a specific type
     * New method to support complete clearing
     */
    public clearAllData(type: 'entity' | 'search'): void {
        // Clear analyzed files
        this.saveAnalyzedFiles(type, new Set());

        // Clear file summaries
        this.saveFileSummaries(type, []);

        // Clear search queries if applicable
        if (type === 'search') {
            this.saveActiveSearchQueries([]);
        }

        console.log(`[SummaryPersistenceService] Cleared all ${type} data`);

        // Notify subscribers
        this.notifySubscribers(`${type}-all-cleared`, null);

        // Dispatch event for components to update
        window.dispatchEvent(new CustomEvent(`${type}-all-cleared`, {
            detail: {
                timestamp: Date.now()
            }
        }));
    }

    /**
     * Reset file summary - removes entity/search data but keeps the file in the system
     * New method to support partial clearing
     */
    public resetFileSummary(type: 'entity' | 'search', fileKey: string): void {
        // Get current summaries
        const summaries = this.getFileSummaries<FileSummaryBase>(type);

        // Remove the specific file summary
        const filteredSummaries = summaries.filter(s => s.fileKey !== fileKey);

        if (filteredSummaries.length !== summaries.length) {
            // Save the updated summaries
            this.saveFileSummaries(type, filteredSummaries);
            console.log(`[SummaryPersistenceService] Reset ${type} summary for file ${fileKey}`);

            // Notify subscribers
            this.notifySubscribers(`${type}-summary-reset`, { fileKey });

            // Dispatch event for components to update
            window.dispatchEvent(new CustomEvent(`${type}-summary-reset`, {
                detail: {
                    fileKey,
                    timestamp: Date.now()
                }
            }));
        }
    }



    /**
     * Filter summaries to only include existing files
     */
    public reconcileFileSummaries<T extends FileSummaryBase>(type: 'entity' | 'search', availableFiles: File[]): T[] {
        // Skip reconciliation if no files provided or initial load in progress
        if (availableFiles.length === 0 || this.initialLoadInProgress[type]) {
            return this.getFileSummaries<T>(type);
        }

        const summaries = this.getFileSummaries<T>(type);
        const availableFileKeys = new Set(availableFiles.map(getFileKey));

        const filteredSummaries = summaries.filter(summary =>
            availableFileKeys.has(summary.fileKey)
        );

        if (filteredSummaries.length !== summaries.length) {
            this.saveFileSummaries(type, filteredSummaries);
            console.log(`[SummaryPersistenceService] Reconciled ${type} summaries, removed ${summaries.length - filteredSummaries.length} summaries`);
        }

        return filteredSummaries;
    }

    /**
     * Ensure summaries are unique by fileKey
     */
    private ensureUniqueSummaries<T extends FileSummaryBase>(summaries: T[]): T[] {
        const uniqueMap = new Map<string, T>();

        // Keep only the latest summary for each fileKey
        summaries.forEach(summary => {
            uniqueMap.set(summary.fileKey, summary);
        });

        return Array.from(uniqueMap.values());
    }

    /**
     * Subscribe to changes
     */
    public subscribe(event: string, callback: Function): { unsubscribe: () => void } {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, new Set());
        }

        this.subscribers.get(event)!.add(callback);

        return {
            unsubscribe: () => {
                const eventSubscribers = this.subscribers.get(event);
                if (eventSubscribers) {
                    eventSubscribers.delete(callback);
                }
            }
        };
    }

    /**
     * Notify subscribers of changes
     */
    private notifySubscribers(event: string, data: any): void {
        const eventSubscribers = this.subscribers.get(event);

        if (eventSubscribers) {
            eventSubscribers.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[SummaryPersistenceService] Error in subscriber:`, error);
                }
            });
        }
    }

    /**
     * Force completion of initialization - can be called when files are certainly loaded
     */
    public completeInitialization(type: 'entity' | 'search'): void {
        this.initialLoadInProgress[type] = false;
        console.log(`[SummaryPersistenceService] Initialization marked complete for ${type}`);
    }
}

// Export singleton instance
export const summaryPersistenceStore = SummaryPersistenceService.getInstance();

export default summaryPersistenceStore;
