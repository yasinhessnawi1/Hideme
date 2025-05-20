import React, { useState, useEffect, useRef } from "react";
import { Save, Search, X, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { SearchPattern, SearchPatternCreate } from "../../../types";
import useSearchPatterns from "../../../hooks/settings/useSearchPatterns";
import useAuth from "../../../hooks/auth/useAuth"; // Adjust path
import { useLoading } from "../../../contexts/LoadingContext";
import LoadingWrapper from "../../common/LoadingWrapper";
import { useNotification } from "../../../contexts/NotificationContext";
import { useLanguage } from '../../../contexts/LanguageContext';
import { mapBackendErrorToMessage } from '../../../utils/errorUtils';

export default function SearchSettings() {
    const { t } = useLanguage();
    const {
        searchPatterns, // This comes from useUser hook
        getSearchPatterns,
        createSearchPattern,
        deleteSearchPattern,
        isLoading: isSearchLoading,
        error: userError,
        clearError: clearUserError
    } = useSearchPatterns();
    const {isLoading: isUserLoading } = useAuth();

    // Local state for UI interaction
    const [localPatterns, setLocalPatterns] = useState<SearchPattern[]>([]);
    const [newSearchTerm, setNewSearchTerm] = useState("");
    const [isCaseSensitive, setIsCaseSensitive] = useState(false); // Keep for potential future backend support
    const [isAiSearch, setIsAiSearch] = useState(false);
    const initialFetchDoneRef = useRef(false); // Ref to track if initial fetch has happened
    const { isLoading: globalLoading, startLoading, stopLoading } = useLoading();
    const { notify, confirm } = useNotification();
    const [searchTermBeingRemoved, setSearchTermBeingRemoved] = useState('');
    // Add a ref to track if initial fetch has happened

    useEffect(() => {
        // Only fetch patterns once when component mounts
        if (!initialFetchDoneRef.current && !isUserLoading) {
            getSearchPatterns();
            initialFetchDoneRef.current = true;
            return;
        }

        // Safely update local state when searchPatterns change
        if (Array.isArray(searchPatterns)) {
            setLocalPatterns(searchPatterns);
        } else if (searchPatterns === null || searchPatterns === undefined) {
            // Only set empty array on first load or when explicitly null/undefined
            setLocalPatterns([]);
        }
    }, [searchPatterns, isUserLoading]); // Added isUserLoading to dependencies

    // Sync local error with hook error
    useEffect(() => {
        if (userError) {
            notify({
                message: mapBackendErrorToMessage(userError),
                type: "error",
                duration: 3000
            });
        }
    }, [userError]);

    // --- Action Handlers ---

    const handleAddSearchTerm = async () => {
        if (!newSearchTerm.trim()) {
            notify({
                message: t('settings', 'searchTermCannotBeEmpty'),
                type: "error",
                duration: 3000
            });
            return;
        }
        clearUserError(); // Clear hook errors first
        startLoading('setting.search');

        const newPatternData: SearchPatternCreate = {
            pattern_text: newSearchTerm.trim(),
            pattern_type: isAiSearch ? 'ai_search' : isCaseSensitive ? 'case_sensitive' :  'normal',
        };

        // Prevent adding exact duplicates (check local state for responsiveness)
        // Ensure localPatterns is an array before calling .some
        const currentLocalPatterns = Array.isArray(localPatterns) ? localPatterns : [];
        const termExists = currentLocalPatterns.some(
            (p) => p.pattern_text === newPatternData.pattern_text
        );

        if (termExists) {
            notify({
                message: t('settings', 'searchTermExists'),
                type: "error",
                duration: 3000
            });
            stopLoading('setting.search');
            return;
        }

        try {
            await createSearchPattern(newPatternData);
            // State updates via useEffect watching `searchPatterns` from useUser hook
            setNewSearchTerm("");
            setIsCaseSensitive(false); // Reset options after adding
            setIsAiSearch(false);
        } catch (err: any) {
            notify({
                message: mapBackendErrorToMessage(err) || t('settings', 'failedToAddSearchTerm'),
                type: "error",
                duration: 3000
            });
            console.error("Error adding search term:", err);
        } finally {
            stopLoading('setting.search');
        }
    };

    const handleRemoveSearchTerm = async (id: number) => {
        clearUserError();
        startLoading('setting.search');

        try {
            await deleteSearchPattern(id);
            notify({
                message: t('settings', 'searchTermRemoved'),
                type: "success",
                duration: 3000
            });
            // State updates via useEffect watching `searchPatternss`
            setSearchTermBeingRemoved(searchPatterns.find(p => p.id === id)?.pattern_text || '');
        } catch (err: any) {
            notify({
                message: mapBackendErrorToMessage(err) || t('settings', 'failedToRemoveSearchTerm'),
                type: "error",
                duration: 3000
            });
            console.error("Error removing search term:", err);
        } finally {
            stopLoading('setting.search');
        }
    };

    const handleClearAllSearchTerms = async () => {
        // Ensure localPatterns is an array before proceeding
        const currentLocalPatterns = Array.isArray(localPatterns) ? localPatterns : [];
        if (currentLocalPatterns.length === 0) return; // Nothing to clear

        if (await confirm({
            title: t('settings', 'clearAllSearchTermsTitle'),
            message: t('settings', 'clearAllSearchTermsMessage').replace('{count}', String(currentLocalPatterns.length)),
            confirmButton: {
                label: t('common', 'clear')
            },
            cancelButton: {
                label: t('common', 'cancel')
            },
            type: "delete"
        })) {

            startLoading('setting.search');
            try {
                // Create a list of promises for deletion
                const deletePromises = currentLocalPatterns.map(p => deleteSearchPattern(p.id));
                await Promise.all(deletePromises);
                notify({
                    message: t('settings', 'allSearchTermsCleared'),
                    type: "success",
                    duration: 3000
                });
                // State updates via useEffect watching `searchPatterns`
            } catch (err: any) {
                notify({
                    message: mapBackendErrorToMessage(err) || t('settings', 'failedToClearAllSearchTerms'),
                    type: "error",
                    duration: 3000
                });
                console.error("Error clearing all search terms:", err);
            } finally {
                stopLoading('setting.search');
            }
        }
    };

    // Combined loading state for UI elements
    const isLoading = isUserLoading || globalLoading(['setting.search']);
    // Ensure localPatterns is always an array for rendering
    const patternsToRender = Array.isArray(localPatterns) ? localPatterns : [];


    return (
        <div className="space-y-6">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">{t('settings', 'savedSearchTerms')}</h2>
                    <p className="card-description">{t('settings', 'manageSearchTermsDescription')}</p>
                </div>
                <div className="card-content space-y-4">
                    <div className="space-y-4">
                        {/* Add New Term Form */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="search-term">
                                {t('settings', 'saveNewSearchTerm')}
                            </label>
                            <div className="flex flex-col sm:flex-row sm:space-x-2"> {/* Stack on small screens */}
                                <div className="flex-1 mb-2 sm:mb-0"> {/* Add bottom margin on small screens */}
                                    <input
                                        className="form-input"
                                        id="search-term"
                                        value={newSearchTerm}
                                        onChange={(e) => setNewSearchTerm(e.target.value)}
                                        placeholder={t('settings', 'searchTermPlaceholder')}
                                        disabled={isLoading}
                                    />
                                </div>
                                <button
                                    className="button button-primary w-full sm:w-auto" // Full width on small screens
                                    onClick={handleAddSearchTerm}
                                    disabled={isLoading || !newSearchTerm.trim()}
                                >
                                    <LoadingWrapper isLoading={isLoading} fallback={t('settings', 'adding')}>
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin button-icon"/> :
                                            <Search size={16} className="button-icon"/>}
                                        {isLoading ? t('settings', 'adding') : t('settings', 'addTerm')}
                                    </LoadingWrapper>
                                </button>
                            </div>

                            <div className="flex items-center space-x-6 pt-2">
                                <div className="flex items-center space-x-2">
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            id="ai-search"
                                            checked={isAiSearch}
                                            onChange={(e) => setIsAiSearch(e.target.checked)}
                                            disabled={isLoading}
                                        />
                                        <span className="switch-slider"></span>
                                    </label>
                                    <label className="checkbox-label"
                                           htmlFor="ai-search"> {/* Use checkbox-label style */}
                                        {t('settings', 'aiSearch')}
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            id="case-sensitive-search"
                                            checked={isCaseSensitive}
                                            onChange={(e) => setIsCaseSensitive(e.target.checked)}
                                            disabled={isLoading}
                                        />
                                        <span className="switch-slider"></span>
                                    </label>
                                    <label className="checkbox-label"
                                           htmlFor="case-sensitive-search"> {/* Use checkbox-label style */}
                                        {t('settings', 'caseSensitive')}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="separator"></div>

                        {/* Saved Terms List */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2"> {/* Added margin */}
                                <h3 className="text-sm font-medium">{t('settings', 'yourSavedTerms').replace('{count}', String(patternsToRender.length))}</h3>
                                {patternsToRender.length > 0 && (
                                    <button
                                        className="button button-outline button-sm"
                                        onClick={handleClearAllSearchTerms}
                                        disabled={isLoading}
                                    >
                                        <LoadingWrapper isLoading={isLoading} fallback={t('settings', 'clearing')}>
                                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin button-icon"/> :
                                                <Trash2 size={14} className="button-icon"/>}
                                            {isLoading ? t('settings', 'clearing') : t('settings', 'clearAll')}
                                        </LoadingWrapper>
                                    </button>
                                )}
                            </div>

                            {/* Loading State */}
                            {isUserLoading && (
                                <LoadingWrapper isLoading={isLoading} fallback={t('settings', 'loading')}>
                                    <div className="flex justify-center items-center py-6">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        <span className="ml-2 text-muted-foreground">{t('settings', 'loadingTerms')}</span>
                                    </div>
                                </LoadingWrapper>
                            )
                            }

                            {/* Empty State */}
                            {!isUserLoading && patternsToRender.length === 0 ? (
                                <div className="border border-dashed rounded-md p-6 text-center">
                                    <p className="text-sm text-muted-foreground">{t('settings', 'noSavedSearchTerms')}</p>
                                </div>
                            ) : (
                                /* List of Terms */
                                <div className="space-y-2">
                                    {/* Use patternsToRender which is guaranteed to be an array */}
                                    {patternsToRender.map((pattern) => (
                                        <div key={pattern.id} className="flex items-center justify-between border rounded-md p-3 hover:bg-muted transition-colors duration-150"> {/* Added hover effect */}
                                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                <span className="font-medium truncate" title={pattern.pattern_text}>{pattern.pattern_text}</span>
                                                <div className="flex space-x-1 flex-shrink-0">
                                                    {pattern.pattern_type === 'case_sensitive' && <span className="badge badge-outline">Aa</span>}
                                                    {pattern.pattern_type === 'ai_search' && <span className="badge badge-outline">AI</span>}
                                                    {pattern.pattern_type === 'regex' && <span className="badge badge-outline">Regex</span>}
                                                </div>
                                            </div>
                                            <button
                                                className="button button-ghost button-sm p-1 text-muted-foreground hover:text-destructive" // Subtle styling
                                                onClick={() => handleRemoveSearchTerm(pattern.id)}
                                                disabled={isLoading || searchTermBeingRemoved === pattern.pattern_text}
                                                title={t('settings', 'removeTerm')}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
