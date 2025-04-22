import { HighlightRect, HighlightType } from '../types/pdfTypes';
import { highlightStore } from '../store/HighlightStore';
import { SearchResult } from '../services/BatchSearchService';
import {getFileKey} from "../contexts/PDFViewerContext";

/**
 * Processes search results into highlights
 */
export class SearchHighlightProcessor {
    /**
     * Process search results for a file
     * @param fileKey The file key
     * @param searchResults The search results
     * @param searchTerm The search term
     * @returns Promise resolving to the IDs of created highlights
     */
    static async processSearchResults(
        fileKey: string,
        searchResults: SearchResult[],
        searchTerm: string
    ): Promise<string[]> {

        if (!searchResults || searchResults.length === 0) {
            console.log('[SearchHighlightProcessor] No search results provided');
            return [];
        }

        // First remove any existing search highlights for this term to avoid duplicates
        const existingHighlights = highlightStore.getHighlightsByText(fileKey, searchTerm)
            .filter(h => h.type === HighlightType.SEARCH);

        if (existingHighlights.length > 0) {
            console.log(`[SearchHighlightProcessor] Removing ${existingHighlights.length} existing highlights for term "${searchTerm}"`);
            await highlightStore.removeMultipleHighlights(existingHighlights.map(h => h.id));
        }

        // Convert search results to highlights
        const allHighlights: HighlightRect[] = [];

        for (const result of searchResults) {
            try {
                // Skip results for other files
                if (result.fileKey && result.fileKey !== fileKey) continue;

                // Create highlight
                const highlight: HighlightRect = {
                    id: `search-${fileKey}-${result.page}-${searchTerm}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    page: result.page,
                    x: result.x - 4,
                    y: result.y - 3,
                    w: result.w + 1, // Slight padding for visibility
                    h: result.h,
                    text: searchTerm,
                    color: '#71c4ff', // Light blue
                    opacity: 0.4,
                    type: HighlightType.SEARCH,
                    fileKey: fileKey,
                    timestamp: Date.now()
                };

                allHighlights.push(highlight);
            } catch (error) {
                console.error('[SearchHighlightProcessor] Error processing search result:', error);
            }
        }

        // Batch add all highlights to the store
        const highlightIds = await highlightStore.addMultipleHighlights(allHighlights);

        console.log(`[SearchHighlightProcessor] Added ${highlightIds.length} search highlights for term "${searchTerm}" in file ${fileKey}`);

        return highlightIds;
    }
}
