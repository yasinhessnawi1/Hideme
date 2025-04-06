import {OptionType} from '../types/types';

/**
 * Safely creates API options object from entity arrays
 * Handles different object formats and ensures proper extraction of entity values
 *
 * @param geminiEntities Array of Gemini entities
 * @param glinerEntities Array of Gliner entities
 * @param presidioEntities Array of Presidio entities
 * @returns Object with arrays of entity values by method
 */
export const handleAllOPtions = (
    geminiEntities: any[] | null | undefined,
    glinerEntities: any[] | null | undefined,
    presidioEntities: any[] | null | undefined
) => {
    return {
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
};
