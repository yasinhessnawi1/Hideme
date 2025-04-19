/**
 * Settings and Preferences Type Definitions
 *
 * This file contains types related to user settings, preferences,
 * ban lists, search patterns, and entity definitions. It consolidates
 * types previously defined in settingsService.ts.
 */

import { OptionType } from './types';

/**
 * User settings information
 */
export interface UserSettings {
    id: number;
    user_id: number;
    theme: string;
    auto_processing: boolean;
    remove_images: boolean;
    is_ai_search?: boolean;
    is_case_sensitive?: boolean;
    default_search_terms?: SearchPattern[];
    ml_entities?: string[];
    detection_threshold?: number;
    use_banlist_for_detection?: boolean;
    banList?: BanListWithWords;
    created_at: string;
    updated_at: string;
}

/**
 * User settings update data
 */
export interface UserSettingsUpdate {
    theme?: string;
    auto_processing?: boolean;
    remove_images?: boolean;
    is_ai_search?: boolean;
    is_case_sensitive?: boolean;
    default_search_terms?: SearchPattern[];
    ml_entities?: string[];
    gliner_entities?: string[];
    gemini_entities?: string[];
    hideme_entities?: string[];
    detection_threshold?: number;
    use_banlist_for_detection?: boolean;
}

/**
 * Ban list information with included words
 */
export interface BanListWithWords {
    id: number;
    words: string[];
}

/**
 * Batch of words for ban list operations
 */
export interface BanListWordBatch {
    words: string[];
}

/**
 * Search pattern information
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
 */
export interface SearchPatternCreate {
    pattern_type: string;
    pattern_text: string;
}

/**
 * Data for updating an existing search pattern
 */
export interface SearchPatternUpdate {
    pattern_type?: string;
    pattern_text?: string;
}

/**
 * Model entity information
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
 */
export interface ModelEntityWithMethod extends ModelEntity {
    method_name: string;
}

/**
 * Batch of entities for creation
 */
export interface ModelEntityBatch {
    method_id: number;
    entity_texts: string[];
}

/**
 * Entity settings structure for saving
 */
export interface EntitySettings {
    presidio: OptionType[];
    gliner: OptionType[];
    gemini: OptionType[];
    hideme: OptionType[];
}
