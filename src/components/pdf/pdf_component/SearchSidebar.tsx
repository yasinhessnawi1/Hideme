import React, { useState, useEffect, useCallback, useRef } from 'react';

// Extend the Window interface to include our custom properties
declare global {
    interface Window {
        defaultSearchTerms?: string[];
        executeSearchWithDefaultTerms?: () => void;
    }
}
import { useFileContext } from '../../../contexts/FileContext';
import {  getFileKey } from '../../../contexts/PDFViewerContext';
import { useBatchSearch } from '../../../contexts/SearchContext';
import { usePDFApi } from '../../../hooks/usePDFApi';
import { useUser } from '../../../hooks/userHook';
import '../../../styles/modules/pdf/SettingsSidebar.css';
import '../../../styles/modules/pdf/SearchSidebar.css';
import { Search, XCircle, ChevronUp, ChevronDown, ChevronRight, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { usePDFNavigation } from '../../../hooks/usePDFNavigation';

const SearchSidebar: React.FC = () => {
    const { currentFile, selectedFiles, files } = useFileContext();
    const pdfNavigation = usePDFNavigation('search-sidebar');
    const { settings: userSettings, isLoading: userSettingsLoading, updateSettings } = useUser();

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
    const [isAiSearch, setIsAiSearch] = useState(false);
    const [isCaseSensitive, setIsCaseSensitive] = useState(false);
    const [localSearchError, setLocalSearchError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [expandedFileSummaries, setExpandedFileSummaries] = useState<Set<string>>(new Set());
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [contextMenuSearchTerm, setContextMenuSearchTerm] = useState('');

    // Ref for the context menu
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Add ref for the search input field
    const searchInputRef = useRef<HTMLInputElement>(null);

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
                    query.isAiSearch === isAiSearch
            );

            if (isExistingTerm) {
                setLocalSearchError(`"${searchTermToUse}" is already in your search terms`);
                // Keep focus on search input even when showing error
                searchInputRef.current?.focus();
                return;
            }

            await batchSearch(
                filesToSearch,
                searchTermToUse,
                {
                    isCaseSensitive: isCaseSensitive,
                    isAiSearch: isAiSearch
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

                // Refocus the search input after search completes
                searchInputRef.current?.focus();
            }, 100);
        } catch (error: any) {
            setLocalSearchError(error.message || 'Error performing search');
            // Refocus input even when there's an error
            searchInputRef.current?.focus();
        }
    }, [
        tempSearchTerm,
        getFilesToProcess,
        resetErrors,
        runBatchSearch,
        batchSearch,
        isCaseSensitive,
        isAiSearch,
        getSearchResultsStats,
        activeQueries,
        expandedFileSummaries
    ]);

    // Handle search term removal
    const removeSearchTerm = (term: string) => {
        clearSearch(term);
        // Refocus the search input after removing a search term
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 0);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addSearchTerm().then(() => {});
        }
    };

    const handleClearAllSearches = () => {
        clearAllSearches();
        setTempSearchTerm('');
        // Refocus the search input after clearing all searches
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 0);
    };

    // Synchronize with user settings when they change
    useEffect(() => {
        // Only proceed if we have user settings and they're loaded
        if (!userSettingsLoading && userSettings) {
            console.log('[SearchSidebar] Applying user settings to search');
            
            // Apply AI search setting if available
            if (userSettings.is_ai_search !== undefined) {
                console.log('[SearchSidebar] Applying AI search setting:', userSettings.is_ai_search);
                setIsAiSearch(userSettings.is_ai_search);
            }
            
            // Apply case sensitivity setting if available
            if (userSettings.is_case_sensitive !== undefined) {
                console.log('[SearchSidebar] Applying case sensitivity setting:', userSettings.is_case_sensitive);
                setIsCaseSensitive(userSettings.is_case_sensitive);
            }
            
            // Apply default search terms if available
            if (userSettings.default_search_terms && userSettings.default_search_terms.length > 0) {
                // If there are no active queries, use the first default term for the search input
                if (activeQueries.length === 0) {
                    console.log('[SearchSidebar] Applying default search term to input:', userSettings.default_search_terms[0]);
                    setTempSearchTerm(userSettings.default_search_terms[0]);
                }
                
                // Save the default terms for later use (e.g., with toolbar button)
                window.defaultSearchTerms = userSettings.default_search_terms;
                
                // Calculate terms that aren't currently active
                const activeTerms = new Set(activeQueries.map(q => q.term));
                const defaultTermsNotSearched = userSettings.default_search_terms.filter(term => !activeTerms.has(term));
                console.log('[SearchSidebar] Default terms not searched:', defaultTermsNotSearched);
            }
        }
    }, [userSettings, userSettingsLoading, activeQueries.length]);
    
    // Add a special method to load and apply all default search terms
    const applyAllDefaultSearchTerms = useCallback(async () => {
        if (userSettings?.default_search_terms && userSettings.default_search_terms.length > 0) {
            console.log('[SearchSidebar] Applying all default search terms');
            
            // Get currently active terms
            const activeTerms = new Set(activeQueries.map(q => q.term));
            
            // Get terms that aren't already active
            const termsToAdd = userSettings.default_search_terms.filter(term => !activeTerms.has(term));
            
            if (termsToAdd.length === 0) {
                console.log('[SearchSidebar] All default terms are already active');
                setLocalSearchError('All default search terms are already active');
                return;
            }
            
            // Apply each default term that isn't already active
            let addedCount = 0;
            
            for (const term of termsToAdd) {
                if (!term.trim()) continue;
                
                try {
                    const filesToSearch = getFilesToProcess();
                    if (filesToSearch.length === 0) {
                        setLocalSearchError('No files selected for search');
                        return;
                    }
                    
                    // Search with the current term using appropriate settings
                    console.log(`[SearchSidebar] Adding default search term: "${term}"`);                    
                    await batchSearch(
                        filesToSearch,
                        term,
                        {
                            isCaseSensitive: userSettings.is_case_sensitive || false,
                            isAiSearch: userSettings.is_ai_search || false
                        }
                    );
                    
                    addedCount++;
                } catch (err) {
                    console.error(`[SearchSidebar] Error adding default term "${term}":`, err);
                }
            }
            
            if (addedCount > 0) {
                setSuccessMessage(`Added ${addedCount} default search ${addedCount === 1 ? 'term' : 'terms'}`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } else {
            setLocalSearchError('No default search terms available');
        }
    }, [userSettings, activeQueries, batchSearch, getFilesToProcess]);

    // Create a function to focus the search input
    const focusSearchInput = useCallback(() => {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
            if (searchInputRef.current) {
                searchInputRef.current.focus();
            }
        }, 50);
    }, []);

    // Use Intersection Observer to detect when the search sidebar becomes visible
    useEffect(() => {
        // Create a reference to the container element
        const searchSidebarRef = document.querySelector('.search-sidebar');
        if (!searchSidebarRef) return;

        // Create an observer that will monitor the visibility of the search sidebar
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // When the search sidebar becomes visible
                if (entry.isIntersecting) {
                    focusSearchInput();
                }
            });
        }, { threshold: 0.1 }); // Trigger when at least 10% of the element is visible

        // Start observing the search sidebar
        observer.observe(searchSidebarRef);

        // Cleanup function
        return () => {
            observer.disconnect();
        };
    }, [focusSearchInput]);

    // Also focus on initial mount
    useEffect(() => {
        focusSearchInput();
    }, [focusSearchInput]);
    
    // Handle search term removal



    // Listen for explicit focus requests and search execution (e.g., from toolbar button)
    useEffect(() => {
        // Handle focus requests
        const handleFocusRequest = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { source } = customEvent.detail || {};
            
            console.log(`[SearchSidebar] Received focus request from ${source}`);
            focusSearchInput();
        };
        
        // Handle search execution requests
        const handleSearchRequest = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { source, applyDefaultTerms } = customEvent.detail || {};
            
            console.log(`[SearchSidebar] Received search request from ${source}`);
            
            if (applyDefaultTerms) {
                // Apply all default search terms
                console.log('[SearchSidebar] Applying all default search terms on request');
                applyAllDefaultSearchTerms();
            } else if (tempSearchTerm.trim()) {
                // Execute the current search term if one is available
                console.log(`[SearchSidebar] Executing current search with term: "${tempSearchTerm}"`);
                addSearchTerm();
            } else {
                console.log('[SearchSidebar] No search term to execute');
                focusSearchInput();
            }
        };
        
        // Register event listeners
        window.addEventListener('focus-search-input', handleFocusRequest);
        window.addEventListener('execute-search', handleSearchRequest);
        
        return () => {
            window.removeEventListener('focus-search-input', handleFocusRequest);
            window.removeEventListener('execute-search', handleSearchRequest);
        };
    }, [focusSearchInput, tempSearchTerm, addSearchTerm, applyAllDefaultSearchTerms]);
    
    // Define a global helper for the search-related functionality
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.executeSearchWithDefaultTerms = () => {
                applyAllDefaultSearchTerms();
            };
        }
        
        return () => {
            if (typeof window !== 'undefined') {
                delete window.executeSearchWithDefaultTerms;
            }
        };
    }, [applyAllDefaultSearchTerms]);

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
    
    // Listen for settings changes from user preferences
    useEffect(() => {
        const handleSettingsChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { type, settings } = customEvent.detail || {};
            
            // Only apply search settings
            if (type === 'search' && settings) {
                // Apply appropriate settings
                if (settings.isAiSearch !== undefined) {
                    setIsAiSearch(settings.isAiSearch);
                }
                
                if (settings.isCaseSensitive !== undefined) {
                    setIsCaseSensitive(settings.isCaseSensitive);
                }
                
                if (settings.defaultSearchTerms && settings.defaultSearchTerms.length > 0) {
                    // Apply default search terms (if not already searched)
                    if (activeQueries.length === 0) {
                        // Set as temp search term instead of immediately searching
                        setTempSearchTerm(settings.defaultSearchTerms[0]);
                    }
                }
            }
        };
        
        window.addEventListener('settings-changed', handleSettingsChange);
        
        return () => {
            window.removeEventListener('settings-changed', handleSettingsChange);
        };
    }, [activeQueries.length]);

    // Combined loading state
    const isSearching = isContextSearching || isApiLoading;
    const searchProgress = apiProgress;






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
            // Always align to top for consistency
            alignToTop: true,
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
        // Refocus search input after changing scope
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 0);
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
    const handleSaveToSettings = async () => {
        try {
            // Clear any existing messages
            setLocalSearchError(null);
            setSuccessMessage(null);
            
            if (!userSettings) {
                setLocalSearchError("Cannot save search term - settings not loaded.");
                setContextMenuVisible(false);
                return;
            }
            
            console.log(`[SearchSidebar] Saving search term "${contextMenuSearchTerm}" to default search terms`);
            
            // Also save current search options (AI search, case sensitivity)
            const currentQuery = activeQueries.find(q => q.term === contextMenuSearchTerm);
            const isAiSearchForTerm = currentQuery?.isAiSearch || isAiSearch;
            const isCaseSensitiveForTerm = currentQuery?.caseSensitive || isCaseSensitive;
            
            // Create new array with the current search term added
            const searchTerms = userSettings.default_search_terms || [];
            
            // Check if this term already exists
            if (!searchTerms.includes(contextMenuSearchTerm)) {
                // Add the term to the beginning of the array (highest priority)
                const updatedSearchTerms = [contextMenuSearchTerm, ...searchTerms];
                
                // Limit to a reasonable number of default terms (e.g., 5)
                const limitedTerms = updatedSearchTerms.slice(0, 5);
                
                console.log(`[SearchSidebar] Updating settings with new search terms`, limitedTerms);
                
                // Update user settings with term and options
                await updateSettings({
                    default_search_terms: limitedTerms,
                    is_ai_search: isAiSearchForTerm,
                    is_case_sensitive: isCaseSensitiveForTerm
                });
                
                // Dispatch an event to notify other components about the settings change
                const event = new CustomEvent('settings-changed', {
                    detail: {
                        type: 'search',
                        settings: {
                            defaultSearchTerms: limitedTerms,
                            isAiSearch: isAiSearchForTerm,
                            isCaseSensitive: isCaseSensitiveForTerm
                        }
                    }
                });
                window.dispatchEvent(event);
                
                // Show success message
                setSuccessMessage(`"${contextMenuSearchTerm}" saved as default search term with current options.`);
                
                // Auto-hide success message after 3 seconds
                setTimeout(() => {
                    setSuccessMessage(null);
                }, 3000);
                
                console.log(`[SearchSidebar] Search term saved to settings successfully with options: AI=${isAiSearchForTerm}, Case=${isCaseSensitiveForTerm}`);
            } else {
                // If term exists, update its options
                await updateSettings({
                    is_ai_search: isAiSearchForTerm,
                    is_case_sensitive: isCaseSensitiveForTerm
                });
                
                // Dispatch event for option changes
                const event = new CustomEvent('settings-changed', {
                    detail: {
                        type: 'search',
                        settings: {
                            isAiSearch: isAiSearchForTerm,
                            isCaseSensitive: isCaseSensitiveForTerm
                        }
                    }
                });
                window.dispatchEvent(event);
                
                // Term already exists
                setSuccessMessage(`"${contextMenuSearchTerm}" options updated in search settings.`);
                
                // Auto-hide success message after 3 seconds
                setTimeout(() => {
                    setSuccessMessage(null);
                }, 3000);
                
                console.log(`[SearchSidebar] Search term options updated in settings`);
            }
        } catch (error) {
            console.error(`[SearchSidebar] Error saving search term to settings:`, error);
            setLocalSearchError("Failed to save search term to settings.");
            
            // Auto-hide error message after 5 seconds
            setTimeout(() => {
                setLocalSearchError(null);
            }, 5000);
        } finally {
            setContextMenuVisible(false);
            // Return focus to search input after closing context menu
            searchInputRef.current?.focus();
        }
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
                                ref={searchInputRef}
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
                                    checked={isAiSearch}
                                    onChange={() => setIsAiSearch(!isAiSearch)}
                                    disabled={isSearching}
                                />
                                <span className="checkmark"></span>
                                Ai search
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
                                                {query.isAiSearch && <span className="search-term-option">.*</span>}
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
                
                {successMessage && (
                    <div className="sidebar-section success-section">
                        <div className="success-message">
                            <CheckCircle size={18} className="success-icon" />
                            {successMessage}
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
                        title="Add this term to your default search terms"
                    >
                        <Save size={14} />
                        <span>Save as Default Term</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default SearchSidebar;
