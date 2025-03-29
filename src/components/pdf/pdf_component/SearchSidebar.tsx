// src/components/pdf/pdf_component/SearchSidebar.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaSearch, FaTimesCircle, FaChevronUp, FaChevronDown, FaDesktop, FaFileAlt } from 'react-icons/fa';
import { usePDFViewerContext, getFileKey } from '../../../contexts/PDFViewerContext';
import { useFileContext } from '../../../contexts/FileContext';
import { useBatchSearch } from '../../../contexts/SearchContext';
import { usePDFApi } from '../../../hooks/usePDFApi';
import '../../../styles/modules/pdf/SettingsSidebar.css';

const SearchSidebar: React.FC = () => {
    const { scrollToPage } = usePDFViewerContext();
    const { currentFile, selectedFiles, files } = useFileContext();

    const {
        isSearching: isContextSearching,
        searchError: contextSearchError,
        activeQueries,
        batchSearch,
        clearSearch,
        clearAllSearches,
        getSearchResultsStats
    } = useBatchSearch();

    // Use the refactored PDF API hook for search operations
    const {
        loading: isApiLoading,
        error: apiError,
        progress: apiProgress,
        runBatchSearch
    } = usePDFApi();

    const [tempSearchTerm, setTempSearchTerm] = useState('');
    const [searchScope, setSearchScope] = useState<'current' | 'selected' | 'all'>('current');
    const [isRegexSearch, setIsRegexSearch] = useState(false);
    const [isCaseSensitive, setIsCaseSensitive] = useState(false);
    const [localSearchError, setLocalSearchError] = useState<string | null>(null);

    // Get current search statistics (memoize it to prevent infinite re-renders)
    const searchStatsRef = useRef(getSearchResultsStats());

    // Only update search stats when we need to
    useEffect(() => {
        searchStatsRef.current = getSearchResultsStats();
    }, [
        getSearchResultsStats,
        activeQueries,
        // Add dependencies that indicate when search results might change
        isContextSearching,
        isApiLoading
    ]);

    // Track the currently visible result for navigation
    const [resultNavigation, setResultNavigation] = useState<{
        results: { fileKey: string; page: number; count: number }[];
        currentIndex: number;
    }>({
        results: [],
        currentIndex: -1
    });

    // Use a ref to make sure we don't cause render cycles
    const navigationUpdatePending = useRef(false);

    // Set error from API if available
    useEffect(() => {
        if (apiError) {
            setLocalSearchError(apiError);
        } else if (contextSearchError) {
            setLocalSearchError(contextSearchError);
        } else {
            setLocalSearchError(null);
        }
    }, [apiError, contextSearchError]);

    // Combined loading state
    const isSearching = isContextSearching || isApiLoading;
    const searchProgress = apiProgress;

    // Update result navigation when search results change
    useEffect(() => {
        // Avoid updates if one is already pending
        if (navigationUpdatePending.current) return;

        // Get the latest stats from the ref
        const searchStats = searchStatsRef.current;

        // Mark as pending to prevent multiple updates
        navigationUpdatePending.current = true;

        // Schedule update in next frame to avoid render loop
        setTimeout(() => {
            // Flatten search results for navigation
            const flatResults: { fileKey: string; page: number; count: number }[] = [];

            searchStats.pageMatches.forEach((pageMap, fileKey) => {
                pageMap.forEach((count, page) => {
                    flatResults.push({ fileKey, page, count });
                });
            });

            // Sort by file key and then by page number
            flatResults.sort((a, b) => {
                if (a.fileKey !== b.fileKey) return a.fileKey.localeCompare(b.fileKey);
                return a.page - b.page;
            });

            setResultNavigation({
                results: flatResults,
                currentIndex: flatResults.length > 0 ? 0 : -1
            });

            // Clear pending flag
            navigationUpdatePending.current = false;
        }, 0);
    }, [
        // Only depend on relevant values
        isSearching,
        activeQueries.length
    ]);

    // Get files to process based on selected scope
    const getFilesToProcess = useCallback((): File[] => {
        if (searchScope === 'current' && currentFile) {
            return [currentFile];
        } else if (searchScope === 'selected' && selectedFiles.length > 0) {
            return selectedFiles;
        } else if (searchScope === 'all') {
            return files;
        }
        return [];
    }, [searchScope, currentFile, selectedFiles, files]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addSearchTerm();
    };

    const addSearchTerm = async () => {
        if (!tempSearchTerm.trim()) return;

        const filesToSearch = getFilesToProcess();
        if (filesToSearch.length === 0) {
            setLocalSearchError('No files selected for search');
            return;
        }

        setLocalSearchError(null);

        try {
            // First use the API hook for the search to get results from backend
            const searchResults = await runBatchSearch(
                filesToSearch,
                tempSearchTerm,
                {
                    isCaseSensitive,
                    isRegexSearch
                }
            );

            // Then use the context's batchSearch to integrate the results
            // into the application state and create highlights
            await batchSearch(
                filesToSearch,
                tempSearchTerm,
                {
                    caseSensitive: isCaseSensitive,
                    regex: isRegexSearch
                }
            );

            // Clear input field after search is initiated
            setTempSearchTerm('');
        } catch (error: any) {
            setLocalSearchError(error.message || 'Error performing search');
        }
    };

    const removeSearchTerm = (term: string) => {
        clearSearch(term);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addSearchTerm();
        }
    };

    const handleClearAllSearches = () => {
        clearAllSearches();
        setTempSearchTerm('');
    };

    // Navigate to specific search result
    const navigateToSearchResult = (direction: 'next' | 'prev') => {
        const { results, currentIndex } = resultNavigation;

        if (results.length === 0) return;

        let newIndex;

        if (direction === 'next') {
            newIndex = (currentIndex + 1) % results.length;
        } else {
            newIndex = (currentIndex - 1 + results.length) % results.length;
        }

        const target = results[newIndex];

        // Update the navigation state
        setResultNavigation(prev => ({
            ...prev,
            currentIndex: newIndex
        }));

        // Find the file object by key
        const targetFile = files.find(file => getFileKey(file) === target.fileKey);

        if (targetFile && target.page) {
            // Navigate to the page
            scrollToPage(target.page, target.fileKey);
        }
    };

    const handleChangeSearchScope = (scope: 'current' | 'selected' | 'all') => {
        if (scope === searchScope) return;
        setSearchScope(scope);
    };

    // Calculate overall result index for display
    const calculateOverallResultIndex = () => {
        if (resultNavigation.currentIndex === -1 || resultNavigation.results.length === 0) {
            return 0;
        }

        const { results, currentIndex } = resultNavigation;

        // Sum up the counts of all previous results
        let overallIndex = 1; // Start at 1 for user-friendly display

        for (let i = 0; i < currentIndex; i++) {
            overallIndex += results[i].count;
        }

        return overallIndex;
    };

    // Get the searchStats once from the ref for rendering
    const searchStats = searchStatsRef.current;

    return (
        <div className="search-sidebar">
            <div className="search-header">
                <h3>Batch Search</h3>
            </div>

            <div className="search-form">
                <form onSubmit={handleSearchSubmit}>
                    <div className="search-input-container">
                        <input
                            type="text"
                            value={tempSearchTerm}
                            onChange={(e) => setTempSearchTerm(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Enter search term..."
                            className="search-input"
                        />
                        <button
                            type="button"
                            onClick={addSearchTerm}
                            className="search-button"
                            disabled={!tempSearchTerm.trim() || isSearching}
                        >
                            <FaSearch />
                        </button>
                    </div>

                    <div className="search-options">
                        <label>
                            <input
                                type="checkbox"
                                checked={isRegexSearch}
                                onChange={() => setIsRegexSearch(!isRegexSearch)}
                            />
                            Regex search
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={isCaseSensitive}
                                onChange={() => setIsCaseSensitive(!isCaseSensitive)}
                            />
                            Case sensitive
                        </label>
                    </div>

                    <div className="search-scope">
                        <label className="scope-label">Search in:</label>
                        <div className="scope-options">
                            <button
                                type="button"
                                className={`scope-button ${searchScope === 'current' ? 'active' : ''}`}
                                onClick={() => handleChangeSearchScope('current')}
                                disabled={!currentFile}
                                title="Search in current file only"
                            >
                                <FaFileAlt size={14} />
                                <span>Current</span>
                            </button>
                            <button
                                type="button"
                                className={`scope-button ${searchScope === 'selected' ? 'active' : ''}`}
                                onClick={() => handleChangeSearchScope('selected')}
                                disabled={selectedFiles.length === 0}
                                title={`Search in ${selectedFiles.length} selected files`}
                            >
                                <FaFileAlt size={14} />
                                <span>Selected ({selectedFiles.length})</span>
                            </button>
                            <button
                                type="button"
                                className={`scope-button ${searchScope === 'all' ? 'active' : ''}`}
                                onClick={() => handleChangeSearchScope('all')}
                                title={`Search in all ${files.length} files`}
                            >
                                <FaDesktop size={14} />
                                <span>All ({files.length})</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <div className="search-terms-container">
                <div className="search-terms-header">
                    <h4>Search Terms</h4>
                    {activeQueries.length > 0 && (
                        <button className="clear-all-button" onClick={handleClearAllSearches} title="Clear All Search Terms">
                            Clear All
                        </button>
                    )}
                </div>
                <div className="search-terms-list">
                    {activeQueries.length === 0 ? (
                        <div className="no-search-terms">No search terms</div>
                    ) : (
                        activeQueries.map((query) => (
                            <div key={query.term} className="search-term-item">
                                <span className="search-term-text">
                                    {query.term}
                                    {query.caseSensitive && <span className="search-term-option">Aa</span>}
                                    {query.isRegex && <span className="search-term-option">.*</span>}
                                </span>
                                <button
                                    className="search-term-remove"
                                    onClick={() => removeSearchTerm(query.term)}
                                    title="Remove Search Term"
                                >
                                    <FaTimesCircle />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="search-results-container">
                <div className="search-results-header">
                    <h4>Results</h4>
                    <span className="results-count">
                        {isSearching ? `Searching... ${searchProgress}%` :
                            searchStats.totalMatches > 0 ?
                                `${calculateOverallResultIndex()} of ${searchStats.totalMatches}` :
                                'No results'}
                    </span>
                </div>

                {localSearchError && (
                    <div className="search-error">
                        {localSearchError}
                    </div>
                )}

                <div className="search-navigation">
                    <button
                        className="nav-button"
                        onClick={() => navigateToSearchResult('prev')}
                        disabled={searchStats.totalMatches === 0 || isSearching}
                        title="Previous Result"
                    >
                        <FaChevronUp />
                    </button>
                    <button
                        className="nav-button"
                        onClick={() => navigateToSearchResult('next')}
                        disabled={searchStats.totalMatches === 0 || isSearching}
                        title="Next Result"
                    >
                        <FaChevronDown />
                    </button>
                </div>

                <div className="search-results-list">
                    {isSearching ? (
                        <div className="searching-indicator">Searching...</div>
                    ) : searchStats.totalMatches === 0 ? (
                        <div className="no-results">No results found</div>
                    ) : (
                        // Display results grouped by file
                        Array.from(searchStats.fileMatches.entries()).map(([fileKey, fileCount]) => {
                            // Find the corresponding file name
                            const file = files.find(f => getFileKey(f) === fileKey);
                            const fileName = file ? file.name : fileKey;
                            const pageMatches = searchStats.pageMatches.get(fileKey) || new Map();

                            return (
                                <div key={fileKey} className="file-results">
                                    <div className="file-results-header">
                                        {fileName} ({fileCount} matches)
                                    </div>
                                    {Array.from(pageMatches.entries()).map(([pageNum, count]) => (
                                        <div
                                            key={`${fileKey}-page-${pageNum}`}
                                            className="search-result-item"
                                            onClick={() => scrollToPage(pageNum, fileKey)}
                                        >
                                            <span className="page-number">Page {pageNum}</span>
                                            <span className="match-count">{count} matches</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchSidebar;
