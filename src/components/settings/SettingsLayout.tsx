import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from "lucide-react";
import GeneralSettings from "./tabs/GeneralSettings";
import AccountSettings from "./tabs/AccountSettings";
import EntitySettings from "./tabs/EntitySettings";
import SearchSettings from "./tabs/SearchSettings";
import BanListSettings from "./tabs/BanListSettings";
import '../../styles/SettingsPage.css'; // Ensure this path is correct
import useSettings from "../../hooks/settings/useSettings"; // Ensure this path is correct
import { useLoading } from "../../contexts/LoadingContext";

export default function SettingsLayout() {
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
                aria-label="Go back"
                title="Go back to previous page"
            >
                <ArrowLeft size={24} />
            </button>

            <div className="max-w-5xl mx-auto">
                <div className="mb-6 mt-2">
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
                </div>

                {globalLoading(['setting.general']) && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading settings...</span>
                    </div>
                )}

                {userError && !isUserLoading && globalLoading(['setting.general']) && (
                    <div className="alert alert-destructive mb-6">
                        <div>
                            <div className="alert-title">Error Loading Settings</div>
                            <div className="alert-description">{userError}</div>
                        </div>
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
                                General
                            </button>
                            <button
                                className="tab-trigger"
                                data-state={activeTab === "account" ? "active" : "inactive"}
                                onClick={() => setActiveTab("account")}
                            >
                                Account
                            </button>
                            <button
                                className="tab-trigger"
                                data-state={activeTab === "entity" ? "active" : "inactive"}
                                onClick={() => setActiveTab("entity")}
                            >
                                Entity
                            </button>
                            <button
                                className="tab-trigger"
                                data-state={activeTab === "search" ? "active" : "inactive"}
                                onClick={() => setActiveTab("search")}
                            >
                                Search
                            </button>
                            <button
                                className="tab-trigger"
                                data-state={activeTab === "banlist" ? "active" : "inactive"}
                                onClick={() => setActiveTab("banlist")}
                            >
                                Ban List
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
