// src/contexts/AutoProcessProvider.tsx
import React, { useEffect } from 'react';
import { useAutoProcess } from '../hooks/useAutoProcess';
import { useBatchSearch } from './SearchContext';
import { useEditContext } from './EditContext';

/**
 * Provider component that initializes and connects the auto-processing system
 * This component doesn't render anything visible - it just connects contexts
 */
export const AutoProcessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { activeQueries } = useBatchSearch();
    const {
        selectedMlEntities,
        selectedGlinerEntities,
        selectedAiEntities
    } = useEditContext();

    // Initialize the auto-processing hook
    useAutoProcess();

    // Log current configuration for debugging
    useEffect(() => {
        console.log('[AutoProcessProvider] Current configuration:', {
            searchQueries: activeQueries.length,
            presidioEntities: selectedMlEntities.length,
            glinerEntities: selectedGlinerEntities.length,
            geminiEntities: selectedAiEntities.length
        });
    }, [
        activeQueries,
        selectedMlEntities,
        selectedGlinerEntities,
        selectedAiEntities
    ]);

    // Simply render children - this component is just for initialization
    return <>{children}</>;
};

export default AutoProcessProvider;
