import React, { useEffect } from 'react';
import { useAutoProcess } from '../hooks/general/useAutoProcess';

/**
 * Provider component that initializes and connects the auto-processing system
 * This component doesn't render anything visible - it just connects contexts
 */
export const AutoProcessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const { getConfig } = useAutoProcess();

    // Log current configuration for debugging
    useEffect(() => {
        const currentConfig = getConfig();
        console.log('[AutoProcessProvider] Initialized. Current AutoProcessManager config:', {
            isActive: currentConfig.isActive,
            searchQueries: currentConfig.searchQueries.length,
            presidioEntities: currentConfig.presidioEntities.length,
            glinerEntities: currentConfig.glinerEntities.length,
            geminiEntities: currentConfig.geminiEntities.length,
            hidemeEntities: currentConfig.hidemeEntities.length, // Added hideme entities
            detectionThreshold: currentConfig.detectionThreshold,
            useBanlist: currentConfig.useBanlist,
            banlistWordsCount: currentConfig.banlistWords?.length ?? 0
        });
    }, [getConfig]); // Dependency on getConfig

    // Simply render children - this component is just for initialization
    return <>{children}</>;
};

export default AutoProcessProvider;
