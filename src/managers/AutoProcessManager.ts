import {HighlightType, OptionType} from '../types';
import {getFileKey} from '../contexts/PDFViewerContext';
import processingStateService from '../services/ProcessingStateService';
import {EntityHighlightProcessor} from "./EntityHighlightProcessor";
import {highlightStore} from "../store/HighlightStore";

/**
 * Configuration for automatic file processing
 */
export interface ProcessingConfig {
    // Entity detection settings
    presidioEntities: OptionType[];
    glinerEntities: OptionType[];
    geminiEntities: OptionType[];
    hidemeEntities: OptionType[];
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
            hidemeEntities: [],
            searchQueries: [],
            isActive: true,
            detectionThreshold: 0.5, // Default threshold
            useBanlist: true,
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
            hidemeEntities: config.hidemeEntities ?? this.config.hidemeEntities,
            searchQueries: config.searchQueries ?? this.config.searchQueries,
            isActive: config.isActive ?? this.config.isActive,
            // Add threshold and ban list settings
            detectionThreshold: config.detectionThreshold ?? this.config.detectionThreshold,
            useBanlist: config.useBanlist ?? this.config.useBanlist,
            banlistWords: config.banlistWords ?? this.config.banlistWords,
        };
    }

    public getConfig(): ProcessingConfig {
        return {...this.config};
    }

    /**
     * Process a single new file
     *
     * Updated to check if file already has highlights before processing
     */
    public async processNewFile(file: File): Promise<boolean> {
        // Check if auto-processing is disabled in config
        if (!this.config.isActive) {
            console.log('[AutoProcessManager] Auto-processing is disabled via config, skipping file:', file.name);
            return false;
        }

        const fileKey = getFileKey(file);

        // Skip if already being processed or is a redacted file
        if (this.processingQueue.has(fileKey) || file.name.includes('-redacted')) {
            console.log(`[AutoProcessManager] Skipping file: ${file.name} (already processing or is redacted)`);
            return false;
        }

        // Check if file already has entity highlights
        const existingHighlights = highlightStore.getHighlightsByType(fileKey, HighlightType.ENTITY);
        if (existingHighlights && existingHighlights.length > 0) {
            console.log(`[AutoProcessManager] Skipping file: ${file.name} (already has ${existingHighlights.length} entity highlights)`);
            return false;
        }

        // Mark as processing
        this.processingQueue.set(fileKey, true);

        // Get estimated processing time and page count
        const pageCount = await this.getPageCount(file);
        const estimatedTimeMs = await this.calculateEstimatedProcessingTime(file);

        // Register with processing state service
        processingStateService.startProcessing(file, {
            method: 'auto',
            pageCount,
            expectedTotalTimeMs: estimatedTimeMs
        });

        try {
            console.log('[AutoProcessManager] Starting auto-processing for file:', file.name);
            let success = false;

            // Check if entity detection is needed based on config
            const hasEntitySettings = (
                this.config.presidioEntities.length > 0 ||
                this.config.glinerEntities.length > 0 ||
                this.config.geminiEntities.length > 0 ||
                this.config.hidemeEntities.length > 0
            );

            if (hasEntitySettings && this._detectEntitiesCallback) {
                await this.processEntityDetection(file);
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

            // Mark processing as complete in the state service
            processingStateService.completeProcessing(fileKey, true);

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

            // Mark processing as failed in the state service
            processingStateService.completeProcessing(fileKey, false);

            return false;
        } finally {
            this.processingQueue.delete(fileKey);
        }
    }

    /**
     * Process multiple new files
     *
     * Updated to check if files already have highlights before processing
     */
    public async processNewFiles(files: File[]): Promise<number> {
        // Check if auto-processing is disabled or no files provided
        if (!this.config.isActive || files.length === 0) {
            console.log(`[AutoProcessManager] Auto-processing disabled or no files provided for batch. Skipping.`);
            return 0;
        }

        console.log(`[AutoProcessManager] Processing ${files.length} new files in batch`);
        let successCount = 0;

        // Filter out files already processing or redacted
        const initialFilesToProcess = files.filter(file => {
            const fileKey = getFileKey(file);
            const shouldSkip = this.processingQueue.has(fileKey) || file.name.includes('-redacted');
            if (shouldSkip) {
                console.log(`[AutoProcessManager] Skipping file in batch: ${file.name} (already processing or is redacted)`);
            }
            return !shouldSkip;
        });

        // Further filter out files that already have entity highlights
        const filesToProcess = await Promise.all(initialFilesToProcess.map(async (file) => {
            const fileKey = getFileKey(file);
            const existingHighlights = highlightStore.getHighlightsByType(fileKey, HighlightType.ENTITY);

            if (existingHighlights && existingHighlights.length > 0) {
                console.log(`[AutoProcessManager] Skipping file in batch: ${file.name} (already has ${existingHighlights.length} entity highlights)`);
                return null;
            }

            return file;
        })).then(results => results.filter(file => file !== null) as File[]);

        if (filesToProcess.length === 0) {
            console.log("[AutoProcessManager] No files left to process in batch after filtering.");
            return 0;
        }

        // Process each file that passed the filters
        console.log(`[AutoProcessManager] After filtering, processing ${filesToProcess.length} files in batch`);

        // Initialize processing for each file
        for (const file of filesToProcess) {
            const fileKey = getFileKey(file);
            this.processingQueue.set(fileKey, true);

            // Get estimated processing time and page count
            const pageCount = await this.getPageCount(file);
            const estimatedTimeMs = await this.calculateEstimatedProcessingTime(file);

            // Register with processing state service
            processingStateService.startProcessing(file, {
                method: 'auto',
                pageCount,
                expectedTotalTimeMs: estimatedTimeMs
            });
        }

        // Batch Entity Detection (if needed)
        const hasEntitySettings = (
            this.config.presidioEntities.length > 0 ||
            this.config.glinerEntities.length > 0 ||
            this.config.geminiEntities.length > 0 ||
            this.config.hidemeEntities.length > 0
        );

        if (hasEntitySettings && this._detectEntitiesCallback) {
            try {
                await this.batchProcessEntityDetection(filesToProcess);
                successCount += filesToProcess.length;

                // Update progress for all files after entity detection
                filesToProcess.forEach(file => {
                    const fileKey = getFileKey(file);
                    processingStateService.updateProcessingInfo(fileKey, {
                        progress: 75 // Entity detection is about 75% of the work
                    });
                });
            } catch (error) {
                console.error('[AutoProcessManager] Batch entity detection error:', error);
                filesToProcess.forEach(file => {
                    const fileKey = getFileKey(file);
                    processingStateService.completeProcessing(fileKey, false);
                });
            }
        }

        // Batch Search (if needed)
        const hasSearchQueries = this.config.searchQueries.length > 0;
        if (hasSearchQueries && this._searchCallback) {
            try {
                await this.batchProcessSearchQueries(filesToProcess);

                // Update progress for files that weren't marked as failed
                filesToProcess.forEach(file => {
                    const fileKey = getFileKey(file);
                    const currentInfo = processingStateService.getProcessingInfo(fileKey);

                    if (currentInfo && currentInfo.status !== 'failed') {
                        processingStateService.updateProcessingInfo(fileKey, {
                            progress: 95 // Almost complete after search
                        });
                    }
                });
            } catch (error) {
                console.error('[AutoProcessManager] Batch search error:', error);
                filesToProcess.forEach(file => {
                    const fileKey = getFileKey(file);
                    const currentInfo = processingStateService.getProcessingInfo(fileKey);

                    // Only mark as failed if entity detection didn't already fail
                    if (currentInfo && currentInfo.status !== 'failed') {
                        processingStateService.completeProcessing(fileKey, false);
                    }
                });
            }
        }

        // Mark all files as completed that haven't been marked as failed
        filesToProcess.forEach(file => {
            const fileKey = getFileKey(file);
            const currentInfo = processingStateService.getProcessingInfo(fileKey);

            if (currentInfo && currentInfo.status !== 'failed') {
                // Mark as completed
                processingStateService.completeProcessing(fileKey, true);

                // Notify of completion
                window.dispatchEvent(new CustomEvent('auto-processing-complete', {
                    detail: {
                        fileKey,
                        hasEntityResults: hasEntitySettings,
                        hasSearchResults: hasSearchQueries,
                        timestamp: Date.now()
                    }
                }));
            }

            // Clean up queue
            this.processingQueue.delete(fileKey);
        });

        console.log(`[AutoProcessManager] Completed batch processing for ${filesToProcess.length} files.`);
        return successCount;
    }

// Add these helper methods if they don't exist:

    /**
     * Get estimated page count from a PDF file
     */
    private async getPageCount(file: File): Promise<number> {
        try {
            // Import and use PDFDocument from pdf-lib if available
            const PDFDocument = (window as any).PDFLib?.PDFDocument;

            if (PDFDocument) {
                // Convert File to ArrayBuffer
                const arrayBuffer = await file.arrayBuffer();

                // Load PDF using pdf-lib
                const pdfDoc = await PDFDocument.load(arrayBuffer);

                // Return page count
                return pdfDoc.getPageCount();
            }

            // Fallback estimate based on file size if PDFDocument is not available
            return Math.max(1, Math.ceil(file.size / (100 * 1024))); // Rough estimate: 100KB per page
        } catch (error) {
            console.error(`[AutoProcessManager] Error getting page count for ${file.name}:`, error);
            // Default to estimate based on file size
            return Math.max(1, Math.ceil(file.size / (100 * 1024)));
        }
    }

    /**
     * Calculate estimated processing time for a file
     */
    private async calculateEstimatedProcessingTime(file: File): Promise<number> {
        // Get page count
        const pageCount = await this.getPageCount(file);

        // Base processing time per file in ms
        const baseTimePerFile = 1000;

        // Additional time per page in ms
        const timePerPage = 1700;

        // Additional time per entity type in ms
        const timePerEntityType = 300;

        // Additional time per search query in ms
        const timePerSearchQuery = 500;

        // Count active entity types
        const entityTypeCount =
            (this.config.presidioEntities.length > 0 ? 1 : 0) +
            (this.config.glinerEntities.length > 0 ? 1 : 0) +
            (this.config.geminiEntities.length > 0 ? 1 : 0) +
            (this.config.hidemeEntities.length > 0 ? 1 : 0);

        // Count search queries
        const searchQueryCount = this.config.searchQueries.length;

        // Calculate total estimated time
        return baseTimePerFile +
            (pageCount * timePerPage) +
            (entityTypeCount * timePerEntityType) +
            (searchQueryCount * timePerSearchQuery);
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
            hideme: this.config.hidemeEntities.map(e => typeof e === 'object' ? (e.value || '') : e)
                .filter(Boolean),
            threshold: this.config.detectionThreshold,
            banlist: this.config.useBanlist && this.config.banlistWords ? this.config.banlistWords : undefined
        };

        try {
            // Run detection and get results
            const results = await this._detectEntitiesCallback([file], options);
            const fileKey = getFileKey(file);
            const detectionResult = results[fileKey];

            if (detectionResult) {
                // Process the detection results using the EntityHighlightProcessor
                await EntityHighlightProcessor.processDetectionResults(fileKey, detectionResult, true);
                console.log(`[AutoProcessManager] Entity detection processed for file ${file.name}`);
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

        // Extract entity values from the option objects
        const options = {
            presidio: this.config.presidioEntities.map(e => typeof e === 'object' ? (e.value || '') : e)
                .filter(Boolean),
            gliner: this.config.glinerEntities.map(e => typeof e === 'object' ? (e.value  || '') : e)
                .filter(Boolean),
            gemini: this.config.geminiEntities.map(e => typeof e === 'object' ? (e.value  || '') : e)
                .filter(Boolean),
            hideme: this.config.hidemeEntities.map(e => typeof e === 'object' ? (e.value  || '') : e)
                .filter(Boolean),
            // Add detection threshold if configured (value between 0.0 and 1.0)
            threshold: this.config.detectionThreshold !== undefined ?
                Math.max(0, Math.min(1, this.config.detectionThreshold)) : undefined,
            // Add banlist words if enabled
            banlist: this.config.useBanlist && this.config.banlistWords ? this.config.banlistWords : undefined
        };

        try {
            // Run detection and get results
            const results = await this._detectEntitiesCallback(files, options);

            // Process results for each file
            files.forEach(file => {
                const fileKey = getFileKey(file);
                const detectionResult = results[fileKey];

                if (detectionResult) {
                    const mappingToSet = detectionResult;
                    console.log(`[AutoProcessManager] Got detection results for file ${file.name}, applying to context`);
                    // Process the detection results using the EntityHighlightProcessor
                    // Pass true to indicate this is from auto-processing
                    EntityHighlightProcessor.processDetectionResults(fileKey, mappingToSet, true)
                        .then(() => {
                            console.log(`[AutoProcessManager] Entity detection processed for file ${file.name}`);
                        })
                        .catch(error => {
                            console.error(`[AutoProcessManager] Error processing detection results for ${file.name}:`, error);
                        });

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



