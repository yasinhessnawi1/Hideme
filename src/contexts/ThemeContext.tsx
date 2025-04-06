
import React, { createContext, useContext, ReactNode } from 'react';
import {AppliedTheme, ThemePreference, useTheme} from "../hooks/useTheme";

interface ThemeContextProps {
    preference: ThemePreference;
    setPreference: (pref: ThemePreference) => void;
    appliedTheme: AppliedTheme;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

/**
 * Provides the theme context to its children.
 * Initializes the useTheme hook.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const theme = useTheme('system'); // Initialize with 'system' default

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};

/**
 * Hook to consume the theme context.
 * Must be used within a ThemeProvider.
 */
export const useThemeContext = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
};
