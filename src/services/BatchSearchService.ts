// src/services/BatchSearchService.ts
import { apiRequest } from './apiService';
import { HighlightType } from '../types/pdfTypes';
import { v4 as uuidv4 } from 'uuid';
// Base API URL - ensure this is consistent across services
const API_BASE_URL = 'https://api.hidemeai.com';

// Types
export interface SearchBatchSummary {
    batch_id: string;
    total_files: number;
    successful: number;
    failed: number;
    total_matches: number;
    search_term: string;
    query_time: number;
}

export interface SearchMatch {
    bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}

export interface SearchPageResults {
    page: number;
    matches: SearchMatch[];
}

export interface SearchFileResults {
    file: string;
    status: string;
    results?: {
        pages: SearchPageResults[];
        match_count: number;
    };
    error?: string;
}

export interface BatchSearchResponse {
    batch_summary: SearchBatchSummary;
    file_results: SearchFileResults[];
}

export interface SearchResult {
    id: string;
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    opacity: number;
    type: HighlightType;
    text: string;
    fileKey: string;
    instanceId?: string;
}

/**
 * Service for batch search operations on PDF files
 */
export class BatchSearchService {
    /**
     * Execute a batch search across multiple PDF files
     *
     * @param files Array of PDF files to search
     * @param searchTerm The term to search for
     * @param options Additional search options (case sensitivity, regex, etc.)
     * @returns Promise with batch search results
     */
    static async batchSearch(
        files: File[],
        searchTerm: string,
        options: {
            case_sensitive?: boolean;
            isCaseSensitive?: boolean;
            isAiSearch?: boolean;
            ai_search?: boolean;
        } = {}
    ): Promise<BatchSearchResponse> {
        if (!files.length || !searchTerm.trim()) {
            throw new Error('Files and search term are required');
        }

        console.log(`[BatchSearchService] Searching for "${searchTerm}" in ${files.length} files`);

        try {
            const formData = new FormData();
            // Add files to form data as blob data
            files.forEach(file => {
                formData.append('files', file, file.name);
            });

            // Add search options
            formData.append('case_sensitive', options.case_sensitive? 'true' : 'false');
            formData.append('ai_search', options.ai_search? 'true' : 'false');

            // Add search parameters
            formData.append('search_terms', searchTerm);


            if (options.case_sensitive || options.isCaseSensitive) {
                formData.append('case_sensitive', 'true');
            }

            if (options.ai_search || options.isAiSearch) {
                formData.append('regex', 'true');
            }

            // Execute the API call
            const result = await apiRequest<BatchSearchResponse>({
                method: 'POST',
                url: `${API_BASE_URL}/batch/search`,
                formData: formData,
            });

            console.log(`[BatchSearchService] Search completed. Found ${result.batch_summary.total_matches} matches across ${result.batch_summary.successful} files`);

            return result;
        } catch (error) {
            console.error('[BatchSearchService] Error during batch search:', error);
            throw error;
        }
    }

    /**
     * Transform API search results into highlight-compatible format
     *
     * @param searchResponse The API search response
     * @param searchTerm The term that was searched for
     * @returns Map of fileKey -> pageNumber -> highlights[]
     */
    static transformSearchResults(
        searchResponse: BatchSearchResponse,
        searchTerm: string
    ): Map<string, Map<number, SearchResult[]>> {
        // Create a nested map structure: fileKey -> pageNumber -> highlights[]
        const resultsMap = new Map<string, Map<number, SearchResult[]>>();

        if (!searchResponse?.file_results) {
            console.warn('[BatchSearchService] Empty or invalid search response');
            return resultsMap;
        }

        console.log(`[BatchSearchService] Transforming search results with ${searchResponse.file_results.length} files`);

        // Process each file's results
        searchResponse.file_results.forEach(fileResult => {
            if (fileResult.status !== 'success' || !fileResult.results?.pages) {
                console.warn(`[BatchSearchService] Skipping file result with invalid structure:`, fileResult);
                return; // Skip failed results
            }

            const fileName = fileResult.file;
            const pageResults = new Map<number, SearchResult[]>();

            // Log found results for debugging
            console.log(`[BatchSearchService] Processing file ${fileName} with ${fileResult.results.pages.length} pages containing matches`);

            // Process each page
            fileResult.results.pages.forEach(page => {
                if (!page.matches || !Array.isArray(page.matches)) {
                    console.warn(`[BatchSearchService] Page ${page.page} has invalid matches structure`);
                    return;
                }

                const pageNumber = page.page;
                const highlights: SearchResult[] = [];

                // Process matches on this page
                page.matches.forEach((match, index) => {
                    if (!match.bbox) {
                        console.warn(`[BatchSearchService] Match missing bbox:`, match);
                        return;
                    }

                    // Extract bounding box coordinates
                    const { x0, y0, x1, y1 } = match.bbox;

                    // Create highlight object with a more unique ID
                    const highlight: SearchResult = {
                        id: `search-${fileName}-${pageNumber}-${index}-${Date.now()}`,
                        page: pageNumber,
                        x: x0 ,
                        y: y0 ,
                        w: x1 - x0,
                        h: y1 - y0,
                        color: '71c4ff', // Default color for search highlights
                        opacity: 0.4,
                        type: HighlightType.SEARCH,
                        text: searchTerm,
                        fileKey: fileName,
                        instanceId: uuidv4(),
                    };

                    highlights.push(highlight);
                });

                if (highlights.length > 0) {
                    console.log(`[BatchSearchService] Created ${highlights.length} highlights for page ${pageNumber}`);
                    pageResults.set(pageNumber, highlights);
                }
            });

            if (pageResults.size > 0) {
                resultsMap.set(fileName, pageResults);
            }
        });
        return resultsMap;
    }

}
