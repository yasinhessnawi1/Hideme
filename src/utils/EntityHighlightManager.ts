// src/utils/EntityHighlightManager.ts
import { HighlightType } from "../contexts/HighlightContext";
import { PDFPageViewport, TextContent } from "../types/pdfTypes";

export interface EntityOptions {
    pageNumber?: number; // Optional page number to only process a specific page
    forceReprocess?: boolean; // Force reprocessing even if already processed
}

export class EntityHighlightManager {
    private pageNumber: number;
    private viewport: PDFPageViewport;
    private textContent: TextContent;
    private detectionMapping: any;
    private getNextHighlightId: () => string;
    private addAnnotation: (page: number, annotation: any, fileKey?: string) => void;
    private fileKey?: string;
    private options: EntityOptions;
    private processingTimestamp: number;
    private processedEntityIds: Set<string> = new Set();
    // Track processed entities by file to prevent cross-contamination
    private static processedEntitiesByFile: Map<string, Set<string>> = new Map();
    // Track processed pages by file to prevent reprocessing
    private static processedPagesByFile: Map<string, Set<number>> = new Map();

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
        const fileMarker = this.fileKey || 'default';
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
     * Reset processed entities for a specific file
     * This allows reprocessing entities when needed
     */
    public static resetProcessedEntitiesForFile(fileKey: string): void {
        const fileMarker = fileKey || 'default';
        EntityHighlightManager.processedEntitiesByFile.set(fileMarker, new Set<string>());
        EntityHighlightManager.processedPagesByFile.set(fileMarker, new Set<number>());
        console.log(`[EntityDebug] Reset processed entities for file ${fileMarker}`);
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
        console.log(`[EntityDebug] Removed file ${fileMarker} from processed entities tracking`);
    }

    /**
     * Generate a unique entity ID based on its properties
     * This helps prevent duplicate entity creation
     */
    private generateEntityId(entity: any): string {
        const { entity_type, bbox, model } = entity;
        const { x0, y0, x1, y1 } = bbox || {};

        // Add more specific file data to prevent cross-file contamination
        const fileMarker = this.fileKey || 'default';

        // Create a stable identifying string based on entity properties with better uniqueness
        return `${fileMarker}-${this.pageNumber}-${entity_type}-${model || 'unknown'}-${x0}-${y0}-${x1}-${y1}`;
    }

    /**
     * Process entity highlights for the page
     * Optimized with batched operations and better validation
     */
    public processHighlights(): void {
        const fileMarker = this.fileKey || 'default';

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
        if (!this.detectionMapping || !this.detectionMapping.pages || !Array.isArray(this.detectionMapping.pages)) {
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
        const fileMarker = this.fileKey || 'default';

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

        // Create highlights for the unique entities
        const highlightsToAdd = uniqueEntities
            .map((entity, index) => {
                try {
                    return this.createEntityHighlightObject(entity, index);
                } catch (error) {
                    console.error('[EntityDebug] Error creating entity highlight:', error);
                    return null;
                }
            })
            .filter(Boolean);

        // Add all highlights in batch
        if (highlightsToAdd.length > 0) {
            console.log(`[EntityDebug] Adding ${highlightsToAdd.length} entity highlights to page ${this.pageNumber} for file ${fileMarker}`);

            // Add all highlights in batch
            highlightsToAdd.forEach(highlight => {
                if (highlight) {
                    this.addAnnotation(this.pageNumber, highlight, this.fileKey);
                }
            });
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

        const { x0, y0, x1, y1 } = entity.bbox;

        // Validate coordinate values
        if (typeof x0 !== 'number' || typeof y0 !== 'number' ||
            typeof x1 !== 'number' || typeof y1 !== 'number') {
            console.warn('[EntityDebug] Invalid bbox coordinates:', entity.bbox);
            return null;
        }

        // Get entity type and model (for color assignment)
        const entityType = entity.entity_type || 'UNKNOWN';
        const model = entity.model || 'presidio'; // Default to presidio if not specified

        // Add debug logging with clear context
        if (index < 3) { // Only log first 3 to reduce verbosity
            console.log(`[EntityDebug] Creating entity highlight: ${entityType} from ${model} model at (${x0.toFixed(2)}, ${y0.toFixed(2)}) with size ${(x1-x0).toFixed(2)}x${(y1-y0).toFixed(2)} for file ${this.fileKey || 'default'}`);
        }

        // Create a truly unique ID with timestamp and random string to prevent collisions
        const randomString = Math.random().toString(36).substring(2, 7);
        const timestamp = Date.now();
        const nextId = this.getNextHighlightId();
        const uniqueId = `entity-${this.fileKey || 'default'}-${this.pageNumber}-${nextId}-${timestamp}-${randomString}`;

        // Create highlight object with guaranteed unique ID and file reference
        return {
            id: uniqueId,
            type: HighlightType.ENTITY,
            x: x0 - 2, // Small padding for better visibility
            y: y0 - 2,
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
            timestamp: this.processingTimestamp
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
