import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import UserContextProvider, {useUserContext} from '../contexts/UserContext';
import {useAuth} from '../hooks/auth/useAuth';
import {useSettings} from '../hooks/settings/useSettings';
import useBanList from '../hooks/settings/useBanList';
import useEntityDefinitions from '../hooks/settings/useEntityDefinitions';
import useSearchPatterns from '../hooks/settings/useSearchPatterns';
import useUserProfile from '../hooks/auth/useUserProfile';
import {BrowserRouter} from 'react-router-dom';
import {BanListWithWords, ModelEntity, SearchPattern, User, UserSettings} from '../types';

// Mock all the hooks used by UserContext
vi.mock('../hooks/auth/useAuth', () => ({
    useAuth: vi.fn()
}));

vi.mock('../hooks/settings/useSettings', () => ({
    useSettings: vi.fn()
}));

vi.mock('../hooks/settings/useBanList', () => ({
    default: vi.fn()
}));

vi.mock('../hooks/settings/useEntityDefinitions', () => ({
    default: vi.fn()
}));

vi.mock('../hooks/settings/useSearchPatterns', () => ({
    default: vi.fn()
}));

vi.mock('../hooks/auth/useUserProfile', () => ({
    default: vi.fn()
}));

// Test component to consume the context
const TestConsumer = () => {
    const {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
        verifySession,
        settings,
        updateSettings,
        banList,
        addBanListWords,
        removeBanListWords,
        modelEntities,
        getModelEntities,
        addModelEntities,
        deleteModelEntity,
        replaceModelEntities,
        deleteAllEntitiesForMethod,
        updateAllEntitySelections,
        searchPatterns,
        getSearchPatterns,
        createSearchPattern,
        updateSearchPattern,
        deleteSearchPattern,
        getUserProfile,
        updateUserProfile,
        changePassword,
        deleteAccount
    } = useUserContext();

    return (
        <div>
            <div data-testid="user-info">{user ? JSON.stringify(user) : 'No user'}</div>
            <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
            <div data-testid="loading-status">{isLoading ? 'Loading' : 'Not loading'}</div>
            <div data-testid="error-message">{error || 'No error'}</div>
            <div data-testid="settings-info">{settings ? JSON.stringify(settings) : 'No settings'}</div>
            <div data-testid="banlist-info">{banList ? JSON.stringify(banList) : 'No ban list'}</div>
            <div data-testid="entities-info">{Object.keys(modelEntities).length > 0 ? 'Has entities' : 'No entities'}</div>
            <div data-testid="search-patterns-info">{searchPatterns.length > 0 ? JSON.stringify(searchPatterns) : 'No search patterns'}</div>

            <button
                data-testid="login-button"
                onClick={() => login('testuser', 'password')}
            >
                Login
            </button>
            <button
                data-testid="register-button"
                onClick={() => register('testuser', 'test@example.com', 'password', 'password')}
            >
                Register
            </button>
            <button
                data-testid="logout-button"
                onClick={() => logout()}
            >
                Logout
            </button>
            <button
                data-testid="clear-error-button"
                onClick={() => clearError()}
            >
                Clear Error
            </button>
            <button
                data-testid="verify-session-button"
                onClick={() => verifySession()}
            >
                Verify Session
            </button>
            <button
                data-testid="update-settings-button"
                onClick={() => updateSettings({ theme: 'dark' })}
            >
                Update Settings
            </button>
            <button
                data-testid="add-banlist-words-button"
                onClick={() => addBanListWords(['test'])}
            >
                Add Ban List Words
            </button>
            <button
                data-testid="remove-banlist-words-button"
                onClick={() => removeBanListWords(['test'])}
            >
                Remove Ban List Words
            </button>
            <button
                data-testid="get-model-entities-button"
                onClick={() => getModelEntities(1)}
            >
                Get Model Entities
            </button>
            <button
                data-testid="add-model-entities-button"
                onClick={() => addModelEntities({ method_id: 1, entity_texts: ['test'] })}
            >
                Add Model Entities
            </button>
            <button
                data-testid="delete-model-entity-button"
                onClick={() => deleteModelEntity(1)}
            >
                Delete Model Entity
            </button>
            <button
                data-testid="replace-model-entities-button"
                onClick={() => replaceModelEntities(1, [{ value: 'test', label: 'Test' }])}
            >
                Replace Model Entities
            </button>
            <button
                data-testid="delete-all-entities-button"
                onClick={() => deleteAllEntitiesForMethod(1)}
            >
                Delete All Entities for Method
            </button>
            <button
                data-testid="update-all-entity-selections-button"
                onClick={() => updateAllEntitySelections([], [], [], [])}
            >
                Update All Entity Selections
            </button>
            <button
                data-testid="get-search-patterns-button"
                onClick={() => getSearchPatterns()}
            >
                Get Search Patterns
            </button>
            <button
                data-testid="create-search-pattern-button"
                onClick={() => createSearchPattern({ pattern_type: 'text', pattern_text: 'test' })}
            >
                Create Search Pattern
            </button>
            <button
                data-testid="update-search-pattern-button"
                onClick={() => updateSearchPattern(1, { pattern_text: 'updated' })}
            >
                Update Search Pattern
            </button>
            <button
                data-testid="delete-search-pattern-button"
                onClick={() => deleteSearchPattern(1)}
            >
                Delete Search Pattern
            </button>
            <button
                data-testid="get-user-profile-button"
                onClick={() => getUserProfile()}
            >
                Get User Profile
            </button>
            <button
                data-testid="update-user-profile-button"
                onClick={() => updateUserProfile({ username: 'updated' })}
            >
                Update User Profile
            </button>
            <button
                data-testid="change-password-button"
                onClick={() => changePassword({ current_password: 'old', new_password: 'new', confirm_password: 'new' })}
            >
                Change Password
            </button>
            <button
                data-testid="delete-account-button"
                onClick={() => deleteAccount({ password: 'password', confirm: 'DELETE' })}
            >
                Delete Account
            </button>
        </div>
    );
};

// Component that will cause an error by using the hook outside the provider
const ErrorComponent = () => {
    try {
        useUserContext();
        return <div>No error</div>;
    } catch (error) {
        return <div data-testid="context-error">Context error occurred</div>;
    }
};

describe('UserContext', () => {
    // Mock user data
    const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
    };

    // Mock settings data
    const mockSettings: UserSettings = {
        id: 1,
        user_id: 1,
        theme: 'light',
        auto_processing: true,
        remove_images: false,
        is_ai_search: false,
        is_case_sensitive: false,
        detection_threshold: 0.5,
        use_banlist_for_detection: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
    };

    // Mock ban list data
    const mockBanList: BanListWithWords = {
        id: 1,
        words: ['sensitive']
    };

    // Mock model entities
    const mockModelEntities: Record<number, ModelEntity[]> = {
        1: [
            {
                id: 1,
                setting_id: 1,
                method_id: 1,
                entity_text: 'test-entity',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-01T00:00:00Z'
            }
        ]
    };

    // Mock search patterns
    const mockSearchPatterns: SearchPattern[] = [
        {
            id: 1,
            setting_id: 1,
            pattern_type: 'text',
            pattern_text: 'test-pattern',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mock for useAuth
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            login: vi.fn().mockResolvedValue(undefined),
            register: vi.fn().mockResolvedValue(undefined),
            logout: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            verifySession: vi.fn().mockResolvedValue(true),
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn()
        });

        // Setup default mock for useSettings
        vi.mocked(useSettings).mockReturnValue({
            settings: null,
            isLoading: false,
            error: null,
            getSettings: vi.fn().mockResolvedValue(null),
            updateSettings: vi.fn().mockResolvedValue(null),
            clearError: vi.fn(),
            isInitialized: false,
            exportSettings: vi.fn(),
            importSettings: vi.fn()
        });

        // Setup default mock for useBanList
        vi.mocked(useBanList).mockReturnValue({
            banList: null,
            isLoading: false,
            error: null,
            getBanList: vi.fn().mockResolvedValue(null),
            addBanListWords: vi.fn().mockResolvedValue(null),
            removeBanListWords: vi.fn().mockResolvedValue(null),
            clearError: vi.fn(),
            isInitialized: false
        });

        // Setup default mock for useEntityDefinitions
        vi.mocked(useEntityDefinitions).mockReturnValue({
            modelEntities: {},
            isLoading: false,
            error: null,
            getModelEntities: vi.fn().mockResolvedValue([]),
            addModelEntities: vi.fn().mockResolvedValue([]),
            deleteModelEntity: vi.fn().mockResolvedValue(undefined),
            replaceModelEntities: vi.fn().mockResolvedValue([]),
            deleteAllEntitiesForMethod: vi.fn().mockResolvedValue(undefined),
            updateAllEntitySelections: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            isMethodLoaded: vi.fn().mockReturnValue(false)
        });

        // Setup default mock for useSearchPatterns
        vi.mocked(useSearchPatterns).mockReturnValue({
            searchPatterns: [],
            isLoading: false,
            error: null,
            getSearchPatterns: vi.fn().mockResolvedValue([]),
            createSearchPattern: vi.fn().mockResolvedValue(null),
            updateSearchPattern: vi.fn().mockResolvedValue(null),
            deleteSearchPattern: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            isInitialized: false
        });

        // Setup default mock for useUserProfile
        vi.mocked(useUserProfile).mockReturnValue({
            getUserProfile: vi.fn().mockResolvedValue(null),
            updateUserProfile: vi.fn().mockResolvedValue(null),
            changePassword: vi.fn().mockResolvedValue(undefined),
            deleteAccount: vi.fn().mockResolvedValue(undefined),
            getActiveSessions: vi.fn().mockResolvedValue([]),
            invalidateSession: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    test('provides user context to children with initial state', () => {
        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Initial state should be empty or with default values
        expect(screen.getByTestId('user-info').textContent).toBe('No user');
        expect(screen.getByTestId('auth-status').textContent).toBe('Not authenticated');
        expect(screen.getByTestId('loading-status').textContent).toBe('Not loading');
        expect(screen.getByTestId('error-message').textContent).toBe('No error');
        expect(screen.getByTestId('settings-info').textContent).toBe('No settings');
        expect(screen.getByTestId('banlist-info').textContent).toBe('No ban list');
        expect(screen.getByTestId('entities-info').textContent).toBe('No entities');
        expect(screen.getByTestId('search-patterns-info').textContent).toBe('No search patterns');
    });

    test('throws error when used outside provider', () => {
        render(<ErrorComponent />);
        expect(screen.getByTestId('context-error')).toBeInTheDocument();
    });

    test('provides authenticated user state correctly', () => {
        // Mock authenticated state
        vi.mocked(useAuth).mockReturnValue({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            clearError: vi.fn(),
            verifySession: vi.fn().mockResolvedValue(true),
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn()
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        expect(screen.getByTestId('user-info').textContent).toContain('testuser');
        expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    });

    test('provides settings correctly', () => {
        // Mock settings
        vi.mocked(useSettings).mockReturnValue({
            settings: mockSettings,
            isLoading: false,
            error: null,
            getSettings: vi.fn().mockResolvedValue(mockSettings),
            updateSettings: vi.fn().mockResolvedValue(mockSettings),
            clearError: vi.fn(),
            isInitialized: true,
            exportSettings: vi.fn(),
            importSettings: vi.fn()
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        expect(screen.getByTestId('settings-info').textContent).toContain('light');
    });

    test('provides ban list correctly', () => {
        // Mock ban list
        vi.mocked(useBanList).mockReturnValue({
            banList: mockBanList,
            isLoading: false,
            error: null,
            getBanList: vi.fn().mockResolvedValue(mockBanList),
            addBanListWords: vi.fn().mockResolvedValue(mockBanList),
            removeBanListWords: vi.fn().mockResolvedValue(mockBanList),
            clearError: vi.fn(),
            isInitialized: true
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        expect(screen.getByTestId('banlist-info').textContent).toContain('sensitive');
    });

    test('provides model entities correctly', () => {
        // Mock model entities
        vi.mocked(useEntityDefinitions).mockReturnValue({
            modelEntities: mockModelEntities,
            isLoading: false,
            error: null,
            getModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            addModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            deleteModelEntity: vi.fn().mockResolvedValue(undefined),
            replaceModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            deleteAllEntitiesForMethod: vi.fn().mockResolvedValue(undefined),
            updateAllEntitySelections: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            isMethodLoaded: function (methodId: number): boolean {
                throw new Error('Function not implemented.');
            }
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        expect(screen.getByTestId('entities-info').textContent).toBe('Has entities');
    });

    test('provides search patterns correctly', () => {
        // Mock search patterns
        vi.mocked(useSearchPatterns).mockReturnValue({
            searchPatterns: mockSearchPatterns,
            isLoading: false,
            error: null,
            getSearchPatterns: vi.fn().mockResolvedValue(mockSearchPatterns),
            createSearchPattern: vi.fn().mockResolvedValue(mockSearchPatterns[0]),
            updateSearchPattern: vi.fn().mockResolvedValue(mockSearchPatterns[0]),
            deleteSearchPattern: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            isInitialized: true
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        expect(screen.getByTestId('search-patterns-info').textContent).toContain('test-pattern');
    });

    test('calls login function correctly', async () => {
        const loginMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            login: loginMock,
            register: vi.fn(),
            logout: vi.fn(),
            clearError: vi.fn(),
            verifySession: vi.fn().mockResolvedValue(true),
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn()
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click login button
        await act(async () => {
            fireEvent.click(screen.getByTestId('login-button'));
        });

        // Verify login was called with correct parameters
        expect(loginMock).toHaveBeenCalledWith('testuser', 'password');
    });

    test('calls register function correctly', async () => {
        const registerMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            login: vi.fn(),
            register: registerMock,
            logout: vi.fn(),
            clearError: vi.fn(),
            verifySession: vi.fn().mockResolvedValue(true),
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn()
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click register button
        await act(async () => {
            fireEvent.click(screen.getByTestId('register-button'));
        });

        // Verify register was called with correct parameters
        expect(registerMock).toHaveBeenCalledWith('testuser', 'test@example.com', 'password', 'password');
    });

    test('calls logout function correctly', async () => {
        const logoutMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useAuth).mockReturnValue({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: logoutMock,
            clearError: vi.fn(),
            verifySession: vi.fn().mockResolvedValue(true),
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn()
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click logout button
        await act(async () => {
            fireEvent.click(screen.getByTestId('logout-button'));
        });

        // Verify logout was called
        expect(logoutMock).toHaveBeenCalled();
    });

    test('calls verifySession function correctly', async () => {
        const verifySessionMock = vi.fn().mockResolvedValue(true);
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            clearError: vi.fn(),
            verifySession: verifySessionMock,
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn()
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click verify session button
        await act(async () => {
            fireEvent.click(screen.getByTestId('verify-session-button'));
        });

        // Verify verifySession was called
        expect(verifySessionMock).toHaveBeenCalled();
    });

    test('calls updateSettings function correctly', async () => {
        const updateSettingsMock = vi.fn().mockResolvedValue(mockSettings);
        vi.mocked(useSettings).mockReturnValue({
            settings: mockSettings,
            isLoading: false,
            error: null,
            getSettings: vi.fn().mockResolvedValue(mockSettings),
            updateSettings: updateSettingsMock,
            clearError: vi.fn(),
            isInitialized: true,
            exportSettings: vi.fn(),
            importSettings: vi.fn()
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click update settings button
        await act(async () => {
            fireEvent.click(screen.getByTestId('update-settings-button'));
        });

        // Verify updateSettings was called with correct parameters
        expect(updateSettingsMock).toHaveBeenCalledWith({ theme: 'dark' });
    });

    test('calls addBanListWords function correctly', async () => {
        const addBanListWordsMock = vi.fn().mockResolvedValue(mockBanList);
        vi.mocked(useBanList).mockReturnValue({
            banList: mockBanList,
            isLoading: false,
            error: null,
            getBanList: vi.fn().mockResolvedValue(mockBanList),
            addBanListWords: addBanListWordsMock,
            removeBanListWords: vi.fn().mockResolvedValue(mockBanList),
            clearError: vi.fn(),
            isInitialized: true
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click add ban list words button
        await act(async () => {
            fireEvent.click(screen.getByTestId('add-banlist-words-button'));
        });

        // Verify addBanListWords was called with correct parameters
        expect(addBanListWordsMock).toHaveBeenCalledWith(['test']);
    });

    test('calls removeBanListWords function correctly', async () => {
        const removeBanListWordsMock = vi.fn().mockResolvedValue(mockBanList);
        vi.mocked(useBanList).mockReturnValue({
            banList: mockBanList,
            isLoading: false,
            error: null,
            getBanList: vi.fn().mockResolvedValue(mockBanList),
            addBanListWords: vi.fn().mockResolvedValue(mockBanList),
            removeBanListWords: removeBanListWordsMock,
            clearError: vi.fn(),
            isInitialized: true
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click remove ban list words button
        await act(async () => {
            fireEvent.click(screen.getByTestId('remove-banlist-words-button'));
        });

        // Verify removeBanListWords was called with correct parameters
        expect(removeBanListWordsMock).toHaveBeenCalledWith(['test']);
    });

    test('calls getModelEntities function correctly', async () => {
        const getModelEntitiesMock = vi.fn().mockResolvedValue(mockModelEntities[1]);
        vi.mocked(useEntityDefinitions).mockReturnValue({
            modelEntities: mockModelEntities,
            isLoading: false,
            error: null,
            getModelEntities: getModelEntitiesMock,
            addModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            deleteModelEntity: vi.fn().mockResolvedValue(undefined),
            replaceModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            deleteAllEntitiesForMethod: vi.fn().mockResolvedValue(undefined),
            updateAllEntitySelections: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            isMethodLoaded: vi.fn().mockReturnValue(true)
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click get model entities button
        await act(async () => {
            fireEvent.click(screen.getByTestId('get-model-entities-button'));
        });

        // Verify getModelEntities was called with correct parameters
        expect(getModelEntitiesMock).toHaveBeenCalledWith(1);
    });

    test('calls addModelEntities function correctly', async () => {
        const addModelEntitiesMock = vi.fn().mockResolvedValue(mockModelEntities[1]);
        vi.mocked(useEntityDefinitions).mockReturnValue({
            modelEntities: mockModelEntities,
            isLoading: false,
            error: null,
            getModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            addModelEntities: addModelEntitiesMock,
            deleteModelEntity: vi.fn().mockResolvedValue(undefined),
            replaceModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            deleteAllEntitiesForMethod: vi.fn().mockResolvedValue(undefined),
            updateAllEntitySelections: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            isMethodLoaded: vi.fn().mockReturnValue(true)
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click add model entities button
        await act(async () => {
            fireEvent.click(screen.getByTestId('add-model-entities-button'));
        });

        // Verify addModelEntities was called with correct parameters
        expect(addModelEntitiesMock).toHaveBeenCalledWith({ method_id: 1, entity_texts: ['test'] });
    });

    test('calls deleteModelEntity function correctly', async () => {
        const deleteModelEntityMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useEntityDefinitions).mockReturnValue({
            modelEntities: mockModelEntities,
            isLoading: false,
            error: null,
            getModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            addModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            deleteModelEntity: deleteModelEntityMock,
            replaceModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            deleteAllEntitiesForMethod: vi.fn().mockResolvedValue(undefined),
            updateAllEntitySelections: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            isMethodLoaded: vi.fn().mockReturnValue(true)
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click delete model entity button
        await act(async () => {
            fireEvent.click(screen.getByTestId('delete-model-entity-button'));
        });

        // Verify deleteModelEntity was called with correct parameters
        expect(deleteModelEntityMock).toHaveBeenCalledWith(1);
    });

    test('calls replaceModelEntities function correctly', async () => {
        const replaceModelEntitiesMock = vi.fn().mockResolvedValue(mockModelEntities[1]);
        vi.mocked(useEntityDefinitions).mockReturnValue({
            modelEntities: mockModelEntities,
            isLoading: false,
            error: null,
            getModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            addModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            deleteModelEntity: vi.fn().mockResolvedValue(undefined),
            replaceModelEntities: replaceModelEntitiesMock,
            deleteAllEntitiesForMethod: vi.fn().mockResolvedValue(undefined),
            updateAllEntitySelections: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            isMethodLoaded: vi.fn().mockReturnValue(true)
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click replace model entities button
        await act(async () => {
            fireEvent.click(screen.getByTestId('replace-model-entities-button'));
        });

        // Verify replaceModelEntities was called with correct parameters
        expect(replaceModelEntitiesMock).toHaveBeenCalledWith(1, [{ value: 'test', label: 'Test' }]);
    });

    test('calls deleteAllEntitiesForMethod function correctly', async () => {
        const deleteAllEntitiesForMethodMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useEntityDefinitions).mockReturnValue({
            modelEntities: mockModelEntities,
            isLoading: false,
            error: null,
            getModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            addModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            deleteModelEntity: vi.fn().mockResolvedValue(undefined),
            replaceModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            deleteAllEntitiesForMethod: deleteAllEntitiesForMethodMock,
            updateAllEntitySelections: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            isMethodLoaded: vi.fn().mockReturnValue(true)
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click delete all entities button
        await act(async () => {
            fireEvent.click(screen.getByTestId('delete-all-entities-button'));
        });

        // Verify deleteAllEntitiesForMethod was called with correct parameters
        expect(deleteAllEntitiesForMethodMock).toHaveBeenCalledWith(1);
    });

    test('calls updateAllEntitySelections function correctly', async () => {
        const updateAllEntitySelectionsMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useEntityDefinitions).mockReturnValue({
            modelEntities: mockModelEntities,
            isLoading: false,
            error: null,
            getModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            addModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            deleteModelEntity: vi.fn().mockResolvedValue(undefined),
            replaceModelEntities: vi.fn().mockResolvedValue(mockModelEntities[1]),
            deleteAllEntitiesForMethod: vi.fn().mockResolvedValue(undefined),
            updateAllEntitySelections: updateAllEntitySelectionsMock,
            clearError: vi.fn(),
            isMethodLoaded: vi.fn().mockReturnValue(true)
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click update all entity selections button
        await act(async () => {
            fireEvent.click(screen.getByTestId('update-all-entity-selections-button'));
        });

        // Verify updateAllEntitySelections was called with correct parameters
        expect(updateAllEntitySelectionsMock).toHaveBeenCalledWith([], [], [], []);
    });

    test('calls getSearchPatterns function correctly', async () => {
        const getSearchPatternsMock = vi.fn().mockResolvedValue(mockSearchPatterns);
        vi.mocked(useSearchPatterns).mockReturnValue({
            searchPatterns: mockSearchPatterns,
            isLoading: false,
            error: null,
            getSearchPatterns: getSearchPatternsMock,
            createSearchPattern: vi.fn().mockResolvedValue(mockSearchPatterns[0]),
            updateSearchPattern: vi.fn().mockResolvedValue(mockSearchPatterns[0]),
            deleteSearchPattern: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            isInitialized: true
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click get search patterns button
        await act(async () => {
            fireEvent.click(screen.getByTestId('get-search-patterns-button'));
        });

        // Verify getSearchPatterns was called
        expect(getSearchPatternsMock).toHaveBeenCalled();
    });

    test('calls createSearchPattern function correctly', async () => {
        const createSearchPatternMock = vi.fn().mockResolvedValue(mockSearchPatterns[0]);
        vi.mocked(useSearchPatterns).mockReturnValue({
            searchPatterns: mockSearchPatterns,
            isLoading: false,
            error: null,
            getSearchPatterns: vi.fn().mockResolvedValue(mockSearchPatterns),
            createSearchPattern: createSearchPatternMock,
            updateSearchPattern: vi.fn().mockResolvedValue(mockSearchPatterns[0]),
            deleteSearchPattern: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            isInitialized: true
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click create search pattern button
        await act(async () => {
            fireEvent.click(screen.getByTestId('create-search-pattern-button'));
        });

        // Verify createSearchPattern was called with correct parameters
        expect(createSearchPatternMock).toHaveBeenCalledWith({ pattern_type: 'text', pattern_text: 'test' });
    });

    test('calls updateSearchPattern function correctly', async () => {
        const updateSearchPatternMock = vi.fn().mockResolvedValue(mockSearchPatterns[0]);
        vi.mocked(useSearchPatterns).mockReturnValue({
            searchPatterns: mockSearchPatterns,
            isLoading: false,
            error: null,
            getSearchPatterns: vi.fn().mockResolvedValue(mockSearchPatterns),
            createSearchPattern: vi.fn().mockResolvedValue(mockSearchPatterns[0]),
            updateSearchPattern: updateSearchPatternMock,
            deleteSearchPattern: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            isInitialized: true
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click update search pattern button
        await act(async () => {
            fireEvent.click(screen.getByTestId('update-search-pattern-button'));
        });

        // Verify updateSearchPattern was called with correct parameters
        expect(updateSearchPatternMock).toHaveBeenCalledWith(1, { pattern_text: 'updated' });
    });

    test('calls deleteSearchPattern function correctly', async () => {
        const deleteSearchPatternMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useSearchPatterns).mockReturnValue({
            searchPatterns: mockSearchPatterns,
            isLoading: false,
            error: null,
            getSearchPatterns: vi.fn().mockResolvedValue(mockSearchPatterns),
            createSearchPattern: vi.fn().mockResolvedValue(mockSearchPatterns[0]),
            updateSearchPattern: vi.fn().mockResolvedValue(mockSearchPatterns[0]),
            deleteSearchPattern: deleteSearchPatternMock,
            clearError: vi.fn(),
            isInitialized: true
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click delete search pattern button
        await act(async () => {
            fireEvent.click(screen.getByTestId('delete-search-pattern-button'));
        });

        // Verify deleteSearchPattern was called with correct parameters
        expect(deleteSearchPatternMock).toHaveBeenCalledWith(1);
    });

    test('calls getUserProfile function correctly', async () => {
        const getUserProfileMock = vi.fn().mockResolvedValue(mockUser);
        vi.mocked(useUserProfile).mockReturnValue({
            getUserProfile: getUserProfileMock,
            updateUserProfile: vi.fn().mockResolvedValue(mockUser),
            changePassword: vi.fn().mockResolvedValue(undefined),
            deleteAccount: vi.fn().mockResolvedValue(undefined),
            getActiveSessions: vi.fn().mockResolvedValue([]),
            invalidateSession: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            error: null
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click get user profile button
        await act(async () => {
            fireEvent.click(screen.getByTestId('get-user-profile-button'));
        });

        // Verify getUserProfile was called
        expect(getUserProfileMock).toHaveBeenCalled();
    });

    test('calls updateUserProfile function correctly', async () => {
        const updateUserProfileMock = vi.fn().mockResolvedValue(mockUser);
        vi.mocked(useUserProfile).mockReturnValue({
            getUserProfile: vi.fn().mockResolvedValue(mockUser),
            updateUserProfile: updateUserProfileMock,
            changePassword: vi.fn().mockResolvedValue(undefined),
            deleteAccount: vi.fn().mockResolvedValue(undefined),
            getActiveSessions: vi.fn().mockResolvedValue([]),
            invalidateSession: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            error: null
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click update user profile button
        await act(async () => {
            fireEvent.click(screen.getByTestId('update-user-profile-button'));
        });

        // Verify updateUserProfile was called with correct parameters
        expect(updateUserProfileMock).toHaveBeenCalledWith({ username: 'updated' });
    });

    test('calls changePassword function correctly', async () => {
        const changePasswordMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useUserProfile).mockReturnValue({
            getUserProfile: vi.fn().mockResolvedValue(mockUser),
            updateUserProfile: vi.fn().mockResolvedValue(mockUser),
            changePassword: changePasswordMock,
            deleteAccount: vi.fn().mockResolvedValue(undefined),
            getActiveSessions: vi.fn().mockResolvedValue([]),
            invalidateSession: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            error: null
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click change password button
        await act(async () => {
            fireEvent.click(screen.getByTestId('change-password-button'));
        });

        // Verify changePassword was called with correct parameters
        expect(changePasswordMock).toHaveBeenCalledWith({ current_password: 'old', new_password: 'new', confirm_password: 'new' });
    });

    test('calls deleteAccount function correctly', async () => {
        const deleteAccountMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useUserProfile).mockReturnValue({
            getUserProfile: vi.fn().mockResolvedValue(mockUser),
            updateUserProfile: vi.fn().mockResolvedValue(mockUser),
            changePassword: vi.fn().mockResolvedValue(undefined),
            deleteAccount: deleteAccountMock,
            getActiveSessions: vi.fn().mockResolvedValue([]),
            invalidateSession: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            error: null
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click delete account button
        await act(async () => {
            fireEvent.click(screen.getByTestId('delete-account-button'));
        });

        // Verify deleteAccount was called with correct parameters
        expect(deleteAccountMock).toHaveBeenCalledWith({ password: 'password', confirm: 'DELETE' });
    });

    test('handles error states correctly', () => {
        // Mock error state
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Authentication error',
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            clearError: vi.fn(),
            verifySession: vi.fn().mockResolvedValue(false),
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn()
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        expect(screen.getByTestId('error-message').textContent).toBe('Authentication error');
    });

    test('calls clearError function correctly', async () => {
        const clearErrorMock = vi.fn();
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Authentication error',
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            clearError: clearErrorMock,
            verifySession: vi.fn().mockResolvedValue(true),
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn()
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click clear error button
        await act(async () => {
            fireEvent.click(screen.getByTestId('clear-error-button'));
        });

        // Verify clearError was called
        expect(clearErrorMock).toHaveBeenCalled();
    });

    test('handles loading state correctly', () => {
        // Mock loading state
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            isAuthenticated: false,
            isLoading: true,
            error: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            clearError: vi.fn(),
            verifySession: vi.fn().mockResolvedValue(true),
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn()
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        expect(screen.getByTestId('loading-status').textContent).toBe('Loading');
    });

    test('handles failed function calls correctly', async () => {
        // Mock login function that fails
        const loginMock = vi.fn().mockRejectedValue(new Error('Login failed'));
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            login: loginMock,
            register: vi.fn(),
            logout: vi.fn(),
            clearError: vi.fn(),
            verifySession: vi.fn().mockResolvedValue(true),
            setUser: vi.fn(),
            setIsAuthenticated: vi.fn(),
            setIsLoading: vi.fn(),
            setError: vi.fn()
        });

        render(
            <BrowserRouter>
                <UserContextProvider>
                    <TestConsumer />
                </UserContextProvider>
            </BrowserRouter>
        );

        // Click login button
        await act(async () => {
            fireEvent.click(screen.getByTestId('login-button'));
        });

        // Verify login was called and error was thrown
        expect(loginMock).toHaveBeenCalled();
        // The error would be handled within the provider
    });
});