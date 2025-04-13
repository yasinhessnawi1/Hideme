/**
 * Utilities for synchronizing settings from user preferences to application
 * components like the search and entity detection panels.
 */

import { OptionType } from '../types/types';

// Interface for search settings
interface SearchSettings {
  isAiSearch?: boolean;
  isCaseSensitive?: boolean;
  defaultSearchTerms?: string[];
}

// Interface for entity detection settings
interface EntitySettings {
  selectedMlEntities?: OptionType[];
  selectedAiEntities?: OptionType[];
  selectedGlinerEntities?: OptionType[];
  presidioColor?: string;
  glinerColor?: string;
  geminiColor?: string;
}

/**
 * Synchronizes search settings from user preferences
 * @param userSettings The user preference settings
 * @param currentSettings The current search settings in the application
 * @returns Updated search settings
 */
export function syncSearchSettings(
  userSettings: any,
  currentSettings: SearchSettings
): SearchSettings {
  // Create merged settings with user preferences taking precedence
  return {
    ...currentSettings,
    isAiSearch: userSettings?.isAiSearch ?? currentSettings.isAiSearch,
    isCaseSensitive: userSettings?.isCaseSensitive ?? currentSettings.isCaseSensitive,
    defaultSearchTerms: userSettings?.defaultSearchTerms ?? currentSettings.defaultSearchTerms,
  };
}

/**
 * Synchronizes entity detection settings from user preferences
 * @param userSettings The user preference settings
 * @param currentSettings The current entity detection settings in the application
 * @returns Updated entity detection settings
 */
export function syncEntitySettings(
  userSettings: any,
  currentSettings: EntitySettings
): EntitySettings {
  // Create merged settings with user preferences taking precedence
  return {
    ...currentSettings,
    selectedMlEntities: userSettings?.selectedMlEntities ?? currentSettings.selectedMlEntities,
    selectedAiEntities: userSettings?.selectedAiEntities ?? currentSettings.selectedAiEntities,
    selectedGlinerEntities: userSettings?.selectedGlinerEntities ?? currentSettings.selectedGlinerEntities,
    presidioColor: userSettings?.presidioColor ?? currentSettings.presidioColor,
    glinerColor: userSettings?.glinerColor ?? currentSettings.glinerColor,
    geminiColor: userSettings?.geminiColor ?? currentSettings.geminiColor,
  };
}

/**
 * Dispatches an event to notify components of settings changes
 * @param settingsType The type of settings that changed
 * @param settings The updated settings
 */
export function notifySettingsChanged(settingsType: 'search' | 'entity', settings: any): void {
  window.dispatchEvent(
    new CustomEvent('settings-changed', {
      detail: {
        type: settingsType,
        settings,
      },
    })
  );
}