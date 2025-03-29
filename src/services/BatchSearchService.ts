// src/services/BatchSearchService.ts
import { apiRequest } from './apiService';
import { getFileKey } from '../contexts/PDFViewerContext';
import { HighlightType } from '../contexts/HighlightContext';
import {blob} from "node:stream/consumers";

// Base API URL - ensure this is consistent across services
const API_BASE_URL = 'http://localhost:8000';

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
            caseSensitive?: boolean;
            regex?: boolean;
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
            formData.append('case_sensitive', options.caseSensitive? 'true' : 'false');
            formData.append('regex', options.regex? 'true' : 'false');

            // Add search parameters
            formData.append('search_terms', searchTerm);

            // Execute the API call


            // Add search parameters
            formData.append('search_terms', searchTerm);

            if (options.caseSensitive) {
                formData.append('case_sensitive', 'true');
            }

            if (options.regex) {
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

        if (!searchResponse || !searchResponse.file_results) {
            return resultsMap;
        }

        // Process each file's results
        searchResponse.file_results.forEach(fileResult => {
            if (fileResult.status !== 'success' || !fileResult.results || !fileResult.results.pages) {
                return; // Skip failed results
            }

            const fileKey = fileResult.file;
            const pageResults = new Map<number, SearchResult[]>();

            // Process each page
            fileResult.results.pages.forEach(page => {
                const highlights: SearchResult[] = [];

                // Process matches on this page
                page.matches.forEach((match, index) => {
                    // Extract bounding box coordinates
                    const { x0, y0, x1, y1 } = match.bbox;

                    // Create highlight object
                    const highlight: SearchResult = {
                        id: `search-${fileKey}-${page.page}-${index}`,
                        page: page.page,
                        x: x0,
                        y: y0,
                        w: x1 - x0,
                        h: y1 - y0,
                        color: '#FFD700', // Default color for search highlights
                        opacity: 0.4,
                        type: HighlightType.SEARCH,
                        text: searchTerm,
                        fileKey: fileKey
                    };

                    highlights.push(highlight);
                });

                if (highlights.length > 0) {
                    pageResults.set(page.page, highlights);
                }
            });

            if (pageResults.size > 0) {
                resultsMap.set(fileKey, pageResults);
            }
        });

        return resultsMap;
    }
}
