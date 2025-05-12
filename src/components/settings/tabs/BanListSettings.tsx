import React, { useState, useEffect, useRef } from "react";
import { Save, Plus, X, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import useBanList from "../../../hooks/settings/useBanList"; // Adjust path if needed
import { useLoading } from "../../../contexts/LoadingContext";
import LoadingWrapper from "../../common/LoadingWrapper";
import { useNotification } from "../../../contexts/NotificationContext";
import { useLanguage } from '../../../contexts/LanguageContext';

export default function BanListSettings() {
    const { t } = useLanguage();
    const {
        banList,
        getBanList,
        addBanListWords,
        removeBanListWords,
        isLoading: isUserLoading,
        error: userError,
        clearError: clearUserError
    } = useBanList();

    const [localBannedWords, setLocalBannedWords] = useState<string[]>([]);
    const [newBannedWord, setNewBannedWord] = useState("");
    const { isLoading: globalLoading, startLoading, stopLoading } = useLoading();
    const {notify, confirm} = useNotification();
    const [termBeingRemoved, setTermBeingRemoved] = useState<string | null>(null);
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
            notify({
                message: userError,
                type: 'error',
                duration: 3000
            });
        }
    }, [userError]);

    const handleAddBannedWord = async () => {
        const wordToAdd = newBannedWord.trim().toLowerCase(); // Normalize word

        if (!wordToAdd) {
            notify({
                message: t('banlist', 'wordCannotBeEmpty'),
                type: 'error',
                duration: 3000
            });
            return;
        }

        if (localBannedWords.includes(wordToAdd)) {
            notify({
                message: t('banlist', 'wordAlreadyInList'),
                type: 'error',
                duration: 3000
            });
            return;
        }

        clearUserError();
        startLoading('setting.banlist.add');

        try {
            await addBanListWords([wordToAdd]);
            // `localBannedWords` will update via useEffect watching `banList`
            setNewBannedWord("");
        } catch (err: any) {
            notify({
                message: (err.userMessage ?? err.message) ?? t('banlist', 'failedToAddBannedWord'),
                type: 'error',
                duration: 3000
            });
            console.error("Error adding banned word:", err);
        } finally {
            stopLoading('setting.banlist.add');
        }
    };

    const handleRemoveBannedWord = async (wordToRemove: string) => {
        clearUserError();

        try {
            await removeBanListWords([wordToRemove]);
            // `localBannedWords` will update via useEffect
            setTermBeingRemoved(wordToRemove);
        } catch (err: any) {
            notify({
                message: (err.userMessage ?? err.message) ?? t('banlist', 'failedToRemoveBannedWord'),
                type: 'error',
                duration: 3000
            });
            console.error("Error removing banned word:", err);
        } finally {
            setTermBeingRemoved(null);
        }
    };

    const handleClearAllBannedWords = async () => {
       const confirmed = await confirm({
        type: "warning",
        title: t('banlist', 'clearAllIgnoredWordsTitle'),
        message: t('banlist', 'clearAllIgnoredWordsMessage'),
        confirmButton: {
            label: t('banlist', 'clearAll'),
        },
        cancelButton: {
            label: t('banlist', 'cancel'),
        }
       });
       if (confirmed) {
        clearUserError();
        startLoading('setting.banlist.clear');
        try {
            if (localBannedWords.length > 0) {
                await removeBanListWords(localBannedWords);
                // `localBannedWords` will update via useEffect
            }
        } catch (err: any) {
            notify({
                message: (err.userMessage ?? err.message) ?? t('banlist', 'failedToClearIgnoredWordsList'),
                type: 'error',
                duration: 3000
            });
        } finally {
            stopLoading('setting.banlist.clear');
        }
       }
    };

    const isLoading = isUserLoading || globalLoading(['setting.banlist.add', 'setting.banlist.clear']);

    // Generate unique IDs for list items based on word and index
    const getWordItemId = (word: string, index: number) => `banword-${word}-${index}`;

    return (
        <div className="space-y-6">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">{t('banlist', 'ignoredWordsList')}</h2>
                    <p className="card-description">{t('banlist', 'manageIgnoredWordsDescription')}</p>
                </div>
                <div className="card-content space-y-4">
                    <div className="space-y-4">
                        {/* Add New Word Form */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="ignored-word">
                                {t('banlist', 'addNewIgnoredWord')}
                            </label>
                            <div className="flex space-x-2">
                                <div className="flex-1">
                                    <input
                                        className="form-input"
                                        id="banned-word"
                                        value={newBannedWord}
                                        onChange={(e) => setNewBannedWord(e.target.value)}
                                        placeholder={t('banlist', 'enterWordToIgnore')}
                                        disabled={isLoading}
                                    />
                                </div>
                                <button
                                    className="button button-primary"
                                    onClick={handleAddBannedWord}
                                    disabled={isLoading || !newBannedWord.trim()}
                                >
                                    <LoadingWrapper isLoading={isLoading} fallback={t('banlist', 'adding')}>
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <Plus size={16} className="button-icon" />}
                                        {isLoading ? t('banlist', 'adding') : t('banlist', 'add')}
                                    </LoadingWrapper>
                                </button>
                            </div>
                        </div>

                        <div className="separator"></div>

                        {/* Banned Words List */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">{t('banlist', 'yourIgnoredWords').replace('{count}', String(localBannedWords.length))}</h3>
                                {localBannedWords.length > 0 && (
                                    <button
                                        className="button button-outline button-sm"
                                        onClick={handleClearAllBannedWords}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <Trash2 size={14} className="button-icon" />}
                                        {isLoading ? t('banlist', 'clearing') : t('banlist', 'clearAll')}
                                    </button>
                                )}
                            </div>

                            {isUserLoading && localBannedWords.length === 0 && !initialLoadAttemptedRef.current && (
                                <div className="flex justify-center items-center py-6">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="ml-2 text-muted-foreground">{t('banlist', 'removing')}</span>
                                </div>
                            )}

                            {!isUserLoading && localBannedWords.length === 0 ? (
                                <div className="border border-dashed rounded-md p-6 text-center">
                                    <p className="text-sm text-muted-foreground">{t('banlist', 'noIgnoredWords')}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {localBannedWords.map((word, index) => (
                                        <div key={getWordItemId(word, index)} className="flex items-center justify-between border rounded-md p-2">
                                            <span className="font-medium truncate" title={word}>{word}</span>
                                            <button
                                                className="button button-ghost button-sm p-1" // Smaller padding
                                                onClick={() => handleRemoveBannedWord(word)}
                                                disabled={isLoading}
                                                title={t('banlist', 'remove')}
                                            >
                                                <LoadingWrapper isLoading={termBeingRemoved === word} fallback={t('banlist', 'removingWord')}>
                                                    {(termBeingRemoved === word) ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <X size={14} className="button-icon" />}
                                                    {(termBeingRemoved === word) ? t('banlist', 'removingWord') : ''}
                                                </LoadingWrapper>
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
