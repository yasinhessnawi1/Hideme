import React, { useState, useEffect } from 'react';
import { FaSearch, FaTimesCircle, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { usePDFContext } from '../../contexts/PDFContext';
import { useHighlightContext, HighlightType } from '../../contexts/HighlightContext';
import '../../styles/pdf/SearchSidebar.css';

const SearchSidebar: React.FC = () => {
    const {
        searchQueries,
        setSearchQueries,
        scrollToPage,
        isRegexSearch,
        setIsRegexSearch,
        isCaseSensitive,
        setIsCaseSensitive,
    } = usePDFContext();

    const {
        annotations: highlights,
        clearAnnotationsByType,
    } = useHighlightContext();

    const [tempSearchTerm, setTempSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<{
        pageNumber: number;
        count: number;
        highlightIds: number[];
    }[]>([]);
    const [totalMatches, setTotalMatches] = useState(0);
    const [currentResultIndex, setCurrentResultIndex] = useState(-1);

    // Compute search results based on highlights
    useEffect(() => {
        const searchHighlights = Object.entries(highlights).reduce((acc, [pageStr, pageHighlights]) => {
            const page = parseInt(pageStr);
            const sHighlights = pageHighlights.filter((h) => h.type === HighlightType.SEARCH);
            if (sHighlights.length > 0) {
                acc[page] = sHighlights;
            }
            return acc;
        }, {} as Record<number, any[]>);

        const results = Object.entries(searchHighlights)
            .map(([pageStr, pageHls]) => ({
                pageNumber: parseInt(pageStr),
                count: pageHls.length,
                highlightIds: pageHls.map((h: any) => h.id),
            }))
            .sort((a, b) => a.pageNumber - b.pageNumber);

        setSearchResults(results);

        const total = results.reduce((sum, r) => sum + r.count, 0);
        setTotalMatches(total);

        if (currentResultIndex === -1 && total > 0) {
            setCurrentResultIndex(0);
        } else if (total === 0) {
            setCurrentResultIndex(-1);
        } else if (currentResultIndex >= total) {
            setCurrentResultIndex(total - 1);
        }
    }, [highlights, currentResultIndex]);

    const addSearchTerm = () => {
        if (tempSearchTerm.trim()) {
            if (!searchQueries.includes(tempSearchTerm)) {
                setSearchQueries([...searchQueries, tempSearchTerm]);
                console.log('Added search term:', tempSearchTerm);
            }
            setTempSearchTerm('');
        }
    };

    const removeSearchTerm = (term: string) => {
        const newQueries = searchQueries.filter((q) => q !== term);
        setSearchQueries(newQueries);
        console.log('Removed search term:', term);

        if (newQueries.length === 0) {
            clearAnnotationsByType(HighlightType.SEARCH);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addSearchTerm();
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addSearchTerm();
        }
    };

    const clearSearch = () => {
        setSearchQueries([]);
        setTempSearchTerm('');
        clearAnnotationsByType(HighlightType.SEARCH);
        setCurrentResultIndex(-1);
    };

    // Navigate to specific search result
    const navigateToSearchResult = (direction: 'next' | 'prev') => {
        if (totalMatches === 0) return;

        let newIndex;
        if (direction === 'next') {
            newIndex = (currentResultIndex + 1) % totalMatches;
        } else {
            newIndex = (currentResultIndex - 1 + totalMatches) % totalMatches;
        }

        setCurrentResultIndex(newIndex);

        let runningCount = 0;
        for (const result of searchResults) {
            if (runningCount + result.count > newIndex) {
                const highlightIndex = newIndex - runningCount;
                const highlightId = result.highlightIds[highlightIndex];
                scrollToPage(result.pageNumber);
                // Optionally scroll to highlightId...
                break;
            }
            runningCount += result.count;
        }
    };

    return (
        <div className="search-sidebar">
            <div className="search-header">
                <h3>Search</h3>
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
                            disabled={!tempSearchTerm.trim()}
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
                </form>
            </div>

            <div className="search-terms-container">
                <div className="search-terms-header">
                    <h4>Search Terms</h4>
                    {searchQueries.length > 0 && (
                        <button className="clear-all-button" onClick={clearSearch} title="Clear All Search Terms">
                            Clear All
                        </button>
                    )}
                </div>
                <div className="search-terms-list">
                    {searchQueries.length === 0 ? (
                        <div className="no-search-terms">No search terms</div>
                    ) : (
                        searchQueries.map((term) => (
                            <div key={term} className="search-term-item">
                                <span className="search-term-text">{term}</span>
                                <button
                                    className="search-term-remove"
                                    onClick={() => removeSearchTerm(term)}
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
            {totalMatches > 0 ? `${currentResultIndex + 1} of ${totalMatches}` : 'No results'}
          </span>
                </div>

                <div className="search-navigation">
                    <button
                        className="nav-button"
                        onClick={() => navigateToSearchResult('prev')}
                        disabled={totalMatches === 0}
                        title="Previous Result"
                    >
                        <FaChevronUp />
                    </button>
                    <button
                        className="nav-button"
                        onClick={() => navigateToSearchResult('next')}
                        disabled={totalMatches === 0}
                        title="Next Result"
                    >
                        <FaChevronDown />
                    </button>
                </div>

                <div className="search-results-list">
                    {searchResults.length === 0 ? (
                        <div className="no-results">No results found</div>
                    ) : (
                        searchResults.map((result) => (
                            <div
                                key={`page-${result.pageNumber}`}
                                className="search-result-item"
                                onClick={() => scrollToPage(result.pageNumber)}
                            >
                                <span className="page-number">Page {result.pageNumber}</span>
                                <span className="match-count">{result.count} matches</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchSidebar;
