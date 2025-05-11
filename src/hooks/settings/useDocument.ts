/**
 * Document Hook
 *
 * Provides utilities for handling document operations such as:
 * - Validating JSON files for settings import
 * - Sanitizing settings data for security
 * - Parsing JSON files
 * - Downloading JSON files to the user's device
 */

import { useState } from 'react';
import { UserSettings } from '../../types';

export interface SettingsExport {
  user_id: number;
  export_date: string;
  general_settings: {
    id: number;
    user_id: number;
    remove_images: boolean;
    theme: "light" | "dark" | "system";
    auto_processing: boolean;
    detection_threshold: number;
    use_banlist_for_detection: boolean;
    created_at: string;
    updated_at: string;
  };
  ban_list: {
    id: number;
    words: string[] | null;
  };
  search_patterns: any[] | null;
  model_entities: any[] | null;
}

export interface UseDocumentReturn {
  error: string | null;
  isLoading: boolean;
  validateSettingsFile: (data: any) => { valid: boolean; error?: string };
  sanitizeSettingsFile: (data: any) => Partial<SettingsExport>;
  downloadJsonFile: (data: any, filename: string) => void;
  parseJsonFile: (file: File) => Promise<any>;
  clearError: () => void;
}

/**
 * Hook for handling document operations
 */
export const useDocument = (): UseDocumentReturn => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Clear error messages
   */
  const clearError = (): void => {
    setError(null);
  };

  /**
   * Validates a settings file to ensure it has the required structure and properties
   * 
   * @param data The settings data to validate
   * @returns Object indicating validity and any error message
   */
  const validateSettingsFile = (data: any): { valid: boolean; error?: string } => {
    // Check if data is an object
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid settings format: expected a JSON object' };
    }

    // Check required top-level properties
    if (!data.user_id || !data.export_date) {
      return { valid: false, error: 'Invalid settings format: missing required properties' };
    }

    // Validate general settings structure
    if (!data.general_settings || typeof data.general_settings !== 'object') {
      return { valid: false, error: 'Invalid settings format: missing or invalid general settings' };
    }

    // Check for required general settings properties
    const requiredSettings = [
      'theme', 'auto_processing', 'detection_threshold', 'use_banlist_for_detection'
    ];
    
    for (const prop of requiredSettings) {
      if (!(prop in data.general_settings)) {
        return { valid: false, error: `Invalid settings format: missing ${prop} property` };
      }
    }

    // Validate data types
    if (
      typeof data.general_settings.theme !== 'string' ||
      typeof data.general_settings.auto_processing !== 'boolean' ||
      typeof data.general_settings.detection_threshold !== 'number' ||
      typeof data.general_settings.use_banlist_for_detection !== 'boolean'
    ) {
      return { valid: false, error: 'Invalid settings format: property types mismatch' };
    }

    // Validate theme value
    if (!['light', 'dark', 'system'].includes(data.general_settings.theme)) {
      return { valid: false, error: 'Invalid theme value' };
    }

    // Validate threshold range
    if (data.general_settings.detection_threshold < 0 || data.general_settings.detection_threshold > 1) {
      return { valid: false, error: 'Invalid detection threshold: should be between 0 and 1' };
    }

    // Optional validation of ban list if present
    if (data.ban_list) {
      if (data.ban_list.words !== null && !Array.isArray(data.ban_list.words)) {
        return { valid: false, error: 'Invalid ban list format: words should be an array or null' };
      }
      
      // Validate that all words are strings if the array is not null
      if (Array.isArray(data.ban_list.words) && 
          data.ban_list.words.some((word: any) => typeof word !== 'string')) {
        return { valid: false, error: 'Invalid ban list format: all words must be strings' };
      }
    }

    // Optional validation of search patterns if present
    if ('search_patterns' in data && 
        data.search_patterns !== null && 
        !Array.isArray(data.search_patterns)) {
      return { valid: false, error: 'Invalid search patterns format: should be an array or null' };
    }

    // Optional validation of model entities if present
    if ('model_entities' in data && 
        data.model_entities !== null && 
        !Array.isArray(data.model_entities)) {
      return { valid: false, error: 'Invalid model entities format: should be an array or null' };
    }

    return { valid: true };
  };

  /**
   * Sanitizes settings data by removing unexpected properties and ensuring
   * all values are of the correct type
   * 
   * @param data Raw settings data
   * @returns Sanitized settings data
   */
  const sanitizeSettingsFile = (data: any): Partial<SettingsExport> => {
    // Create a new object with only the allowed properties
    const sanitized: Partial<SettingsExport> = {
      user_id: Number(data.user_id),
      export_date: String(data.export_date)
    };

    // Sanitize general settings
    if (data.general_settings) {
      sanitized.general_settings = {
        id: Number(data.general_settings.id || 0),
        user_id: Number(data.general_settings.user_id || 0),
        remove_images: Boolean(data.general_settings.remove_images),
        theme: ['light', 'dark', 'system'].includes(data.general_settings.theme) 
          ? data.general_settings.theme 
          : 'system',
        auto_processing: Boolean(data.general_settings.auto_processing),
        detection_threshold: Math.min(Math.max(Number(data.general_settings.detection_threshold || 0.5), 0), 1),
        use_banlist_for_detection: Boolean(data.general_settings.use_banlist_for_detection),
        created_at: String(data.general_settings.created_at || new Date().toISOString()),
        updated_at: String(data.general_settings.updated_at || new Date().toISOString())
      };
    }

    // Sanitize ban list - account for null words array
    if (data.ban_list) {
      sanitized.ban_list = {
        id: Number(data.ban_list.id || 0),
        words: Array.isArray(data.ban_list.words) 
          ? data.ban_list.words
              .filter((word: any) => typeof word === 'string')
              .map((word: string) => String(word).trim())
              .filter((word: string) => word.length > 0)
          : null // Handle null words array
      };
    }

    // Include search patterns if present (can be null)
    if ('search_patterns' in data) {
      sanitized.search_patterns = data.search_patterns;
    }

    // Include model entities if present (can be null or array)
    if ('model_entities' in data) {
      sanitized.model_entities = data.model_entities;
    }

    return sanitized;
  };

  /**
   * Downloads a JSON object as a file
   * 
   * @param data JSON data to download
   * @param filename Name for the downloaded file
   */
  const downloadJsonFile = (data: any, filename: string): void => {
    try {
      // Convert the data to a JSON string
      const jsonString = JSON.stringify(data, null, 2);
      
      // Create a Blob with the JSON data
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create a URL for the Blob
      const url = URL.createObjectURL(blob);
      
      // Create a temporary anchor element
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      
      // Append to the body temporarily, click to download, then remove
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      setError(`Failed to download file: ${error.message}`);
    }
  };

  /**
   * Parses a JSON file and returns its contents
   * 
   * @param file The file to parse
   * @returns Promise resolving to the parsed JSON data
   */
  const parseJsonFile = (file: File): Promise<any> => {
    setIsLoading(true);
    clearError();

    return new Promise((resolve, reject) => {
      // Validate file type
      if (!file.type.includes('json') && !file.name.endsWith('.json')) {
        setIsLoading(false);
        setError('Invalid file type. Please upload a JSON file.');
        reject(new Error('Invalid file type'));
        return;
      }

      // Validate file size (5MB limit)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_SIZE) {
        setIsLoading(false);
        setError('File is too large. Maximum size is 5MB.');
        reject(new Error('File too large'));
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') {
            throw new Error('Failed to read file');
          }

          // Try to parse the JSON
          const parsed = JSON.parse(result);
          setIsLoading(false);
          resolve(parsed);
        } catch (error: any) {
          setIsLoading(false);
          setError(`Failed to parse JSON: ${error.message}`);
          reject(error);
        }
      };

      reader.onerror = () => {
        setIsLoading(false);
        setError('Error reading file');
        reject(new Error('Error reading file'));
      };

      reader.readAsText(file);
    });
  };

  return {
    error,
    isLoading,
    validateSettingsFile,
    sanitizeSettingsFile,
    downloadJsonFile,
    parseJsonFile,
    clearError
  };
};

export default useDocument;
