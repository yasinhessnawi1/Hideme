import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { highlightStore, HighlightStore } from '../store/HighlightStore';
import { HighlightRect, HighlightType } from '../types/pdfTypes';

// Context type
type HighlightStoreContextType = {
    // Core operations
    addHighlight: (highlight: HighlightRect) => Promise<string>;
    removeHighlight: (id: string) => Promise<boolean>;

    // Batch operations
    addMultipleHighlights: (highlights: HighlightRect[]) => Promise<string[]>;
    removeMultipleHighlights: (ids: string[]) => Promise<boolean>;

    // Page operations
    getHighlightsForPage: (fileKey: string, page: number) => HighlightRect[];
    addHighlightsToPage: (fileKey: string, page: number, highlights: HighlightRect[]) => Promise<string[]>;
    removeHighlightsFromPage: (fileKey: string, page: number) => Promise<boolean>;

    // File operations
    getHighlightsForFile: (fileKey: string) => HighlightRect[];
    addHighlightsToFile: (fileKey: string, highlights: HighlightRect[]) => Promise<string[]>;
    removeHighlightsFromFile: (fileKey: string) => Promise<boolean>;

    // Type operations
    getHighlightsByType: (fileKey: string, type: HighlightType) => HighlightRect[];
    addHighlightsByType: (fileKey: string, type: HighlightType, highlights: HighlightRect[]) => Promise<string[]>;
    removeHighlightsByType: (fileKey: string, type: HighlightType) => Promise<boolean>;

    // Property operations
    getHighlightsByProperty: (fileKey: string, property: string, value: any) => HighlightRect[];
    removeHighlightsByProperty: (fileKey: string, property: string, value: any) => Promise<boolean>;
    removeHighlightsByPropertyFromAllFiles: (property: string, value: any, files : File[]) => Promise<boolean>;
    getHighlightsByText: (fileKey: string, text: string) => HighlightRect[];
    removeHighlightsByText: (fileKey: string, text: string) => Promise<boolean>;

    // Global operations
    removeAllHighlights: () => Promise<boolean>;
    removeAllHighlightsByType: (type: HighlightType) => Promise<boolean>;
    removeHighlightsByPosition: ( files: File[],
                                  x0: number,
                                  y0: number,
                                  x1: number,
                                  y1: number,
                                  options: {
                                      iouThreshold?: number;      // Threshold for Intersection over Union (0-1)
                                      centerDistThreshold?: number; // Max distance between centers as % of box size
                                      sizeRatioDifference?: number;  // Max allowed ratio difference in size
                                      debug?: boolean;            // Enable detailed logging
                                  }  ) => Promise<boolean>;
    // Internal tracking for re-renders
    refreshTrigger: number;
};

// Create context with default values
const HighlightStoreContext = createContext<HighlightStoreContextType>({
    // Default values will be overridden in the provider
    addHighlight: async () => '',
    removeHighlight: async () => false,
    addMultipleHighlights: async () => [],
    removeMultipleHighlights: async () => false,
    getHighlightsForPage: () => [],
    addHighlightsToPage: async () => [],
    removeHighlightsFromPage: async () => false,
    getHighlightsForFile: () => [],
    addHighlightsToFile: async () => [],
    removeHighlightsFromFile: async () => false,
    getHighlightsByType: () => [],
    addHighlightsByType: async () => [],
    removeHighlightsByType: async () => false,
    getHighlightsByProperty: () => [],
    removeHighlightsByProperty: async () => false,
    getHighlightsByText: () => [],
    removeHighlightsByText: async () => false,
    removeAllHighlights: async () => false,
    removeAllHighlightsByType: async () => false,
    removeHighlightsByPosition: async () => false,
    removeHighlightsByPropertyFromAllFiles: async () => false,

    refreshTrigger: 0
});

/**
 * Provider component that gives access to the highlight store
 */
export const HighlightStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // State to trigger re-renders when highlights change
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Subscribe to highlight changes
    useEffect(() => {
        const subscription = highlightStore.subscribe((fileKey, page, type) => {
            // Increment refresh counter to trigger re-render
            setRefreshTrigger(prev => prev + 1);
        });

        // Cleanup subscription on unmount
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Create memoized context value
    const contextValue = useMemo(() => ({
        // All operations from the store
        addHighlight: highlightStore.addHighlight.bind(highlightStore),
        removeHighlight: highlightStore.removeHighlight.bind(highlightStore),
        addMultipleHighlights: highlightStore.addMultipleHighlights.bind(highlightStore),
        removeMultipleHighlights: highlightStore.removeMultipleHighlights.bind(highlightStore),
        getHighlightsForPage: highlightStore.getHighlightsForPage.bind(highlightStore),
        addHighlightsToPage: highlightStore.addHighlightsToPage.bind(highlightStore),
        removeHighlightsFromPage: highlightStore.removeHighlightsFromPage.bind(highlightStore),
        getHighlightsForFile: highlightStore.getHighlightsForFile.bind(highlightStore),
        addHighlightsToFile: highlightStore.addHighlightsToFile.bind(highlightStore),
        removeHighlightsFromFile: highlightStore.removeHighlightsFromFile.bind(highlightStore),
        getHighlightsByType: highlightStore.getHighlightsByType.bind(highlightStore),
        addHighlightsByType: highlightStore.addHighlightsByType.bind(highlightStore),
        removeHighlightsByType: highlightStore.removeHighlightsByType.bind(highlightStore),
        getHighlightsByProperty: highlightStore.getHighlightsByProperty.bind(highlightStore),
        removeHighlightsByProperty: highlightStore.removeHighlightsByProperty.bind(highlightStore),
        getHighlightsByText: highlightStore.getHighlightsByText.bind(highlightStore),
        removeHighlightsByText: highlightStore.removeHighlightsByText.bind(highlightStore),
        removeAllHighlights: highlightStore.removeAllHighlights.bind(highlightStore),
        removeAllHighlightsByType: highlightStore.removeAllHighlightsByType.bind(highlightStore),
        removeHighlightsByPosition: highlightStore.removeHighlightsByPosition.bind(highlightStore),
        removeHighlightsByPropertyFromAllFiles: highlightStore.removeHighlightsByPropertyFromAllFiles.bind(highlightStore),
        // State for triggering re-renders
        refreshTrigger
    }), [refreshTrigger]);

    return (
        <HighlightStoreContext.Provider value={contextValue}>
            {children}
        </HighlightStoreContext.Provider>
    );
};

/**
 * Custom hook to access the highlight store
 * @returns Highlight store context
 */
export const useHighlightStore = () => useContext(HighlightStoreContext);
