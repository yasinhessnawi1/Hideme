// Modified SearchSidebar.tsx implementation to use summaryPersistenceStore
import React, { useState, useEffect, useCallback, useRef } from 'react';

// Extend the Window interface to include our custom properties
declare global {
    interface Window {
        defaultSearchTerms?: string[];
        executeSearchWithDefaultTerms?: () => void;
    }
}
import { useFileContext } from '../../../contexts/FileContext';
import { getFileKey } from '../../../contexts/PDFViewerContext';
import { useBatchSearch } from '../../../contexts/SearchContext';
import { usePDFApi } from '../../../hooks/usePDFApi';
import '../../../styles/modules/pdf/SettingsSidebar.css';
import '../../../styles/modules/pdf/SearchSidebar.css';
import { Search, XCircle, ChevronUp, ChevronDown, ChevronRight, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { usePDFNavigation } from '../../../hooks/usePDFNavigation';
import useSearchPatterns from "../../../hooks/settings/useSearchPatterns";
import { useHighlightStore } from "../../../hooks/useHighlightStore";
import summaryPersistenceStore, { SearchFileSummary } from '../../../store/SummaryPersistenceStore';
import {HighlightType} from "../../../types";

const SearchSidebar: React.FC = () => {
    const { currentFile, selectedFiles, files } = useFileContext();
    const pdfNavigation = usePDFNavigation('search-sidebar');
    const {
        searchPatterns,
        isLoading: userDataLoading,
        createSearchPattern,
        getSearchPatterns
    } = useSearchPatterns();
    const { removeHighlightsByText } = useHighlightStore();

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
    const [searchScope, setSearchScope] = useState<'current' | 'selected' | 'all'>('all');
    const [isAiSearch, setIsAiSearch] = useState(false);
    const [isCaseSensitive, setIsCaseSensitive] = useState(false);
    const [localSearchError, setLocalSearchError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [expandedFileSummaries, setExpandedFileSummaries] = useState<Set<string>>(new Set());
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [contextMenuSearchTerm, setContextMenuSearchTerm] = useState('');
    const initialPatternFetchAttemptedRef = useRef(false);

    // Add state for tracking searched files count
    const [searchedFilesCount, setSearchedFilesCount] = useState<number>(0);
    // Add state for file summaries
    const [fileSummaries, setFileSummaries] = useState<SearchFileSummary[]>([]);
    // Track searched files set
    const searchedFilesRef = useRef<Set<string>>(new Set());

    // Ref for the context menu
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Add ref for the search input field
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Get current search statistics
    const searchStats = getSearchResultsStats();

    // Load persisted search data
    useEffect(() => {
        try {
            // Load searched files from persistence service
            const savedSearchedFiles = summaryPersistenceStore.getAnalyzedFiles('search');

            // Only keep files that still exist
            const availableFileKeys = new Set(files.map(getFileKey));
            const validFileKeys = [...savedSearchedFiles].filter(key => availableFileKeys.has(key));

            // Update our local state
            searchedFilesRef.current = new Set(validFileKeys);
            setSearchedFilesCount(validFileKeys.length);

            // Load file summaries
            const savedSummaries = summaryPersistenceStore.getFileSummaries<SearchFileSummary>('search');

            // Filter to only include valid files
            const validSummaries = savedSummaries.filter(summary =>
                availableFileKeys.has(summary.fileKey)
            );

            setFileSummaries(validSummaries);
            console.log(`[SearchSidebar] Loaded ${validSummaries.length} file summaries and ${validFileKeys.length} searched files`);

            // Auto-expand summaries on load
            if (validSummaries.length > 0) {
                const newExpandedSet = new Set<string>();
                validSummaries.forEach(summary => newExpandedSet.add(summary.fileKey));
                setExpandedFileSummaries(newExpandedSet);
            }
        } catch (error) {
            console.error('[SearchSidebar] Error loading persisted search data:', error);
        }
    }, [files]);
    useEffect(() => {
        const handleHighlightsCleared = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, allTypes, type } = customEvent.detail || {};

            // Skip if not related to search highlights
            if (type && type !== HighlightType.SEARCH && !allTypes) return;

            if (fileKey) {
                console.log(`[SearchSidebar] Search highlights cleared for file: ${fileKey}`);

                // Update file summaries to reflect cleared highlights
                setFileSummaries(prev => {
                    // Find the file summary for this file
                    const updatedSummaries = prev.filter(summary => summary.fileKey !== fileKey);

                    // Save the updated summaries
                    summaryPersistenceStore.saveFileSummaries('search', updatedSummaries);

                    return updatedSummaries;
                });

                // Update the search files count
                if (searchedFilesRef.current.has(fileKey)) {
                    searchedFilesRef.current.delete(fileKey);
                    setSearchedFilesCount(searchedFilesRef.current.size);

                    // Update the persistence store
                    summaryPersistenceStore.removeAnalyzedFile('search', fileKey);
                }
            }
        };

        // Listen for both general highlights cleared and search-specific events
        window.addEventListener('highlights-cleared', handleHighlightsCleared);
        window.addEventListener('search-highlights-cleared', handleHighlightsCleared);

        return () => {
            window.removeEventListener('highlights-cleared', handleHighlightsCleared);
            window.removeEventListener('search-highlights-cleared', handleHighlightsCleared);
        };
    }, []);
    // Reconcile our data when files change
    useEffect(() => {
        if (files.length === 0) return;

        // Get available file keys
        const availableFileKeys = files.map(getFileKey);

        // Reconcile analyzed files with persistence service
        const validSearchedFiles = summaryPersistenceStore.reconcileAnalyzedFiles('search', availableFileKeys);

        // Update local state if needed
        if (searchedFilesRef.current.size !== validSearchedFiles.size) {
            searchedFilesRef.current = validSearchedFiles;
            setSearchedFilesCount(validSearchedFiles.size);
        }

        // Reconcile file summaries
        const validSummaries = summaryPersistenceStore.reconcileFileSummaries<SearchFileSummary>('search', files);

        // Update local state if needed
        if (validSummaries.length !== fileSummaries.length) {
            setFileSummaries(validSummaries);
        }
    }, [files, fileSummaries.length]);

    // Listen for file removal events
    useEffect(() => {
        const handleFileRemoved = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, fileName } = customEvent.detail || {};

            if (fileKey) {
                console.log(`[SearchSidebar] File removed: ${fileKey}`);

                // Update our tracked files set
                if (searchedFilesRef.current.has(fileKey)) {
                    searchedFilesRef.current.delete(fileKey);
                    setSearchedFilesCount(searchedFilesRef.current.size);

                    // Save the updated set to persistence store
                    summaryPersistenceStore.saveAnalyzedFiles('search', searchedFilesRef.current);
                }

                // Update file summaries
                setFileSummaries(prev => {
                    const updatedSummaries = prev.filter(summary => summary.fileKey !== fileKey);

                    // Save the updated summaries if they changed
                    if (updatedSummaries.length !== prev.length) {
                        summaryPersistenceStore.saveFileSummaries('search', updatedSummaries);
                    }

                    return updatedSummaries;
                });

                // If there are active queries for this file, remove them
                activeQueries.forEach(query => {
                        clearSearch(query.term);
                });
            }
        };

        window.addEventListener('file-removed', handleFileRemoved);

        return () => {
            window.removeEventListener('file-removed', handleFileRemoved);
        };
    }, [activeQueries, clearSearch]);

    // Save searched files to persistence when count changes
    useEffect(() => {
        summaryPersistenceStore.saveAnalyzedFiles('search', searchedFilesRef.current);
    }, [searchedFilesCount]);

    // Save file summaries when they change
    useEffect(() => {
        if (fileSummaries.length > 0) {
            summaryPersistenceStore.saveFileSummaries('search', fileSummaries);
        }
    }, [fileSummaries]);

    // Helper function to update file summaries
    const updateFileSummary = useCallback((newSummary: SearchFileSummary) => {
        setFileSummaries(prev => {
            // Remove any existing summary for this file
            const filteredSummaries = prev.filter(s => s.fileKey !== newSummary.fileKey);

            // Add the new summary
            const updatedSummaries = [...filteredSummaries, newSummary];

            // Save to persistence
            summaryPersistenceStore.saveFileSummaries('search', updatedSummaries);

            return updatedSummaries;
        });
    }, []);

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

                // Update file summaries based on search results
                currentStats.fileMatches.forEach((matchCount, fileKey) => {
                    // Add to expanded set
                    newExpandedSet.add(fileKey);

                    // Add to searched files
                    if (!searchedFilesRef.current.has(fileKey)) {
                        searchedFilesRef.current.add(fileKey);
                    }

                    // Create or update file summary
                    const file = files.find(f => getFileKey(f) === fileKey);
                    if (file) {
                        // Get page matches
                        const pageMatches = currentStats.pageMatches.get(fileKey) || new Map();

                        const summary: SearchFileSummary = {
                            fileKey,
                            fileName: file.name,
                            matchCount,
                            pageMatches: Object.fromEntries(pageMatches)
                        };

                        // Update file summary
                        updateFileSummary(summary);
                    }
                });

                // Update counter
                setSearchedFilesCount(searchedFilesRef.current.size);

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
        batchSearch,
        isCaseSensitive,
        isAiSearch,
        getSearchResultsStats,
        activeQueries,
        expandedFileSummaries,
        files,
        updateFileSummary
    ]);
    useEffect(() => {
        const handleSearchSummaryUpdated = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, fileName, summary } = customEvent.detail || {};

            if (fileKey && summary) {
                console.log(`[SearchSidebar] Received search summary update for file: ${fileName}`);

                // Add to our tracked files set if not already there
                if (!searchedFilesRef.current.has(fileKey)) {
                    searchedFilesRef.current.add(fileKey);
                    setSearchedFilesCount(searchedFilesRef.current.size);
                }

                // Update the file summary
                updateFileSummary(summary);

                // Ensure the file summary is expanded
                setExpandedFileSummaries(prev => {
                    const newSet = new Set(prev);
                    newSet.add(fileKey);
                    return newSet;
                });
            }
        };

        window.addEventListener('search-summary-updated', handleSearchSummaryUpdated);

        return () => {
            window.removeEventListener('search-summary-updated', handleSearchSummaryUpdated);
        };
    }, [updateFileSummary]);
    // Handle search term removal
    useEffect(() => {
        const handleAutoProcessingComplete = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, hasSearchResults } = customEvent.detail || {};

            if (fileKey && hasSearchResults) {
                console.log(`[SearchSidebar] Auto-processing with search completed for file: ${fileKey}`);

                // Short delay to ensure all search results are properly processed
                setTimeout(() => {
                    // Get fresh stats after search has completed
                    const currentStats = getSearchResultsStats();

                    // Check if this file has matches
                    const fileMatches = currentStats.fileMatches.get(fileKey);
                    if (fileMatches && fileMatches > 0) {
                        // Add to searched files if not already there
                        if (!searchedFilesRef.current.has(fileKey)) {
                            searchedFilesRef.current.add(fileKey);
                            setSearchedFilesCount(searchedFilesRef.current.size);
                        }

                        // Create or update file summary
                        const file = files.find(f => getFileKey(f) === fileKey);
                        if (file) {
                            // Get page matches
                            const pageMatches = currentStats.pageMatches.get(fileKey) || new Map();

                            const summary = {
                                fileKey,
                                fileName: file.name,
                                matchCount: fileMatches,
                                pageMatches: Object.fromEntries(pageMatches)
                            };

                            // Update file summary
                            updateFileSummary(summary);

                            // Ensure the file summary is expanded
                            setExpandedFileSummaries(prev => {
                                const newSet = new Set(prev);
                                newSet.add(fileKey);
                                return newSet;
                            });
                        }
                    }
                }, 300); // Slightly longer delay for auto-processing completion
            }
        };

        window.addEventListener('auto-processing-complete', handleAutoProcessingComplete);

        return () => {
            window.removeEventListener('auto-processing-complete', handleAutoProcessingComplete);
        };
    }, [files, getSearchResultsStats, updateFileSummary]);
    const removeSearchTerm = (term: string) => {
        // First, call the existing clearSearch method from BatchSearchContext
        clearSearch(term);
        summaryPersistenceStore.removeSearchQuery(term);
        // After a short delay to allow BatchSearchContext to update
        setTimeout(() => {
            // Refocus the search input
            searchInputRef.current?.focus();

            // Get fresh search statistics after term removal
            const currentStats = getSearchResultsStats();

            // Update file summaries based on current search results
            setFileSummaries(prev => {
                const updatedSummaries: SearchFileSummary[] = [];
                const filesToRemove: string[] = [];

                // Process each existing summary
                prev.forEach(summary => {
                    const fileKey = summary.fileKey;
                    const fileName = summary.fileName;

                    // Check if this file still has matches
                    const matchCount = currentStats.fileMatches.get(fileKey) || 0;

                    if (matchCount > 0) {
                        // File still has matches, update the summary
                        const pageMatches = currentStats.pageMatches.get(fileKey) || new Map();

                        updatedSummaries.push({
                            fileKey,
                            fileName,
                            matchCount,
                            pageMatches: Object.fromEntries(pageMatches)
                        });
                    } else {
                        // No matches left, mark for removal
                        filesToRemove.push(fileKey);
                    }
                });

                // Save updated summaries to persistence
                if (updatedSummaries.length > 0 || updatedSummaries.length !== prev.length) {
                    summaryPersistenceStore.saveFileSummaries('search', updatedSummaries);
                }

                // Update analyzed files if needed
                if (filesToRemove.length > 0) {
                    filesToRemove.forEach(fileKey => {
                        searchedFilesRef.current.delete(fileKey);
                    });

                    // Update counter
                    setSearchedFilesCount(searchedFilesRef.current.size);
                    summaryPersistenceStore.saveAnalyzedFiles('search', searchedFilesRef.current);
                }

                return updatedSummaries;
            });

            // Remove highlights for this term from all files
            files.forEach(file => {
                removeHighlightsByText(getFileKey(file), term);
            });
        }, 50); // Short delay to ensure BatchSearchContext has updated
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addSearchTerm().then(() => {});
        }
    };

    const handleClearAllSearches = () => {
        clearAllSearches();
        setTempSearchTerm('');

        // Clear search summaries and counters
        setFileSummaries([]);
        searchedFilesRef.current.clear();
        setSearchedFilesCount(0);

        // Clear from persistence
        summaryPersistenceStore.saveFileSummaries('search', []);
        summaryPersistenceStore.saveAnalyzedFiles('search', new Set());

        // Refocus the search input after clearing all searches
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 0);
    };


    useEffect(() => {
        // Only run this effect once when the component mounts
        if (!userDataLoading && !initialPatternFetchAttemptedRef.current) {
            console.log('[SearchSidebar] Initial fetch of search patterns');
            initialPatternFetchAttemptedRef.current = true;
            getSearchPatterns();
        }
    }, [userDataLoading, getSearchPatterns]); // Added getSearchPatterns to dependencies

    // Add a special method to load and apply all default search terms
    const applyAllDefaultSearchTerms = useCallback(async () => {
        if (searchPatterns && searchPatterns.length > 0) {
            console.log('[SearchSidebar] Applying all default search patterns');

            // Get currently active terms
            const activeTerms = new Set(activeQueries.map(q => q.term));

            // Get patterns that aren't already active
            const patternsToAdd = searchPatterns.filter(pattern =>
                !activeTerms.has(pattern.pattern_text)
            );

            if (patternsToAdd.length === 0) {
                console.log('[SearchSidebar] All default terms are already active');
                setLocalSearchError('All default search terms are already active');
                return;
            }

            // Apply each default pattern that isn't already active
            let addedCount = 0;

            for (const pattern of patternsToAdd) {
                if (!pattern.pattern_text.trim()) continue;

                try {
                    const filesToSearch = getFilesToProcess();
                    if (filesToSearch.length === 0) {
                        setLocalSearchError('No files selected for search');
                        return;
                    }

                    // Search with the current pattern using appropriate settings
                    console.log(`[SearchSidebar] Adding default search term: "${pattern.pattern_text}"`);
                    await batchSearch(
                        filesToSearch,
                        pattern.pattern_text,
                        {
                            isCaseSensitive: pattern.pattern_type === 'case_sensitive',
                            isAiSearch: pattern.pattern_type === 'ai_search'
                        }
                    );

                    addedCount++;
                } catch (err) {
                    console.error(`[SearchSidebar] Error adding default term "${pattern.pattern_text}":`, err);
                }
            }

            if (addedCount > 0) {
                setSuccessMessage(`Added ${addedCount} default search ${addedCount === 1 ? 'term' : 'terms'}`);
                setTimeout(() => setSuccessMessage(null), 3000);

                // Update search summaries after a delay to allow search to complete
                setTimeout(() => {
                    // Get fresh stats after search has completed
                    const currentStats = getSearchResultsStats();

                    // Update file summaries based on search results
                    currentStats.fileMatches.forEach((matchCount, fileKey) => {
                        // Add to searched files
                        if (!searchedFilesRef.current.has(fileKey)) {
                            searchedFilesRef.current.add(fileKey);
                        }

                        // Create or update file summary
                        const file = files.find(f => getFileKey(f) === fileKey);
                        if (file) {
                            // Get page matches
                            const pageMatches = currentStats.pageMatches.get(fileKey) || new Map();

                            const summary: SearchFileSummary = {
                                fileKey,
                                fileName: file.name,
                                matchCount,
                                pageMatches: Object.fromEntries(pageMatches)
                            };

                            // Update file summary
                            updateFileSummary(summary);
                        }
                    });

                    // Update counter
                    setSearchedFilesCount(searchedFilesRef.current.size);
                }, 300);
            }
        } else {
            setLocalSearchError('No default search terms available');
        }
    }, [searchPatterns, activeQueries, batchSearch, getFilesToProcess, getSearchResultsStats, files, updateFileSummary]);

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
    }, [resultNavigation]);

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

            console.log(`[SearchSidebar] Saving search term "${contextMenuSearchTerm}" to patterns`);

            // Also save current search options (AI search, case sensitivity)
            const currentQuery = activeQueries.find(q => q.term === contextMenuSearchTerm);
            const isAiSearchForTerm = currentQuery?.isAiSearch || isAiSearch;
            const isCaseSensitiveForTerm = currentQuery?.caseSensitive || isCaseSensitive;

            // Determine pattern type based on current options
            let patternType = 'normal';
            if (isAiSearchForTerm) patternType = 'ai_search';
            else if (isCaseSensitiveForTerm) patternType = 'case_sensitive';

            // Check if this term already exists in saved patterns
            const existingPattern = searchPatterns.find(p => p.pattern_text === contextMenuSearchTerm);

            if (!existingPattern) {
                // Create a new pattern with the current search term
                await createSearchPattern({
                    pattern_text: contextMenuSearchTerm,
                    pattern_type: patternType
                });

                // Show success message
                setSuccessMessage(`"${contextMenuSearchTerm}" saved as a search pattern`);
                console.log(`[SearchSidebar] Search term saved to patterns successfully with type: ${patternType}`);
            } else {
                // Pattern already exists
                setSuccessMessage(`"${contextMenuSearchTerm}" is already a saved pattern`);
                console.log(`[SearchSidebar] Search term already exists in patterns`);
            }

            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (error) {
            console.error(`[SearchSidebar] Error saving search term to patterns:`, error);
            setLocalSearchError("Failed to save search pattern.");

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
                {searchedFilesCount > 0 && (
                    <div className="entity-badge">
                        {searchedFilesCount} file{searchedFilesCount !== 1 ? 's' : ''} searched
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
                        {searchStats.totalMatches === 0 && fileSummaries.length === 0 ? (
                            <div className="no-results">No results found</div>
                        ) : (
                            // Display results grouped by file - use file summaries for display
                            fileSummaries.map(summary => {
                                const fileKey = summary.fileKey;
                                const fileName = summary.fileName;
                                const matchCount = summary.matchCount;
                                const pageMatches = typeof summary.pageMatches === 'object' ?
                                    new Map(Object.entries(summary.pageMatches).map(([k, v]) => [parseInt(k), v])) :
                                    new Map();
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
                                                    {matchCount} matches
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
