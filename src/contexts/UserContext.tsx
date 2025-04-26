import React, {createContext, useContext, useMemo} from 'react';
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
    getSettings: () => Promise<UserSettings | null>;
    updateSettings: (data: UserSettingsUpdate) => Promise<UserSettings | null>;
    settingsLoading: boolean;
    settingsError: string | null;
    clearSettingsError: () => void;
    banList: BanListWithWords | null;
    getBanList: () => Promise<BanListWithWords | null>;
    addBanListWords: (words: string[]) => Promise<BanListWithWords | null>;
    removeBanListWords: (words: string[]) => Promise<BanListWithWords | null>;
    banListLoading: boolean;
    banListError: string | null;
    clearBanListError: () => void;
    modelEntities: Record<number, ModelEntity[]>;
    getModelEntities: (methodId: number) => Promise<ModelEntity[]>;
    addModelEntities: (data: ModelEntityBatch) => Promise<ModelEntity[]>;
    deleteModelEntity: (entityId: number) => Promise<void>;
    replaceModelEntities: (methodId: number, entities: OptionType[]) => Promise<ModelEntity[]>;
    deleteAllEntitiesForMethod: (methodId: number) => Promise<void>;
    updateAllEntitySelections: (
        presidioEntities: OptionType[],
        glinerEntities: OptionType[],
        geminiEntities: OptionType[],
        hidemeEntities: OptionType[]
    ) => Promise<void>;
    searchPatterns: SearchPattern[];
    getSearchPatterns: () => Promise<SearchPattern[]>;
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
    </UserContext.Provider>), [user, isAuthenticated, isLoading, error, login, register, logout, clearError, setUser, setIsAuthenticated, setIsLoading, setError, verifySession // Add to dependency array
    ]);
};

export default UserContextProvider;
