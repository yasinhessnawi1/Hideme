// EntityHighlightManager.ts

import { HighlightManager } from './HighlightManager';
import { HighlightType } from '../contexts/HighlightContext';
import { RedactionItem, RedactionMapping } from '../contexts/PDFContext';

/**
 * Manager for entity detection and highlighting
 * Processes entity information from detection mappings
 */
export class EntityHighlightManager extends HighlightManager {
    private detectionMapping: RedactionMapping | null;

    constructor(
        pageNumber: number,
        viewport: any,             // or a typed PageViewport if you have one
        textContent: any,
        detectionMapping: RedactionMapping | null,
        getNextHighlightId: (type: HighlightType) => string,
        addAnnotation: (page: number, ann: any) => void
    ) {
        // Pass exactly 5 arguments into super if the parent highlight manager expects them
        super(pageNumber, viewport, textContent, getNextHighlightId, addAnnotation);
        this.detectionMapping = detectionMapping;
    }

    /**
     * Process all entity highlights for the page
     */
    processHighlights(): void {
        if (!this.viewport || !this.detectionMapping) {
            console.log(
                `[EntityHighlightManager] Skipping page ${this.pageNumber}: Missing requirements`
            );
            return;
        }

        // Find detection data for this page
        const pageMapping = this.detectionMapping.pages.find(
            (p) => p.page === this.pageNumber
        );
        if (!pageMapping || !pageMapping.sensitive || pageMapping.sensitive.length === 0) {
            console.log(`[EntityHighlightManager] No entities found for page ${this.pageNumber}`);
            return;
        }

        console.log(
            `[EntityHighlightManager] Processing entity highlights for page ${this.pageNumber}: ${pageMapping.sensitive.length} entities`
        );

        // Process each detected entity
        pageMapping.sensitive.forEach((entity) => this.processEntity(entity));
    }

    /**
     * Process an individual entity item
     */
    private processEntity(entity: RedactionItem): void {
        const entityType = entity.entity_type;
        const model = entity.model || 'presidio'; // Default to presidio if not specified
        const color = this.getEntityColor(entityType, model);
        const opacity = this.getOpacityForModel(model);
        const borderStyle = this.getBorderStyleForModel(model);

        // Single bounding box
        if (entity.bbox) {
            this.createHighlightFromBBox(entity.bbox, color, entityType, model, opacity, borderStyle, entity.content);
        }

        // Possibly multiple bounding boxes
        if (entity.boxes && Array.isArray(entity.boxes)) {
            entity.boxes.forEach((box) => {
                this.createHighlightFromBBox(box, color, entityType, model, opacity, borderStyle, entity.content);
            });
        }
    }

    /**
     * Get opacity value based on model type
     */
    private getOpacityForModel(model: string): number {
        switch (model) {
            case 'presidio':
                return 0.4;
            case 'gliner':
                return 0.5;
            case 'gemini':
                return 0.3;
            default:
                return 0.4;
        }
    }

    /**
     * Get border style based on model type
     */
    private getBorderStyleForModel(model: string): string {
        switch (model) {
            case 'presidio':
                return 'solid';
            case 'gliner':
                return 'dashed';
            case 'gemini':
                return 'dotted';
            default:
                return 'solid';
        }
    }

    /**
     * Create a highlight from a bounding box definition
     */
    private createHighlightFromBBox(
        bbox: { x0: number; y0: number; x1: number; y1: number },
        color: string,
        entityType: string,
        model: string,
        opacity: number = 0.4,
        borderStyle: string = 'solid',
        content?: string
    ): void {
        const { x0, y0, x1, y1 } = bbox;

        // convertToViewportPoint(...) usually returns number[], so cast it
        const [vX0, vY0] = this.viewport.convertToViewportPoint(x0, y0) as [number, number];
        const [vX1, vY1] = this.viewport.convertToViewportPoint(x1, y1) as [number, number];

        // PDF pages can have Y=0 at bottom, so some code flips it with:
        //   y = this.viewport.height - ...
        // Adjust if your PDF is top-down or bottom-up

        const x = Math.min(vX0, vX1);
        const y = this.viewport.height - Math.max(vY0, vY1);
        const width = Math.abs(vX1 - vX0);
        const height = Math.abs(vY1 - vY0);

        // Create an entity highlight object
        const highlight = this.createHighlight(
            x,
            y,
            width,
            height,
            HighlightType.ENTITY,
            color,
            opacity,
            {
                entity: entityType,
                text: content || entityType,
                model: model,
                borderStyle: borderStyle,
            }
        );

        this.addAnnotation(this.pageNumber, highlight);

        console.log(
            `[EntityHighlightManager] Added ${model} entity highlight on page ${this.pageNumber} for "${entityType}" at ` +
            `x=${highlight.x.toFixed(1)}, y=${highlight.y.toFixed(1)}, w=${highlight.w.toFixed(1)}, h=${highlight.h.toFixed(1)}`
        );
    }

    /**
     * Assign colors based on entity type and model
     */
    private getEntityColor(entityType: string, model: string): string {
        const normalizedType = entityType.toUpperCase();

        // Use different color schemes for different models
        if (model === 'gemini') {
            // Gemini AI - Orange/Red color scheme
            switch (normalizedType) {
                case 'PERSON':
                case 'NAME':
                    return '#FF7F50'; // Coral

                case 'DATE_TIME':
                case 'DATE':
                    return '#FF8C00'; // Dark Orange

                case 'LOCATION':
                case 'ADDRESS':
                    return '#FF6347'; // Tomato

                case 'EMAIL_ADDRESS':
                case 'EMAIL':
                    return '#FFA07A'; // Light Salmon

                case 'PHONE_NUMBER':
                case 'PHONE':
                    return '#FF4500'; // Orange Red

                default:
                    return '#FFA500'; // Orange
            }
        } else if (model === 'gliner') {
            // Gliner ML - Purple/Pink color scheme
            switch (normalizedType) {
                case 'PERSON':
                    return '#DA70D6'; // Orchid

                case 'DATE_TIME':
                case 'DATE':
                    return '#FF00FF'; // Magenta

                case 'LOCATION':
                case 'ADDRESS':
                    return '#BA55D3'; // Medium Orchid

                case 'EMAIL_ADDRESS':
                case 'EMAIL':
                    return '#EE82EE'; // Violet

                case 'PHONE_NUMBER':
                    return '#DDA0DD'; // Plum

                case 'BOOK':
                    return '#D8BFD8'; // Thistle

                case 'ACTOR':
                case 'CHARACTER':
                    return '#FF69B4'; // Hot Pink

                default:
                    return '#C71585'; // Medium Violet Red
            }
        } else {
            // Presidio ML - Original blue/green color scheme
            switch (normalizedType) {
                case 'PERSON':
                case 'NAME':
                    return '#87CEFA'; // Light blue

                case 'DATE_TIME':
                case 'DATE':
                    return '#98FB98'; // Pale green

                case 'LOCATION':
                case 'ADDRESS':
                    return '#ADD8E6'; // Light blue

                case 'EMAIL_ADDRESS':
                case 'EMAIL':
                    return '#B0C4DE'; // Light steel blue

                case 'PHONE_NUMBER':
                case 'PHONE':
                    return '#20B2AA'; // Light sea green

                case 'ORGANIZATION':
                case 'ORG':
                    return '#4682B4'; // Steel blue

                case 'MONEY':
                case 'CURRENCY':
                    return '#90EE90'; // Light green

                default:
                    return '#ADD8E6'; // Light blue for unknown
            }
        }
    }
}
