// src/components/settings/SettingsLayout.tsx
// REMOVE "use client"; if it was at the top

import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom'; // *** CHANGE THIS IMPORT ***
import { ArrowLeft, Loader2 } from "lucide-react";
import GeneralSettings from "./tabs/GeneralSettings";
import AccountSettings from "./tabs/AccountSettings";
import EntitySettings from "./tabs/EntitySettings";
import SearchSettings from "./tabs/SearchSettings";
import BanListSettings from "./tabs/BanListSettings";
import '../../styles/SettingsPage.css'; // Ensure this path is correct
import { useUser } from "../../hooks/userHook"; // Ensure this path is correct

export default function SettingsLayout() {
    const [activeTab, setActiveTab] = useState("general");
    const { isLoading: isUserLoading, error: userError, settings, getSettings } = useUser();
    const navigate = useNavigate(); // *** USE useNavigate ***

    useEffect(() => {
        if (!settings && !isUserLoading) {
            getSettings();
        }
    }, [settings, getSettings, isUserLoading]);

    const handleGoBack = () => {
        navigate(-1); // *** CHANGE THIS to navigate(-1) ***
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

                {isUserLoading && !settings && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading settings...</span>
                    </div>
                )}

                {userError && !isUserLoading && (
                    <div className="alert alert-destructive mb-6">
                        <div>
                            <div className="alert-title">Error Loading Settings</div>
                            <div className="alert-description">{userError}</div>
                        </div>
                    </div>
                )}

                {!isUserLoading && (
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

                        {/* Tab Content Panels */}
                        <div className={`tab-content ${activeTab === "general" ? 'active' : ''}`} data-state={activeTab === "general" ? "active" : "inactive"}>
                            {activeTab === "general" && <GeneralSettings />}
                        </div>
                        <div className={`tab-content ${activeTab === "account" ? 'active' : ''}`} data-state={activeTab === "account" ? "active" : "inactive"}>
                            {activeTab === "account" && <AccountSettings />}
                        </div>
                        <div className={`tab-content ${activeTab === "entity" ? 'active' : ''}`} data-state={activeTab === "entity" ? "active" : "inactive"}>
                            {activeTab === "entity" && <EntitySettings />}
                        </div>
                        <div className={`tab-content ${activeTab === "search" ? 'active' : ''}`} data-state={activeTab === "search" ? "active" : "inactive"}>
                            {activeTab === "search" && <SearchSettings />}
                        </div>
                        <div className={`tab-content ${activeTab === "banlist" ? 'active' : ''}`} data-state={activeTab === "banlist" ? "active" : "inactive"}>
                            {activeTab === "banlist" && <BanListSettings />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
