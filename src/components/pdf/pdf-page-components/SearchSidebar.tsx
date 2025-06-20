import LoadingWrapper from "../../common/LoadingWrapper";
import {useHighlightStore} from '../../../contexts/HighlightStoreContext';
import {useFileSummary} from '../../../contexts/FileSummaryContext';
import Tooltip from '../../common/Tooltip';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useFileContext} from '../../../contexts/FileContext';
import {getFileKey} from '../../../contexts/PDFViewerContext';
import {useBatchSearch} from '../../../contexts/SearchContext';
import {AlertTriangle, CheckCircle, ChevronDown, ChevronRight, ChevronUp, Save, Search, XCircle} from 'lucide-react';
import {usePDFNavigation} from '../../../hooks/general/usePDFNavigation';
import useSearchPatterns from "../../../hooks/settings/useSearchPatterns";
import {HighlightRect, HighlightType} from "../../../types";
import {useNotification} from '../../../contexts/NotificationContext';
import {useEditContext} from "../../../contexts/EditContext";
import {useLanguage} from '../../../contexts/LanguageContext';

declare global {
    interface Window {
        defaultSearchTerms?: string[];
        executeSearchWithDefaultTerms?: () => void;
    }
}

/**
 * SearchSidebar component
 *
 * Provides UI for searching through PDF files
 * with improved navigation to search results
 */
const SearchSidebar: React.FC = () => {
    const {currentFile, selectedFiles, files, openFile} = useFileContext();
    const {notify} = useNotification();
    const { getHighlightsForPage, getHighlightsByType } = useHighlightStore();
    // Use our improved navigation hook
    const pdfNavigation = usePDFNavigation('search-sidebar');

    // Use the FileSummaryContext instead of local state
    const {
        searchFileSummaries,
        searchedFilesCount,
        expandedSearchSummaries,
        toggleSearchSummaryExpansion,
        updateSearchFileSummary,
        removeSearchFileSummary
    } = useFileSummary();

    const {
        searchPatterns, isLoading: userDataLoading, createSearchPattern, getSearchPatterns
    } = useSearchPatterns();

    const {
        isSearching: isContextSearching,
        searchError: contextSearchError,
        activeQueries,
        batchSearch,
        clearSearch,
        clearAllSearches,
        getSearchResultsStats
    } = useBatchSearch();
    const { setSelectedHighlightIds, setSelectedHighlightId} = useEditContext();

    const { t } = useLanguage();

    // Component state
    const [tempSearchTerm, setTempSearchTerm] = useState('');
    const [searchScope, setSearchScope] = useState<'current' | 'selected' | 'all'>(selectedFiles.length > 0 ? 'selected' : 'all');
    const [isAiSearch, setIsAiSearch] = useState(false);
    const [isCaseSensitive, setIsCaseSensitive] = useState(false);
    const [localSearchError, setLocalSearchError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0});
    const [contextMenuSearchTerm, setContextMenuSearchTerm] = useState('');
    const initialPatternFetchAttemptedRef = useRef(false);

    // Add ref for the context menu
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Add ref for the search input field
    const searchInputRef = useRef<HTMLTextAreaElement | null>(null);

    // Get current search statistics
    const searchStats = getSearchResultsStats();

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addSearchTerm().then(() => {
        });
    };

    // Get files to process based on selected scope
    const getFilesToProcess = useCallback((): File[] => {
        if (searchScope === 'current' && currentFile) {
            return [currentFile];
        } else if (searchScope === 'selected' || selectedFiles.length > 0) {
            return selectedFiles;
        } else if (searchScope === 'all') {
            return files;
        }
        return [];
    }, [searchScope, currentFile, selectedFiles, files]);

    // Add a search term
    const addSearchTerm = useCallback(async () => {
        if (!tempSearchTerm.trim()) return;

        const filesToSearch = getFilesToProcess();
        if (filesToSearch.length === 0) {
            setLocalSearchError(t('pdf', 'no_files_selected_for_search'));
            return;
        }

        setLocalSearchError(null);

        try {
            // Store the search term before clearing the input field
            const searchTermToUse = tempSearchTerm.trim();

            // Clear input field early to prevent state issues
            setTempSearchTerm('');

            // Check if this term is already in the active queries to avoid duplicates
            const isExistingTerm = activeQueries.some(query => query.term === searchTermToUse && query.caseSensitive === isCaseSensitive && query.isAiSearch === isAiSearch);

            if (isExistingTerm) {
                setLocalSearchError(t('pdf', 'searchTermAlreadyExists').replace('{term}', searchTermToUse));
                // Keep focus on search input even when showing error
                searchInputRef.current?.focus();
                return;
            }

            await batchSearch(filesToSearch, searchTermToUse, {
                isCaseSensitive: isCaseSensitive, isAiSearch: isAiSearch
            });

            // We'll expand file summaries after a short delay to ensure the search results are processed
            setTimeout(() => {
                // Get fresh stats after search has completed
                const currentStats = getSearchResultsStats();

                // Update file summaries based on search results
                currentStats.fileMatches.forEach((matchCount, fileKey) => {
                    // Create or update file summary
                    const file = files.find(f => getFileKey(f) === fileKey);
                    if (file) {
                        // Get page matches
                        const pageMatches = currentStats.pageMatches.get(fileKey) || new Map();

                        const summary = {
                            fileKey,
                            fileName: file.name,
                            matchCount,
                            pageMatches: Object.fromEntries(pageMatches)
                        };

                        // Update file summary using context
                        updateSearchFileSummary(summary);
                    }
                });

                // Refocus the search input after search completed
                searchInputRef.current?.focus();

                // Dispatch search completion event for toolbar
                window.dispatchEvent(new CustomEvent('search-completed', {
                    detail: {
                        success: true,
                        source: 'search-sidebar',
                        searchTerm: searchTermToUse,
                        totalMatches: currentStats.totalMatches
                    }
                }));
            }, 100);
        } catch (error: any) {
            setLocalSearchError(error.message ?? t('pdf', 'errorPerformingSearch'));
            // Refocus input even when there's an error
            searchInputRef.current?.focus();

            // Dispatch search completion event even on error
            window.dispatchEvent(new CustomEvent('search-completed', {
                detail: {
                    success: false,
                    source: 'search-sidebar',
                    error: error.message ?? t('pdf', 'errorPerformingSearch')
                }
            }));
        }
    }, [tempSearchTerm, getFilesToProcess, batchSearch, isCaseSensitive, isAiSearch, getSearchResultsStats, activeQueries, files, updateSearchFileSummary]);

    // Remove search term with cleanup
    const removeSearchTerm = (term: string) => {
        // First, call the existing clearSearch method from BatchSearchContext
        clearSearch(term);

        // After a short delay to allow BatchSearchContext to update
        setTimeout(() => {
            // Refocus the search input
            searchInputRef.current?.focus();

            // Get fresh search statistics after term removal
            const currentStats = getSearchResultsStats();

            // Update file summaries based on current search results
            searchFileSummaries.forEach(summary => {
                const fileKey = summary.fileKey;
                const fileName = summary.fileName;

                // Check if this file still has matches
                const matchCount = currentStats.fileMatches.get(fileKey) ?? 0;

                if (matchCount > 0) {
                    // File still has matches, update the summary
                    const pageMatches = currentStats.pageMatches.get(fileKey) || new Map();

                    updateSearchFileSummary({
                        fileKey, fileName, matchCount, pageMatches: Object.fromEntries(pageMatches)
                    });
                } else {
                    // No matches left, remove the summary
                    removeSearchFileSummary(fileKey);
                }
            });

            // Remove highlights for this term from all files
            files.forEach(file => {
                const fileKey = getFileKey(file);
                const searchHighlights = getHighlightsByType(fileKey, HighlightType.SEARCH);
                const termHighlights = searchHighlights.filter(h => h.text === term);
                if (termHighlights.length > 0) {
                    // Additional cleanup if needed
                }
            });

            // Notify AutoProcessManager about updated search queries after removal
            const updatedQueries = activeQueries
                .filter(query => query.term !== term)
                .map(query => ({
                    term: query.term,
                    case_sensitive: query.caseSensitive,
                    ai_search: query.isAiSearch
                }));

            window.dispatchEvent(new CustomEvent('search-settings-updated', {
                detail: {
                    settings: {
                        searchQueries: updatedQueries
                    }
                }
            }));
        }, 50); // Short delay to ensure BatchSearchContext has updated
    };

    // Add a special method to load and apply all default search terms
    const applyAllDefaultSearchTerms = useCallback(async () => {
        if (searchPatterns && searchPatterns.length > 0) {

            // Get currently active terms
            const activeTerms = new Set(activeQueries.map(q => q.term));

            // Get patterns that aren't already active
            const patternsToAdd = searchPatterns.filter(pattern => !activeTerms.has(pattern.pattern_text));

            if (patternsToAdd.length === 0) {
                notify({
                    message: t('pdf', 'allDefaultTermsActive'),
                    type: 'info'
                });
                return;
            }

            // Apply each default pattern that isn't already active
            let addedCount = 0;

            for (const pattern of patternsToAdd) {
                if (!pattern.pattern_text.trim()) continue;

                try {
                    const filesToSearch = getFilesToProcess();
                    if (filesToSearch.length === 0) {
                        setLocalSearchError(t('pdf', 'no_files_selected_for_search'));
                        return;
                    }

                    // Search with the current pattern using appropriate settings
                    await batchSearch(filesToSearch, pattern.pattern_text, {
                        isCaseSensitive: pattern.pattern_type === 'case_sensitive',
                        isAiSearch: pattern.pattern_type === 'ai_search'
                    });

                    addedCount++;
                } catch (err) {
                    console.error(`[SearchSidebar] Error adding default term "${pattern.pattern_text}":`, err);
                }
            }

            if (addedCount > 0) {
                notify({
                    message: t('pdf', 'addedDefaultTerms').replace('{count}', String(addedCount)),
                    type: 'success'
                });

                // Update search summaries after a delay to allow search to complete
                setTimeout(() => {
                    // Get fresh stats after search has completed
                    const currentStats = getSearchResultsStats();

                    // Update file summaries based on search results
                    currentStats.fileMatches.forEach((matchCount, fileKey) => {
                        // Create or update file summary
                        const file = files.find(f => getFileKey(f) === fileKey);
                        if (file) {
                            // Get page matches
                            const pageMatches = currentStats.pageMatches.get(fileKey) || new Map();

                            const summary = {
                                fileKey, fileName: file.name, matchCount, pageMatches: Object.fromEntries(pageMatches)
                            };

                            // Update file summary
                            updateSearchFileSummary(summary);
                        }
                    });

                    // Notify AutoProcessManager about updated search queries
                    const updatedQueries = activeQueries.map(query => ({
                        term: query.term,
                        case_sensitive: query.caseSensitive,
                        ai_search: query.isAiSearch
                    }));

                    window.dispatchEvent(new CustomEvent('search-settings-updated', {
                        detail: {
                            settings: {
                                searchQueries: updatedQueries
                            }
                        }
                    }));

                    // Dispatch search completion event for toolbar
                    window.dispatchEvent(new CustomEvent('search-completed', {
                        detail: {
                            success: true,
                            source: 'search-sidebar',
                            addedTerms: addedCount,
                            totalMatches: currentStats.totalMatches
                        }
                    }));
                }, 300);
            } else {
                // Still dispatch completion event even if no terms were added
                window.dispatchEvent(new CustomEvent('search-completed', {
                    detail: {
                        success: true,
                        source: 'search-sidebar',
                        addedTerms: 0,
                        message: 'All default terms already active'
                    }
                }));
            }
        } else {
            notify({
                message: t('pdf', 'noDefaultTermsFound'),
                type: 'warning'
            });
        }
    }, [searchPatterns, activeQueries, batchSearch, getFilesToProcess, getSearchResultsStats, files, updateSearchFileSummary, notify, t]);


    // Create a function to focus the search input
    const focusSearchInput = useCallback(() => {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
            if (searchInputRef.current) {
                searchInputRef.current.focus();
            }
        }, 50);
    }, []);

    // Auto-resize function for textarea
    const autoResizeTextarea = useCallback(() => {
        if (searchInputRef.current) {
            searchInputRef.current.style.height = 'auto';
            searchInputRef.current.style.height = `${Math.min(searchInputRef.current.scrollHeight, 120)}px`;
        }
    }, []);

    // Auto-resize when search term changes
    useEffect(() => {
        autoResizeTextarea();
    }, [tempSearchTerm, autoResizeTextarea]);

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            addSearchTerm().then(() => {
            });
        }
        // Allow Shift+Enter for new lines
    };
    useEffect(() => {
        focusSearchInput();
    }, [focusSearchInput]);

    // Listen for explicit focus requests and search execution (e.g., from toolbar button)
    useEffect(() => {
        // Handle focus requests
        const handleFocusRequest = (event: Event) => {
            const customEvent = event as CustomEvent;
            const {source} = customEvent.detail || {};

            focusSearchInput();
        };

        // Handle search execution requests
        const handleSearchRequest = (event: Event) => {
            const customEvent = event as CustomEvent;
            const {source, applyDefaultTerms} = customEvent.detail || {};

            console.log('[SearchSidebar] Search process trigger received:', {source, applyDefaultTerms});
            console.log('[SearchSidebar] Available functions:', {
                applyAllDefaultSearchTerms: typeof applyAllDefaultSearchTerms,
                addSearchTerm: typeof addSearchTerm,
                tempSearchTerm: tempSearchTerm
            });

            try {
                if (applyDefaultTerms) {
                    // Apply all default search terms
                    console.log('[SearchSidebar] Applying all default search terms');
                    applyAllDefaultSearchTerms();
                } else if (tempSearchTerm.trim()) {
                    // Execute the current search term if one is available
                    console.log('[SearchSidebar] Adding current search term:', tempSearchTerm);
                    addSearchTerm();
                } else {
                    console.log('[SearchSidebar] No search term to execute, focusing input');
                    focusSearchInput();
                }
            } catch (error) {
                console.error('[SearchSidebar] Error handling search request:', error);
            }
        };

        console.log('[SearchSidebar] Setting up event listeners for focus-search-input and execute-search');
        
        // Register event listeners
        window.addEventListener('focus-search-input', handleFocusRequest);
        window.addEventListener('execute-search', handleSearchRequest);

        return () => {
            console.log('[SearchSidebar] Removing event listeners for focus-search-input and execute-search');
            window.removeEventListener('focus-search-input', handleFocusRequest);
            window.removeEventListener('execute-search', handleSearchRequest);
        };
    }, [focusSearchInput, tempSearchTerm, addSearchTerm, applyAllDefaultSearchTerms]);

    // Load search patterns on init
    useEffect(() => {
        // Only run this effect once when the component mounts
        if (!userDataLoading && !initialPatternFetchAttemptedRef.current) {
            initialPatternFetchAttemptedRef.current = true;
            getSearchPatterns();
        }
    }, [userDataLoading, getSearchPatterns]);

    // Handle search term right-click context menu
    const handleSearchTermRightClick = (e: React.MouseEvent, term: string) => {
        e.preventDefault();

        // Position the context menu
        setContextMenuPosition({x: e.clientX, y: e.clientY});
        setContextMenuSearchTerm(term);
        setContextMenuVisible(true);
    };

    // Handle save to settings from context menu
    const handleSaveToSettings = async () => {
        try {
            // Also save current search options (AI search, case sensitivity)
            const currentQuery = activeQueries.find(q => q.term === contextMenuSearchTerm);
            const isAiSearchForTerm = currentQuery?.isAiSearch || isAiSearch;
            const isCaseSensitiveForTerm = currentQuery?.caseSensitive || isCaseSensitive;

            // Determine pattern type based on current options
            let patternType = 'normal';
            if (isAiSearchForTerm) patternType = 'ai_search'; else if (isCaseSensitiveForTerm) patternType = 'case_sensitive';

            // Check if this term already exists in saved patterns
            const existingPattern = searchPatterns.find(p => p.pattern_text === contextMenuSearchTerm);

            if (!existingPattern) {
                // Create a new pattern with the current search term
                await createSearchPattern({
                    pattern_text: contextMenuSearchTerm, pattern_type: patternType
                });

                // Show success message
                setSuccessMessage(`"${contextMenuSearchTerm}" saved as a search pattern`);
                notify({
                    message: t('pdf', 'searchTermSaved').replace('{term}', contextMenuSearchTerm).replace('{type}', patternType),
                    type: 'success'
                });
            } else {
                // Pattern already exists
                setSuccessMessage(t('pdf', 'patternAlreadyExists').replace('{term}', contextMenuSearchTerm));
                notify({
                    message: t('pdf', 'patternAlreadyExists').replace('{term}', contextMenuSearchTerm),
                    type: 'info'
                });
            }

            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (error) {
            notify({
                message: t('pdf', 'failedToSavePattern'),
                type: 'error'
            });

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

    // Focus the search input when sidebar becomes visible
    useEffect(() => {
        // Create a reference to the container element
        const searchSidebarRef = document.querySelector('.search-sidebar');
        if (!searchSidebarRef) return;

        // Create an observer that will monitor the visibility of the search sidebar
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // When the search sidebar becomes visible
                if (entry.isIntersecting && searchInputRef.current) {
                    searchInputRef.current.focus();
                }
            });
        }, {threshold: 0.1}); // Trigger when at least 10% of the element is visible

        // Start observing the search sidebar
        observer.observe(searchSidebarRef);

        // Cleanup function
        return () => {
            observer.disconnect();
        };
    }, []);

    // Set error from API if available
    useEffect(() => {
        if (contextSearchError) {
            setLocalSearchError(contextSearchError);
        } else {
            setLocalSearchError(null);
        }
    }, [contextSearchError]);

    // Listen for settings changes from user preferences
    useEffect(() => {
        const handleSettingsChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            const {type, settings} = customEvent.detail ?? {};

            // Only apply search settings
            if (type === 'search' && settings) {
                // Apply appropriate settings
                if (settings.isAiSearch !== undefined) {
                    setIsAiSearch(settings.isAiSearch);
                }

                if (settings.isCaseSensitive !== undefined) {
                    setIsCaseSensitive(settings.isCaseSensitive);
                }

                // Re-fetch search patterns when settings change
                getSearchPatterns();
            }
        };

        window.addEventListener('settings-changed', handleSettingsChange);

        return () => {
            window.removeEventListener('settings-changed', handleSettingsChange);
        };
    }, [getSearchPatterns]);

    // Combined loading state
    const isSearching = isContextSearching;

    // Simple navigation to a page with our improved navigation system
    const navigateToPage = useCallback((fileKey: string, pageNumber: number) => {
        // Find the file by key
        const file = files.find(f => getFileKey(f) === fileKey);
        if (!file) return;

        // Use our improved navigation hook to navigate
        pdfNavigation.navigateToPage(pageNumber, fileKey, {
            // Use smooth scrolling for better user experience
            behavior: 'smooth', // Always align to top for better visibility of search results
            alignToTop: true, // Always highlight the thumbnail
            highlightThumbnail: true
        });
    }, [pdfNavigation, files]);


    const [resultNavigation, setResultNavigation] = useState<{
        results: { fileKey: string; page: number; count: number }[]; currentIndex: number;
    }>({
        results: [], currentIndex: -1
    });


    const navigateToSearchResult = useCallback((direction: 'next' | 'prev') => {
        const {results, currentIndex} = resultNavigation;

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
            ...prev, currentIndex: newIndex
        }));

        if (!target) {
            return;
        }

        // Use our improved navigation mechanism
        navigateToPage(target.fileKey, target.page);
        const highlights = getHighlightsForPage(target.fileKey, target.page);
        // Filter to only get search highlights and set both selection states
        const searchHighlights = highlights.filter(h => h.type === 'SEARCH');
        if (searchHighlights.length > 0) {
            setSelectedHighlightIds(searchHighlights.map(h => h.id));
            // Set the first highlight as the selected one
            setSelectedHighlightId(searchHighlights[0].id);
        }
    }, [resultNavigation, navigateToPage, setSelectedHighlightIds, setSelectedHighlightId]);


    const calculateOverallResultIndex = useCallback(() => {
        if (resultNavigation.currentIndex === -1 || resultNavigation.results.length === 0) {
            return 0;
        }

        const {results, currentIndex} = resultNavigation;

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
    }, [resultNavigation]);

    // Update navigation results when search results change - use a ref to prevent infinite loop
    const prevSearchStatsRef = useRef<any>(null);

    useEffect(() => {
        // Create a stable representation of the search stats for comparison
        const statsSignature = JSON.stringify({
            totalMatches: searchStats.totalMatches, fileCount: searchStats.fileMatches.size
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
                flatResults.push({fileKey, page, count});
            });
        });

        // Sort by file key and then by page number
        flatResults.sort((a, b) => {
            if (a.fileKey !== b.fileKey) return a.fileKey.localeCompare(b.fileKey);
            return a.page - b.page;
        });

        setResultNavigation({
            results: flatResults, currentIndex: flatResults.length > 0 ? 0 : -1
        });
    }, [searchStats.totalMatches, activeQueries.length, isSearching]);

    // Handle scope change
    const handleChangeSearchScope = (scope: 'current' | 'selected' | 'all') => {
        if (scope === searchScope) return;
        setSearchScope(scope);
        // Refocus search input after changing scope
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 0);
    };

    // Listen for page navigation and select highlights
    useEffect(() => {
        const handlePageNavigation = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, page } = customEvent.detail ?? {};

            if (fileKey && page !== undefined) {
                // Get search highlights for this page
                const searchHighlights = getHighlightsByType(fileKey, HighlightType.SEARCH)
                    .filter(h => h.page === page);

                if (searchHighlights.length > 0) {
                    setSelectedHighlightIds(searchHighlights.map(h => h.id));
                    setSelectedHighlightId(searchHighlights[0].id);
                }
            }
        };

        window.addEventListener('page-navigated', handlePageNavigation);

        return () => {
            window.removeEventListener('page-navigated', handlePageNavigation);
        };
    }, [getHighlightsByType, setSelectedHighlightId, setSelectedHighlightIds]);

    useEffect(() => {
        const handlePageNavigated = (event: CustomEvent) => {
            const { page } = event.detail;
            // Get highlights for the current page
            const pageHighlights = getHighlightsByType('search', page);
            if (pageHighlights && pageHighlights.length > 0) {
                // Select the first highlight on the page
                const firstHighlight = pageHighlights[0];
                if (firstHighlight) {
                    window.dispatchEvent(new CustomEvent('highlight-selected', {
                        detail: {
                            highlightId: firstHighlight.id,
                            source: 'search-sidebar'
                        }
                    }));
                }
            }
        };

        window.addEventListener('page-navigated', handlePageNavigated as EventListener);
        return () => {
            window.removeEventListener('page-navigated', handlePageNavigated as EventListener);
        };
    }, [getHighlightsByType]);

    return (<div className="search-sidebar">
            <div className="sidebar-header search-header">
                <h3>{t('pdf', 'search')}</h3>
                {searchedFilesCount > 0 && (
                    <div className="entity-badge">
                        {t('pdf', 'filesSearched').replace('{count}', String(searchedFilesCount))}
                    </div>
                )}
            </div>

            <div className="sidebar-content">
                <div className="sidebar-section">
                    <form onSubmit={handleSearchSubmit} className="search-form">
                        <div className="search-input-wrapper">
                            <textarea
                                value={tempSearchTerm}
                                onChange={(e) => {
                                    setTempSearchTerm(e.target.value);
                                    // Auto-resize the textarea
                                    autoResizeTextarea();
                                }}
                                onKeyDown={handleSearchKeyDown}
                                placeholder={t('pdf', 'searchTermPlaceholder')}
                                className="search-input"
                                disabled={isSearching}
                                ref={searchInputRef}
                                rows={1}
                                style={{resize: 'none', overflow: 'hidden'}}
                            />
                            <button
                                type="submit"
                                className="search-button"
                                disabled={!tempSearchTerm.trim() || isSearching}
                            >
                                <Search size={18}/>
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
                                {t('pdf', 'aiSearch')}
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={isCaseSensitive}
                                    onChange={() => setIsCaseSensitive(!isCaseSensitive)}
                                    disabled={isSearching}
                                />
                                <span className="checkmark"></span>
                                {t('pdf', 'caseSensitive')}
                            </label>
                        </div>
                    </form>
                </div>

                <div className="sidebar-section scope-section">
                    <h4>{t('pdf', 'searchScope')}</h4>
                    <div className="scope-buttons">
                        <button
                            className={`scope-button ${searchScope === 'current' ? 'active' : ''}`}
                            onClick={() => handleChangeSearchScope('current')}
                            disabled={!currentFile || isSearching}
                            title={t('pdf', 'searchCurrentFileOnly')}
                        >
                            {t('pdf', 'currentFile')}
                        </button>
                        <button
                            className={`scope-button ${searchScope === 'selected' ? 'active' : ''}`}
                            onClick={() => handleChangeSearchScope('selected')}
                            disabled={selectedFiles.length === 0 || isSearching}
                            title={t('pdf', 'searchSelectedFiles').replace('{count}', String(selectedFiles.length))}
                        >
                            {t('pdf', 'selectedFiles').replace('{count}', String(selectedFiles.length))}
                        </button>
                        <button
                            className={`scope-button ${searchScope === 'all' ? 'active' : ''}`}
                            onClick={() => handleChangeSearchScope('all')}
                            disabled={isSearching}
                            title={t('pdf', 'searchAllFiles').replace('{count}', String(files.length))}
                        >
                            {t('pdf', 'allFiles').replace('{count}', String(files.length))}
                        </button>
                    </div>
                </div>

                <div className="sidebar-section">
                    <div className="search-terms-header">
                        <h4>{t('pdf', 'searchTerms')}</h4>
                        {activeQueries.length > 0 && (<button
                                className="clear-all-button"
                                onClick={() => clearAllSearches()}
                                disabled={isSearching}
                            >
                                {t('pdf', 'clearAll')}
                            </button>)}
                    </div>
                    <div className="search-terms-list">
                        {activeQueries.length === 0 ? (<div className="no-search-terms">{t('pdf', 'noSearchTerms')}</div>) : (
                            <div className="search-term-items">
                                {activeQueries.map((query) => (<div
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
                                            title={t('pdf', 'removeSearchTerm')}
                                            disabled={isSearching}
                                        >
                                            <XCircle size={16}/>
                                        </button>
                                    </div>))}
                            </div>)}
                    </div>
                </div>

                {localSearchError && (<div className="sidebar-section error-section">
                        <div className="error-message">
                            <AlertTriangle size={18} className="error-icon"/>
                            {localSearchError}
                        </div>
                    </div>)}

                {successMessage && (<div className="sidebar-section success-section">
                        <div className="success-message">
                            <CheckCircle size={18} className="success-icon"/>
                            {successMessage}
                        </div>
                    </div>)}


                {isSearching && (
                    <LoadingWrapper isLoading={isSearching} overlay={true} fallback={t('pdf', 'searching')}>
                        <div className="sidebar-section">
                            <div className="progress-container">
                                <div className="progress-label">{t('pdf', 'searching')}</div>
                            </div>
                        </div>
                    </LoadingWrapper>
                )}

                <div className="sidebar-section">
                    <div className="search-results-header">
                        <h4>{t('pdf', 'results')}</h4>
                        <div className="search-navigation">
                            <button
                                className="nav-button"
                                onClick={() => navigateToSearchResult('prev')}
                                disabled={searchStats.totalMatches === 0 || isSearching}
                                title={t('pdf', 'previousResult')}
                            >
                                <ChevronUp size={16}/>
                            </button>
                            <button
                                className="nav-button"
                                onClick={() => navigateToSearchResult('next')}
                                disabled={searchStats.totalMatches === 0 || isSearching}
                                title={t('pdf', 'nextResult')}
                            >
                                <ChevronDown size={16}/>
                            </button>
                        </div>
                    </div>

                    {searchStats.totalMatches > 0 && (<div className="results-count">
                            {isSearching ? t('pdf', 'searching') : `${calculateOverallResultIndex()} ${t('pdf', 'of')} ${searchStats.totalMatches} ${t('pdf', 'matches')}`}
                        </div>)}

                    <div className="search-results-list">
                        {searchStats.totalMatches === 0 && searchFileSummaries.length === 0 ? (
                            <div className="no-results">{t('pdf', 'noResultsFound')}</div>) : (
                            searchFileSummaries.map(summary => {
                                const fileKey = summary.fileKey;
                                const fileName = summary.fileName;
                                const matchCount = summary.matchCount;
                                const pageMatches = typeof summary.pageMatches === 'object' ? new Map(Object.entries(summary.pageMatches).map(([k, v]) => [parseInt(k), v])) : new Map();
                                const isExpanded = expandedSearchSummaries.has(fileKey);

                                return (<div className="file-summary-card" key={fileKey}>
                                        <div
                                            className="file-summary-header"
                                            onClick={() => toggleSearchSummaryExpansion(fileKey)}
                                        >
                                            <div className="file-summary-title">
                                                <Tooltip content={fileName}>
                                                    <span className="file-name">{fileName}</span>
                                                </Tooltip>
                                                <span className="result-count-badge">
                                                    {matchCount} {t('pdf', 'matches')}
                                                </span>
                                            </div>
                                            <div className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                                                {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                            </div>
                                        </div>

                                        {isExpanded && (<div className="file-summary-content">
                                                {Array.from(pageMatches.entries())
                                                    .sort((a, b) => a[0] - b[0])
                                                    .map(([pageNum, count]) => (<div
                                                            className="page-list-item"
                                                            key={`${fileKey}-page-${pageNum}`}
                                                        >
                                                            <div className="page-item-left">
                                                                <span className="page-name">
                                                                    {t('pdf', 'page')} {pageNum}
                                                                </span>
                                                            </div>
                                                            <div className="page-item-right">
                                                                <span className="match-count">{count} {t('pdf', 'matches')}</span>
                                                                <div className="navigation-buttons">
                                                                    <button
                                                                        className="nav-button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const file = files.find(f => f.name === fileKey);
                                                                            let searchHighlights: HighlightRect[] = [];
                                                                            if (file) {
                                                                                openFile(file);
                                                                                navigateToPage(fileKey, pageNum);
                                                                                // Get search highlights using the dedicated method
                                                                                 searchHighlights = getHighlightsByType(fileKey, HighlightType.SEARCH)
                                                                                .filter(h => h.page === pageNum);
                                                                            }
                                                                            if (searchHighlights.length > 0) {
                                                                                setSelectedHighlightIds(searchHighlights.map(h => h.id));
                                                                                setSelectedHighlightId(searchHighlights[0].id);
                                                                            }
                                                                        }}
                                                                        title={t('pdf', 'navigateToPage')}
                                                                    >
                                                                        <ChevronRight size={14}/>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>))}
                                            </div>)}
                                    </div>);
                            }))}
                    </div>
                </div>
            </div>

            {/* Context Menu for Right-Click */}
            {contextMenuVisible && (<div
                    ref={contextMenuRef}
                    className="context-menu"
                    style={{
                        top: contextMenuPosition.y, left: contextMenuPosition.x
                    }}
                >
                    <button
                        className="context-menu-item"
                        onClick={handleSaveToSettings}
                        title={t('pdf', 'addThisTermToDefaultSearchTerms')}
                    >
                        <Save size={14}/>
                        <span>{t('pdf', 'saveAsDefaultTerm')}</span>
                    </button>
                </div>)}
        </div>);
};

export default SearchSidebar;
