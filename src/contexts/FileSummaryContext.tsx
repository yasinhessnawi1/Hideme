import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { summaryPersistenceStore, EntityFileSummary, SearchFileSummary, FileSummaryBase } from '../store/SummaryPersistenceStore';
import { useFileContext } from './FileContext';
import { useBatchSearch } from './SearchContext';
import { getFileKey } from './PDFViewerContext';

// Define the context props
interface FileSummaryContextProps {
    // Entity summaries
    entityFileSummaries: EntityFileSummary[];
    entityAnalyzedFilesCount: number;
    expandedEntitySummaries: Set<string>;
    
    // Search summaries
    searchFileSummaries: SearchFileSummary[];
    searchedFilesCount: number;
    expandedSearchSummaries: Set<string>;
    
    // Entity methods
    updateEntityFileSummary: (summary: EntityFileSummary) => void;
    removeEntityFileSummary: (fileKey: string) => void;
    clearAllEntityData: () => void;
    toggleEntitySummaryExpansion: (fileKey: string) => void;
    
    // Search methods
    updateSearchFileSummary: (summary: SearchFileSummary) => void;
    removeSearchFileSummary: (fileKey: string) => void;
    clearAllSearchData: () => void;
    toggleSearchSummaryExpansion: (fileKey: string) => void;
    
    // Common methods
    reconcileFileSummaries: () => void;
}

// Create the context
const FileSummaryContext = createContext<FileSummaryContextProps | undefined>(undefined);

// Custom hook to use the context
export const useFileSummary = () => {
    const context = useContext(FileSummaryContext);
    if (!context) {
        throw new Error('useFileSummary must be used within a FileSummaryProvider');
    }
    return context;
};

// Provider component
export const FileSummaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { files } = useFileContext();
    const { clearAllSearches } = useBatchSearch();
    
    // Entity state
    const [entityFileSummaries, setEntityFileSummaries] = useState<EntityFileSummary[]>([]);
    const [entityAnalyzedFilesCount, setEntityAnalyzedFilesCount] = useState<number>(0);
    const [expandedEntitySummaries, setExpandedEntitySummaries] = useState<Set<string>>(new Set());
    
    // Search state
    const [searchFileSummaries, setSearchFileSummaries] = useState<SearchFileSummary[]>([]);
    const [searchedFilesCount, setSearchedFilesCount] = useState<number>(0);
    const [expandedSearchSummaries, setExpandedSearchSummaries] = useState<Set<string>>(new Set());
    
    // Initialize state from persistence store
    useEffect(() => {
        // Load entity data
        const entityFiles = summaryPersistenceStore.getAnalyzedFiles('entity');
        setEntityAnalyzedFilesCount(entityFiles.size);
        
        const entitySummaries = summaryPersistenceStore.getFileSummaries<EntityFileSummary>('entity');
        setEntityFileSummaries(entitySummaries);
        
        // Auto-expand entity summaries
        if (entitySummaries.length > 0) {
            const newExpandedSet = new Set<string>();
            entitySummaries.forEach(summary => newExpandedSet.add(summary.fileKey));
            setExpandedEntitySummaries(newExpandedSet);
        }
        
        // Load search data
        const searchFiles = summaryPersistenceStore.getAnalyzedFiles('search');
        setSearchedFilesCount(searchFiles.size);
        
        const searchSummaries = summaryPersistenceStore.getFileSummaries<SearchFileSummary>('search');
        setSearchFileSummaries(searchSummaries);
        
        // Auto-expand search summaries
        if (searchSummaries.length > 0) {
            const newExpandedSet = new Set<string>();
            searchSummaries.forEach(summary => newExpandedSet.add(summary.fileKey));
            setExpandedSearchSummaries(newExpandedSet);
        }
    }, []);
    
    // Reconcile with available files when files change
    useEffect(() => {
        if (files.length > 0) {
            reconcileFileSummaries();
        }
    }, [files.length]);
    
    // Listen for entity events
    useEffect(() => {
        const handleEntityEvent = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, timestamp, allTypes, type } = customEvent.detail || {};
            
            // Skip if not related to entity
            if (type && type !== 'ENTITY' && !allTypes) return;

            // Refresh entity data from store
            refreshEntityData();
        };
        
        // Listen for all relevant entity events
        window.addEventListener('entity-file-removed', handleEntityEvent);
        window.addEventListener('entity-highlights-cleared', handleEntityEvent);
        window.addEventListener('entity-all-cleared', handleEntityEvent);
        window.addEventListener('entity-summary-updated', handleEntityEvent);
        window.addEventListener('highlights-cleared', handleEntityEvent);
        
        return () => {
            window.removeEventListener('entity-file-removed', handleEntityEvent);
            window.removeEventListener('entity-highlights-cleared', handleEntityEvent);
            window.removeEventListener('entity-all-cleared', handleEntityEvent);
            window.removeEventListener('entity-summary-updated', handleEntityEvent);
            window.removeEventListener('highlights-cleared', handleEntityEvent);
        };
    }, []);
    
    // Listen for search events
    useEffect(() => {
        const handleSearchEvent = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { fileKey, timestamp, allTypes, type } = customEvent.detail || {};
            
            // Skip if not related to search
            if (type && type !== 'SEARCH' && !allTypes) return;

            // Refresh search data from store
            refreshSearchData();
        };
        
        // Listen for all relevant search events
        window.addEventListener('search-file-removed', handleSearchEvent);
        window.addEventListener('search-highlights-cleared', handleSearchEvent);
        window.addEventListener('search-all-cleared', handleSearchEvent);
        window.addEventListener('search-summary-updated', handleSearchEvent);
        window.addEventListener('highlights-cleared', handleSearchEvent);
        
        return () => {
            window.removeEventListener('search-file-removed', handleSearchEvent);
            window.removeEventListener('search-highlights-cleared', handleSearchEvent);
            window.removeEventListener('search-all-cleared', handleSearchEvent);
            window.removeEventListener('search-summary-updated', handleSearchEvent);
            window.removeEventListener('highlights-cleared', handleSearchEvent);
        };
    }, []);
    
    // Helper to refresh entity data from store
    const refreshEntityData = useCallback(() => {
        const entityFiles = summaryPersistenceStore.getAnalyzedFiles('entity');
        setEntityAnalyzedFilesCount(entityFiles.size);
        
        const entitySummaries = summaryPersistenceStore.getFileSummaries<EntityFileSummary>('entity');
        setEntityFileSummaries(entitySummaries);
    }, []);
    
    // Helper to refresh search data from store
    const refreshSearchData = useCallback(() => {
        const searchFiles = summaryPersistenceStore.getAnalyzedFiles('search');
        setSearchedFilesCount(searchFiles.size);
        
        const searchSummaries = summaryPersistenceStore.getFileSummaries<SearchFileSummary>('search');
        setSearchFileSummaries(searchSummaries);
    }, []);
    
    // Entity methods
    const updateEntityFileSummary = useCallback((summary: EntityFileSummary) => {
        // Update in persistence store
        summaryPersistenceStore.updateFileSummary('entity', summary);
        
        // Update local state
        setEntityFileSummaries(prev => {
            // Remove any existing summary for this file
            const filteredSummaries = prev.filter(s => s.fileKey !== summary.fileKey);
            
            // Add the new summary
            return [...filteredSummaries, summary];
        });
        
        // Add to analyzed files
        summaryPersistenceStore.addAnalyzedFile('entity', summary.fileKey);
        setEntityAnalyzedFilesCount(summaryPersistenceStore.getAnalyzedFiles('entity').size);
        
        // Ensure summary is expanded
        setExpandedEntitySummaries(prev => {
            const newSet = new Set(prev);
            newSet.add(summary.fileKey);
            return newSet;
        });
    }, []);
    
    const removeEntityFileSummary = useCallback((fileKey: string) => {
        // Remove from persistence store
        summaryPersistenceStore.removeFileFromSummaries('entity', fileKey);
        
        // Update local state
        setEntityFileSummaries(prev => prev.filter(s => s.fileKey !== fileKey));
        setEntityAnalyzedFilesCount(summaryPersistenceStore.getAnalyzedFiles('entity').size);
        
        // Remove from expanded summaries
        setExpandedEntitySummaries(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileKey);
            return newSet;
        });
    }, []);
    
    const clearAllEntityData = useCallback(() => {
        // Clear all entity data in persistence store
        summaryPersistenceStore.clearAllData('entity');
        
        // Update local state
        setEntityFileSummaries([]);
        setEntityAnalyzedFilesCount(0);
        setExpandedEntitySummaries(new Set());
    }, []);
    
    const toggleEntitySummaryExpansion = useCallback((fileKey: string) => {
        setExpandedEntitySummaries(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fileKey)) {
                newSet.delete(fileKey);
            } else {
                newSet.add(fileKey);
            }
            return newSet;
        });
    }, []);
    
    // Search methods
    const updateSearchFileSummary = useCallback((summary: SearchFileSummary) => {
        // Update in persistence store
        summaryPersistenceStore.updateFileSummary('search', summary);
        
        // Update local state
        setSearchFileSummaries(prev => {
            // Remove any existing summary for this file
            const filteredSummaries = prev.filter(s => s.fileKey !== summary.fileKey);
            
            // Add the new summary
            return [...filteredSummaries, summary];
        });
        
        // Add to analyzed files
        summaryPersistenceStore.addAnalyzedFile('search', summary.fileKey);
        setSearchedFilesCount(summaryPersistenceStore.getAnalyzedFiles('search').size);
        
        // Ensure summary is expanded
        setExpandedSearchSummaries(prev => {
            const newSet = new Set(prev);
            newSet.add(summary.fileKey);
            return newSet;
        });
    }, []);
    
    const removeSearchFileSummary = useCallback((fileKey: string) => {
        // Remove from persistence store
        summaryPersistenceStore.removeFileFromSummaries('search', fileKey);
        
        // Update local state
        setSearchFileSummaries(prev => prev.filter(s => s.fileKey !== fileKey));
        setSearchedFilesCount(summaryPersistenceStore.getAnalyzedFiles('search').size);
        
        // Remove from expanded summaries
        setExpandedSearchSummaries(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileKey);
            return newSet;
        });
    }, []);
    
    const clearAllSearchData = useCallback(() => {
        // Clear all search data in persistence store
        summaryPersistenceStore.clearAllData('search');
        
        // Clear search state from context
        clearAllSearches();
        
        // Update local state
        setSearchFileSummaries([]);
        setSearchedFilesCount(0);
        setExpandedSearchSummaries(new Set());
    }, [clearAllSearches]);
    
    const toggleSearchSummaryExpansion = useCallback((fileKey: string) => {
        setExpandedSearchSummaries(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fileKey)) {
                newSet.delete(fileKey);
            } else {
                newSet.add(fileKey);
            }
            return newSet;
        });
    }, []);
    
    // Common methods
    const reconcileFileSummaries = useCallback(() => {
        if (files.length === 0) return;
        
        // Get available file keys
        const availableFileKeys = files.map(getFileKey);
        
        // Reconcile entity data
        const validEntityFiles = summaryPersistenceStore.reconcileAnalyzedFiles('entity', availableFileKeys);
        setEntityAnalyzedFilesCount(validEntityFiles.size);
        
        const validEntitySummaries = summaryPersistenceStore.reconcileFileSummaries<EntityFileSummary>('entity', files);
        setEntityFileSummaries(validEntitySummaries);
        
        // Reconcile search data
        const validSearchFiles = summaryPersistenceStore.reconcileAnalyzedFiles('search', availableFileKeys);
        setSearchedFilesCount(validSearchFiles.size);
        
        const validSearchSummaries = summaryPersistenceStore.reconcileFileSummaries<SearchFileSummary>('search', files);
        setSearchFileSummaries(validSearchSummaries);
    }, [files]);
    
    // Create memoized context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        // Entity state
        entityFileSummaries,
        entityAnalyzedFilesCount,
        expandedEntitySummaries,
        
        // Search state
        searchFileSummaries,
        searchedFilesCount,
        expandedSearchSummaries,
        
        // Entity methods
        updateEntityFileSummary,
        removeEntityFileSummary,
        clearAllEntityData,
        toggleEntitySummaryExpansion,
        
        // Search methods
        updateSearchFileSummary,
        removeSearchFileSummary,
        clearAllSearchData,
        toggleSearchSummaryExpansion,
        
        // Common methods
        reconcileFileSummaries
    }), [
        entityFileSummaries,
        entityAnalyzedFilesCount,
        expandedEntitySummaries,
        searchFileSummaries,
        searchedFilesCount,
        expandedSearchSummaries,
        updateEntityFileSummary,
        removeEntityFileSummary,
        clearAllEntityData,
        toggleEntitySummaryExpansion,
        updateSearchFileSummary,
        removeSearchFileSummary,
        clearAllSearchData,
        toggleSearchSummaryExpansion,
        reconcileFileSummaries
    ]);
    
    return (
        <FileSummaryContext.Provider value={contextValue}>
            {children}
        </FileSummaryContext.Provider>
    );
};

export default FileSummaryProvider; 