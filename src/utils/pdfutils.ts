import {OptionType} from '../types/types';

/**
 * Safely creates API options object from entity arrays
 * Handles different object formats and ensures proper extraction of entity values
 * 
 * @param geminiEntities Array of Gemini entities
 * @param glinerEntities Array of Gliner entities
 * @param presidioEntities Array of Presidio entities
 * @param threshold Optional detection threshold (value between 0.0 and 1.0)
 * @param useBanlist Optional flag to use ban list
 * @param banlistWords Optional array of ban list words
 * @returns Options object for API request
 */
export const handleAllOPtions = (
    geminiEntities: any[] | null | undefined,
    glinerEntities: any[] | null | undefined,
    presidioEntities: any[] | null | undefined,
    threshold?: number,
    useBanlist?: boolean, 
    banlistWords?: string[]
) => {
    const options: any = {
        // Safely process each entity type, handling different object formats
        presidio: Array.isArray(presidioEntities) ? presidioEntities.map(entity => {
            if (!entity) return null;
            // Handle both { value: "..." } and { entity_text: "..." } formats
            return entity.value || entity.entity_text || null;
        }).filter(Boolean) : [],

        gliner: Array.isArray(glinerEntities) ? glinerEntities.map(entity => {
            if (!entity) return null;
            return entity.value || entity.entity_text || null;
        }).filter(Boolean) : [],

        gemini: Array.isArray(geminiEntities) ? geminiEntities.map(entity => {
            if (!entity) return null;
            return entity.value || entity.entity_text || null;
        }).filter(Boolean) : []
    };

    // Add threshold if provided (value between 0.0 and 1.0)
    if (threshold !== undefined) {
        options.threshold = Math.max(0, Math.min(1, threshold)); // Ensure value is between 0 and 1
    }

    // Add banlist words if provided and enabled
    if (useBanlist && Array.isArray(banlistWords) && banlistWords.length > 0) {
        options.banlist = banlistWords;
    }

    return options;
};