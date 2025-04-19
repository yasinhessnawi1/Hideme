import React, {createContext, useContext, useEffect, useMemo} from 'react';
import { useAuth} from '../hooks/auth/useAuth';
import {User} from "../types";

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
const UserContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const {  user,
        isAuthenticated,
        isLoading,
        error,
        // Authentication methods
        login,
        register,
        logout,
        // Session verification
        verifySession, // Add verifySession from useAuth
        // Utility methods
        clearError,

        //user context
        setUser,
        setIsAuthenticated,
        setIsLoading,
        setError,
    }
        = useAuth();


    return useMemo(() => (
        <UserContext.Provider
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
                verifySession // Include verifySession in the context
            }}
        >
            {children}
        </UserContext.Provider>
    ), [
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
        verifySession // Add to dependency array
    ]);
};

export default UserContextProvider;
