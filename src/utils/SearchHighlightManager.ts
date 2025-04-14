// src/utils/SearchHighlightManager.ts - Fixed version
import { HighlightType } from "../types/pdfTypes";
import { SearchResult } from "../services/BatchSearchService";
import { v4 as uuidv4 } from 'uuid';

/**
 * Manages search highlights from batch search results
 * Optimized with better logging and duplicate prevention
 */
export class SearchHighlightManager {
    private readonly searchResults: SearchResult[];
    private readonly addAnnotation: (page: number, annotation: any, fileKey?: string) => void;
    private readonly fileKey?: string;
    private readonly processingTimestamp: number;
    private readonly processedIds: Set<string> = new Set();
    private readonly options: { forceReprocess?: boolean } = {};

    // Static tracking of processed pages by file to prevent reprocessing
    private static readonly processedPagesByFile: Map<string, Set<number>> = new Map();
    // Static tracking of processed search results by file
    private static readonly processedSearchIdsByFile: Map<string, Set<string>> = new Map();
    // Track reset operations to prevent cascades
    private static readonly lastResetTimestamps: Map<string, number> = new Map();
    // Define a reset throttle time (milliseconds)
    private static readonly RESET_THROTTLE_TIME = 2000; // 2 seconds

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
        this.options = options;

        // Initialize file-specific processed search IDs set if not exists
        const fileMarker = this.fileKey ?? 'default';
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
     * Reset processed pages for a specific file with throttling
     */
    public static resetProcessedPagesForFile(fileKey: string): boolean {
        const fileMarker = fileKey || 'default';
        const now = Date.now();

        // Check if we've reset this file recently to prevent cascades
        const lastReset = SearchHighlightManager.lastResetTimestamps.get(fileMarker) ?? 0;
        if (now - lastReset < SearchHighlightManager.RESET_THROTTLE_TIME) {
            // Skip this reset if it's too soon after the last one
            console.log(`[SearchHighlightManager] Throttling reset for file ${fileMarker} - last reset was ${now - lastReset}ms ago`);
            return false;
        }

        // Update the reset timestamp
        SearchHighlightManager.lastResetTimestamps.set(fileMarker, now);

        // Clear processed pages for this file
        SearchHighlightManager.processedPagesByFile.set(fileMarker, new Set<number>());
        console.log(`[SearchHighlightManager] Reset processed pages for file ${fileMarker}`);
        return true;
    }

    /**
     * Reset all processed data for a specific file
     */
    public static resetProcessedDataForFile(fileKey: string): void {
        const fileMarker = fileKey || 'default';
        SearchHighlightManager.processedPagesByFile.set(fileMarker, new Set<number>());
        SearchHighlightManager.processedSearchIdsByFile.set(fileMarker, new Set<string>());
        // Also clear the reset timestamp
        SearchHighlightManager.lastResetTimestamps.delete(fileMarker);
        console.log(`[SearchHighlightManager] Reset all processed data for file ${fileMarker}`);
    }

    /**
     * Remove a file from the processed data tracking
     */
    public static removeFileFromProcessedData(fileKey: string): void {
        const fileMarker = fileKey || 'default';
        SearchHighlightManager.processedPagesByFile.delete(fileMarker);
        SearchHighlightManager.processedSearchIdsByFile.delete(fileMarker);
        // Also clear the reset timestamp
        SearchHighlightManager.lastResetTimestamps.delete(fileMarker);
        console.log(`[SearchHighlightManager] Removed file ${fileMarker} from processed data tracking`);
    }

    /**
     * Generate a unique ID for a search result that won't cause duplicates
     */
    private generateUniqueSearchId(result: SearchResult): string {
        const { page,text } = result;
        const fileMarker = this.fileKey ?? 'default';

        // Use UUID for guaranteed uniqueness
        const uuid = uuidv4();
        const timestamp = Date.now();

        // Create a truly unique ID
        return `search-${fileMarker}-${page}-${text || 'unknown'}-${uuid}-${timestamp}`;
    }

    /**
     * Process search results into highlights with duplicate prevention
     */
    public processHighlights(): void {
        const fileMarker = this.fileKey ?? 'default';
        console.log(`[SearchHighlightManager] Processing ${this.searchResults.length} search highlights for ${fileMarker}`);

        if (!this.searchResults || this.searchResults.length === 0) {
            console.log('[SearchHighlightManager] No search results to process');
            return;
        }

        // FIXED: Always force reprocessing of search highlights
        // This ensures search highlights always appear even when switching files
        const forceProcess = true; // Always process search highlights

        // Force reprocessing of search highlights to ensure they always appear
        if (forceProcess) {
            SearchHighlightManager.resetProcessedPagesForFile(fileMarker);
        }
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
            // Generate a stable unique ID for this result
            const resultId = this.generateUniqueSearchId(result);

            // Skip if we've already processed this exact result
            if (this.processedIds.has(resultId) && !forceProcess) {
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
            console.log(`[SearchHighlightManager] Adding ${pageResults.length} highlights to page ${pageNumber}`);

            // Process in batches for better performance
            this.processBatch(pageResults, pageNumber);

            // Mark this page as processed for this file
            SearchHighlightManager.markPageAsProcessedForFile(fileMarker, pageNumber);
        });
    }

    /**
     * Process a batch of search results for better performance
     */
    private processBatch(results: SearchResult[], pageNumber: number): void {
        // Create processed annotations array
        const batchSize = 10; // Process in smaller batches

        // Process in batches to prevent UI freezing
        const processBatch = (startIndex: number) => {
            const endIndex = Math.min(startIndex + batchSize, results.length);
            const batch = results.slice(startIndex, endIndex);

            // Prepare batch of annotations
            const batchAnnotations = batch.map(result => {
                // Generate a unique ID for this highlight
                const uniqueId = this.generateUniqueSearchId(result);

                // Create a new highlight with consistent properties
                return {
                    ...result,
                    type: HighlightType.SEARCH,
                    id: uniqueId,
                    page: pageNumber,
                    fileKey: this.fileKey ?? result.fileKey, // Ensure fileKey is set
                    timestamp: this.processingTimestamp,
                    opacity: 0.4 // Consistent opacity for search highlights
                };
            });

            // Add all annotations in this batch
            batchAnnotations.forEach(annotation => {
                this.addAnnotation(pageNumber, annotation, this.fileKey);
            });

            // Process next batch if more results left
            if (endIndex < results.length) {
                setTimeout(() => processBatch(endIndex), 0);
            } else {
                console.log(`[SearchHighlightManager] Completed processing all ${results.length} search results for page ${pageNumber}`);
            }
        };

        // Start processing the first batch
        if (results.length > 0) {
            // Log only the first few for debugging
            const firstResult = results[0];
            console.log(`[SearchHighlightManager] Sample highlight: x=${firstResult.x.toFixed(2)}, y=${firstResult.y.toFixed(2)}, w=${firstResult.w.toFixed(2)}, h=${firstResult.h.toFixed(2)}, term="${firstResult.text || ''}"`);

            // Start batch processing
            processBatch(0);
        }
    }
}
