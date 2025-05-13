import React, {createContext, useContext, useMemo, useEffect} from 'react';
import {useAuth} from '../hooks/auth/useAuth';
import {useSettings} from '../hooks/settings/useSettings';
import {
    AccountDeletion,
    BanListWithWords,
    ModelEntity,
    ModelEntityBatch,
    OptionType,
    PasswordChange,
    SearchPattern,
    SearchPatternCreate,
    SearchPatternUpdate,
    User,
    UserSettings,
    UserSettingsUpdate,
    UserUpdate
} from "../types";
import useBanList from '../hooks/settings/useBanList';
import useEntityDefinitions from '../hooks/settings/useEntityDefinitions';
import useSearchPatterns from '../hooks/settings/useSearchPatterns';
import useUserProfile from '../hooks/auth/useUserProfile';
import { SettingsExport } from '../hooks/settings/useDocument';
import apiClient from '../services/api-services/apiClient';

interface UserContextProps {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (usernameOrEmail: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string, confirmPassword: string) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
    setUser: (user: User | null) => void;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    verifySession: () => Promise<boolean>; // Add verifySession to the interface
    settings: UserSettings | null;
    getSettings: (forceRefresh?: boolean) => Promise<UserSettings | null>;
    updateSettings: (data: UserSettingsUpdate) => Promise<UserSettings | null>;
    exportSettings: () => Promise<void>;
    importSettings: (settingsFile: File) => Promise<UserSettings | null>;
    settingsLoading: boolean;
    settingsError: string | null;
    clearSettingsError: () => void;
    banList: BanListWithWords | null;
    getBanList: (forceRefresh?: boolean) => Promise<BanListWithWords | null>;
    addBanListWords: (words: string[]) => Promise<BanListWithWords | null>;
    removeBanListWords: (words: string[]) => Promise<BanListWithWords | null>;
    banListLoading: boolean;
    banListError: string | null;
    clearBanListError: () => void;
    modelEntities: Record<number, ModelEntity[]>;
    getModelEntities: (methodId: number, forceRefresh?: boolean) => Promise<ModelEntity[] | null>;
    addModelEntities: (data: ModelEntityBatch) => Promise<ModelEntity[]>;
    deleteModelEntity: (entityId: number) => Promise<void>;
    replaceModelEntities: (methodId: number, entities: OptionType[]) => Promise<ModelEntity[] | null>;
    deleteAllEntitiesForMethod: (methodId: number) => Promise<void>;
    updateAllEntitySelections: (
        presidioEntities: OptionType[],
        glinerEntities: OptionType[],
        geminiEntities: OptionType[],
        hidemeEntities: OptionType[]
    ) => Promise<void>;
    searchPatterns: SearchPattern[];
    getSearchPatterns: (forceRefresh?: boolean) => Promise<SearchPattern[]>;
    createSearchPattern: (data: SearchPatternCreate) => Promise<SearchPattern | null>;
    updateSearchPattern: (patternId: number, data: SearchPatternUpdate) => Promise<SearchPattern | null>;
    deleteSearchPattern: (patternId: number) => Promise<void>;
    searchPatternsLoading: boolean;
    searchPatternsError: string | null;
    clearSearchPatternsError: () => void;
    getUserProfile: () => Promise<User | null>;
    updateUserProfile: (data: UserUpdate) => Promise<User | null>;
    changePassword: (data: PasswordChange) => Promise<void>;
    deleteAccount: (data: AccountDeletion) => Promise<void>;
    modelLoading: boolean;
    modelError: string | null;
    clearModelError: () => void;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserContextProvider');
    }
    return context;
};
/**
 * Provider component that initializes and connects the user authentication system
 * This component doesn't render anything visible - it just connects contexts
 */
const UserContextProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {

    const {
        user, isAuthenticated, isLoading, error, // Authentication methods
        login, register, logout, // Session verification
        verifySession, // Add verifySession from useAuth
        // Utility methods
        clearError,

        //user context
        setUser, setIsAuthenticated, setIsLoading, setError,
    } = useAuth();

    const {
        settings,
        getSettings,
        updateSettings,
        exportSettings,
        importSettings,
        isLoading: settingsLoading,
        error: settingsError,
        clearError: clearSettingsError,
    } = useSettings();
    const {
        banList,
        getBanList,
        addBanListWords,
        removeBanListWords,
        isLoading: banListLoading,
        error: banListError,
        clearError: clearBanListError,
    } = useBanList();
    const {
        modelEntities, getModelEntities,
        addModelEntities,
        deleteModelEntity,
        replaceModelEntities,
        deleteAllEntitiesForMethod,
        updateAllEntitySelections, isLoading: modelLoading, error: modelError, clearError: clearModelError,
    } = useEntityDefinitions();
    const {
        searchPatterns,
        getSearchPatterns,
        createSearchPattern,
        updateSearchPattern,
        deleteSearchPattern,
        isLoading: searchPatternsLoading,
        error: searchPatternsError,
        clearError: clearSearchPatternsError,
    } = useSearchPatterns();
    const {
        getUserProfile,
        updateUserProfile,
        changePassword,
        deleteAccount,
    } = useUserProfile();

    // Add an effect to refresh all settings after import
    useEffect(() => {
        const handleSettingsImport = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { success } = customEvent.detail || {};

            // Only refresh if import was successful
            if (success) {
                console.log('[UserContext] Settings import completed, refreshing all settings');

                // Clear all settings-related caches to ensure fresh data
                apiClient.clearCacheEntry('/settings');
                apiClient.clearCacheEntry('/settings/patterns');
                apiClient.clearCacheEntry('/settings/ban-list');

                // Method IDs are typically 1-4 (Presidio, Gemini, Gliner, HideMe)
                [1, 2, 3, 4].forEach(methodId => {
                    apiClient.clearCacheEntry(`/settings/entities/${methodId}`);
                });

                // Refresh all settings states with a small delay to ensure cache is cleared
                setTimeout(() => {
                    // Refresh general settings with force refresh
                    getSettings(true).then(() => {
                        console.log('[UserContext] General settings refreshed');
                    }).catch(err => console.error('[UserContext] Failed to refresh general settings:', err));

                    // Refresh ban list with force refresh
                    getBanList(true).then(() => {
                        console.log('[UserContext] Ban list refreshed');
                    }).catch(err => console.error('[UserContext] Failed to refresh ban list:', err));

                    // Refresh model entities for each potential method
                    [1, 2, 3, 4].forEach(methodId => {
                        getModelEntities(methodId, true).then(() => {
                            console.log(`[UserContext] Model entities for method ${methodId} refreshed`);
                        }).catch(err => console.error(`[UserContext] Failed to refresh model entities for method ${methodId}:`, err));
                    });

                    // Wait a bit longer for search patterns to ensure other requests are completed
                    setTimeout(() => {
                        console.log('[UserContext] Starting search patterns refresh with longer delay');
                        // Force refresh the search patterns cache again
                        apiClient.clearCacheEntry('/settings/patterns');

                        // Refresh search patterns with force refresh
                        getSearchPatterns(true).then((patterns) => {
                            console.log(`[UserContext] Search patterns refreshed, found ${patterns.length} patterns`);
                        }).catch(err => console.error('[UserContext] Failed to refresh search patterns:', err));
                    }, 300);
                }, 100);
            }
        };

        // Add event listener for settings import completion
        window.addEventListener('settings-import-completed', handleSettingsImport);

        // Clean up
        return () => {
            window.removeEventListener('settings-import-completed', handleSettingsImport);
        };
    }, [getSettings, getBanList, getModelEntities, getSearchPatterns]);

    return useMemo(() => (<UserContext.Provider
        value={{
            user,
            isAuthenticated,
            isLoading,
            error,
            login,
            register,
            logout,
            clearError,
            setUser,
            setIsAuthenticated,
            setIsLoading,
            setError,
            verifySession, // Include verifySession in the context
            settings,
            getSettings,
            updateSettings,
            exportSettings,
            importSettings,
            settingsLoading,
            settingsError,
            clearSettingsError,
            banList,
            getBanList,
            addBanListWords,
            removeBanListWords,
            banListLoading,
            banListError,
            clearBanListError,
            modelEntities,
            modelError,
            clearModelError,
            getModelEntities,
            addModelEntities,
            deleteModelEntity,
            replaceModelEntities,
            deleteAllEntitiesForMethod,
            updateAllEntitySelections,
            modelLoading,
            searchPatternsLoading,
            searchPatterns,
            getSearchPatterns,
            createSearchPattern,
            updateSearchPattern,
            deleteSearchPattern,
            searchPatternsError,
            clearSearchPatternsError,
            getUserProfile,
            updateUserProfile,
            changePassword,
            deleteAccount,
        }}
    >
        {children}
    </UserContext.Provider>), [user, isAuthenticated, isLoading, error, login, register, logout, clearError, setUser, setIsAuthenticated, setIsLoading, setError, verifySession, // Add to dependency array
    settings, getSettings, updateSettings, exportSettings, importSettings, settingsLoading, settingsError, clearSettingsError,
    banList, getBanList, addBanListWords, removeBanListWords, banListLoading, banListError, clearBanListError,
    modelEntities, getModelEntities, addModelEntities, deleteModelEntity, replaceModelEntities,
    deleteAllEntitiesForMethod, updateAllEntitySelections, modelLoading, modelError, clearModelError,
    searchPatterns, getSearchPatterns, createSearchPattern, updateSearchPattern, deleteSearchPattern,
    searchPatternsLoading, searchPatternsError, clearSearchPatternsError,
    getUserProfile, updateUserProfile, changePassword, deleteAccount
    ]);
};

export default UserContextProvider;
