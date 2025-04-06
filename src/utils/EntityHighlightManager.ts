import { HighlightType } from "../contexts/HighlightContext";
import { PDFPageViewport, TextContent } from "../types/pdfTypes";
import { v4 as uuidv4 } from 'uuid';

export interface EntityOptions {
    pageNumber?: number; // Optional page number to only process a specific page
    forceReprocess?: boolean; // Force reprocessing even if already processed
}

export class EntityHighlightManager {
    private readonly pageNumber: number;
    private readonly viewport: PDFPageViewport;
    private readonly textContent: TextContent;
    private readonly detectionMapping: any;
    private readonly getNextHighlightId: () => string;
    private readonly addAnnotation: (page: number, annotation: any, fileKey?: string) => void;
    private readonly fileKey?: string;
    private readonly options: EntityOptions;
    private readonly processingTimestamp: number;
    private readonly processedEntityIds: Set<string> = new Set();

    // Track processed entities by file to prevent cross-contamination
    private static readonly processedEntitiesByFile: Map<string, Set<string>> = new Map();
    // Track processed pages by file to prevent reprocessing
    private static readonly processedPagesByFile: Map<string, Set<number>> = new Map();
    // Track reset operations to prevent cascades
    private static readonly lastResetTimestamps: Map<string, number> = new Map();
    // Define a reset throttle time (milliseconds)
    private static readonly RESET_THROTTLE_TIME = 500; // 0.5

    constructor(
        pageNumber: number,
        viewport: PDFPageViewport,
        textContent: TextContent,
        detectionMapping: any,
        getNextHighlightId: () => string,
        addAnnotation: (page: number, annotation: any, fileKey?: string) => void,
        fileKey?: string,
        options: EntityOptions = {}
    ) {
        this.pageNumber = pageNumber;
        this.viewport = viewport;
        this.textContent = textContent;
        this.detectionMapping = detectionMapping;
        this.getNextHighlightId = getNextHighlightId;
        this.addAnnotation = addAnnotation;
        this.fileKey = fileKey;
        this.options = options;
        this.processingTimestamp = Date.now();

        // Initialize file-specific processed entities set if not exists
        const fileMarker = this.fileKey ?? 'default';
        if (!EntityHighlightManager.processedEntitiesByFile.has(fileMarker)) {
            EntityHighlightManager.processedEntitiesByFile.set(fileMarker, new Set<string>());
        }

        // Initialize file-specific processed pages set if not exists
        if (!EntityHighlightManager.processedPagesByFile.has(fileMarker)) {
            EntityHighlightManager.processedPagesByFile.set(fileMarker, new Set<number>());
        }

        // Get the file-specific processed entities set
        this.processedEntityIds = EntityHighlightManager.processedEntitiesByFile.get(fileMarker) || new Set<string>();
    }

    /**
     * Check if a page has already been processed for a specific file
     */
    public static isPageProcessedForFile(fileKey: string, pageNumber: number): boolean {
        const fileMarker = fileKey || 'default';
        const processedPages = EntityHighlightManager.processedPagesByFile.get(fileMarker);
        return processedPages ? processedPages.has(pageNumber) : false;
    }

    /**
     * Mark a page as processed for a specific file
     */
    public static markPageAsProcessedForFile(fileKey: string, pageNumber: number): void {
        const fileMarker = fileKey || 'default';
        let processedPages = EntityHighlightManager.processedPagesByFile.get(fileMarker);

        if (!processedPages) {
            processedPages = new Set<number>();
            EntityHighlightManager.processedPagesByFile.set(fileMarker, processedPages);
        }

        processedPages.add(pageNumber);
    }

    /**
     * Check if a file has any processed entities
     */
    public static hasProcessedEntitiesForFile(fileKey: string): boolean {
        const fileMarker = fileKey || 'default';
        const processedEntities = EntityHighlightManager.processedEntitiesByFile.get(fileMarker);
        return processedEntities ? processedEntities.size > 0 : false;
    }

    /**
     * Remove a file from the processed entities tracking
     */
    public static removeFileFromProcessedEntities(fileKey: string): void {
        const fileMarker = fileKey || 'default';
        EntityHighlightManager.processedEntitiesByFile.delete(fileMarker);
        EntityHighlightManager.processedPagesByFile.delete(fileMarker);
        // Also clear the reset timestamp
        EntityHighlightManager.lastResetTimestamps.delete(fileMarker);
        console.log(`[EntityDebug] Removed file ${fileMarker} from processed entities tracking`);
    }

    /**
     * Reset processed entities for a specific file with throttling
     * to prevent event cascade loops
     */
    public static resetProcessedEntitiesForFile(fileKey: string): boolean {
        const fileMarker = fileKey || 'default';
        const now = Date.now();

        // Check if we've reset this file recently to prevent cascades
        const lastReset = EntityHighlightManager.lastResetTimestamps.get(fileMarker) ?? 0;
        if (now - lastReset < EntityHighlightManager.RESET_THROTTLE_TIME) {
            // Skip this reset if it's too soon after the last one
            console.log(`[EntityDebug] Throttling reset for file ${fileMarker} - last reset was ${now - lastReset}ms ago`);
            return false;
        }

        // Clear processed entities for this file
        EntityHighlightManager.processedEntitiesByFile.set(fileMarker, new Set<string>());

        // Clear processed pages for this file
        EntityHighlightManager.processedPagesByFile.set(fileMarker, new Set<number>());

        // Update the reset timestamp
        EntityHighlightManager.lastResetTimestamps.set(fileMarker, now);

        console.log(`[EntityDebug] Reset processed entities for file ${fileMarker}`);

        // Trigger a re-processing event with a slight delay to ensure UI is ready
        // Using a simpler event with less data to reduce overhead
        window.dispatchEvent(new CustomEvent('force-reprocess-entity-highlights', {
            detail: {
                fileKey: fileMarker,
                timestamp: now,
                source: 'entity-highlight-manager'
            }
        }));

        return true;
    }

    // Generate a unique entity ID that won't cause duplicates
    private generateEntityId(entity: any): string {
        const {entity_type} = entity;

        // Use full UUID for guaranteed uniqueness
        const uuid = uuidv4();
        const timestamp = Date.now();
        const fileMarker = this.fileKey ?? 'default';

        // Create a compound ID with sufficient entropy to prevent collisions
        return `entity-${fileMarker}-${this.pageNumber}-${entity_type}-${uuid}-${timestamp}`;
    }

    /**
     * Process entity highlights for the page
     * Optimized with batched operations and better validation
     */
    public processHighlights(): void {
        const fileMarker = this.fileKey ?? 'default';

        // Verify that the detection mapping belongs to this file
        if (this.detectionMapping?.fileKey &&
            this.detectionMapping.fileKey !== fileMarker) {
            console.warn(`[EntityDebug] Detection mapping belongs to file ${this.detectionMapping.fileKey} but processing for ${fileMarker}, skipping`);
            return;
        }

        // Check if this page has already been processed for this file
        // Skip if already processed unless force reprocess is enabled
        if (!this.options.forceReprocess &&
            EntityHighlightManager.isPageProcessedForFile(fileMarker, this.pageNumber)) {
            console.log(`[EntityDebug] Page ${this.pageNumber} already processed for file ${fileMarker}, skipping`);
            return;
        }

        // Log with clear context information
        console.log(`[EntityDebug] Processing highlights for page ${this.pageNumber}${this.fileKey ? ` in file ${this.fileKey}` : ''} (${this.processingTimestamp})`);

        // Validate detection mapping
        if (!this.detectionMapping?.pages || !Array.isArray(this.detectionMapping.pages)) {
            console.warn('[EntityDebug] No valid detection mapping structure');
            return;
        }

        // Find the page data for the current page - fixed for better performance
        const pageData = this.detectionMapping.pages.find((p: any) => p.page === this.pageNumber);

        if (!pageData) {
            console.warn(`[EntityDebug] No data found for page ${this.pageNumber}`);
            return;
        }

        // Check if sensitive entities exist for this page
        if (!pageData.sensitive || !Array.isArray(pageData.sensitive) || pageData.sensitive.length === 0) {
            console.warn(`[EntityDebug] No sensitive entities found on page ${this.pageNumber}`);
            // Still mark as processed even if no entities found
            EntityHighlightManager.markPageAsProcessedForFile(fileMarker, this.pageNumber);
            return;
        }

        console.log(`[EntityDebug] Found ${pageData.sensitive.length} entities on page ${this.pageNumber} to process`);

        // Process entities in one pass for better performance
        this.batchProcessEntities(pageData.sensitive);

        // Mark this page as processed for this file
        EntityHighlightManager.markPageAsProcessedForFile(fileMarker, this.pageNumber);
    }

    /**
     * Process entities in batch for better performance
     */
    private batchProcessEntities(entities: any[]): void {
        if (!entities || entities.length === 0) return;

        // Create a new Set for this processing session
        const processedThisSession: Set<string> = new Set();
        const fileMarker = this.fileKey ?? 'default';
        const batchSize = 10; // Process in smaller batches to avoid UI freezing

        // Filter entities in one pass to avoid redundant processing
        const uniqueEntities = entities.filter(entity => {
            // Skip if no valid bbox
            if (!entity.bbox) {
                return false;
            }

            const entityId = this.generateEntityId(entity);

            // Skip if already processed globally or in this session
            if (this.processedEntityIds.has(entityId) || processedThisSession.has(entityId)) {
                return false;
            }

            // Mark as processed for this session and globally
            processedThisSession.add(entityId);
            this.processedEntityIds.add(entityId);

            // Also update the file-specific processed entities set
            const fileProcessedEntities = EntityHighlightManager.processedEntitiesByFile.get(fileMarker);
            if (fileProcessedEntities) {
                fileProcessedEntities.add(entityId);
            }

            return true;
        });

        console.log(`[EntityDebug] Processing ${uniqueEntities.length} unique entities out of ${entities.length} total for file ${fileMarker}`);

        // Process entities in smaller batches to avoid UI freezing
        const processBatch = (startIndex: number) => {
            const endIndex = Math.min(startIndex + batchSize, uniqueEntities.length);
            const batch = uniqueEntities.slice(startIndex, endIndex);

            // Create highlights for this batch
            const highlightsToAdd = batch.map((entity, index) => {
                try {
                    return this.createEntityHighlightObject(entity, index);
                } catch (error) {
                    console.error('[EntityDebug] Error creating entity highlight:', error);
                    return null;
                }
            }).filter(Boolean);

            // Add all highlights in this batch
            if (highlightsToAdd.length > 0) {
                highlightsToAdd.forEach(highlight => {
                    if (highlight) {
                        this.addAnnotation(this.pageNumber, highlight, this.fileKey);
                    }
                });
            }

            // Process next batch if more entities left
            if (endIndex < uniqueEntities.length) {
                setTimeout(() => processBatch(endIndex), 0);
            } else {
                console.log(`[EntityDebug] Completed processing all ${uniqueEntities.length} entities for page ${this.pageNumber}`);
            }
        };

        // Start processing the first batch
        if (uniqueEntities.length > 0) {
            processBatch(0);
        } else {
            console.log(`[EntityDebug] No valid entity highlights to add on page ${this.pageNumber} for file ${fileMarker}`);
        }
    }

    /**
     * Extract highlight creation into a separate method for better maintenance
     */
    private createEntityHighlightObject(entity: any, index: number): any {
        // Must have a valid bbox
        if (!entity.bbox) {
            console.warn('[EntityDebug] Entity missing bbox property', entity);
            return null;
        }

        const {x0, y0, x1, y1} = entity.bbox;

        // Validate coordinate values
        if (typeof x0 !== 'number' || typeof y0 !== 'number' ||
            typeof x1 !== 'number' || typeof y1 !== 'number') {
            console.warn('[EntityDebug] Invalid bbox coordinates:', entity.bbox);
            return null;
        }

        // Get entity type and model (for color assignment)
        const entityType = entity.entity_type || 'UNKNOWN';

        const model = entity.engine || 'presidio'; // Default to presidio if not specified

        // Add debug logging with clear context
        if (index < 3) { // Only log first 3 to reduce verbosity
            console.log(`[EntityDebug] Creating entity highlight: ${entityType} from ${model} model at (${x0.toFixed(2)}, ${y0.toFixed(2)}) with size ${(x1 - x0).toFixed(2)}x${(y1 - y0).toFixed(2)} for file ${this.fileKey ?? 'default'}`);
        }

        // Generate a unique ID that won't collide
        const uniqueId = this.generateEntityId(entity);

        // Create highlight object with guaranteed unique ID and file reference
        return {
            id: uniqueId,
            type: HighlightType.ENTITY,
            x: x0 - 5, // Small padding for better visibility
            y: y0 -5,
            w: (x1 - x0) + 4, // Add padding on both sides
            h: (y1 - y0) + 4,
            text: entity.content || entityType,
            entity: entityType,
            model: model,
            color: this.getColorForModel(model),
            opacity: 0.3,
            score: entity.score || 0,
            fileKey: this.fileKey, // Ensure fileKey is set
            page: this.pageNumber,
            timestamp: this.processingTimestamp,
            instanceId: uuidv4()
        };
    }

    /**
     * Get the appropriate color for an entity model
     */
    private getColorForModel(model: string): string {
        // Define color mapping for different models
        // These are the default colors, which can be overridden by the user
        const colorMap: Record<string, string> = {
            'presidio': '#ffd771', // Yellow
            'gliner': '#ff7171', // Red
            'gemini': '#7171ff', // Blue
            'default': '#757575' // Gray
        };

        // Return the color if it exists in the map, otherwise return a default color
        return colorMap[model.toLowerCase()] || colorMap.default;
    }
}
