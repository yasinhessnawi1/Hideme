import React, {createContext, useContext, useState, useCallback, useRef, useMemo, useEffect} from 'react';
import { BatchSearchService, SearchResult, BatchSearchResponse } from '../services/processing-backend-services/BatchSearchService';
import { usePDFApi } from "../hooks/general/usePDFApi";
import {useHighlightStore} from './HighlightStoreContext';
import {SearchHighlightProcessor} from "../managers/SearchHighlightProcessor";
import summaryPersistenceStore from "../store/SummaryPersistenceStore";
import { HighlightType } from '../types';

interface SearchQuery {
    term: string;
    caseSensitive: boolean;
    isAiSearch: boolean;
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
        options?: {
            isCaseSensitive?: boolean;
            isAiSearch?: boolean;
            }
    ) => Promise<void>;

    clearSearch: (searchTerm?: string) => void;
    clearAllSearches: () => void;

    // Getters
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
    const { removeAllHighlightsByType, removeHighlightsByText} = useHighlightStore();

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

// Save queries whenever they change
    useEffect(() => {
        // Save active queries when they change
        if (searchState.activeQueries.length > 0) {
            summaryPersistenceStore.saveActiveSearchQueries(searchState.activeQueries);
        }
    }, [searchState.activeQueries]);


    /**
     * Execute a batch search operation
     */
    const batchSearch = useCallback(async (
            files: File[],
            searchTerm: string,
            options: {
                isCaseSensitive?: boolean;
                isAiSearch?: boolean;
            } = {}
        ) => {
            if (!files.length || !searchTerm.trim()) {
                setSearchState(prev => ({
                    ...prev,
                    error: 'Files and search term are required'
                }));
                return;
            }

            // Check if this search is already active
            const isExistingSearch = searchStateRef.current.activeQueries.some(
                query => query.term === searchTerm &&
                    query.caseSensitive === !!options.isCaseSensitive &&
                    query.isAiSearch === !!options.isAiSearch
            );

            setSearchState(prev => ({
                ...prev,
                isSearching: true,
                progress: 0,
                error: null
            }));
            console.warn('[BatchSearchContext] serch term:', searchTerm);
            try {
                // Execute the search using the PDF API hook
                const response = await runBatchSearch(files, searchTerm, {
                    isCaseSensitive: options.isCaseSensitive,
                    isAiSearch: options.isAiSearch,
                });

                // Transform API results to highlight-compatible format
                const searchResultsMap = BatchSearchService.transformSearchResults(response, searchTerm);

                // Add the new search query to active queries
                const newQuery: SearchQuery = {
                    term: searchTerm,
                    caseSensitive: !!options.isCaseSensitive,
                    isAiSearch: !!options.isAiSearch
                };

                // Process the results into highlights for each file
                for (const [fileKey, pageMap] of searchResultsMap.entries()) {
                    // Flatten the page map into a single array of results
                    const allResults: SearchResult[] = [];
                    pageMap.forEach(results => {
                        allResults.push(...results);
                    });

                    if (allResults.length > 0) {
                        // Use SearchHighlightProcessor to create the highlights
                        await SearchHighlightProcessor.processSearchResults(
                            fileKey,
                            allResults,
                            searchTerm
                        );
                    }
                }

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

                    // Add the new query to active queries if it doesn't exist
                    let updatedQueries = [...prev.activeQueries];
                    if (!isExistingSearch) {
                        updatedQueries.push(newQuery);
                    } else {
                        // If existing search, update the options in case they changed
                        updatedQueries = updatedQueries.map(q =>
                            q.term === searchTerm ? newQuery : q
                        );
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


            } catch (error: any) {
                console.error('[BatchSearchContext] Search error:', error);
                setSearchState(prev => ({
                    ...prev,
                    isSearching: false,
                    error: error.message ?? 'Error performing batch search'
                }));
            }
        }, [runBatchSearch]);

    /**
     * Clear all search results and highlights
     */
    const clearAllSearches = useCallback(() => {
            // Clear all search highlights
            setSearchState(prev => ({
                ...prev,
                searchResults: new Map(),
                activeQueries: []
            }));
            removeAllHighlightsByType(HighlightType.SEARCH, []);
            // Clear saved queries
            summaryPersistenceStore.saveActiveSearchQueries([]);
        }, [removeAllHighlightsByType]);

    /**
     * Clear a specific search term or all searches
     */
    const clearSearch = useCallback((searchTerm?: string, specificFileKey?: string) => {
            if (!searchTerm) {
                return clearAllSearches();
            }

            setSearchState(prev => {
                // Create a new search results map without the specified term
                const updatedResults = new Map(prev.searchResults);

                // Only remove this specific search term from the results map
                updatedResults.forEach((fileMap, fileKey) => {
                    if (!specificFileKey || fileKey === specificFileKey) {
                        fileMap.forEach((pageMap, pageNumber) => {
                            // Only remove this search term, keep others
                            pageMap.delete(searchTerm);

                            // Clean up empty maps
                            if (pageMap.size === 0) {
                                fileMap.delete(pageNumber);
                            }
                        });
                        removeHighlightsByText(fileKey, searchTerm);

                        // If no pages left for this file, remove the file entry
                        if (fileMap.size === 0) {
                            updatedResults.delete(fileKey);
                        }
                    }
                });

                // Update active queries - only remove the specific term
                const updatedQueries = prev.activeQueries.filter(
                    query => query.term !== searchTerm
                );

                return {
                    ...prev,
                    searchResults: updatedResults,
                    activeQueries: updatedQueries
                };
            });


        }, [clearAllSearches, removeHighlightsByText]);


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
        getSearchResultsStats,
        getSearchQueries
    ]);

    return (
        <BatchSearchContext.Provider value={contextValue}>
            {children}
        </BatchSearchContext.Provider>
    );
};
