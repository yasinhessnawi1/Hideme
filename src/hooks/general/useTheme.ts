// src/hooks/useTheme.ts
import { useState, useEffect, useCallback } from 'react';

// Define the possible theme preferences and the actually applied themes
export type ThemePreference = 'light' | 'dark' | 'system';
export type AppliedTheme = 'light' | 'dark';

// Key for storing the user's preference in localStorage
const THEME_STORAGE_KEY = 'theme-preference';

/**
 * Checks the user's system preference for dark mode.
 * Safe for SSR environments.
 * @returns 'dark' or 'light'
 */
const getSystemTheme = (): AppliedTheme => {
    if (typeof window !== 'undefined') {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }
    return 'light'; // Default for SSR or environments without matchMedia
};

/**
 * Applies the chosen theme ('light' or 'dark') to the document's root element.
 * Sets 'data-theme' attribute and adds/removes 'dark' class.
 * @param theme - The theme to apply ('light' or 'dark')
 */
const applyThemeToDOM = (theme: AppliedTheme) => {
    if (typeof document === 'undefined') return; // Guard for SSR

    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    console.log(`[Theme] Applied theme: ${theme}`);
};

/**
 * Custom hook to manage theme preference and application.
 * - Supports 'light', 'dark', and 'system' preferences.
 * - Defaults to 'system'.
 * - Persists preference in localStorage.
 * - Listens for system theme changes when 'system' preference is active.
 * - Applies the correct theme ('light' or 'dark') to the DOM.
 *
 * @param defaultPreference - The initial theme preference if none is stored. Defaults to 'system'.
 * @returns An object containing the current preference, a function to set the preference,
 *          and the currently applied theme ('light' or 'dark').
 */
export const useTheme = (defaultPreference: ThemePreference = 'system') => {

    // State for the user's *chosen* preference ('light', 'dark', 'system')
    const [preference, setPreferenceState] = useState<ThemePreference>(() => {
        // Read initial preference from localStorage (client-side only)
        if (typeof window !== 'undefined') {
            const storedPref = localStorage.getItem(THEME_STORAGE_KEY);
            if (storedPref === 'light' || storedPref === 'dark' || storedPref === 'system') {
                console.log(`[Theme] Loaded preference from localStorage: ${storedPref}`);
                return storedPref;
            }
        }
        console.log(`[Theme] Using default preference: ${defaultPreference}`);
        return defaultPreference;
    });

    // State for the *actual* theme being applied ('light' or 'dark')
    // This reflects the evaluated result, especially for 'system' preference
    const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>(() => {
        if (preference === 'system') {
            return getSystemTheme(); // Get initial system theme
        }
        return preference; // 'light' or 'dark'
    });

    // Function to update the user's preference (memoized for performance)
    const setPreference = useCallback((pref: ThemePreference) => {
        setPreferenceState(pref);
        if (typeof window !== 'undefined') {
            localStorage.setItem(THEME_STORAGE_KEY, pref);
        }
    }, []);

    // Effect to update the applied theme and apply it to the DOM when preference changes
    useEffect(() => {
        let newAppliedTheme: AppliedTheme;

        if (preference === 'system') {
            newAppliedTheme = getSystemTheme();
        } else {
            newAppliedTheme = preference; // 'light' or 'dark'
        }

        setAppliedTheme(newAppliedTheme); // Update state for consumers
        applyThemeToDOM(newAppliedTheme);   // Apply to DOM

    }, [preference]); // Run only when the user's preference changes

    // Effect to listen for system theme changes *only* when preference is 'system'
    useEffect(() => {
        // Only add listener if preference is 'system' and we are on the client
        if (preference !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
            return; // No listener needed
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (event: MediaQueryListEvent) => {
            const systemThemeNow = event.matches ? 'dark' : 'light';
            setAppliedTheme(systemThemeNow); // Update the applied theme state
            applyThemeToDOM(systemThemeNow);   // Apply change immediately to DOM
        };

        // Add listener
        try {
            mediaQuery.addEventListener('change', handleChange);
            console.log("[Theme] Added system theme change listener.");
        } catch {
            // Fallback for older browsers
            mediaQuery.addListener(handleChange);
        }

        // Cleanup listener on unmount or when preference changes away from 'system'
        return () => {
            try {
                mediaQuery.removeEventListener('change', handleChange);
                console.log("[Theme] Removed system theme change listener.");
            } catch {
                mediaQuery.removeListener(handleChange);
            }
        };
    }, [preference]); // Re-run this effect setup only when preference changes


    return {
        preference,      // The user's choice ('light', 'dark', 'system')
        setPreference,   // Function to change the preference
        appliedTheme     // The actual theme being used ('light' or 'dark')
    };
};

