import { OptionType } from '../types/types';
import { getFileKey } from '../contexts/PDFViewerContext';
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
    private readonly processingQueue: Map<string, boolean> = new Map();
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
            presidioEntities: config.presidioEntities ?? this.config.presidioEntities,
            glinerEntities: config.glinerEntities ?? this.config.glinerEntities,
            geminiEntities: config.geminiEntities ?? this.config.geminiEntities,
            searchQueries: config.searchQueries ?? this.config.searchQueries,
            isActive: config.isActive ?? this.config.isActive,
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
        // --- UPDATED: Check isActive flag from config ---
        if (!this.config.isActive) {
            console.log('[AutoProcessManager] Auto-processing is disabled via config, skipping file:', file.name);
            return false;
        }
        // ---------------------------------------------

        const fileKey = getFileKey(file);

        // Skip if already being processed or is a redacted file
        if (this.processingQueue.has(fileKey) || file.name.includes('-redacted')) {
            console.log(`[AutoProcessManager] Skipping file: ${file.name} (already processing or is redacted)`);
            return false;
        }

        // Mark as processing
        this.processingQueue.set(fileKey, true);
        this.processingStatus.set(fileKey, { status: 'processing', startTime: Date.now() });


        try {
            console.log('[AutoProcessManager] Starting auto-processing for file:', file.name);
            let success = false;

            // Check if entity detection is needed based on config
            const hasEntitySettings = (
                this.config.presidioEntities.length > 0 ||
                this.config.glinerEntities.length > 0 ||
                this.config.geminiEntities.length > 0
            );

            if (hasEntitySettings && this._detectEntitiesCallback) {
                await this.processEntityDetection(file);
                sessionStorage.setItem(`auto-processed-${fileKey}`, 'true');
                success = true;
            } else if (hasEntitySettings && !this._detectEntitiesCallback) {
                console.warn('[AutoProcessManager] Entity settings found, but no detection callback is set.');
            }


            // Check if search is needed based on config
            const hasSearchQueries = this.config.searchQueries.length > 0;

            if (hasSearchQueries && this._searchCallback) {
                await this.processSearchQueries(file);
                success = true;
            } else if (hasSearchQueries && !this._searchCallback) {
                console.warn('[AutoProcessManager] Search queries found, but no search callback is set.');
            }

            this.processingStatus.set(fileKey, {
                status: 'completed',
                startTime: this.processingStatus.get(fileKey)?.startTime || Date.now(),
                endTime: Date.now()
            });

            console.log(`[AutoProcessManager] Auto-processing completed for file: ${file.name}. Success: ${success}`);

            if (success) {
                window.dispatchEvent(new CustomEvent('auto-processing-complete', {
                    detail: {
                        fileKey,
                        hasEntityResults: hasEntitySettings,
                        hasSearchResults: hasSearchQueries,
                        timestamp: Date.now()
                    }
                }));
            }

            return success;
        } catch (error: any) {
            console.error('[AutoProcessManager] Error processing file:', file.name, error);
            this.processingStatus.set(fileKey, {
                status: 'failed',
                error: error.message || 'Unknown error',
                startTime: this.processingStatus.get(fileKey)?.startTime || Date.now(),
                endTime: Date.now()
            });
            return false;
        } finally {
            this.processingQueue.delete(fileKey);
            // Optionally clear completed/failed status after a delay
            setTimeout(() => {
                const status = this.processingStatus.get(fileKey);
                if (status && (status.status === 'completed' || status.status === 'failed')) {
                    this.processingStatus.delete(fileKey);
                }
            }, 5000);
        }
    }

    public async processNewFiles(files: File[]): Promise<number> {
        // --- UPDATED: Check isActive flag from config ---
        if (!this.config.isActive || files.length === 0) {
            console.log(`[AutoProcessManager] Auto-processing disabled or no files provided for batch. Skipping.`);
            return 0;
        }
        // ---------------------------------------------

        console.log(`[AutoProcessManager] Processing ${files.length} new files in batch`);
        let successCount = 0;

        // Filter out files already processing or redacted
        const filesToProcess = files.filter(file => {
            const fileKey = getFileKey(file);
            const shouldSkip = this.processingQueue.has(fileKey) || file.name.includes('-redacted');
            if (shouldSkip) {
                console.log(`[AutoProcessManager] Skipping file in batch: ${file.name} (already processing or is redacted)`);
            }
            return !shouldSkip;
        });


        if (filesToProcess.length === 0) {
            console.log("[AutoProcessManager] No files left to process in batch after filtering.");
            return 0;
        }

        // Batch Entity Detection (if needed)
        const hasEntitySettings = (
            this.config.presidioEntities.length > 0 ||
            this.config.glinerEntities.length > 0 ||
            this.config.geminiEntities.length > 0
        );

        if (hasEntitySettings && this._detectEntitiesCallback) {
            try {
                filesToProcess.forEach(file => {
                    const fileKey = getFileKey(file);
                    this.processingQueue.set(fileKey, true);
                    this.processingStatus.set(fileKey, { status: 'processing', startTime: Date.now() });
                });

                await this.batchProcessEntityDetection(filesToProcess);
                successCount += filesToProcess.length; // Assume success for now, refine later if needed

                filesToProcess.forEach(file => {
                    const fileKey = getFileKey(file);
                    sessionStorage.setItem(`auto-processed-${fileKey}`, 'true');
                    this.processingStatus.set(fileKey, {
                        status: 'completed', // Mark as completed for entity part
                        startTime: this.processingStatus.get(fileKey)?.startTime || Date.now(),
                        endTime: Date.now()
                    });
                });

            } catch (error) {
                console.error('[AutoProcessManager] Batch entity detection error:', error);
                filesToProcess.forEach(file => {
                    const fileKey = getFileKey(file);
                    this.processingStatus.set(fileKey, {
                        status: 'failed',
                        error: (error as Error).message || 'Entity detection failed',
                        startTime: this.processingStatus.get(fileKey)?.startTime || Date.now(),
                        endTime: Date.now()
                    });
                });
            }
        }

        // Batch Search (if needed)
        const hasSearchQueries = this.config.searchQueries.length > 0;
        if (hasSearchQueries && this._searchCallback) {
            try {
                // Reset successCount if we only care about search success
                // successCount = 0; // Uncomment if success depends only on search
                await this.batchProcessSearchQueries(filesToProcess);
                // Assume success if no error, could refine based on callback result if available
                // successCount += filesToProcess.length; // Or update based on actual results

                // Update status if needed, could be complex if search runs after entities
                filesToProcess.forEach(file => {
                    const fileKey = getFileKey(file);
                    const currentStatus = this.processingStatus.get(fileKey);
                    if (currentStatus && currentStatus.status !== 'failed') {
                        this.processingStatus.set(fileKey, {
                            ...currentStatus,
                            status: 'completed', // Mark final completion
                            endTime: Date.now()
                        });
                    }
                });

            } catch (error) {
                console.error('[AutoProcessManager] Batch search error:', error);
                filesToProcess.forEach(file => {
                    const fileKey = getFileKey(file);
                    this.processingStatus.set(fileKey, {
                        status: 'failed',
                        error: (error as Error).message || 'Search failed',
                        startTime: this.processingStatus.get(fileKey)?.startTime || Date.now(),
                        endTime: Date.now()
                    });
                });
            }
        }


        // Cleanup queue and status after processing
        filesToProcess.forEach(file => {
            const fileKey = getFileKey(file);
            this.processingQueue.delete(fileKey);
            // Optionally clear completed/failed status after a delay
            setTimeout(() => {
                const status = this.processingStatus.get(fileKey);
                if (status && (status.status === 'completed' || status.status === 'failed')) {
                    this.processingStatus.delete(fileKey);
                }
            }, 5000);
        });


        console.log(`[AutoProcessManager] Completed batch processing for ${filesToProcess.length} files.`);
        // Return count based on successful entity detection or search
        // This logic might need refinement based on how success is defined.
        // For now, returning the number of files attempted.
        return filesToProcess.length;
    }

    private async batchProcessEntityDetection(files: File[]): Promise<void> {
        if (!this._detectEntitiesCallback) return;

        console.log('[AutoProcessManager] Running batch entity detection for files:', files.map(f => f.name));

        // Use entities from the manager's config
        const options = {
            presidio: this.config.presidioEntities.map(e => e.value),
            gliner: this.config.glinerEntities.map(e => e.value),
            gemini: this.config.geminiEntities.map(e => e.value),
        };

        try {
            // Run detection and get results
            const results = await this._detectEntitiesCallback(files, options);

            // Process results for each file
            files.forEach(file => {
                const fileKey = getFileKey(file);
                const detectionResult = results[fileKey];

                if (detectionResult) {
                    const mappingToSet = detectionResult.redaction_mapping || detectionResult;
                    console.log(`[AutoProcessManager] Got detection results for file ${file.name}, applying to context`);

                    window.dispatchEvent(new CustomEvent('apply-detection-mapping', {
                        detail: { fileKey, mapping: mappingToSet, timestamp: Date.now() }
                    }));

                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('entity-detection-complete', {
                            detail: { fileKey, source: 'auto-process-batch', timestamp: Date.now(), forceProcess: true }
                        }));
                    }, 200);
                } else {
                    console.warn(`[AutoProcessManager] No detection results returned for ${file.name} in batch`);
                }
            });
        } catch (error) {
            console.error('[AutoProcessManager] Batch entity detection error:', error);
            throw error;
        }
    }

    private async batchProcessSearchQueries(files: File[]): Promise<void> {
        if (!this._searchCallback || this.config.searchQueries.length === 0) return;

        console.log(`[AutoProcessManager] Running ${this.config.searchQueries.length} search queries for batch of ${files.length} files`);

        // Process each search query against the batch of files
        for (const query of this.config.searchQueries) {
            try {
                await this._searchCallback(files, query.term, {
                    caseSensitive: query.caseSensitive,
                    regex: query.isRegex
                });
                // Add a small delay between different search terms if needed
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`[AutoProcessManager] Batch search error for term "${query.term}":`, error);
                // Decide if one search failure should stop others - currently continues
            }
        }
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
    private readonly processingStatus: Map<string, {
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



