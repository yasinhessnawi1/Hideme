// src/hooks/useAutoProcess.ts

import { useEffect, useCallback } from 'react';
import { autoProcessManager } from '../utils/AutoProcessManager';
import { useEditContext } from '../contexts/EditContext';
import { useBatchSearch } from '../contexts/SearchContext';
import { usePDFApi } from './usePDFApi';
import { useUser } from './userHook'; // Import useUser
import { SearchPattern, ModelEntity } from '../services/settingsService'; // Import types
export const useAutoProcess = () => {
    const {
        settings,
        searchPatterns,
        modelEntities, // This holds Record<number, ModelEntity[]>
        isAuthenticated,
        isLoading: userLoading
    } = useUser();

    const {
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
        if (userLoading || !isAuthenticated || !settings) {
            console.log('[useAutoProcess] User not authenticated or settings loading, using default config.');
            autoProcessManager.updateConfig({
                presidioEntities: [],
                glinerEntities: [],
                geminiEntities: [],
                searchQueries: [],
                isActive: false // Default to inactive if no settings
            });
            return;
        }

        // 1. Format Search Queries from user.searchPatterns
        let formattedSearchQueries: any[] = [];
        if (searchPatterns && searchPatterns.length > 0) {
             formattedSearchQueries = searchPatterns.map((pattern: SearchPattern) => ({
                    setting_id: pattern.setting_id,
                    pattern_text: pattern.pattern_text,
                    pattern_type: pattern.pattern_type,
                }));
        } else {
            console.warn('[useAutoProcess] No search patterns found in user settings.');
            formattedSearchQueries = [];
        }

        // 2. Format Entities from user.modelEntities
        // Assuming method IDs: 1=Presidio, 2=Gliner, 3=Gemini (adjust if different)
        const presidioEntities = (modelEntities[1] || []).map((entity: ModelEntity) => ({
            value: entity.entity_text,
            label: entity.entity_text, // Label might need better formatting
        }));
        const glinerEntities = (modelEntities[2] || []).map((entity: ModelEntity) => ({
            value: entity.entity_text,
            label: entity.entity_text,
        }));
        const geminiEntities = (modelEntities[3] || []).map((entity: ModelEntity) => ({
            value: entity.entity_text,
            label: entity.entity_text,
        }));

        // Log the derived config
        console.log('[useAutoProcess] Updating AutoProcessManager config from User Settings:', {
            presidioEntities: presidioEntities.map(e => e.value),
            glinerEntities: glinerEntities.map(e => e.value),
            geminiEntities: geminiEntities.map(e => e.value),
            searchQueries: formattedSearchQueries.map(q => q.term),
            isActive: settings.auto_processing ?? false
        });


        // 3. Update AutoProcessManager Config
        autoProcessManager.updateConfig({
            presidioEntities,
            glinerEntities,
            geminiEntities,
            searchQueries: formattedSearchQueries,
            isActive: settings.auto_processing ?? false, // Use fetched setting
        });

    }, [
        settings,
        searchPatterns,
        modelEntities,
        isAuthenticated,
        userLoading
    ]);


    // Function to enable/disable auto-processing (now redundant? Kept for potential direct calls)
    // This function *might* conflict if called directly, as the useEffect above overrides it based on settings.
    // Ideally, this should be removed or refactored to call `updateSettings`.
    // For now, let's leave it but be aware of the potential conflict. A better approach
    // would be to remove this and rely solely on the toggle updating the persisted setting.
    const setAutoProcessingEnabled = useCallback((enabled: boolean) => {
        console.warn('[useAutoProcess] setAutoProcessingEnabled called directly. This might be overridden by user settings. Use the settings toggle instead.');
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
