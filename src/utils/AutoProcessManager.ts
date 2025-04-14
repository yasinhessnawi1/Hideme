import { OptionType } from '../types/types';
import { getFileKey } from '../contexts/PDFViewerContext';
import {handleAllOPtions} from "./pdfutils";
import { v4 as uuidv4 } from 'uuid';
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
        case_sensitive: boolean;
        ai_search: boolean;
    }[];

    // Processing status
    isActive: boolean;
    
    // Detection threshold (0.0 to 1.0)
    detectionThreshold?: number;
    
    // Ban list settings
    useBanlist?: boolean;
    banlistWords?: string[];
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
            detectionThreshold: 0.5, // Default threshold
            useBanlist: false, // Don't use ban list by default
            banlistWords: [], // Empty ban list by default
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
            // Add threshold and ban list settings
            detectionThreshold: config.detectionThreshold ?? this.config.detectionThreshold,
            useBanlist: config.useBanlist ?? this.config.useBanlist,
            banlistWords: config.banlistWords ?? this.config.banlistWords,
        };

        console.log('[AutoProcessManager] Configuration updated:', {
            presidioEntities: this.config.presidioEntities.length,
            glinerEntities: this.config.glinerEntities.length,
            geminiEntities: this.config.geminiEntities.length,
            searchQueries: this.config.searchQueries.length,
            isActive: this.config.isActive,
            detectionThreshold: this.config.detectionThreshold !== undefined ? 
                this.config.detectionThreshold : 'default (0.5)',
            useBanlist: this.config.useBanlist !== undefined ? this.config.useBanlist : false,
            banlistWordCount: this.config.banlistWords ? this.config.banlistWords.length : 0
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

    /**
     * Process entity detection for a file
     * Extracts entity values correctly from entity objects
     *
     * @param file File to process
     * @returns Promise that resolves when detection is complete
     */
    // In AutoProcessManager.ts, modify processEntityDetection method
    private async processEntityDetection(file: File): Promise<void> {
        if (!this._detectEntitiesCallback) return;

        console.log('[AutoProcessManager] Running entity detection for file:', file.name);

        // Extract entity values from the option objects
        const options = {
            presidio: this.config.presidioEntities.map(e => typeof e === 'object' ? (e.value || '') : e)
                .filter(Boolean),
            gliner: this.config.glinerEntities.map(e => typeof e === 'object' ? (e.value || '') : e)
                .filter(Boolean),
            gemini: this.config.geminiEntities.map(e => typeof e === 'object' ? (e.value || '') : e)
                .filter(Boolean),
            // Add detection threshold if configured (value between 0.0 and 1.0)
            threshold: this.config.detectionThreshold !== undefined ? 
                Math.max(0, Math.min(1, this.config.detectionThreshold)) : undefined,
            // Add banlist words if enabled
            banlist: this.config.useBanlist && this.config.banlistWords ? this.config.banlistWords : undefined
        };
        
        // Log detailed options for debugging
        console.log(`[AutoProcessManager] Detection options for file ${file.name}:`, {
            presidioEntities: options.presidio.length,
            glinerEntities: options.gliner.length,
            geminiEntities: options.gemini.length,
            threshold: options.threshold !== undefined ? options.threshold : 'default (0.5)',
            useBanlist: options.banlist !== undefined ? true : false,
            banlistWordCount: options.banlist ? options.banlist.length : 0
        });

        try {
            // Run detection and get results
            const results = await this._detectEntitiesCallback([file], options);
            const fileKey = getFileKey(file);
            const detectionResult = results[fileKey];

            if (detectionResult) {
                const mappingToSet = detectionResult.redaction_mapping || detectionResult;

                // Add a processing ID and timestamp to track this specific detection run
                const processRunId = uuidv4();
                (mappingToSet as any).processRunId = processRunId;
                (mappingToSet as any).processTimestamp = Date.now();
                (mappingToSet as any).fileKey = fileKey;

                console.log(`[AutoProcessManager] Got detection results for file ${file.name}, applying to context (run ID: ${processRunId})`);

                // Clear processing flag to ensure highlights update properly
                if (typeof window.removeFileHighlightTracking === 'function') {
                    window.removeFileHighlightTracking(fileKey);
                }

                // Mark this file as auto-processed in session storage for special handling
                sessionStorage.setItem(`auto-processed-${fileKey}`, 'true');

                // Dispatch event to store the mapping
                window.dispatchEvent(new CustomEvent('apply-detection-mapping', {
                    detail: {
                        fileKey,
                        mapping: mappingToSet,
                        timestamp: Date.now(),
                        runId: processRunId,
                        source: 'auto-process'
                    }
                }));

                // Add delay before triggering highlight updates
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('entity-detection-complete', {
                        detail: {
                            fileKey,
                            source: 'auto-process',
                            timestamp: Date.now(),
                            runId: processRunId,
                            forceProcess: true
                        }
                    }));
                }, 300);
            } else {
                console.warn(`[AutoProcessManager] No detection results returned for ${file.name}`);
            }
        } catch (error) {
            console.error('[AutoProcessManager] Entity detection error:', error);
            throw error;
        }
    }

    /**
     * Process entity detection for multiple files
     *
     * @param files Files to process
     * @returns Promise that resolves when detection is complete
     */
    private async batchProcessEntityDetection(files: File[]): Promise<void> {
        if (!this._detectEntitiesCallback) return;

        console.log('[AutoProcessManager] Running batch entity detection for files:', files.map(f => f.name));

        // Extract entity values from the option objects in the same way as individual processing
        const options = {
            presidio: this.config.presidioEntities.map(e => typeof e === 'object' ? (e.value || '') : e)
                .filter(Boolean),
            gliner: this.config.glinerEntities.map(e => typeof e === 'object' ? (e.value  || '') : e)
                .filter(Boolean),
            gemini: this.config.geminiEntities.map(e => typeof e === 'object' ? (e.value  || '') : e)
                .filter(Boolean),
            // Add detection threshold if configured (value between 0.0 and 1.0)
            threshold: this.config.detectionThreshold !== undefined ? 
                Math.max(0, Math.min(1, this.config.detectionThreshold)) : undefined,
            // Add banlist words if enabled
            banlist: this.config.useBanlist && this.config.banlistWords ? this.config.banlistWords : undefined
        };

        // Log entity counts for debugging
        console.log('[AutoProcessManager] Using entity values for batch detection:', {
            presidioCount: options.presidio.length,
            glinerCount: options.gliner.length,
            geminiCount: options.gemini.length,
            fileCount: files.length,
            threshold: options.threshold !== undefined ? options.threshold : 'default (0.5)',
            useBanlist: options.banlist !== undefined ? true : false,
            banlistWordCount: options.banlist ? options.banlist.length : 0
        });

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

    /**
     * Process search queries for a file
     * Handles different query formats and ensures proper extraction of search parameters
     *
     * @param file File to search
     * @returns Promise that resolves when all searches are complete
     */
    private async processSearchQueries(file: File): Promise<void> {
        if (!this._searchCallback || this.config.searchQueries.length === 0) return;

        console.log(`[AutoProcessManager] Running ${this.config.searchQueries.length} search queries for file:`, file.name);

        // Process each search query sequentially
        for (const query of this.config.searchQueries) {
            try {
                // Check if query has the proper structure
                if (!query.term) {
                    console.warn(`[AutoProcessManager] Invalid search query format, missing term:`, query);
                    continue;
                }

                // Extract search parameters safely with defaults
                const searchTerm = query.term;
                const searchOptions = {
                    case_sensitive: query.case_sensitive,
                    ai_search: query.ai_search,  // Map ai_search to regex parameter expected by the API
                    isAiSearch: query.ai_search ,// Alternative name some APIs might expect
                    isCaseSensitive: query.case_sensitive // Alternative name some APIs might expect
                };

                console.log(`[AutoProcessManager] Searching for "${searchTerm}" with options:`, searchOptions);

                // Call the search callback with proper parameters
                await this._searchCallback([file], searchTerm, searchOptions);

            } catch (error) {
                console.error(`[AutoProcessManager] Search error for query:`, query, error);
            }
        }
    }

    /**
     * Process search queries for multiple files
     *
     * @param files Files to search
     * @returns Promise that resolves when all searches are complete
     */
    private async batchProcessSearchQueries(files: File[]): Promise<void> {
        if (!this._searchCallback || this.config.searchQueries.length === 0) return;

        console.log(`[AutoProcessManager] Running ${this.config.searchQueries.length} search queries for batch of ${files.length} files`);

        // Process each search query against the batch of files
        for (const query of this.config.searchQueries) {
            try {
                // Check if query has the proper structure
                if (!query.term) {
                    console.warn(`[AutoProcessManager] Invalid search query format, missing term:`, query);
                    continue;
                }

                // Extract search parameters safely with defaults
                const searchTerm = query.term;
                const searchOptions = {
                    case_sensitive: query.case_sensitive,
                    ai_search: query.ai_search,  // Map ai_search to regex parameter expected by the API
                    isAiSearch: query.ai_search ,// Alternative name some APIs might expect
                    isCaseSensitive: query.case_sensitive // Alternative name some APIs might expect
                };

                console.log(`[AutoProcessManager] Batch searching for "${searchTerm}" with options:`, searchOptions);

                await this._searchCallback(files, searchTerm, searchOptions);

                // Add a small delay between different search terms if needed
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.error(`[AutoProcessManager] Batch search error for query:`, query, error);
                // Decide if one search failure should stop others - currently continues
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



