import { useEffect, useCallback, useState } from 'react';
import { autoProcessManager } from '../../managers/AutoProcessManager';
import { useBatchSearch } from '../../contexts/SearchContext';
import { usePDFApi } from './usePDFApi';
import { SearchPattern } from '../../types';
import useSettings from '../settings/useSettings';
import useSearchPatterns from '../settings/useSearchPatterns';
import useEntityDefinitions from '../settings/useEntityDefinitions';
import useAuth from '../auth/useAuth';
import useBanList from '../settings/useBanList';
import authStateManager from '../../managers/authStateManager';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';

export const useAutoProcess = () => {
    const { isAuthenticated, isLoading: userLoading } = useAuth();
    const cachedState = authStateManager.getCachedState();
    const isAuthenticatedOrCached = isAuthenticated || Boolean(cachedState?.isAuthenticated);

    const { settings, getSettings } = useSettings();
    const { searchPatterns } = useSearchPatterns();
    const { modelEntities, getModelEntities } = useEntityDefinitions();
    const { banList, getBanList } = useBanList();
    const { notify } = useNotification();
    const { t } = useLanguage();

    const [entitiesFetched, setEntitiesFetched] = useState({
        presidio: false,
        gliner: false,
        gemini: false,
        hideme: false
    });

    const { batchSearch } = useBatchSearch();
    const { runBatchHybridDetect } = usePDFApi();

    useEffect(() => {
        autoProcessManager.setDetectEntitiesCallback(runBatchHybridDetect);
    }, [runBatchHybridDetect]);

    useEffect(() => {
        autoProcessManager.setSearchCallback(batchSearch);
    }, [batchSearch]);

    useEffect(() => {
        if (userLoading || !isAuthenticatedOrCached) return;

        if (!settings) {
            getSettings().then(settings => {
                if (!settings) return;
            });
        }

        if (settings?.auto_processing) {
            const fetchEntities = async (methodId: number, entityKey: keyof typeof entitiesFetched) => {
                if (!entitiesFetched[entityKey] && (!modelEntities[methodId] || !Array.isArray(modelEntities[methodId]))) {
                    console.log(`[useAutoProcess] Fetching entities (Method ID: ${methodId})`);
                    try {
                        await getModelEntities(methodId);
                        setEntitiesFetched(prev => ({ ...prev, [entityKey]: true }));
                    } catch (err) {
                        console.error(`[useAutoProcess] Error fetching entities (Method ID: ${methodId}):`, err);
                    }
                }
            };

            fetchEntities(1, 'presidio');
            fetchEntities(2, 'gliner');
            fetchEntities(3, 'gemini');
            fetchEntities(4, 'hideme');
        }
    }, [isAuthenticated, userLoading, settings, modelEntities, getModelEntities, entitiesFetched]);

    useEffect(() => {
        if (userLoading || !isAuthenticatedOrCached) {
            console.log('[useAutoProcess] User not authenticated or settings loading, using default config.');
            autoProcessManager.updateConfig({
                presidioEntities: [],
                glinerEntities: [],
                geminiEntities: [],
                hidemeEntities: [],
                searchQueries: [],
                isActive: true
            });
            return;
        }

        if (!settings) {
            getSettings().then(settings => {
                if (!settings) {
                    return;
                }
                notify({
                    message: t('settings', 'autoProcessRefreshNeeded'),
                    type: 'info',
                    duration: 3000
                });
            });
        }

        const formattedSearchQueries = searchPatterns?.map((pattern: SearchPattern) => ({
            term: pattern.pattern_text,
            pattern_type: pattern.pattern_type,
            setting_id: pattern.setting_id,
            case_sensitive: pattern.pattern_type === 'case_sensitive',
            ai_search: pattern.pattern_type === 'ai_search'
        })) || [];

        const createEntityList = (methodEntities: any[] | undefined | null) => {
            return (methodEntities || []).map(entity => ({
                value: entity?.entity_text ?? '',
                label: entity?.entity_text ?? ''
            })).filter(entity => entity.value);
        };

        const presidioEntities = createEntityList(modelEntities[1]);
        const glinerEntities = createEntityList(modelEntities[2]);
        const geminiEntities = createEntityList(modelEntities[3]);
        const hidemeEntities = createEntityList(modelEntities[4]);

            const detectionThreshold = settings?.detection_threshold ?? 0.5;
        const useBanlist = settings?.use_banlist_for_detection ?? true;

        const banlistWords = useBanlist && banList?.words ? banList?.words : [];

        autoProcessManager.updateConfig({
            presidioEntities,
            glinerEntities,
            geminiEntities,
            hidemeEntities,
            searchQueries: formattedSearchQueries,
            isActive: settings?.auto_processing ?? true,
            detectionThreshold,
            useBanlist,
            banlistWords
        });

    }, [settings, searchPatterns, modelEntities, isAuthenticated, userLoading, entitiesFetched]);

    const setAutoProcessingEnabled = useCallback((enabled: boolean) => {
        autoProcessManager.updateConfig({ isActive: enabled });
    }, []);

    return {
        processNewFile: autoProcessManager.processNewFile.bind(autoProcessManager),
        processNewFiles: autoProcessManager.processNewFiles.bind(autoProcessManager),
        setAutoProcessingEnabled,
        getConfig: autoProcessManager.getConfig.bind(autoProcessManager)
    };
};
