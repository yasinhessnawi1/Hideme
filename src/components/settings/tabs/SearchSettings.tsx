import React, { useState, useEffect, useRef } from "react";
import { Save, Search, X, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { SearchPattern, SearchPatternCreate } from "../../../types";
import useSearchPatterns from "../../../hooks/settings/useSearchPatterns";
import useAuth from "../../../hooks/auth/useAuth"; // Adjust path

export default function SearchSettings() {
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
    const [localError, setLocalError] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null); // Store ID being deleted
    const [isClearingAll, setIsClearingAll] = useState(false);
    const initialFetchDoneRef = useRef(false); // Ref to track if initial fetch has happened
    // Add a ref to track if initial fetch has happened

    // Load patterns when hook provides them or fetch if needed - WITH FIXES
    useEffect(() => {
        // Only fetch patterns once when component mounts
        if (!initialFetchDoneRef.current && !isUserLoading) {
            console.log("[SearchSettings] Initial fetch of search patterns");
            getSearchPatterns().then((patterns) => {setLocalPatterns(patterns);});
            initialFetchDoneRef.current = true;
            return;
        }
        // Safely update local state when searchPatterns change
        if (Array.isArray(searchPatterns)) {
            console.log("[SearchSettings] Setting localPatterns from searchPatterns (array). Count:", searchPatterns.length);
            setLocalPatterns(searchPatterns);
        } else if (searchPatterns === null || searchPatterns === undefined) {
            // Only set empty array on first load or when explicitly null/undefined
            console.log("[SearchSettings] searchPatterns is null/undefined, setting empty array");
            setLocalPatterns([]);
        }
    }, [searchPatterns, isSearchLoading]); // Added isSearchLoading to dependencies

    // Sync local error with hook error
    useEffect(() => {
        if (userError) {
            setLocalError(userError);
        } else if (localError === userError) { // Clear local error only if it matches the hook's cleared error
            setLocalError("");
        }
    }, [userError, localError]); // Add localError dependency

    // --- Action Handlers ---

    const handleAddSearchTerm = async () => {
        if (!newSearchTerm.trim()) {
            setLocalError("Search term cannot be empty");
            return;
        }
        clearUserError(); // Clear hook errors first
        setLocalError(""); // Clear local errors
        setIsAdding(true);

        const newPatternData: SearchPatternCreate = {
            pattern_text: newSearchTerm.trim(),
            pattern_type: isAiSearch ? 'ai_search' : isCaseSensitive ? 'case_sensitive' :  'normal',
        };

        // Prevent adding exact duplicates (check local state for responsiveness)
        // Ensure localPatterns is an array before calling .some
        const currentLocalPatterns = Array.isArray(localPatterns) ? localPatterns : [];
        const termExists = currentLocalPatterns.some(
            (p) => p.pattern_text === newPatternData.pattern_text && p.pattern_type === newPatternData.pattern_type
        );

        if (termExists) {
            setLocalError("This search term/type combination already exists.");
            setIsAdding(false);
            return;
        }

        try {
            await createSearchPattern(newPatternData);
            // State updates via useEffect watching `searchPatterns` from useUser hook
            setNewSearchTerm("");
            setIsCaseSensitive(false); // Reset options after adding
            setIsAiSearch(false);
            setLocalError(""); // Clear error on success
        } catch (err: any) {
            setLocalError(err.userMessage || err.message || "Failed to add search term.");
            console.error("Error adding search term:", err);
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveSearchTerm = async (id: number) => {
        clearUserError();
        setLocalError("");
        setIsDeleting(id);

        try {
            await deleteSearchPattern(id);
            setLocalError(""); // Clear error on success
            // State updates via useEffect watching `searchPatterns`
        } catch (err: any) {
            setLocalError(err.userMessage || err.message || "Failed to remove search term.");
            console.error("Error removing search term:", err);
        } finally {
            setIsDeleting(null);
        }
    };

    const handleClearAllSearchTerms = async () => {
        // Ensure localPatterns is an array before proceeding
        const currentLocalPatterns = Array.isArray(localPatterns) ? localPatterns : [];
        if (currentLocalPatterns.length === 0) return; // Nothing to clear

        if (window.confirm(`Are you sure you want to remove all ${currentLocalPatterns.length} saved search terms?`)) {
            clearUserError();
            setLocalError("");
            setIsClearingAll(true);
            try {
                // Create a list of promises for deletion
                const deletePromises = currentLocalPatterns.map(p => deleteSearchPattern(p.id));
                await Promise.all(deletePromises);
                setLocalError(""); // Clear error on success
                // State updates via useEffect watching `searchPatterns`
            } catch (err: any) {
                setLocalError(err.userMessage || err.message || "Failed to clear all search terms.");
                console.error("Error clearing all search terms:", err);
            } finally {
                setIsClearingAll(false);
            }
        }
    };

    // Combined loading state for UI elements
    const isLoading = isUserLoading || isAdding || isDeleting !== null || isClearingAll;
    // Ensure localPatterns is always an array for rendering
    const patternsToRender = Array.isArray(localPatterns) ? localPatterns : [];


    return (
        <div className="space-y-6">
            {localError && (
                <div className="alert alert-destructive">
                    <AlertTriangle className="alert-icon" size={16}/>
                    <div>
                        <div className="alert-title">Save Error</div>
                        <div className="alert-description">{localError}</div>
                    </div>
                </div>
            )}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Saved Search Terms</h2>
                    <p className="card-description">Manage terms used for highlighting content in documents</p>
                </div>
                <div className="card-content space-y-4">
                    <div className="space-y-4">
                        {/* Add New Term Form */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="search-term">
                                Add New Search Term
                            </label>
                            <div className="flex flex-col sm:flex-row sm:space-x-2"> {/* Stack on small screens */}
                                <div className="flex-1 mb-2 sm:mb-0"> {/* Add bottom margin on small screens */}
                                    <input
                                        className="form-input"
                                        id="search-term"
                                        value={newSearchTerm}
                                        onChange={(e) => setNewSearchTerm(e.target.value)}
                                        placeholder="Enter search term or regex..."
                                        disabled={isLoading}
                                    />
                                </div>
                                <button
                                    className="button button-primary w-full sm:w-auto" // Full width on small screens
                                    onClick={handleAddSearchTerm}
                                    disabled={isLoading || !newSearchTerm.trim()}
                                >
                                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin button-icon"/> :
                                        <Search size={16} className="button-icon"/>}
                                    {isAdding ? 'Adding...' : 'Add Term'}
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
                                        Ai Search
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
                                        Case Sensitive
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="separator"></div>

                        {/* Saved Terms List */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2"> {/* Added margin */}
                                <h3 className="text-sm font-medium">Your Saved Terms ({patternsToRender.length})</h3>
                                {patternsToRender.length > 0 && (
                                    <button
                                        className="button button-outline button-sm"
                                        onClick={handleClearAllSearchTerms}
                                        disabled={isLoading}
                                    >
                                        {isClearingAll ? <Loader2 className="h-4 w-4 animate-spin button-icon"/> :
                                            <Trash2 size={14} className="button-icon"/>}
                                        {isClearingAll ? 'Clearing...' : 'Clear All'}
                                    </button>
                                )}
                            </div>

                            {/* Loading State */}
                            {isUserLoading && patternsToRender.length === 0  && (
                                <div className="flex justify-center items-center py-6">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="ml-2 text-muted-foreground">Loading terms...</span>
                                </div>
                            )}

                            {/* Empty State */}
                            {!isUserLoading && patternsToRender.length === 0 ? (
                                <div className="border border-dashed rounded-md p-6 text-center">
                                    <p className="text-sm text-muted-foreground">No saved search terms yet. Add some above.</p>
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
                                                disabled={isLoading || isDeleting === pattern.id}
                                                title="Remove term"
                                            >
                                                {isDeleting === pattern.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X size={16} />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* No Save Changes button needed as actions are immediate */}
        </div>
    );
}
