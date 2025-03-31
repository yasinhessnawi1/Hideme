// src/hooks/useAutoProcess.ts

import { useEffect, useCallback } from 'react';
import { autoProcessManager } from '../utils/AutoProcessManager';
import { useEditContext } from '../contexts/EditContext';
import { useBatchSearch } from '../contexts/SearchContext';
import { usePDFApi } from './usePDFApi';

export const useAutoProcess = () => {
    const {
        selectedMlEntities,
        selectedGlinerEntities,
        selectedAiEntities,
    } = useEditContext();

    const {
        activeQueries,
        batchSearch
    } = useBatchSearch();

    const {
        runBatchHybridDetect
    } = usePDFApi();

    // Set up callbacks for entity detection
    useEffect(() => {
        // Set entity detection callback
        autoProcessManager.setDetectEntitiesCallback(runBatchHybridDetect);
    }, [runBatchHybridDetect]);

    // Set up callbacks for search
    useEffect(() => {
        // Set search callback using the batchSearch
        autoProcessManager.setSearchCallback(batchSearch);
    }, [batchSearch]);

    // Update configuration when entity detection settings change
    useEffect(() => {
        autoProcessManager.updateConfig({
            presidioEntities: selectedMlEntities,
            glinerEntities: selectedGlinerEntities,
            geminiEntities: selectedAiEntities,
        });
    }, [selectedMlEntities, selectedGlinerEntities, selectedAiEntities]);

    // Update configuration when search queries change
    useEffect(() => {
        // Format active queries to the expected format
        const searchQueries = activeQueries.map(query => ({
            term: query.term,
            caseSensitive: query.caseSensitive,
            isRegex: query.isRegex
        }));

        autoProcessManager.updateConfig({
            searchQueries
        });
    }, [activeQueries]);

    // Function to enable/disable auto-processing
    const setAutoProcessingEnabled = useCallback((enabled: boolean) => {
        autoProcessManager.updateConfig({
            isActive: enabled
        });
    }, []);

    // Expose the necessary functions with proper typing
    return {
        processNewFile: autoProcessManager.processNewFile.bind(autoProcessManager),
        processNewFiles: autoProcessManager.processNewFiles.bind(autoProcessManager),
        setAutoProcessingEnabled,
        getConfig: autoProcessManager.getConfig.bind(autoProcessManager)
    };
};
