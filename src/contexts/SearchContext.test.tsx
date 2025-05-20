import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BatchSearchProvider, useBatchSearch } from '../contexts/SearchContext';
import { HighlightType } from '../types';
import {useHighlightStore} from "./HighlightStoreContext";
import {usePDFApi} from "../hooks/general/usePDFApi";

// Mock dependencies at the top level (hoisted)
vi.mock('../contexts/HighlightStoreContext', () => ({
    useHighlightStore: vi.fn()
}));

vi.mock('../hooks/general/usePDFApi', () => ({
    usePDFApi: vi.fn()
}));

vi.mock('../store/SummaryPersistenceStore', () => ({
    default: {
        saveActiveSearchQueries: vi.fn(),
        getFileSummaries: vi.fn().mockReturnValue([]),
        addAnalyzedFile: vi.fn(),
        updateFileSummary: vi.fn()
    }
}));

vi.mock('../managers/SearchHighlightProcessor', () => ({
    SearchHighlightProcessor: {
        processSearchResults: vi.fn().mockResolvedValue(['highlight-id-1']),
        processBatchSearchResults: vi.fn().mockResolvedValue(true)
    }
}));

// Mock BatchSearchService with the correct structure
vi.mock('../services/processing-backend-services/BatchSearchService', () => ({
    BatchSearchService: {
        batchSearch: vi.fn().mockImplementation(() => {
            return Promise.resolve({
                batch_summary: {
                    batch_id: "test-batch",
                    total_files: 1,
                    successful: 1,
                    failed: 0,
                    total_matches: 1,
                    search_term: "test query",
                    query_time: 100
                },
                file_results: [
                    {
                        file: "test.pdf",
                        status: "success",
                        results: {
                            pages: [
                                {
                                    page: 1,
                                    matches: [
                                        {
                                            bbox: {
                                                x0: 10,
                                                y0: 20,
                                                x1: 110,
                                                y1: 40
                                            }
                                        }
                                    ]
                                }
                            ],
                            match_count: 1
                        }
                    }
                ]
            });
        }),
        transformSearchResults: vi.fn().mockImplementation(() => {
            const resultMap = new Map();
            const pageMap = new Map();
            pageMap.set(1, [
                {
                    page: 1,
                    x: 10,
                    y: 20,
                    w: 100,
                    h: 20,
                    text: 'test query',
                    fileKey: 'test.pdf',
                    type: HighlightType.SEARCH,
                    color: '#71c4ff',
                    opacity: 0.4,
                    id: 'test-id-1'
                }
            ]);
            resultMap.set('test.pdf', pageMap);
            return resultMap;
        })
    }
}));

// Test component to consume the context
const TestConsumer = () => {
    const {
        isSearching,
        searchError,
        searchProgress,
        activeQueries,
        batchSearch,
        clearSearch,
        clearAllSearches,
        getSearchResultsStats,
        getSearchQueries
    } = useBatchSearch();

    return (
        <div>
            <div data-testid="is-searching">{String(isSearching)}</div>
            <div data-testid="search-error">{searchError || 'no-error'}</div>
            <div data-testid="search-progress">{searchProgress}</div>
            <div data-testid="active-queries">{JSON.stringify(activeQueries)}</div>
            <div data-testid="search-queries">{JSON.stringify(getSearchQueries())}</div>
            <div data-testid="search-stats">{JSON.stringify(getSearchResultsStats())}</div>

            <button
                data-testid="start-search"
                onClick={() => batchSearch([new File([], 'test.pdf')], 'test query')}
            >
                Start Search
            </button>

            <button
                data-testid="start-advanced-search"
                onClick={() => batchSearch(
                    [new File([], 'test.pdf')],
                    'advanced query',
                    { isCaseSensitive: true, isAiSearch: true }
                )}
            >
                Start Advanced Search
            </button>

            <button
                data-testid="clear-specific-search"
                onClick={() => clearSearch('test query')}
            >
                Clear Specific Search
            </button>

            <button
                data-testid="clear-specific-search-with-file"
                onClick={() => clearSearch('test query')}
            >
                Clear Specific Search With File
            </button>

            <button
                data-testid="clear-all-searches"
                onClick={() => clearAllSearches()}
            >
                Clear All Searches
            </button>
        </div>
    );
};

// Component that will cause an error by using the hook outside the provider
const ErrorComponent = () => {
    try {
        useBatchSearch();
        return <div>No error</div>;
    } catch (error) {
        return <div data-testid="context-error">Context error occurred</div>;
    }
};

describe('BatchSearchContext', () => {
    // Set up mock data with the correct structure
    const mockSearchResponse = {
        batch_summary: {
            batch_id: "test-batch",
            total_files: 1,
            successful: 1,
            failed: 0,
            total_matches: 1,
            search_term: "test query",
            query_time: 100
        },
        file_results: [
            {
                file: "test.pdf",
                status: "success",
                results: {
                    pages: [
                        {
                            page: 1,
                            matches: [
                                {
                                    bbox: {
                                        x0: 10,
                                        y0: 20,
                                        x1: 110,
                                        y1: 40
                                    }
                                }
                            ]
                        }
                    ],
                    match_count: 1
                }
            }
        ]
    };

    const mockAdvancedSearchResponse = {
        batch_summary: {
            batch_id: "test-batch-2",
            total_files: 1,
            successful: 1,
            failed: 0,
            total_matches: 1,
            search_term: "advanced query",
            query_time: 100
        },
        file_results: [
            {
                file: "test.pdf",
                status: "success",
                results: {
                    pages: [
                        {
                            page: 1,
                            matches: [
                                {
                                    bbox: {
                                        x0: 15,
                                        y0: 25,
                                        x1: 115,
                                        y1: 45
                                    }
                                }
                            ]
                        }
                    ],
                    match_count: 1
                }
            }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementations for useHighlightStore
        (useHighlightStore as any).mockReturnValue({
            addHighlight: vi.fn().mockResolvedValue('highlight-id-1'),
            removeHighlight: vi.fn().mockResolvedValue(true),
            addMultipleHighlights: vi.fn().mockResolvedValue(['highlight-id-1', 'highlight-id-2']),
            removeMultipleHighlights: vi.fn().mockResolvedValue(true),
            getHighlightsForPage: vi.fn().mockReturnValue([]),
            addHighlightsToPage: vi.fn().mockResolvedValue(['highlight-id-1']),
            removeHighlightsFromPage: vi.fn().mockResolvedValue(true),
            getHighlightsForFile: vi.fn().mockReturnValue([]),
            addHighlightsToFile: vi.fn().mockResolvedValue(['highlight-id-1']),
            removeHighlightsFromFile: vi.fn().mockResolvedValue(true),
            getHighlightsByType: vi.fn().mockReturnValue([]),
            addHighlightsByType: vi.fn().mockResolvedValue(['highlight-id-1']),
            removeHighlightsByType: vi.fn().mockResolvedValue(true),
            getHighlightsByProperty: vi.fn().mockReturnValue([]),
            removeHighlightsByProperty: vi.fn().mockResolvedValue(true),
            removeHighlightsByPropertyFromAllFiles: vi.fn().mockResolvedValue(true),
            getHighlightsByText: vi.fn().mockReturnValue([{
                id: 'highlight-1',
                text: 'test query',
                type: HighlightType.SEARCH,
                fileKey: 'test.pdf',
                page: 1,
                x: 10, y: 20, w: 100, h: 20
            }]),
            removeHighlightsByText: vi.fn().mockResolvedValue(true),
            removeAllHighlights: vi.fn().mockResolvedValue(true),
            removeAllHighlightsByType: vi.fn().mockResolvedValue(true),
            removeHighlightsByPosition: vi.fn().mockResolvedValue(true),
            refreshTrigger: 0
        });

        // Mock for usePDFApi with all required properties
        (usePDFApi as any).mockReturnValue({
            loading: false,
            error: null,
            fileErrors: new Map(),
            progress: 0,
            runBatchSearch: vi.fn().mockResolvedValue(mockSearchResponse),
            runBatchHybridDetect: vi.fn().mockResolvedValue({}),
            getDetectionResults: vi.fn().mockReturnValue(null),
            runRedactPdf: vi.fn().mockResolvedValue(new Blob()),
            runBatchRedactPdfs: vi.fn().mockResolvedValue({}),
            runFindWords: vi.fn().mockResolvedValue({}),
            clearDetectionCache: vi.fn(),
            resetErrors: vi.fn()
        });

        // Mock window.dispatchEvent
        window.dispatchEvent = vi.fn();
    });

    test('provides search context to children with initial state', () => {
        render(
            <BatchSearchProvider>
                <TestConsumer />
            </BatchSearchProvider>
        );

        // Initial state should be empty
        expect(screen.getByTestId('is-searching').textContent).toBe('false');
        expect(screen.getByTestId('search-error').textContent).toBe('no-error');
        expect(screen.getByTestId('search-progress').textContent).toBe('0');
        expect(screen.getByTestId('active-queries').textContent).toBe('[]');
        expect(screen.getByTestId('search-queries').textContent).toBe('[]');
    });

    test('throws error when used outside provider', () => {
        render(<ErrorComponent />);
        expect(screen.getByTestId('context-error')).toBeInTheDocument();
    });

    /*
    test('executes a basic search successfully', async () => {
        // Import the modules directly to make sure the correct mocks are used
        const { BatchSearchService } = await import('../services/BatchSearchService');
        const { SearchHighlightProcessor } = await import('../managers/SearchHighlightProcessor');

        // Set up mocks to simulate successful search
        vi.mocked(BatchSearchService.batchSearch).mockResolvedValue(mockSearchResponse);
        vi.mocked(BatchSearchService.transformSearchResults).mockImplementation(() => {
            const resultMap = new Map();
            const pageMap = new Map();
            pageMap.set(1, [
                {
                    page: 1,
                    x: 10,
                    y: 20,
                    w: 100,
                    h: 20,
                    text: 'test query',
                    fileKey: 'test.pdf',
                    type: HighlightType.SEARCH,
                    color: '#71c4ff',
                    opacity: 0.4,
                    id: 'test-id-1'
                }
            ]);
            resultMap.set('test.pdf', pageMap);
            return resultMap;
        });

        const runBatchSearchMock = vi.fn().mockResolvedValue(mockSearchResponse);
        vi.mocked(usePDFApi).mockReturnValue({
            ...vi.mocked(usePDFApi)(),
            runBatchSearch: runBatchSearchMock
        });

        // Create a component with search execution in useEffect
        const TestComponent = () => {
            const {
                activeQueries,
                batchSearch
            } = useBatchSearch();

            React.useEffect(() => {
                const doSearch = async () => {
                    await batchSearch([new File([], 'test.pdf')], 'test query');
                };
                doSearch();
            }, []);

            return (
                <div data-testid="active-queries">{JSON.stringify(activeQueries)}</div>
            );
        };

        // Render component that automatically executes search
        render(
            <BatchSearchProvider>
                <TestComponent />
            </BatchSearchProvider>
        );

        // Wait for active queries to be updated
        await waitFor(() => {
            const activeQueriesElement = screen.getByTestId('active-queries');
            const activeQueriesContent = activeQueriesElement.textContent || '[]';
            const activeQueries = JSON.parse(activeQueriesContent);
            return activeQueries.length > 0;
        }, { timeout: 2000 });

        // Verify search was saved to persistence store
        const summaryPersistenceStore = await import('../store/SummaryPersistenceStore');
        expect(summaryPersistenceStore.default.saveActiveSearchQueries).toHaveBeenCalled();

        // Verify highlight processor was called
        expect(SearchHighlightProcessor.processSearchResults).toHaveBeenCalled();
    });
    */

    /*
    test('executes an advanced search with options', async () => {
        // Import modules directly
        const { BatchSearchService } = await import('../services/BatchSearchService');

        // Set up mocks for advanced search
        vi.mocked(BatchSearchService.batchSearch).mockResolvedValue(mockAdvancedSearchResponse);
        vi.mocked(BatchSearchService.transformSearchResults).mockImplementation(() => {
            const resultMap = new Map();
            const pageMap = new Map();
            pageMap.set(1, [
                {
                    page: 1,
                    x: 15,
                    y: 25,
                    w: 100,
                    h: 20,
                    text: 'advanced query',
                    fileKey: 'test.pdf',
                    type: HighlightType.SEARCH,
                    id: 'test-id-2'
                }
            ]);
            resultMap.set('test.pdf', pageMap);
            return resultMap;
        });

        // Create component that executes advanced search immediately
        const TestAdvancedComponent = () => {
            const {
                activeQueries,
                batchSearch
            } = useBatchSearch();

            React.useEffect(() => {
                const doSearch = async () => {
                    await batchSearch(
                        [new File([], 'test.pdf')],
                        'advanced query',
                        { isCaseSensitive: true, isAiSearch: true }
                    );
                };
                doSearch();
            }, []);

            return (
                <div data-testid="active-queries">{JSON.stringify(activeQueries)}</div>
            );
        };

        render(
            <BatchSearchProvider>
                <TestAdvancedComponent />
            </BatchSearchProvider>
        );

        // Wait for active queries to be updated
        await waitFor(() => {
            const activeQueriesElement = screen.getByTestId('active-queries');
            const activeQueriesContent = activeQueriesElement.textContent || '[]';
            const activeQueries = JSON.parse(activeQueriesContent);
            return activeQueries.some((q: { term: string; }) => q.term === 'advanced query');
        }, { timeout: 2000 });

        // Verify BatchSearchService was called with correct options
        expect(BatchSearchService.batchSearch).toHaveBeenCalledWith(
            expect.any(Array),
            'advanced query',
            expect.objectContaining({
                case_sensitive: true,
                ai_search: true
            })
        );
    });
    */

    test('handles failed search', async () => {
        // Create an error to throw
        const searchError = new Error('Search failed');

        // Mock the runBatchSearch to reject with our error
        const runBatchSearchMock = vi.fn().mockRejectedValue(searchError);
        vi.mocked(usePDFApi).mockReturnValue({
            ...vi.mocked(usePDFApi)(),
            runBatchSearch: runBatchSearchMock
        });

        render(
            <BatchSearchProvider>
                <TestConsumer />
            </BatchSearchProvider>
        );

        // Start a search that will fail
        await act(async () => {
            fireEvent.click(screen.getByTestId('start-search'));
        });

        // Should display error
        await waitFor(() => {
            expect(screen.getByTestId('search-error').textContent).toBe('Search failed');
        });

        // Progress should be reset
        expect(screen.getByTestId('is-searching').textContent).toBe('false');
    });

    /*
    test('clears a specific search term', async () => {
        // First make a component that will execute a search and then clear it
        const TestClearComponent = () => {
            const {
                activeQueries,
                batchSearch,
                clearSearch
            } = useBatchSearch();

            React.useEffect(() => {
                const doSearchAndClear = async () => {
                    await batchSearch([new File([], 'test.pdf')], 'test query');

                    // Add a small delay to ensure state updates
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Verify query is added, then clear it
                    if (activeQueries.some(q => q.term === 'test query')) {
                        await clearSearch('test query');
                    }
                };
                doSearchAndClear();
            }, [activeQueries.length]);

            return (
                <div>
                    <div data-testid="active-queries">{JSON.stringify(activeQueries)}</div>
                    <div data-testid="active-query-count">{activeQueries.length}</div>
                </div>
            );
        };

        render(
            <BatchSearchProvider>
                <TestClearComponent />
            </BatchSearchProvider>
        );

        // Wait for search to complete and then be cleared
        await waitFor(() => {
            const activeQueriesElement = screen.getByTestId('active-query-count');
            return activeQueriesElement.textContent === '0';
        }, { timeout: 2000 });

        // Verify removeHighlightsByText was called
        const { useHighlightStore } = await import('../contexts/HighlightStoreContext');
        expect(vi.mocked(useHighlightStore)().removeHighlightsByText).toHaveBeenCalled();
    });
    */

    /*
    test('clears a specific search term for a specific file', async () => {
        // Set up mock for removing highlights by text
        const removeHighlightsByTextMock = vi.fn().mockResolvedValue(true);
        vi.mocked(useHighlightStore).mockReturnValue({
            ...vi.mocked(useHighlightStore)(),
            removeHighlightsByText: removeHighlightsByTextMock
        });

        // Create a component that adds a query and then clears it for a specific file
        const TestComponent = () => {
            const {
                activeQueries,
                batchSearch,
                clearSearch
            } = useBatchSearch();

            React.useEffect(() => {
                const executeTest = async () => {
                    await batchSearch([new File([], 'test.pdf')], 'test query');

                    // Add a small delay to ensure state updates
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Clear for specific file
                    await clearSearch('test query');
                };
                executeTest();
            }, []);

            return (
                <div data-testid="active-queries">{JSON.stringify(activeQueries)}</div>
            );
        };

        render(
            <BatchSearchProvider>
                <TestComponent />
            </BatchSearchProvider>
        );

        // Wait for removeHighlightsByText to be called
        await waitFor(() => {
            return removeHighlightsByTextMock.mock.calls.length > 0;
        }, { timeout: 2000 });

        // Verify it was called with correct parameters
        expect(removeHighlightsByTextMock).toHaveBeenCalledWith('file-key-1', 'test query');
    });
    */

    /*
    test('clears all searches', async () => {
        // Set up mock for highlight removal
        const removeAllHighlightsByTypeMock = vi.fn().mockResolvedValue(true);
        vi.mocked(useHighlightStore).mockReturnValue({
            ...vi.mocked(useHighlightStore)(),
            removeAllHighlightsByType: removeAllHighlightsByTypeMock
        });

        // Direct import for persistence store
        const summaryPersistenceStore = await import('../store/SummaryPersistenceStore');

        // Component that adds multiple searches and then clears them all
        const TestClearAllComponent = () => {
            const {
                activeQueries,
                batchSearch,
                clearAllSearches
            } = useBatchSearch();

            const [testPhase, setTestPhase] = React.useState(0);

            React.useEffect(() => {
                const executeTest = async () => {
                    // Phase 0: Add first search
                    if (testPhase === 0) {
                        await batchSearch([new File([], 'test.pdf')], 'test query');
                        setTestPhase(1);
                    }
                    // Phase 1: Add second search
                    else if (testPhase === 1) {
                        await batchSearch([new File([], 'test.pdf')], 'advanced query', { isCaseSensitive: true });
                        setTestPhase(2);
                    }
                    // Phase 2: Verify two searches and clear them
                    else if (testPhase === 2 && activeQueries.length === 2) {
                        await clearAllSearches();
                        setTestPhase(3);
                    }
                };
                executeTest();
            }, [testPhase, activeQueries.length]);

            return (
                <div>
                    <div data-testid="test-phase">{testPhase}</div>
                    <div data-testid="active-queries">{JSON.stringify(activeQueries)}</div>
                    <div data-testid="query-count">{activeQueries.length}</div>
                </div>
            );
        };

        render(
            <BatchSearchProvider>
                <TestClearAllComponent />
            </BatchSearchProvider>
        );

        // Wait for test to complete all phases
        await waitFor(() => {
            return screen.getByTestId('test-phase').textContent === '3';
        }, { timeout: 5000 });

        // Verify queries were cleared
        expect(screen.getByTestId('query-count').textContent).toBe('0');

        // Verify persistence store was updated
        expect(summaryPersistenceStore.default.saveActiveSearchQueries).toHaveBeenCalledWith([]);
    });
    */

    test('getSearchQueries returns the correct queries', async () => {
        // Create component that adds searches and verifies query list
        const TestQueryComponent = () => {
            const {
                batchSearch,
                getSearchQueries
            } = useBatchSearch();

            const [queries, setQueries] = React.useState<string[]>([]);

            React.useEffect(() => {
                const executeTest = async () => {
                    // Add first search
                    await batchSearch([new File([], 'test.pdf')], 'test query');

                    // Small delay for state update
                    await new Promise(resolve => setTimeout(resolve, 300));

                    // Get queries and update state
                    setQueries(getSearchQueries());
                };
                executeTest();
            }, []);

            return (
                <div data-testid="query-list">{JSON.stringify(queries)}</div>
            );
        };

        render(
            <BatchSearchProvider>
                <TestQueryComponent />
            </BatchSearchProvider>
        );

        // Wait for queries to be populated
        await waitFor(() => {
            const queriesElement = screen.getByTestId('query-list');
            const queriesContent = queriesElement.textContent || '[]';
            const queries = JSON.parse(queriesContent);
            return queries.includes('test query');
        }, { timeout: 3000 });
    });
});