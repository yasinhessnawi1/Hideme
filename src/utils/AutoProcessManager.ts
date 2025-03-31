// src/services/AutoProcessManager.ts
import { OptionType } from '../types/types';
import { getFileKey } from '../contexts/PDFViewerContext';
import { BatchSearchService } from '../services/BatchSearchService';
import {handleAllOPtions} from "./pdfutils";

/**
 * Configuration for automatic file processing
 */
export interface ProcessingConfig {
    // Entity detection settings
    presidioEntities: OptionType[];
    glinerEntities: OptionType[];
    geminiEntities: OptionType[];

    // Search settings
    searchQueries: {
        term: string;
        caseSensitive: boolean;
        isRegex: boolean;
    }[];

    // Processing status
    isActive: boolean;
}

/**
 * Service for managing automatic processing of new files
 * Coordinates entity detection and search based on current settings
 */
// src/utils/AutoProcessManager.ts

export class AutoProcessManager {
    private static instance: AutoProcessManager;
    private config: ProcessingConfig;
    private processingQueue: Map<string, boolean> = new Map();
    private _detectEntitiesCallback: ((files: File[], options: any) => Promise<Record<string, any>>) | null = null;
    private _searchCallback: ((files: File[], searchTerm: string, options: any) => Promise<void>) | null = null;

    private constructor() {
        this.config = {
            presidioEntities: [],
            glinerEntities: [],
            geminiEntities: [],
            searchQueries: [],
            isActive: true,
        };
    }

    public static getInstance(): AutoProcessManager {
        if (!AutoProcessManager.instance) {
            AutoProcessManager.instance = new AutoProcessManager();
        }
        return AutoProcessManager.instance;
    }

    public setDetectEntitiesCallback(callback: (files: File[], options: any) => Promise<Record<string, any>>) {
        this._detectEntitiesCallback = callback;
    }

    public setSearchCallback(callback: (files: File[], searchTerm: string, options: any) => Promise<void>) {
        this._searchCallback = callback;
    }

    public updateConfig(config: Partial<ProcessingConfig>): void {
        this.config = {
            ...this.config,
            ...config,
            isActive: config.isActive !== undefined ? config.isActive : this.config.isActive
        };

        console.log('[AutoProcessManager] Configuration updated:', {
            presidioEntities: this.config.presidioEntities.length,
            glinerEntities: this.config.glinerEntities.length,
            geminiEntities: this.config.geminiEntities.length,
            searchQueries: this.config.searchQueries.length,
            isActive: this.config.isActive
        });
    }

    public getConfig(): ProcessingConfig {
        return {...this.config};
    }

    public async processNewFile(file: File): Promise<boolean> {
        if (!this.config.isActive) {
            console.log('[AutoProcessManager] Auto-processing is disabled, skipping file:', file.name);
            return false;
        }

        const fileKey = getFileKey(file);

        // Skip if already being processed
        if (this.processingQueue.has(fileKey) || fileKey.includes('redacted')) {
            console.log('[AutoProcessManager] File is already being processed, skipping:', file.name);
            return false;
        }

        // Mark as processing
        this.processingQueue.set(fileKey, true);

        try {
            console.log('[AutoProcessManager] Processing new file:', file.name);
            let success = false;

            // Check if we have entity detection settings to apply
            const hasEntitySettings = (
                this.config.presidioEntities.length > 0 ||
                this.config.glinerEntities.length > 0 ||
                this.config.geminiEntities.length > 0
            );

            // Process entity detection if we have settings and a callback
            if (hasEntitySettings && this._detectEntitiesCallback) {
                await this.processEntityDetection(file);
                // Mark this file as auto-processed in session storage
                sessionStorage.setItem(`auto-processed-${fileKey}`, 'true');
                success = true;
            }

            // Process search queries if we have any and a callback
            if (this.config.searchQueries.length > 0 && this._searchCallback) {
                await this.processSearchQueries(file);
                success = true;
            }

            console.log('[AutoProcessManager] Processing completed for file:', file.name,
                success ? 'with results' : 'with no applicable processing');

            // Dispatch an event for any components that need to know processing is complete
            if (success) {
                window.dispatchEvent(new CustomEvent('auto-processing-complete', {
                    detail: {
                        fileKey,
                        hasEntityResults: hasEntitySettings,
                        hasSearchResults: this.config.searchQueries.length > 0,
                        timestamp: Date.now()
                    }
                }));
            }

            return success;
        } catch (error) {
            console.error('[AutoProcessManager] Error processing file:', file.name, error);
            return false;
        } finally {
            // Remove from processing queue
            this.processingQueue.delete(fileKey);
        }
    }

    public async processNewFiles(files: File[]): Promise<number> {
        if (!this.config.isActive || files.length === 0) {
            return 0;
        }

        console.log(`[AutoProcessManager] Processing ${files.length} new files`);
        let successCount = 0;

        // Process files one at a time to avoid overwhelming the system
        for (const file of files) {
            try {
                const success = await this.processNewFile(file);
                if (success) successCount++;

                // Add a small delay between files
                if (files.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } catch (error) {
                console.error('[AutoProcessManager] Error processing file in batch:', file.name, error);
            }
        }

        console.log(`[AutoProcessManager] Completed batch processing: ${successCount}/${files.length} files successful`);
        return successCount;
    }

    private async processEntityDetection(file: File): Promise<void> {
        if (!this._detectEntitiesCallback) return;

        console.log('[AutoProcessManager] Running entity detection for file:', file.name);

        const options = handleAllOPtions(this.config.geminiEntities, this.config.glinerEntities, this.config.presidioEntities)

        try {
            // Run detection and get results
            const results = await this._detectEntitiesCallback([file], options);

            // Get the file key
            const fileKey = getFileKey(file);

            // Extract the detection mapping for this file
            const detectionResult = results[fileKey];

            // If we have results, ensure they are in the correct format
            if (detectionResult) {
                // The API might return a structure with redaction_mapping inside
                const mappingToSet = detectionResult.redaction_mapping || detectionResult;

                console.log(`[AutoProcessManager] Got detection results for file ${file.name}, applying to context`);

                // Dispatch an event to store the mapping in the EditContext
                window.dispatchEvent(new CustomEvent('apply-detection-mapping', {
                    detail: {
                        fileKey,
                        mapping: mappingToSet,
                        timestamp: Date.now()
                    }
                }));

                // Allow a moment for the mapping to be applied before triggering highlight updates
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('entity-detection-complete', {
                        detail: {
                            fileKey,
                            source: 'auto-process',
                            timestamp: Date.now(),
                            forceProcess: true
                        }
                    }));
                }, 200);
            } else {
                console.warn(`[AutoProcessManager] No detection results returned for ${file.name}`);
            }
        } catch (error) {
            console.error('[AutoProcessManager] Entity detection error:', error);
            throw error; // Rethrow for proper error handling
        }
    }

    private async processSearchQueries(file: File): Promise<void> {
        if (!this._searchCallback || this.config.searchQueries.length === 0) return;

        console.log(`[AutoProcessManager] Running ${this.config.searchQueries.length} search queries for file:`, file.name);

        // Process each search query sequentially
        for (const query of this.config.searchQueries) {
            try {
                await this._searchCallback([file], query.term, {
                    caseSensitive: query.caseSensitive,
                    regex: query.isRegex
                });
            } catch (error) {
                console.error(`[AutoProcessManager] Search error for term "${query.term}":`, error);
            }
        }
    }
    private processingStatus: Map<string, {
        status: 'queued' | 'processing' | 'completed' | 'failed';
        error?: any;
        startTime: number;
        endTime?: number;
    }> = new Map();

    public getProcessingStatus(fileKey: string) {
        return this.processingStatus.get(fileKey);
    }
}

// Initialize and export singleton instance
export const autoProcessManager = AutoProcessManager.getInstance();



