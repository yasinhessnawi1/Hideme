// src/hooks/useAutoProcess.ts

import {useEffect, useCallback, useState} from 'react';
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
        isLoading: userLoading,
        getModelEntities
    } = useUser();
    // Track if we've fetched model entities
    const [entitiesFetched, setEntitiesFetched] = useState({
        presidio: false,
        gliner: false,
        gemini: false
    });
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

    useEffect(() => {
        if (userLoading || !isAuthenticated || !settings) {
            return;
        }

        // Only fetch entities if not already fetching and auto-processing is enabled
        if (settings.auto_processing) {
            // Fetch presidio entities if not already fetched
            if (!entitiesFetched.presidio && (!modelEntities[1] || !Array.isArray(modelEntities[1]))) {
                console.log('[useAutoProcess] Fetching Presidio entities (Method ID: 1)');
                getModelEntities(1)
                    .then(() => setEntitiesFetched(prev => ({ ...prev, presidio: true })))
                    .catch(err => console.error('[useAutoProcess] Error fetching Presidio entities:', err));
            }

            // Fetch gliner entities if not already fetched
            if (!entitiesFetched.gliner && (!modelEntities[2] || !Array.isArray(modelEntities[2]))) {
                console.log('[useAutoProcess] Fetching Gliner entities (Method ID: 2)');
                getModelEntities(2)
                    .then(() => setEntitiesFetched(prev => ({ ...prev, gliner: true })))
                    .catch(err => console.error('[useAutoProcess] Error fetching Gliner entities:', err));
            }

            // Fetch gemini entities if not already fetched
            if (!entitiesFetched.gemini && (!modelEntities[3] || !Array.isArray(modelEntities[3]))) {
                console.log('[useAutoProcess] Fetching Gemini entities (Method ID: 3)');
                getModelEntities(3)
                    .then(() => setEntitiesFetched(prev => ({ ...prev, gemini: true })))
                    .catch(err => console.error('[useAutoProcess] Error fetching Gemini entities:', err));
            }
        }
    }, [isAuthenticated, userLoading, settings, modelEntities, getModelEntities, entitiesFetched]);

    // Update configuration when entity detection settings change
    useEffect(() => {
        if (userLoading || !isAuthenticated || !settings) {
            console.log('[useAutoProcess] User not authenticated or settings loading, using default config.');
            autoProcessManager.updateConfig({
                presidioEntities: [],
                glinerEntities: [],
                geminiEntities: [],
                searchQueries: [],
                isActive: true // Default to inactive if no settings
            });
            return;
        }

        // 1. Format Search Queries from user.searchPatterns
        let formattedSearchQueries: any[] = [];
        if (searchPatterns && Array.isArray(searchPatterns) && searchPatterns.length > 0) {
            formattedSearchQueries = searchPatterns.map((pattern: SearchPattern) => ({
                term: pattern.pattern_text, // Add the term field with pattern_text
                pattern_type: pattern.pattern_type,
                setting_id: pattern.setting_id,
                // Set appropriate flags based on pattern_type
                caseSensitive: pattern.pattern_type === 'case_sensitive',
                ai_search: pattern.pattern_type === 'ai_search'
            }));
        } else {
            console.warn('[useAutoProcess] No search patterns found in user settings.');
            formattedSearchQueries = [];
        }

        // 2. Safely create entity arrays from modelEntities
        // These helper functions safely transform the entities or return empty arrays if invalid
        const createEntityList = (methodEntities: any[] | undefined | null) => {
            if (!methodEntities || !Array.isArray(methodEntities)) return [];

            return methodEntities.map(entity => ({
                value: entity?.entity_text || '',
                label: entity?.entity_text || ''
            })).filter(entity => entity.value); // Filter out empty values
        };

        const presidioEntities = createEntityList(modelEntities[1]);
        const glinerEntities = createEntityList(modelEntities[2]);
        const geminiEntities = createEntityList(modelEntities[3]);

        // Log the derived config with counts for debugging
        console.log('[useAutoProcess] Updating AutoProcessManager config from User Settings:', {
            presidioEntities: `${presidioEntities.length} entities`,
            presidioValues: presidioEntities.map(e => e.value),
            glinerEntities: `${glinerEntities.length} entities`,
            glinerValues: glinerEntities.map(e => e.value),
            geminiEntities: `${geminiEntities.length} entities`,
            geminiValues: geminiEntities.map(e => e.value),
            searchQueries: `${formattedSearchQueries.length} queries`,
            searchTerms: formattedSearchQueries.map(q => q.term),
            isActive: settings.auto_processing ?? false
        });

        // For troubleshooting, log the raw model entities object
        console.log('[useAutoProcess] Raw modelEntities object:', {
            hasPresidio: !!modelEntities[1],
            presidioIsArray: Array.isArray(modelEntities[1]),
            presidioLength: Array.isArray(modelEntities[1]) ? modelEntities[1].length : 'not an array',
            hasGliner: !!modelEntities[2],
            glinerIsArray: Array.isArray(modelEntities[2]),
            glinerLength: Array.isArray(modelEntities[2]) ? modelEntities[2].length : 'not an array',
            hasGemini: !!modelEntities[3],
            geminiIsArray: Array.isArray(modelEntities[3]),
            geminiLength: Array.isArray(modelEntities[3]) ? modelEntities[3].length : 'not an array',
        });

        // Extract threshold and banlist settings from user settings
        const detectionThreshold = settings.detection_threshold ?? 0.5; // Default to 0.5 if not set
        const useBanlist = settings.use_banlist_for_detection ?? false; // Default to false if not set
        
        // Get ban list words if enabled
        const banlistWords = useBanlist && settings.banList && 
                            settings.banList.words && 
                            Array.isArray(settings.banList.words) 
                            ? settings.banList.words : [];
        
        // 3. Update AutoProcessManager Config with threshold and banlist
        autoProcessManager.updateConfig({
            presidioEntities,
            glinerEntities,
            geminiEntities,
            searchQueries: formattedSearchQueries,
            isActive: settings.auto_processing ?? true, // Use fetched setting
            detectionThreshold: detectionThreshold, // Add detection threshold
            useBanlist: useBanlist, // Add ban list setting
            banlistWords: banlistWords // Add actual ban list words
        });

    }, [
        settings,
        searchPatterns,
        modelEntities,
        isAuthenticated,
        userLoading,
        entitiesFetched // Add dependency on entitiesFetched
    ]);

    // Function to enable/disable auto-processing
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
