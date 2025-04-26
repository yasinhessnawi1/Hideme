import React, {createContext, useContext, useState, useCallback, useMemo} from 'react';

interface LoadingState {
    [key: string]: boolean;
}

interface LoadingContextType {
    loadingStates: LoadingState;
    isLoading: (key?: string | string[]) => boolean;
    startLoading: (key: string) => void;
    stopLoading: (key: string) => void;
    anyLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loadingStates, setLoadingStates] = useState<LoadingState>({});

    const startLoading = useCallback((key: string) => {
        setLoadingStates(prev => ({ ...prev, [key]: true }));
    }, []);

    const stopLoading = useCallback((key: string) => {
        setLoadingStates(prev => ({ ...prev, [key]: false }));
    }, []);

    const isLoading = useCallback((key?: string | string[]) => {
        if (!key) {
            return Object.values(loadingStates).some(Boolean);
        }

        if (Array.isArray(key)) {
            return key.some(k => loadingStates[k]);
        }

        return loadingStates[key];
    }, [loadingStates]);

    // Check if any loading state is active
    const anyLoading = Object.values(loadingStates).some(Boolean);

    // In the LoadingProvider component
    const value = useMemo(() => ({
        loadingStates,
        isLoading,
        startLoading,
        stopLoading,
        anyLoading
    }), [loadingStates, isLoading, startLoading, stopLoading, anyLoading]);

    return (
        <LoadingContext.Provider value={value}>
            {children}
        </LoadingContext.Provider>
    );
};

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};
