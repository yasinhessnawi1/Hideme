// src/contexts/BatchSearchContext.tsx
import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { useFileContext } from './FileContext';
import { useHighlightContext, HighlightType } from './HighlightContext';
import { getFileKey } from './PDFViewerContext';
import { BatchSearchService, SearchResult, BatchSearchResponse } from '../services/BatchSearchService';
import {usePDFApi} from "../hooks/usePDFApi";

interface SearchQuery {
    term: string;
    caseSensitive: boolean;
    isRegex: boolean;
}

interface SearchState {
    isSearching: boolean;
    progress: number;
    error: string | null;
    // Map of fileKey -> pageNumber -> query -> highlights
    searchResults: Map<string, Map<number, Map<string, SearchResult[]>>>;
    // Keep track of active search queries
    activeQueries: SearchQuery[];
    lastResponse: BatchSearchResponse | null;
}

interface BatchSearchContextProps {
    // State
    isSearching: boolean;
    searchError: string | null;
    searchProgress: number;
    activeQueries: SearchQuery[];

    // Actions
    batchSearch: (
        files: File[],
        searchTerm: string,
        options?: { caseSensitive?: boolean; regex?: boolean }
    ) => Promise<void>;

    clearSearch: (searchTerm?: string) => void;
    clearAllSearches: () => void;

    // Getters
    getSearchResultsForPage: (pageNumber: number, fileKey?: string) => SearchResult[];
    getSearchResultsStats: () => {
        totalMatches: number;
        fileMatches: Map<string, number>;
        pageMatches: Map<string, Map<number, number>>;
    };
    getSearchQueries: () => string[];
}

const BatchSearchContext = createContext<BatchSearchContextProps | undefined>(undefined);

export const useBatchSearch = () => {
    const context = useContext(BatchSearchContext);
    if (!context) {
        throw new Error('useBatchSearch must be used within a BatchSearchProvider');
    }
    return context;
};

export const BatchSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { addAnnotation, clearAnnotationsByType } = useHighlightContext();
    const { currentFile } = useFileContext();

    // Main search state
    const [searchState, setSearchState] = useState<SearchState>({
        isSearching: false,
        progress: 0,
        error: null,
        searchResults: new Map(),
        activeQueries: [],
        lastResponse: null
    });

    // References to avoid stale closures
    const searchStateRef = useRef<SearchState>(searchState);
    searchStateRef.current = searchState;
    const { runBatchSearch } = usePDFApi();

    /**
     * Apply search highlights to the current view through the highlight context
     */
    const applySearchHighlights = useCallback((
        searchResultsMap: Map<string, Map<number, SearchResult[]>>
    ) => {
        // Apply highlights for current file if it exists in results
        if (currentFile) {
            const fileKey = getFileKey(currentFile);
            const fileResults = searchResultsMap.get(fileKey);

            if (fileResults) {
                fileResults.forEach((highlights, pageNumber) => {
                    // Add each highlight to the highlight context
                    highlights.forEach(highlight => {
                        addAnnotation(pageNumber, {
                            ...highlight,
                            type: HighlightType.SEARCH
                        }, fileKey);
                    });
                });
            }
        }
    }, [currentFile, addAnnotation]);

    /**
     * Execute a batch search operation
     */
    const batchSearch = useCallback(async (
        files: File[],
        searchTerm: string,
        options: { caseSensitive?: boolean; regex?: boolean } = {}
    ) => {
        if (!files.length || !searchTerm.trim()) {
            setSearchState(prev => ({
                ...prev,
                error: 'Files and search term are required'
            }));
            return;
        }

        // Check if this search is already active (with same case sensitivity and regex options)
        const isExistingSearch = searchStateRef.current.activeQueries.some(
            query => query.term === searchTerm &&
                query.caseSensitive === !!options.caseSensitive &&
                query.isRegex === !!options.regex
        );

        if (isExistingSearch) {
            console.log(`[BatchSearchContext] Search for "${searchTerm}" is already active. Skipping.`);
            return;
        }

        setSearchState(prev => ({
            ...prev,
            isSearching: true,
            progress: 0,
            error: null
        }));

        try {
            // Execute the search using the PDF API hook
            const response = await runBatchSearch(files, searchTerm, {
                isCaseSensitive: options.caseSensitive,
                isRegexSearch: options.regex
            });

            // Transform API results to highlight-compatible format
            const searchResultsMap = BatchSearchService.transformSearchResults(response, searchTerm);

            // Add the new search query to active queries
            const newQuery: SearchQuery = {
                term: searchTerm,
                caseSensitive: !!options.caseSensitive,
                isRegex: !!options.regex
            };

            // Update the search results in state
            setSearchState(prev => {
                // Create a new map with all existing results
                const updatedSearchResults = new Map(prev.searchResults);

                // Integrate new results into the existing structure
                searchResultsMap.forEach((pageMap, fileKey) => {
                    let fileResults = updatedSearchResults.get(fileKey);

                    if (!fileResults) {
                        fileResults = new Map();
                        updatedSearchResults.set(fileKey, fileResults);
                    }

                    pageMap.forEach((highlights, pageNumber) => {
                        let pageResults = fileResults.get(pageNumber);

                        if (!pageResults) {
                            pageResults = new Map();
                            fileResults.set(pageNumber, pageResults);
                        }

                        // Store highlights for this search term, replacing any existing ones
                        pageResults.set(searchTerm, highlights);
                    });
                });

                // Add the new query to active queries (without duplicates)
                const updatedQueries = [...prev.activeQueries];
                if (!updatedQueries.some(q => q.term === newQuery.term)) {
                    updatedQueries.push(newQuery);
                }

                return {
                    ...prev,
                    isSearching: false,
                    progress: 100,
                    searchResults: updatedSearchResults,
                    activeQueries: updatedQueries,
                    lastResponse: response
                };
            });

            // Add highlights to the highlight context
            applySearchHighlights(searchResultsMap);

        } catch (error: any) {
            console.error('[BatchSearchContext] Search error:', error);
            setSearchState(prev => ({
                ...prev,
                isSearching: false,
                error: error.message || 'Error performing batch search'
            }));
        }
    }, [runBatchSearch, applySearchHighlights]);

    /**
     * Clear all search results and highlights
     */
    const clearAllSearches = useCallback(() => {
        setSearchState(prev => ({
            ...prev,
            searchResults: new Map(),
            activeQueries: []
        }));

        // Clear all search highlights
        clearAnnotationsByType(HighlightType.SEARCH);
    }, [clearAnnotationsByType]);
    /**
     * Clear a specific search term or all searches
     */
    const clearSearch = useCallback((searchTerm?: string) => {
        if (!searchTerm) {
            return clearAllSearches();
        }

        setSearchState(prev => {
            // Create a new search results map without the specified term
            const updatedResults = new Map(prev.searchResults);

            // Remove this search term from each page's results
            updatedResults.forEach((fileMap, fileKey) => {
                fileMap.forEach((pageMap, pageNumber) => {
                    pageMap.delete(searchTerm);

                    // Clean up empty maps
                    if (pageMap.size === 0) {
                        fileMap.delete(pageNumber);
                    }
                });

                // Clean up empty files
                if (fileMap.size === 0) {
                    updatedResults.delete(fileKey);
                }
            });

            // Update active queries
            const updatedQueries = prev.activeQueries.filter(
                query => query.term !== searchTerm
            );

            return {
                ...prev,
                searchResults: updatedResults,
                activeQueries: updatedQueries
            };
        });

        // Clear highlights for this term from the highlight context
        // For now, clear all search highlights and reapply the remaining ones
        if (currentFile) {
            const fileKey = getFileKey(currentFile);
            clearAnnotationsByType(HighlightType.SEARCH, undefined, fileKey);

            // Reapply remaining highlights
            setTimeout(() => {
                const currentResults = searchStateRef.current.searchResults.get(fileKey);
                if (currentResults) {
                    currentResults.forEach((pageMap, pageNumber) => {
                        pageMap.forEach((highlights, term) => {
                            if (term !== searchTerm) {
                                highlights.forEach(highlight => {
                                    addAnnotation(pageNumber, highlight, fileKey);
                                });
                            }
                        });
                    });
                }
            }, 0);
        }
    }, [clearAnnotationsByType, addAnnotation, currentFile, clearAllSearches]);



    /**
     * Get search results for a specific page and file
     */
    const getSearchResultsForPage = useCallback((pageNumber: number, fileKey?: string): SearchResult[] => {
        const targetFileKey = fileKey || (currentFile ? getFileKey(currentFile) : '');
        if (!targetFileKey) return [];

        const fileResults = searchStateRef.current.searchResults.get(targetFileKey);
        if (!fileResults) return [];

        const pageResults = fileResults.get(pageNumber);
        if (!pageResults) return [];

        // Combine results from all search terms
        const results: SearchResult[] = [];
        pageResults.forEach(highlights => {
            results.push(...highlights);
        });

        return results;
    }, [currentFile]);

    /**
     * Get statistics about the current search results - memoized to prevent excessive recalculations
     */
    const getSearchResultsStats = useCallback(() => {
        // Create a memoized function that won't cause render loops
        const stats = {
            totalMatches: 0,
            fileMatches: new Map<string, number>(),
            pageMatches: new Map<string, Map<number, number>>()
        };

        // Use the ref directly to avoid dependency on changing objects
        const results = searchStateRef.current.searchResults;

        // Traverse the search results structure to collect stats
        results.forEach((fileMap, fileKey) => {
            let fileMatchCount = 0;
            const pageMatchCounts = new Map<number, number>();

            fileMap.forEach((pageMap, pageNumber) => {
                let pageMatchCount = 0;

                pageMap.forEach(highlights => {
                    pageMatchCount += highlights.length;
                });

                if (pageMatchCount > 0) {
                    pageMatchCounts.set(pageNumber, pageMatchCount);
                    fileMatchCount += pageMatchCount;
                }
            });

            if (fileMatchCount > 0) {
                stats.fileMatches.set(fileKey, fileMatchCount);
                stats.pageMatches.set(fileKey, pageMatchCounts);
                stats.totalMatches += fileMatchCount;
            }
        });

        return stats;
    }, []);

    /**
     * Get list of active search queries
     */
    const getSearchQueries = useCallback(() => {
        return searchStateRef.current.activeQueries.map(query => query.term);
    }, []);

    // Context value - memoize to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        isSearching: searchState.isSearching,
        searchError: searchState.error,
        searchProgress: searchState.progress,
        activeQueries: searchState.activeQueries,

        batchSearch,
        clearSearch,
        clearAllSearches,

        getSearchResultsForPage,
        getSearchResultsStats,
        getSearchQueries
    }), [
        searchState.isSearching,
        searchState.error,
        searchState.progress,
        searchState.activeQueries,
        batchSearch,
        clearSearch,
        clearAllSearches,
        getSearchResultsForPage,
        getSearchResultsStats,
        getSearchQueries
    ]);

    return (
        <BatchSearchContext.Provider value={contextValue}>
            {children}
        </BatchSearchContext.Provider>
    );
};
