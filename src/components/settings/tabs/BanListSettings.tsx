import React, { useState, useEffect, useRef } from "react";
import { Save, Plus, X, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { useUser } from "../../../hooks/userHook"; // Adjust path if needed

export default function BanListSettings() {
    const {
        banList,
        getBanList,
        addBanListWords,
        removeBanListWords,
        isLoading: isUserLoading,
        error: userError,
        clearError: clearUserError
    } = useUser();

    const [localBannedWords, setLocalBannedWords] = useState<string[]>([]);
    const [newBannedWord, setNewBannedWord] = useState("");
    const [localError, setLocalError] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [deletingWord, setDeletingWord] = useState<string | null>(null); // Store word being deleted
    const [isClearingAll, setIsClearingAll] = useState(false);

    // Add a ref to track initial loading
    const initialLoadAttemptedRef = useRef(false);

    // Load banned words when hook provides them or fetch if needed
    useEffect(() => {
        // Only fetch ban list once when component mounts and not already loading
        if (!initialLoadAttemptedRef.current && !isUserLoading) {
            console.log("[BanListSettings] Initial fetch of ban list");
            getBanList();
            initialLoadAttemptedRef.current = true;
            return;
        }

        // Update local state when banList changes
        if (banList) {
            console.log("[BanListSettings] Setting localBannedWords from banList. Count:", banList.words?.length || 0);
            setLocalBannedWords(banList.words || []);
        }
    }, [banList, getBanList, isUserLoading]);

    // Clear local error when hook error changes or is cleared
    useEffect(() => {
        if (userError) {
            setLocalError(userError);
        } else if (localError === userError) { // Clear local error only if it matches the hook's cleared error
            setLocalError("");
        }
    }, [userError, localError]);

    const handleAddBannedWord = async () => {
        const wordToAdd = newBannedWord.trim().toLowerCase(); // Normalize word

        if (!wordToAdd) {
            setLocalError("Word cannot be empty");
            return;
        }

        if (localBannedWords.includes(wordToAdd)) {
            setLocalError("This word is already in the ban list");
            return;
        }

        clearUserError();
        setLocalError("");
        setIsAdding(true);

        try {
            await addBanListWords([wordToAdd]);
            // `localBannedWords` will update via useEffect watching `banList`
            setNewBannedWord("");
        } catch (err: any) {
            setLocalError(err.userMessage || err.message || "Failed to add banned word.");
            console.error("Error adding banned word:", err);
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveBannedWord = async (wordToRemove: string) => {
        clearUserError();
        setLocalError("");
        setDeletingWord(wordToRemove);

        try {
            await removeBanListWords([wordToRemove]);
            // `localBannedWords` will update via useEffect
        } catch (err: any) {
            setLocalError(err.userMessage || err.message || "Failed to remove banned word.");
            console.error("Error removing banned word:", err);
        } finally {
            setDeletingWord(null);
        }
    };

    const handleClearAllBannedWords = async () => {
        if (window.confirm("Are you sure you want to remove all banned words?")) {
            clearUserError();
            setLocalError("");
            setIsClearingAll(true);
            try {
                if (localBannedWords.length > 0) {
                    await removeBanListWords(localBannedWords);
                    // `localBannedWords` will update via useEffect
                }
            } catch (err: any) {
                setLocalError(err.userMessage || err.message || "Failed to clear ban list.");
                console.error("Error clearing ban list:", err);
            } finally {
                setIsClearingAll(false);
            }
        }
    };

    const isLoading = isUserLoading || isAdding || deletingWord !== null || isClearingAll;

    // Generate unique IDs for list items based on word and index
    const getWordItemId = (word: string, index: number) => `banword-${word}-${index}`;

    return (
        <div className="space-y-6">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Banned Words List</h2>
                    <p className="card-description">Manage words to be automatically flagged or redacted</p>
                </div>
                <div className="card-content space-y-4">
                    <div className="space-y-4">
                        {/* Add New Word Form */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="banned-word">
                                Add New Banned Word
                            </label>
                            <div className="flex space-x-2">
                                <div className="flex-1">
                                    <input
                                        className="form-input"
                                        id="banned-word"
                                        value={newBannedWord}
                                        onChange={(e) => setNewBannedWord(e.target.value)}
                                        placeholder="Enter word to ban..."
                                        disabled={isLoading}
                                    />
                                </div>
                                <button
                                    className="button button-primary"
                                    onClick={handleAddBannedWord}
                                    disabled={isLoading || !newBannedWord.trim()}
                                >
                                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <Plus size={16} className="button-icon" />}
                                    {isAdding ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                        </div>

                        <div className="separator"></div>

                        {/* Banned Words List */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">Your Banned Words ({localBannedWords.length})</h3>
                                {localBannedWords.length > 0 && (
                                    <button
                                        className="button button-outline button-sm"
                                        onClick={handleClearAllBannedWords}
                                        disabled={isLoading}
                                    >
                                        {isClearingAll ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <Trash2 size={14} className="button-icon" />}
                                        {isClearingAll ? 'Clearing...' : 'Clear All'}
                                    </button>
                                )}
                            </div>

                            {isUserLoading && localBannedWords.length === 0 && !initialLoadAttemptedRef.current && (
                                <div className="flex justify-center items-center py-6">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="ml-2 text-muted-foreground">Loading ban list...</span>
                                </div>
                            )}

                            {!isUserLoading && localBannedWords.length === 0 ? (
                                <div className="border border-dashed rounded-md p-6 text-center">
                                    <p className="text-sm text-muted-foreground">No banned words yet. Add some above.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {localBannedWords.map((word, index) => (
                                        <div key={getWordItemId(word, index)} className="flex items-center justify-between border rounded-md p-2">
                                            <span className="font-medium truncate" title={word}>{word}</span>
                                            <button
                                                className="button button-ghost button-sm p-1" // Smaller padding
                                                onClick={() => handleRemoveBannedWord(word)}
                                                disabled={isLoading || deletingWord === word}
                                                title="Remove word"
                                            >
                                                {deletingWord === word ? <Loader2 className="h-4 w-4 animate-spin" /> : <X size={16} />}
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
