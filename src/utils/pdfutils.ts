/**
 * Safely creates API options object from entity arrays
 * Handles different object formats and ensures proper extraction of entity values
 *
 * @param presidioEntities Array of Presidio entities
 * @param glinerEntities Array of Gliner entities
 * @param geminiEntities Array of Gemini entities
 * @param hidemeEntities Array of Hideme entities
 * @param threshold Optional detection threshold (value between 0.0 and 1.0)
 * @param useBanlist Optional flag to use ban list
 * @param banlistWords Optional array of ban list words
 * @returns Options object for API request
 */
export const handleAllOPtions = (
    presidioEntities: any[] | null | undefined,
    glinerEntities: any[] | null | undefined,
    geminiEntities: any[] | null | undefined,
    hidemeEntities: any[] | null | undefined,
    threshold?: number,
    useBanlist?: boolean,
    banlistWords?: string[]
) => {
    // Helper function to check if an array has valid entities
    const hasValidEntities = (arr: any[] | null | undefined): boolean => {
        return Array.isArray(arr) && arr.length > 0 && arr.some(item => !!item);
    };

    // Filter and extract values, removing any "ALL_" options
    const extractEntityValues = (entities: any[] | null | undefined): string[] => {
        if (!hasValidEntities(entities)) return [];

        // Use a Set to prevent duplicates
        const valueSet = new Set<string>();

        entities!.forEach(entity => {
            // Handle different entity object formats
            let value: string;

            if (typeof entity === 'string') {
                value = entity;
            } else if (typeof entity === 'object' && entity !== null) {
                value = entity.value || entity.entity_text || '';
            } else {
                return; // Skip invalid entries
            }

            // Skip "ALL_" pseudo-options
            if (value && !value.startsWith('ALL_')) {
                valueSet.add(value);
            }
        });

        return Array.from(valueSet);
    };

    // Extract values for each model with deduplication
    const presidioValues = extractEntityValues(presidioEntities);
    const glinerValues = extractEntityValues(glinerEntities);
    const geminiValues = extractEntityValues(geminiEntities);
    const hidemeValues = extractEntityValues(hidemeEntities);

    // Create the options object for the API request
    const options: any = {};

    // Add entity arrays for each detection method (only if they have values)
    if (presidioValues.length > 0) {
        options.presidio = presidioValues;
    }

    if (glinerValues.length > 0) {
        options.gliner = glinerValues;
    }

    if (geminiValues.length > 0) {
        options.gemini = geminiValues;
    }

    if (hidemeValues.length > 0) {
        options.hideme = hidemeValues;
    }

    // Add threshold if provided
    if (threshold !== undefined) {
        options.threshold = Math.max(0, Math.min(1, threshold));
    }

    // Add banlist words if enabled
    if (useBanlist && Array.isArray(banlistWords) && banlistWords.length > 0) {
        options.banlist = banlistWords;
    }

    // For debugging
    console.log('[pdfutils] handleAllOPtions generated options:', {
        hasPresidio: presidioValues.length > 0,
        hasGliner: glinerValues.length > 0,
        hasGemini: geminiValues.length > 0,
        hasHideme: hidemeValues.length > 0,
        presidioCount: presidioValues.length,
        glinerCount: glinerValues.length,
        geminiCount: geminiValues.length,
        hidemeCount: hidemeValues.length,
        threshold
    });

    return options;
};
