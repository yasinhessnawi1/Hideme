import React, {useEffect} from 'react';
import {useAutoProcess} from '../hooks/general/useAutoProcess';

/**
 * Provider component that initializes and connects the auto-processing system
 * This component doesn't render anything visible - it just connects contexts
 */
export const AutoProcessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const {getConfig, isInitialized} = useAutoProcess();

    // Log current configuration for debugging when initialization is complete
    useEffect(() => {
        if (isInitialized) {
            const currentConfig = getConfig();
            console.log('[AutoProcessProvider] AutoProcessManager fully initialized with config:', {
                isActive: currentConfig.isActive,
                searchQueries: currentConfig.searchQueries.length,
                presidioEntities: currentConfig.presidioEntities.length,
                glinerEntities: currentConfig.glinerEntities.length,
                geminiEntities: currentConfig.geminiEntities.length,
                hidemeEntities: currentConfig.hidemeEntities.length,
                detectionThreshold: currentConfig.detectionThreshold,
                useBanlist: currentConfig.useBanlist,
                banlistWordsCount: currentConfig.banlistWords?.length ?? 0
            });

            // Dispatch event to notify that auto-processing is ready
            window.dispatchEvent(new CustomEvent('auto-processing-ready', {
                detail: {config: currentConfig}
            }));
        }
    }, [isInitialized, getConfig]);

    // Listen for changes to AutoProcessManager config and log them
    useEffect(() => {
        const handleConfigUpdate = (event: Event) => {
            const customEvent = event as CustomEvent;
            const {config, changes} = customEvent.detail || {};

            console.log('[AutoProcessProvider] AutoProcessManager config updated:', {
                changes,
                newConfig: {
                    isActive: config.isActive,
                    searchQueries: config.searchQueries.length,
                    presidioEntities: config.presidioEntities.length,
                    glinerEntities: config.glinerEntities.length,
                    geminiEntities: config.geminiEntities.length,
                    hidemeEntities: config.hidemeEntities.length,
                    detectionThreshold: config.detectionThreshold,
                    useBanlist: config.useBanlist,
                    banlistWordsCount: config.banlistWords?.length ?? 0
                }
            });
        };

        window.addEventListener('auto-process-config-updated', handleConfigUpdate);

        return () => {
            window.removeEventListener('auto-process-config-updated', handleConfigUpdate);
        };
    }, []);

    // Simply render children - this component is just for initialization
    return <>{children}</>;
};

export default AutoProcessProvider;
