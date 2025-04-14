/**
 * @fileoverview Settings service for user preferences and customization
 *
 * This service provides methods for managing user settings, including:
 * - General user interface preferences
 * - Ban lists for content filtering
 * - Search patterns for text detection
 * - Model entities for entity recognition
 */
import apiClient from './apiClient';

/**
 * User settings information
 *
 * @interface
 * @property {number} id - Settings unique identifier
 * @property {number} user_id - User ID the settings belong to
 * @property {string} theme - UI theme preference ('light' or 'dark')
 * @property {boolean} auto_processing - Whether automatic processing is enabled
 * @property {boolean} remove_images - Whether to remove images during processing
 * @property {boolean} is_ai_search - Whether AI search is enabled by default
 * @property {boolean} is_case_sensitive - Whether search is case sensitive by default
 * @property {string[]} default_search_terms - Default search terms to suggest
 * @property {string[]} ml_entities - Selected ML entities for detection
 * @property {string} created_at - Settings creation timestamp
 * @property {string} updated_at - Settings last update timestamp
 */
export interface UserSettings {
    id: number;
    user_id: number;
    theme: string;
    auto_processing: boolean;
    remove_images: boolean;
    is_ai_search?: boolean;
    is_case_sensitive?: boolean;
    default_search_terms?: string[];
    ml_entities?: string[];
    detection_threshold?: number;
    use_banlist_for_detection?: boolean;
    banList?: BanListWithWords;
    created_at: string;
    updated_at: string;
}

/**
 * User settings update data
 *
 * @interface
 * @property {string} [theme] - Optional UI theme preference
 * @property {boolean} [auto_processing] - Optional automatic processing setting
 * @property {boolean} [remove_images] - Optional image removal setting
 * @property {boolean} [is_ai_search] - Optional AI search default setting
 * @property {boolean} [is_case_sensitive] - Optional case sensitivity default setting
 * @property {string[]} [default_search_terms] - Optional default search terms
 * @property {string[]} [ml_entities] - Optional selected ML entities
 */
export interface UserSettingsUpdate {
    theme?: string;
    auto_processing?: boolean;
    remove_images?: boolean;
    is_ai_search?: boolean;
    is_case_sensitive?: boolean;
    default_search_terms?: string[];
    ml_entities?: string[];
    detection_threshold?: number;
    use_banlist_for_detection?: boolean;
}

/**
 * Ban list information with included words
 *
 * @interface
 * @property {number} id - Ban list unique identifier
 * @property {string[]} words - Array of banned words
 */
export interface BanListWithWords {
    id: number;
    words: string[];
}

/**
 * Batch of words for ban list operations
 *
 * @interface
 * @property {string[]} words - Array of words to add/remove
 */
export interface BanListWordBatch {
    words: string[];
}

/**
 * Search pattern information
 *
 * @interface
 * @property {number} id - Pattern unique identifier
 * @property {number} setting_id - Settings ID the pattern belongs to
 * @property {string} pattern_type - Type of pattern (e.g., 'regex', 'text')
 * @property {string} pattern_text - The pattern content
 * @property {string} created_at - Pattern creation timestamp
 * @property {string} updated_at - Pattern last update timestamp
 */
export interface SearchPattern {
    id: number;
    setting_id: number;
    pattern_type: string;
    pattern_text: string;
    created_at: string;
    updated_at: string;
}

/**
 * Data for creating a new search pattern
 *
 * @interface
 * @property {string} pattern_type - Type of pattern (e.g., 'regex', 'text')
 * @property {string} pattern_text - The pattern content
 */
export interface SearchPatternCreate {
    pattern_type: string;
    pattern_text: string;
}

/**
 * Data for updating an existing search pattern
 *
 * @interface
 * @property {string} [pattern_type] - Optional new pattern type
 * @property {string} [pattern_text] - Optional new pattern content
 */
export interface SearchPatternUpdate {
    pattern_type?: string;
    pattern_text?: string;
}

/**
 * Model entity information
 *
 * @interface
 * @property {number} id - Entity unique identifier
 * @property {number} setting_id - Settings ID the entity belongs to
 * @property {number} method_id - Detection method ID
 * @property {string} entity_text - The entity text content
 * @property {string} created_at - Entity creation timestamp
 * @property {string} updated_at - Entity last update timestamp
 */
export interface ModelEntity {
    id: number;
    setting_id: number;
    method_id: number;
    entity_text: string;
    created_at: string;
    updated_at: string;
}

/**
 * Model entity with method name information
 *
 * @interface
 * @extends {ModelEntity}
 * @property {string} method_name - Detection method name
 */
export interface ModelEntityWithMethod extends ModelEntity {
    method_name: string;
}

/**
 * Batch of entities for creation
 *
 * @interface
 * @property {number} method_id - Detection method ID
 * @property {string[]} entity_texts - Array of entity texts to add
 */
export interface ModelEntityBatch {
    method_id: number;
    entity_texts: string[];
}

/**
 * Settings service for managing user preferences and customization
 */
const settingsService = {
    /**
     * Gets the current user's settings
     *
     * @returns {Promise<UserSettings>} Promise resolving to user settings
     * @throws {Error} If request fails
     */
    async getSettings(): Promise<UserSettings> {
        console.log('⚙️ [SETTINGS] Fetching user settings');
        const startTime = performance.now();

        try {
            const response = await apiClient.get('/settings');
            const duration = performance.now() - startTime;

            console.log(`✅ [SETTINGS] User settings fetched successfully`, {
                settingsId: response.data.data.id,
                theme: response.data.data.theme,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [SETTINGS] Failed to fetch settings`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.data?.data?.status,
                error: error.response?.data?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Updates the current user's settings
     *
     * @param {UserSettingsUpdate} data - Settings fields to update
     * @returns {Promise<UserSettings>} Promise resolving to updated settings
     * @throws {Error} If update fails
     */
    async updateSettings(data: UserSettingsUpdate): Promise<UserSettings> {
        console.log('⚙️ [SETTINGS] Updating user settings', {
            fieldsToUpdate: Object.keys(data)
        });

        const startTime = performance.now();

        try {
            const response = await apiClient.put('/settings', data);
            const duration = performance.now() - startTime;

            console.log(`✅ [SETTINGS] User settings updated successfully`, {
                settingsId: response.data.data.id,
                fieldsUpdated: Object.keys(data),
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [SETTINGS] Failed to update settings`, {
                fieldsAttempted: Object.keys(data),
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.data?.data?.status,
                error: error.response?.data?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Gets the current user's ban list
     *
     * @returns {Promise<BanListWithWords>} Promise resolving to ban list with words
     * @throws {Error} If request fails
     */
    async getBanList(): Promise<BanListWithWords> {
        console.log('📋 [SETTINGS] Fetching ban list');
        const startTime = performance.now();

        try {
            const response = await apiClient.get('/settings/ban-list');
            if (response?.data?.data?.words?.length > 0) {
                console.log(`🔍 [SETTINGS] Ban list contains ${response.data.data.words.length} words`);
                return response.data.data;
            } else {
                console.log(`✅ [SETTINGS] Ban list is empty`);
                return { id: response.data.data.id, words: [] };
            }
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [SETTINGS] Failed to fetch ban list`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.data?.data?.status,
                error: error.response?.data?.data.data || error.message
            });

            throw error;
        }
    },

    /**
     * Adds words to the current user's ban list
     *
     * @param {BanListWordBatch} data - Batch of words to add
     * @returns {Promise<BanListWithWords>} Promise resolving to updated ban list
     * @throws {Error} If request fails
     */
    async addBanListWords(data: BanListWordBatch): Promise<BanListWithWords> {
        console.log('➕ [SETTINGS] Adding words to ban list', {
            wordCount: data?.words?.length
        });

        const startTime = performance.now();

        try {
            const response = await apiClient.post('/settings/ban-list/words', data);
            const duration = performance.now() - startTime;

            console.log(`✅ [SETTINGS] Words added to ban list successfully`, {
                banListId: response.data.data.id,
                addedCount: data.words.length,
                totalWords: response.data.data.words.length,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [SETTINGS] Failed to add words to ban list`, {
                wordCount: data.words.length,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.data?.data?.status,
                error: error.response?.data?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Removes words from the current user's ban list
     *
     * @param {BanListWordBatch} data - Batch of words to remove
     * @returns {Promise<BanListWithWords>} Promise resolving to updated ban list
     * @throws {Error} If request fails
     */
    async removeBanListWords(data: BanListWordBatch): Promise<BanListWithWords> {
        console.log('➖ [SETTINGS] Removing words from ban list', {
            wordCount: data.words.length
        });

        const startTime = performance.now();

        try {
            const response = await apiClient.delete('/settings/ban-list/words', { data });
            const duration = performance.now() - startTime;

            console.log(`✅ [SETTINGS] Words removed from ban list successfully`, {
                banListId: response.data.data.id,
                removedCount: data.words?.length,
                remainingWords: response.data.data.words?.length,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [SETTINGS] Failed to remove words from ban list`, {
                wordCount: data.words.length,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.data?.data?.status,
                error: error.response?.data?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Gets the current user's search patterns
     *
     * @returns {Promise<SearchPattern[]>} Promise resolving to array of search patterns
     * @throws {Error} If request fails
     */
    async getSearchPatterns(): Promise<SearchPattern[]> {
        console.log('🔍 [SETTINGS] Fetching search patterns');
        const startTime = performance.now();

        try {
            const response = await apiClient.get('/settings/patterns');
            const duration = performance.now() - startTime;

            console.log(`✅ [SETTINGS] Search patterns fetched successfully`, {
                patternCount: response.data.data?.length || 0,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [SETTINGS] Failed to fetch search patterns`, {
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.data?.data?.status,
                error: error.response?.data?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Creates a new search pattern
     *
     * @param {SearchPatternCreate} data - Pattern creation data
     * @returns {Promise<SearchPattern>} Promise resolving to created pattern
     * @throws {Error} If creation fails
     */
    async createSearchPattern(data: SearchPatternCreate): Promise<SearchPattern> {
        console.log('➕ [SETTINGS] Creating search pattern', {
            patternType: data.pattern_type,
            patternTextLength: data.pattern_text.length
        });

        const startTime = performance.now();

        try {
            const response = await apiClient.post('/settings/patterns', data);
            const duration = performance.now() - startTime;

            console.log(`✅ [SETTINGS] Search pattern created successfully`, {
                patternId: response.data.data.id,
                patternType: response.data.data.pattern_type,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [SETTINGS] Failed to create search pattern`, {
                patternType: data.pattern_type,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.data?.data?.status,
                error: error.response?.data?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Updates an existing search pattern
     *
     * @param {number} patternId - ID of the pattern to update
     * @param {SearchPatternUpdate} data - Pattern update data
     * @returns {Promise<SearchPattern>} Promise resolving to updated pattern
     * @throws {Error} If update fails
     */
    async updateSearchPattern(patternId: number, data: SearchPatternUpdate): Promise<SearchPattern> {
        console.log('✏️ [SETTINGS] Updating search pattern', {
            patternId,
            fieldsToUpdate: Object.keys(data)
        });

        const startTime = performance.now();

        try {
            const response = await apiClient.put(`/settings/patterns/${patternId}`, data);
            const duration = performance.now() - startTime;

            console.log(`✅ [SETTINGS] Search pattern updated successfully`, {
                patternId: response.data.data.id,
                patternType: response.data.data.pattern_type,
                fieldsUpdated: Object.keys(data),
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [SETTINGS] Failed to update search pattern`, {
                patternId,
                fieldsAttempted: Object.keys(data),
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.data?.data?.status,
                error: error.response?.data?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Deletes a search pattern
     *
     * @param {number} patternId - ID of the pattern to delete
     * @returns {Promise<void>} Promise that resolves when deletion is complete
     * @throws {Error} If deletion fails
     */
    async deleteSearchPattern(patternId: number): Promise<void> {
        console.log('🗑️ [SETTINGS] Deleting search pattern', { patternId });
        const startTime = performance.now();

        try {
            await apiClient.delete(`/settings/patterns/${patternId}`);
            const duration = performance.now() - startTime;

            console.log(`✅ [SETTINGS] Search pattern deleted successfully`, {
                patternId,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [SETTINGS] Failed to delete search pattern`, {
                patternId,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.data?.data?.status,
                error: error.response?.data?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Gets model entities for a specific detection method
     *
     * @param {number} methodId - Detection method ID
     * @returns {Promise<ModelEntityWithMethod[]>} Promise resolving to array of entities
     * @throws {Error} If request fails
     */
    async getModelEntities(methodId: number): Promise<ModelEntityWithMethod[]> {
        console.log('🔍 [SETTINGS] Fetching model entities', { methodId });
        const startTime = performance.now();

        try {
            const response = await apiClient.get(`/settings/entities/${methodId}`);
            const duration = performance.now() - startTime;

            console.log(`✅ [SETTINGS] Model entities fetched successfully`, {
                methodId,
                entityCount: response?.data?.data?.length,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data.data;
        } catch (error: any) {



            throw error;
        }
    },

    /**
     * Adds model entities in batch
     *
     * @param {ModelEntityBatch} data - Batch of entities to add
     * @returns {Promise<ModelEntity[]>} Promise resolving to array of created entities
     * @throws {Error} If addition fails
     */
    async addModelEntities(data: ModelEntityBatch): Promise<ModelEntity[]> {
        console.log('➕ [SETTINGS] Adding model entities', {
            methodId: data.method_id,
            entityCount: data.entity_texts.length
        });

        const startTime = performance.now();

        try {
            const response = await apiClient.post('/settings/entities', data);
            const duration = performance.now() - startTime;

            console.log(`✅ [SETTINGS] Model entities added successfully`, {
                methodId: data.method_id,
                addedCount: response.data.data.length,
                duration: `${duration.toFixed(2)}ms`
            });

            return response.data.data;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [SETTINGS] Failed to add model entities`, {
                methodId: data.method_id,
                entityCount: data.entity_texts.length,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.data?.data?.status,
                error: error.response?.data?.data || error.message
            });

            throw error;
        }
    },

    /**
     * Deletes a model entity
     *
     * @param {number} entityId - ID of the entity to delete
     * @returns {Promise<void>} Promise that resolves when deletion is complete
     * @throws {Error} If deletion fails
     */
    async deleteModelEntity(entityId: number): Promise<void> {
        console.log('🗑️ [SETTINGS] Deleting model entity', { entityId });
        const startTime = performance.now();

        try {
            await apiClient.delete(`/settings/entities/${entityId}`);
            const duration = performance.now() - startTime;

            console.log(`✅ [SETTINGS] Model entity deleted successfully`, {
                entityId,
                duration: `${duration.toFixed(2)}ms`
            });
        } catch (error: any) {
            const duration = performance.now() - startTime;

            console.error(`❌ [SETTINGS] Failed to delete model entity`, {
                entityId,
                duration: `${duration.toFixed(2)}ms`,
                status: error.response?.data?.data?.status,
                error: error.response?.data?.data || error.message
            });

            throw error;
        }
    }
};

// Log service initialization
console.log('🚀 [SETTINGS] Settings Service initialized');

export default settingsService;
