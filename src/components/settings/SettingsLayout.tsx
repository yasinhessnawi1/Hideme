import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from "lucide-react";
import GeneralSettings from "./tabs/GeneralSettings";
import AccountSettings from "./tabs/AccountSettings";
import EntitySettings from "./tabs/EntitySettings";
import SearchSettings from "./tabs/SearchSettings";
import BanListSettings from "./tabs/BanListSettings";
import useSettings from "../../hooks/settings/useSettings"; // Ensure this path is correct
import { useLoading } from "../../contexts/LoadingContext";
import { useLanguage } from '../../contexts/LanguageContext';

export default function SettingsLayout() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState("general");
    const { isLoading: isUserLoading, error: userError, settings, getSettings } = useSettings();
    const navigate = useNavigate();

    // Add a ref to track initial settings loading
    const initialLoadingRef = useRef(true);
    const settingsLoadAttemptedRef = useRef(false);

    // Unified loading state to reduce flicker
    const { isLoading: globalLoading, stopLoading } = useLoading();
    // Load settings once on mount, with better safeguards
    useEffect(() => {
        let isMounted = true;

        // Only fetch settings if not already loading and haven't tried yet
        if (!settingsLoadAttemptedRef.current && !isUserLoading) {
            settingsLoadAttemptedRef.current = true;

            // Small delay to allow auth to complete if needed
            const timeoutId = setTimeout(() => {
                if (isMounted) {
                    console.log("[SettingsLayout] Fetching initial settings");
                    getSettings()
                        .finally(() => {
                            if (isMounted) {
                                initialLoadingRef.current = false;
                                stopLoading('setting.general');
                            }
                        });
                }
            }, 100);

            return () => {
                clearTimeout(timeoutId);
                isMounted = false;
            };
        } else if (!isUserLoading && (settings || userError)) {
            // If we either have settings or an error, we're done loading
            initialLoadingRef.current = false;
            stopLoading('setting.general');
        }
    }, [settings, getSettings, isUserLoading, userError]);

    const handleGoBack = () => {
        navigate(-1);
    };

    // Lazy loading for tab components to reduce initial render time
    const renderTabContent = () => {
        if (globalLoading(['setting.general'])) return null;

        switch (activeTab) {
            case "general":
                return <GeneralSettings />;
            case "account":
                return <AccountSettings />;
            case "entity":
                return <EntitySettings />;
            case "search":
                return <SearchSettings />;
            case "banlist":
                return <BanListSettings />;
            default:
                return null;
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 settings-container relative">
            <button
                onClick={handleGoBack}
                className="go-back-button"
                aria-label={t('settings', 'goBack')}
                title={t('settings', 'goBackToPreviousPage')}
            >
                <ArrowLeft size={24} />
            </button>

            <div className="max-w-5xl mx-auto">
                <div className="mb-6 mt-2">
                    <h1 className="text-3xl font-bold">{t('settings', 'title')}</h1>
                    <p className="text-muted-foreground mt-1">{t('settings', 'manageAccountSettings')}</p>
                </div>

                {globalLoading(['setting.general']) && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">{t('settings', 'loadingSettings')}</span>
                    </div>
                )}

                {!globalLoading(['setting.general']) && (
                    <div className="tabs">
                        <div className="tabs-list">
                            {/* Tab Triggers */}
                            <button
                                className="tab-trigger"
                                data-state={activeTab === "general" ? "active" : "inactive"}
                                onClick={() => setActiveTab("general")}
                            >
                                {t('settings', 'generalSettings')}
                            </button>
                            <button
                                className="tab-trigger"
                                data-state={activeTab === "account" ? "active" : "inactive"}
                                onClick={() => setActiveTab("account")}
                            >
                                {t('settings', 'account')}
                            </button>
                            <button
                                className="tab-trigger"
                                data-state={activeTab === "entity" ? "active" : "inactive"}
                                onClick={() => setActiveTab("entity")}
                            >
                                {t('settings', 'entitiesList')}
                            </button>
                            <button
                                className="tab-trigger"
                                data-state={activeTab === "search" ? "active" : "inactive"}
                                onClick={() => setActiveTab("search")}
                            >
                                {t('settings', 'searchList')}
                            </button>
                            <button
                                className="tab-trigger"
                                data-state={activeTab === "banlist" ? "active" : "inactive"}
                                onClick={() => setActiveTab("banlist")}
                            >
                                {t('settings', 'ignoreList')}
                            </button>
                        </div>

                        {/* Single Tab Content Panel with conditional rendering based on activeTab */}
                        <div className="tab-content active" data-state="active">
                            {renderTabContent()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
