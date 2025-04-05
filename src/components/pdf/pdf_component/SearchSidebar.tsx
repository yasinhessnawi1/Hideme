import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFileContext } from '../../../contexts/FileContext';
import {  getFileKey } from '../../../contexts/PDFViewerContext';
import { useBatchSearch } from '../../../contexts/SearchContext';
import { usePDFApi } from '../../../hooks/usePDFApi';
import '../../../styles/modules/pdf/SettingsSidebar.css';
import '../../../styles/modules/pdf/SearchSidebar.css';
import { Search, XCircle, ChevronUp, ChevronDown, ChevronRight, Save, AlertTriangle } from 'lucide-react';
import { usePDFNavigation } from '../../../hooks/usePDFNavigation';

const SearchSidebar: React.FC = () => {
    const { currentFile, selectedFiles, files } = useFileContext();
    const pdfNavigation = usePDFNavigation('search-sidebar');

    const {
        isSearching: isContextSearching,
        searchError: contextSearchError,
        activeQueries,
        batchSearch,
        clearSearch,
        clearAllSearches,
        getSearchResultsStats
    } = useBatchSearch();

    const {
        loading: isApiLoading,
        error: apiError,
        progress: apiProgress,
        runBatchSearch,
        resetErrors
    } = usePDFApi();

    const [tempSearchTerm, setTempSearchTerm] = useState('');
    const [searchScope, setSearchScope] = useState<'current' | 'selected' | 'all'>('current');
    const [isRegexSearch, setIsRegexSearch] = useState(false);
    const [isCaseSensitive, setIsCaseSensitive] = useState(false);
    const [localSearchError, setLocalSearchError] = useState<string | null>(null);
    const [expandedFileSummaries, setExpandedFileSummaries] = useState<Set<string>>(new Set());
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [contextMenuSearchTerm, setContextMenuSearchTerm] = useState('');
    // Ref for the context menu
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Get current search statistics
    const searchStats = getSearchResultsStats();

    // Track the currently visible result for navigation
    const [resultNavigation, setResultNavigation] = useState<{
        results: { fileKey: string; page: number; count: number }[];
        currentIndex: number;
    }>({
        results: [],
        currentIndex: -1
    });

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
        addSearchTerm().then(() => {});
    };

    const addSearchTerm = useCallback(async () => {
        if (!tempSearchTerm.trim()) return;

        const filesToSearch = getFilesToProcess();
        if (filesToSearch.length === 0) {
            setLocalSearchError('No files selected for search');
            return;
        }

        setLocalSearchError(null);
        resetErrors();

        try {
            // Store the search term before clearing the input field
            const searchTermToUse = tempSearchTerm.trim();

            // Clear input field early to prevent state issues
            setTempSearchTerm('');

            // Check if this term is already in the active queries to avoid duplicates
            const isExistingTerm = activeQueries.some(
                query => query.term === searchTermToUse &&
                    query.caseSensitive === isCaseSensitive &&
                    query.isRegex === isRegexSearch
            );

            if (isExistingTerm) {
                setLocalSearchError(`"${searchTermToUse}" is already in your search terms`);
                return;
            }


            await runBatchSearch(
                filesToSearch,
                searchTermToUse,
                {
                    isCaseSensitive,
                    isRegexSearch
                }
            );


            await batchSearch(
                filesToSearch,
                searchTermToUse,
                {
                    caseSensitive: isCaseSensitive,
                    regex: isRegexSearch
                }
            );

            // We'll expand file summaries after a short delay to ensure the search results are processed
            setTimeout(() => {
                // Get fresh stats after search has completed
                const currentStats = getSearchResultsStats();

                // Auto-expand file summaries with results
                const newExpandedSet = new Set<string>(expandedFileSummaries); // Preserve existing expansions

                // Add any new files with results
                currentStats.fileMatches.forEach((_, fileKey) => {
                    newExpandedSet.add(fileKey);
                });

                if (newExpandedSet.size > 0) {
                    setExpandedFileSummaries(newExpandedSet);
                }
            }, 100);
        } catch (error: any) {
            setLocalSearchError(error.message || 'Error performing search');
        }
    }, [
        tempSearchTerm,
        getFilesToProcess,
        resetErrors,
        runBatchSearch,
        batchSearch,
        isCaseSensitive,
        isRegexSearch,
        getSearchResultsStats,
        activeQueries,
        expandedFileSummaries
    ]);

    const removeSearchTerm = (term: string) => {
        clearSearch(term);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addSearchTerm().then(() => {});
        }
    };

    const handleClearAllSearches = () => {
        clearAllSearches();
        setTempSearchTerm('');
    };
    // Simple navigation to a page
    const navigateToPage = useCallback((fileKey: string, pageNumber: number) => {

        const file = files.find(f => getFileKey(f).includes(fileKey));

        if (!file) {
            return;
        }

        const isChangingFile = currentFile !== file;

        // Use our navigation hook for consistent navigation behavior
        pdfNavigation.navigateToPage(pageNumber, getFileKey(file), {
            // Use auto behavior for better UX when changing files
            behavior: isChangingFile ? 'auto' : 'smooth',
            // Always highlight the thumbnail
            highlightThumbnail: true
        });

    }, [pdfNavigation, files, currentFile]);

    // Navigate to specific search result - improved with more robust error handling
    const navigateToSearchResult = useCallback((direction: 'next' | 'prev') => {
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

        if (!target) {
            return;
        }

        // Use our improved navigation mechanism
        navigateToPage(target.fileKey, target.page);

    }, [resultNavigation, navigateToPage]);
    const handleChangeSearchScope = (scope: 'current' | 'selected' | 'all') => {
        if (scope === searchScope) return;
        setSearchScope(scope);
    };

    // Toggle file summary expansion
    const toggleFileSummary = useCallback((fileKey: string) => {
        setExpandedFileSummaries(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fileKey)) {
                newSet.delete(fileKey);
            } else {
                newSet.add(fileKey);
            }
            return newSet;
        });
    }, []);

    // Calculate overall result index for display - memoized to prevent recalculation
    const calculateOverallResultIndex = useCallback(() => {
        if (resultNavigation.currentIndex === -1 || resultNavigation.results.length === 0) {
            return 0;
        }

        const { results, currentIndex } = resultNavigation;

        // Check if current index is valid
        if (currentIndex >= results.length) {
            return 0;
        }

        // Sum up the counts of all previous results
        let overallIndex = 1; // Start at 1 for user-friendly display

        for (let i = 0; i < currentIndex; i++) {
            overallIndex += results[i].count;
        }

        return overallIndex;
    }, [resultNavigation, resultNavigation.results.length]);

    // Handle right click on search term
    const handleSearchTermRightClick = (e: React.MouseEvent, term: string) => {
        e.preventDefault();

        // Position the context menu
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
        setContextMenuSearchTerm(term);
        setContextMenuVisible(true);
    };

    // Handle save to settings from context menu
    const handleSaveToSettings = () => {
        // This is a placeholder - would typically save current settings to user preferences
        alert(`Search term "${contextMenuSearchTerm}" saved to settings!`);
        setContextMenuVisible(false);
    };

    // Handle document click to close context menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenuVisible(false);
            }
        };

        if (contextMenuVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [contextMenuVisible]);

    // Update navigation results when search results change - use a ref to prevent infinite loop
    const prevSearchStatsRef = useRef<any>(null);

    useEffect(() => {
        // Create a stable representation of the search stats for comparison
        const statsSignature = JSON.stringify({
            totalMatches: searchStats.totalMatches,
            fileCount: searchStats.fileMatches.size
        });

        // Skip processing if the stats haven't changed meaningfully
        if (prevSearchStatsRef.current === statsSignature) {
            return;
        }

        prevSearchStatsRef.current = statsSignature;

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
    }, [searchStats.totalMatches, activeQueries.length, isSearching]);

    return (
        <div className="search-sidebar">
            <div className="sidebar-header search-header">
                <h3>Search</h3>
                {activeQueries.length > 0 && (
                    <div className="search-badge">
                        {searchStats.totalMatches} matches
                    </div>
                )}
            </div>

            <div className="sidebar-content">
                <div className="sidebar-section">
                    <form onSubmit={handleSearchSubmit} className="search-form">
                        <div className="search-input-wrapper">
                            <input
                                type="text"
                                value={tempSearchTerm}
                                onChange={(e) => setTempSearchTerm(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Enter search term..."
                                className="search-input"
                                disabled={isSearching}
                            />
                            <button
                                type="submit"
                                className="search-button"
                                disabled={!tempSearchTerm.trim() || isSearching}
                            >
                                <Search size={18} />
                            </button>
                        </div>

                        <div className="search-options">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={isRegexSearch}
                                    onChange={() => setIsRegexSearch(!isRegexSearch)}
                                    disabled={isSearching}
                                />
                                <span className="checkmark"></span>
                                Regex search
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={isCaseSensitive}
                                    onChange={() => setIsCaseSensitive(!isCaseSensitive)}
                                    disabled={isSearching}
                                />
                                <span className="checkmark"></span>
                                Case sensitive
                            </label>
                        </div>
                    </form>
                </div>

                <div className="sidebar-section scope-section">
                    <h4>Search Scope</h4>
                    <div className="scope-buttons">
                        <button
                            className={`scope-button ${searchScope === 'current' ? 'active' : ''}`}
                            onClick={() => handleChangeSearchScope('current')}
                            disabled={!currentFile || isSearching}
                            title="Search in current file only"
                        >
                            Current File
                        </button>
                        <button
                            className={`scope-button ${searchScope === 'selected' ? 'active' : ''}`}
                            onClick={() => handleChangeSearchScope('selected')}
                            disabled={selectedFiles.length === 0 || isSearching}
                            title={`Search in ${selectedFiles.length} selected files`}
                        >
                            Selected ({selectedFiles.length})
                        </button>
                        <button
                            className={`scope-button ${searchScope === 'all' ? 'active' : ''}`}
                            onClick={() => handleChangeSearchScope('all')}
                            disabled={isSearching}
                            title={`Search in all ${files.length} files`}
                        >
                            All Files ({files.length})
                        </button>
                    </div>
                </div>

                <div className="sidebar-section">
                    <div className="search-terms-header">
                        <h4>Search Terms</h4>
                        {activeQueries.length > 0 && (
                            <button
                                className="clear-all-button"
                                onClick={handleClearAllSearches}
                                disabled={isSearching}
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    <div className="search-terms-list">
                        {activeQueries.length === 0 ? (
                            <div className="no-search-terms">No search terms</div>
                        ) : (
                            <div className="search-term-items">
                                {activeQueries.map((query) => (
                                    <div
                                        key={query.term}
                                        className="search-term-item"
                                        onContextMenu={(e) => handleSearchTermRightClick(e, query.term)}
                                    >
                                        <div className="search-term-text">
                                            <span>{query.term}</span>
                                            <div className="search-term-options">
                                                {query.caseSensitive && <span className="search-term-option">Aa</span>}
                                                {query.isRegex && <span className="search-term-option">.*</span>}
                                            </div>
                                        </div>
                                        <button
                                            className="search-term-remove"
                                            onClick={() => removeSearchTerm(query.term)}
                                            title="Remove Search Term"
                                            disabled={isSearching}
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {localSearchError && (
                    <div className="sidebar-section error-section">
                        <div className="error-message">
                            <AlertTriangle size={18} className="error-icon" />
                            {localSearchError}
                        </div>
                    </div>
                )}

                {isSearching && (
                    <div className="sidebar-section">
                        <div className="progress-container">
                            <div className="progress-label">Searching...</div>
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${searchProgress}%` }}
                                ></div>
                            </div>
                            <div className="progress-percentage">{searchProgress}%</div>
                        </div>
                    </div>
                )}

                <div className="sidebar-section">
                    <div className="search-results-header">
                        <h4>Results</h4>
                        <div className="search-navigation">
                            <button
                                className="nav-button"
                                onClick={() => navigateToSearchResult('prev')}
                                disabled={searchStats.totalMatches === 0 || isSearching}
                                title="Previous Result"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <button
                                className="nav-button"
                                onClick={() => navigateToSearchResult('next')}
                                disabled={searchStats.totalMatches === 0 || isSearching}
                                title="Next Result"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                    </div>

                    {searchStats.totalMatches > 0 && (
                        <div className="results-count">
                            {isSearching ? (
                                `Searching...`
                            ) : (
                                `${calculateOverallResultIndex()} of ${searchStats.totalMatches} matches`
                            )}
                        </div>
                    )}

                    <div className="search-results-list">
                        {searchStats.totalMatches === 0 ? (
                            <div className="no-results">No results found</div>
                        ) : (
                            // Display results grouped by file
                            Array.from(searchStats.fileMatches.entries()).map(([fileKey, fileCount]) => {
                                // Find the corresponding file name
                                const file = files.find(f => getFileKey(f) === fileKey);
                                const fileName = file ? file.name : fileKey;
                                const pageMatches = searchStats.pageMatches.get(fileKey) || new Map();
                                const isExpanded = expandedFileSummaries.has(fileKey);

                                return (
                                    <div className="file-summary-card" key={fileKey}>
                                        <div
                                            className="file-summary-header"
                                            onClick={() => toggleFileSummary(fileKey)}
                                        >
                                            <div className="file-summary-title">
                                                <span className="file-name">{fileName}</span>
                                                <span className="result-count-badge">
                                                    {fileCount} matches
                                                </span>
                                            </div>
                                            <div className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="file-summary-content">
                                                {Array.from(pageMatches.entries())
                                                    .sort((a, b) => a[0] - b[0])
                                                    .map(([pageNum, count]) => (
                                                        <div
                                                            className="page-list-item"
                                                            key={`${fileKey}-page-${pageNum}`}
                                                        >
                                                            <div className="page-item-left">
                                                                <span className="page-name">
                                                                    Page {pageNum}
                                                                </span>
                                                            </div>
                                                            <div className="page-item-right">
                                                                <span className="match-count">{count} matches</span>
                                                                <div className="navigation-buttons">
                                                                    <button
                                                                        className="nav-button"
                                                                        onClick={(e) => {
                                                                            console.log("Button fired");
                                                                            e.stopPropagation();
                                                                            navigateToPage(fileKey, pageNum);
                                                                        }}
                                                                        title="Navigate to page"
                                                                    >
                                                                        <ChevronRight size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Context Menu for Right-Click */}
            {contextMenuVisible && (
                <div
                    ref={contextMenuRef}
                    className="context-menu"
                    style={{
                        top: contextMenuPosition.y,
                        left: contextMenuPosition.x
                    }}
                >
                    <button
                        className="context-menu-item"
                        onClick={handleSaveToSettings}
                    >
                        <Save size={14} />
                        <span>Save to Settings</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default SearchSidebar;
