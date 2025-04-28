import { HighlightRect, HighlightType } from '../types/pdfTypes';
import { highlightStore } from '../store/HighlightStore';
import { SearchResult } from '../services/BatchSearchService';
import { getFileKey } from "../contexts/PDFViewerContext";
import summaryPersistenceStore from '../store/SummaryPersistenceStore';

/**
 * Processes search results into highlights
 */
export class SearchHighlightProcessor {
    /**
     * Process search results for a file
     * @param fileKey The file key
     * @param searchResults The search results
     * @param searchTerm The search term
     * @param isFirstFile
     * @returns Promise resolving to the IDs of created highlights
     */
    static async processSearchResults(
        fileKey: string,
        searchResults: SearchResult[],
        searchTerm: string,
        isFirstFile: boolean = false
    ): Promise<string[]> {

        if (!searchResults || searchResults.length === 0) {
            console.log('[SearchHighlightProcessor] No search results provided');
            return [];
        }

        // First remove any existing search highlights for this term to avoid duplicates
        const existingHighlights = highlightStore.getHighlightsByText(fileKey, searchTerm)
            .filter(h => h.type === HighlightType.SEARCH && h.text && h.text[0] === searchTerm[0]);

        if (existingHighlights.length > 0) {
            console.log(`[SearchHighlightProcessor] Removing ${existingHighlights.length} existing highlights for term "${searchTerm}"`);
            await highlightStore.removeMultipleHighlights(existingHighlights.map(h => h.id));
        }

        // Convert search results to highlights
        const allHighlights: HighlightRect[] = [];

        // Track page-level matches for the summary
        const pageMatches = new Map<number, number>();

        for (const result of searchResults) {
            try {
                // Skip results for other files
                if (result.fileKey && result.fileKey !== fileKey) continue;

                // Create highlight
                const highlight: HighlightRect = {
                    id: `search-${fileKey}-${result.page}-${searchTerm}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    page: result.page,
                    x: result.x - 5,
                    y: result.y - 5,
                    w: result.w + 3, // Slight padding for visibility
                    h: result.h + 5,
                    text: searchTerm,
                    color: '#71c4ff', // Light blue
                    opacity: 0.4,
                    type: HighlightType.SEARCH,
                    fileKey: fileKey,
                    timestamp: Date.now()
                };

                allHighlights.push(highlight);

                // Count matches by page
                const pageCount = pageMatches.get(result.page) || 0;
                pageMatches.set(result.page, pageCount + 1);

            } catch (error) {
                console.error('[SearchHighlightProcessor] Error processing search result:', error);
            }
        }

        // Batch add all highlights to the store
        const highlightIds = await highlightStore.addMultipleHighlights(allHighlights);

        console.log(`[SearchHighlightProcessor] Added ${highlightIds.length} search highlights for term "${searchTerm}" in file ${fileKey}`);

        // Update file in persistence store if this search produced results
        if (allHighlights.length > 0) {
            try {
                // Mark the file as analyzed in the search context
                summaryPersistenceStore.addAnalyzedFile('search', fileKey);

                // Get or create summary for this file
                const existingSummaries = summaryPersistenceStore.getFileSummaries('search');
                const existingSummary = existingSummaries.find(s => s.fileKey === fileKey);

                // Get file name if possible
                let fileName = fileKey;
                if (existingSummary) {
                    fileName = existingSummary.fileName;
                }

                // Create a file summary with page-level detail
                const summary = {
                    fileKey,
                    fileName,
                    matchCount: allHighlights.length,
                    pageMatches: Object.fromEntries(pageMatches)
                };

                // Update the file summary in the persistence store
                summaryPersistenceStore.updateFileSummary('search', summary);

                // Special handling for first file or auto-processed files
                if (isFirstFile) {
                    // Dispatch an event to ensure the UI updates
                    window.dispatchEvent(new CustomEvent('search-summary-updated', {
                        detail: {
                            fileKey,
                            fileName,
                            summary
                        }
                    }));
                }

                console.log(`[SearchHighlightProcessor] Updated search summary for ${fileKey} in persistence store`);
            } catch (error) {
                console.error('[SearchHighlightProcessor] Error updating persistence store:', error);
            }
        }

        return highlightIds;
    }

    /**
     * Process search results for multiple files
     * @param results Map of file keys to search results
     * @param searchTerm The search term used
     * @returns Promise resolving to true when all results are processed
     */
    static async processBatchSearchResults(
        results: Map<string, SearchResult[]>,
        searchTerm: string
    ): Promise<boolean> {
        if (!results || results.size === 0) {
            console.log('[SearchHighlightProcessor] No batch search results provided');
            return false;
        }

        try {
            // Process each file's results
            const processPromises: Promise<string[]>[] = [];

            results.forEach((fileResults, fileKey) => {
                if (fileResults.length > 0) {
                    processPromises.push(this.processSearchResults(fileKey, fileResults, searchTerm));
                }
            });

            // Wait for all processing to complete
            await Promise.all(processPromises);

            console.log(`[SearchHighlightProcessor] Completed batch processing for search term "${searchTerm}"`);
            return true;
        } catch (error) {
            console.error(`[SearchHighlightProcessor] Error in batch search processing:`, error);
            return false;
        }
    }
}
