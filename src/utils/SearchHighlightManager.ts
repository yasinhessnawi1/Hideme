// src/utils/SearchHighlightManager.ts
import { HighlightType } from "../contexts/HighlightContext";
import { SearchResult } from "../services/BatchSearchService";

/**
 * Manages search highlights from batch search results
 * Optimized with better logging and duplicate prevention
 */
export class SearchHighlightManager {
    private searchResults: SearchResult[];
    private addAnnotation: (page: number, annotation: any, fileKey?: string) => void;
    private fileKey?: string;
    private processingTimestamp: number;
    private processedIds: Set<string> = new Set();

    // Static tracking of processed pages by file to prevent reprocessing
    private static processedPagesByFile: Map<string, Set<number>> = new Map();
    // Static tracking of processed search results by file
    private static processedSearchIdsByFile: Map<string, Set<string>> = new Map();

    constructor(
        searchResults: SearchResult[],
        addAnnotation: (page: number, annotation: any, fileKey?: string) => void,
        fileKey?: string,
        options: { forceReprocess?: boolean } = {}
    ) {
        this.searchResults = searchResults;
        this.addAnnotation = addAnnotation;
        this.fileKey = fileKey;
        this.processingTimestamp = Date.now();

        // Initialize file-specific processed search IDs set if not exists
        const fileMarker = this.fileKey || 'default';
        if (!SearchHighlightManager.processedSearchIdsByFile.has(fileMarker)) {
            SearchHighlightManager.processedSearchIdsByFile.set(fileMarker, new Set<string>());
        }

        // Initialize file-specific processed pages set if not exists
        if (!SearchHighlightManager.processedPagesByFile.has(fileMarker)) {
            SearchHighlightManager.processedPagesByFile.set(fileMarker, new Set<number>());
        }

        // Get the file-specific processed search IDs
        const fileProcessedIds = SearchHighlightManager.processedSearchIdsByFile.get(fileMarker);
        if (fileProcessedIds) {
            // Initialize our instance set with the file-specific set
            this.processedIds = new Set(fileProcessedIds);
        }

        // If force reprocess is enabled, clear the processed pages for this file
        if (options.forceReprocess) {
            SearchHighlightManager.resetProcessedPagesForFile(fileMarker);
        }
    }

    /**
     * Check if a page has already been processed for a specific file
     */
    public static isPageProcessedForFile(fileKey: string, pageNumber: number): boolean {
        const fileMarker = fileKey || 'default';
        const processedPages = SearchHighlightManager.processedPagesByFile.get(fileMarker);
        return processedPages ? processedPages.has(pageNumber) : false;
    }

    /**
     * Mark a page as processed for a specific file
     */
    public static markPageAsProcessedForFile(fileKey: string, pageNumber: number): void {
        const fileMarker = fileKey || 'default';
        let processedPages = SearchHighlightManager.processedPagesByFile.get(fileMarker);

        if (!processedPages) {
            processedPages = new Set<number>();
            SearchHighlightManager.processedPagesByFile.set(fileMarker, processedPages);
        }

        processedPages.add(pageNumber);
    }

    /**
     * Reset processed pages for a specific file
     */
    public static resetProcessedPagesForFile(fileKey: string): void {
        const fileMarker = fileKey || 'default';
        SearchHighlightManager.processedPagesByFile.set(fileMarker, new Set<number>());
        console.log(`[SearchHighlightManager] Reset processed pages for file ${fileMarker}`);
    }

    /**
     * Reset all processed data for a specific file
     */
    public static resetProcessedDataForFile(fileKey: string): void {
        const fileMarker = fileKey || 'default';
        SearchHighlightManager.processedPagesByFile.set(fileMarker, new Set<number>());
        SearchHighlightManager.processedSearchIdsByFile.set(fileMarker, new Set<string>());
        console.log(`[SearchHighlightManager] Reset all processed data for file ${fileMarker}`);
    }

    /**
     * Remove a file from the processed data tracking
     */
    public static removeFileFromProcessedData(fileKey: string): void {
        const fileMarker = fileKey || 'default';
        SearchHighlightManager.processedPagesByFile.delete(fileMarker);
        SearchHighlightManager.processedSearchIdsByFile.delete(fileMarker);
        console.log(`[SearchHighlightManager] Removed file ${fileMarker} from processed data tracking`);
    }

    /**
     * Process search results into highlights with duplicate prevention
     */
    public processHighlights(): void {
        const fileMarker = this.fileKey || 'default';
        console.log(`[SearchHighlightManager] Processing ${this.searchResults.length} search highlights for ${fileMarker}`);

        if (!this.searchResults || this.searchResults.length === 0) {
            console.log('[SearchHighlightManager] No search results to process');
            return;
        }

        // CRITICAL FIX: Always force reprocessing of search highlights
        // This ensures search highlights always appear even when switching between files
        SearchHighlightManager.resetProcessedPagesForFile(fileMarker);

        // Strict filtering to ensure we only process results for this file
        const fileFilteredResults = this.searchResults.filter(result =>
            !result.fileKey || result.fileKey === this.fileKey
        );

        if (fileFilteredResults.length < this.searchResults.length) {
            console.log(`[SearchHighlightManager] Filtered out ${this.searchResults.length - fileFilteredResults.length} search results for other files`);
        }

        // Group search results by page for better performance
        const resultsByPage = new Map<number, SearchResult[]>();

        fileFilteredResults.forEach(result => {
            // Generate a stable ID for this result
            const resultId = this.generateSearchResultId(result);

            // Skip if we've already processed this exact result
            if (this.processedIds.has(resultId)) {
                return;
            }

            // Add to processed ids (both instance and file-specific)
            this.processedIds.add(resultId);

            // Update the file-specific processed IDs
            const fileProcessedIds = SearchHighlightManager.processedSearchIdsByFile.get(fileMarker);
            if (fileProcessedIds) {
                fileProcessedIds.add(resultId);
            }

            // Group by page
            if (!resultsByPage.has(result.page)) {
                resultsByPage.set(result.page, []);
            }
            resultsByPage.get(result.page)!.push(result);
        });

        // Only log if we have pages to process
        if (resultsByPage.size > 0) {
            console.log(`[SearchHighlightManager] Processing search results for ${resultsByPage.size} pages`);
        } else {
            console.log(`[SearchHighlightManager] No search results to process after filtering`);
            return;
        }

        // Process each page's results efficiently
        resultsByPage.forEach((pageResults, pageNumber) => {
            // CRITICAL FIX: Don't skip processing even if the page has been processed before
            // This ensures search highlights always appear
            console.log(`[SearchHighlightManager] Adding ${pageResults.length} highlights to page ${pageNumber}`);

            // Process in batches for better performance
            this.processBatch(pageResults, pageNumber);

            // Mark this page as processed for this file
            SearchHighlightManager.markPageAsProcessedForFile(fileMarker, pageNumber);
        });
    }

    /**
     * Generate a unique ID for a search result to prevent duplicates
     */
    private generateSearchResultId(result: SearchResult): string {
        const { page, x, y, w, h, text } = result;
        const fileMarker = this.fileKey || 'default';

        // Create a stable ID based on result properties
        return `${fileMarker}-${page}-${text}-${x.toFixed(1)}-${y.toFixed(1)}-${w.toFixed(1)}-${h.toFixed(1)}`;
    }

    /**
     * Process a batch of search results for better performance
     */
    private processBatch(results: SearchResult[], pageNumber: number): void {
        // Create processed annotations array
        const processedAnnotations: any[] = [];

        // Prepare all annotations to be added
        results.forEach(result => {
            // Generate a unique ID with good entropy
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 9);
            const id = result.id || `search-${this.fileKey || 'default'}-${pageNumber}-${timestamp}-${randomString}`;

            // Create a new annotation with consistent properties
            const annotation = {
                ...result,
                type: HighlightType.SEARCH,
                id: id,
                page: pageNumber,
                fileKey: this.fileKey || result.fileKey, // Ensure fileKey is set
                timestamp: this.processingTimestamp,
                opacity: 0.4 // Consistent opacity for search highlights
            };

            // Add to our batch
            processedAnnotations.push(annotation);
        });

        // Add all annotations at once for better performance
        if (processedAnnotations.length > 0) {
            // Log only the first few for debugging
            if (processedAnnotations.length > 0) {
                const firstResult = processedAnnotations[0];
                console.log(`[SearchHighlightManager] Sample highlight: x=${firstResult.x.toFixed(2)}, y=${firstResult.y.toFixed(2)}, w=${firstResult.w.toFixed(2)}, h=${firstResult.h.toFixed(2)}, term="${firstResult.text || ''}"`);
            }

            // Add each annotation to the context
            processedAnnotations.forEach(annotation => {
                this.addAnnotation(pageNumber, annotation, this.fileKey);
            });
        }
    }
}
