import { HighlightRect, HighlightType } from '../types';
import { highlightStore } from '../store/HighlightStore';
import processingStateService from '../services/client-services/ProcessingStateService';
import summaryPersistenceStore from '../store/SummaryPersistenceStore';

/**
 * Processes entity detection results into highlights
 */
export class EntityHighlightProcessor {
    /**
     * Process detection results for a file
     * @param fileKey The file key
     * @param detectionResult The detection results
     * @param isAutoProcess Whether this is from auto-processing (optional)
     * @returns Promise resolving to the IDs of created highlights
     */
    static async processDetectionResults(
        fileKey: string,
        detectionResult: any,
        isAutoProcess: boolean = false,
    ): Promise<string[]> {
        if (!detectionResult) {
            console.warn('[EntityHighlightProcessor] No detection results provided');
            return [];
        }

        // Handle different possible result structures
        const mapping = detectionResult.redaction_mapping || detectionResult;

        if (!mapping.pages || !Array.isArray(mapping.pages)) {
            console.warn('[EntityHighlightProcessor] No pages in detection results');
            return [];
        }

        console.log(`[EntityHighlightProcessor] Processing ${mapping.pages.length} pages of entity detection results for ${fileKey}`);

        // First remove any existing entity highlights for this file
        await highlightStore.removeHighlightsByType(fileKey, HighlightType.ENTITY);

        // Convert detection results to highlights
        const allHighlights: HighlightRect[] = [];

        for (const page of mapping.pages) {
            if (!page.sensitive || !Array.isArray(page.sensitive)) continue;

            for (const entity of page.sensitive) {
                try {
                    if (!entity.bbox) continue;

                    const {x0, y0, x1, y1} = entity.bbox;

                    // Create highlight with standardized properties
                    const highlight: HighlightRect = {
                        id: `entity-${fileKey}-${page.page}-${entity.entity_type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        page: page.page,
                        x: x0 - 5, // Slight padding for visibility
                        y: y0 - 5,
                        w: (x1 - x0) + 3, // Slight padding for visibility
                        h: (y1 - y0) + 5,
                        text: entity.original_text || entity.entity_type,
                        entity: entity.entity_type,
                        model: entity.engine || 'presidio', // Default to presidio if not specified
                        color: this.getColorForModel(entity.engine || 'presidio'),
                        opacity: 0.3,
                        type: HighlightType.ENTITY,
                        fileKey,
                        timestamp: Date.now()
                    };

                    allHighlights.push(highlight);
                } catch (error) {
                    console.error('[EntityHighlightProcessor] Error processing entity:', error);
                }
            }
        }

        // Batch add all highlights to the store
        const highlightIds = await highlightStore.addMultipleHighlights(allHighlights);

        console.log(`[EntityHighlightProcessor] Added ${highlightIds.length} entity highlights for ${fileKey}`);

        // Update the file in the persistence store
        try {
            // Track this file as analyzed in the persistence store
            summaryPersistenceStore.addAnalyzedFile('entity', fileKey);

            // If detection result has summary data, store it in the persistence service
            if (detectionResult.entities_detected && detectionResult.performance) {
                // Get the filename from the first page if available
                let fileName = fileKey;
                if (mapping.pages && mapping.pages.length > 0 && mapping.pages[0].file_name) {
                    fileName = mapping.pages[0].file_name;
                }

                // Create and save the file summary
                const summary = {
                    fileKey,
                    fileName,
                    entities_detected: detectionResult.entities_detected,
                    performance: detectionResult.performance
                };

                summaryPersistenceStore.updateFileSummary('entity', summary);
                console.log(`[EntityHighlightProcessor] Updated entity summary for ${fileKey} in persistence store`);
            }
        } catch (error) {
            console.error('[EntityHighlightProcessor] Error updating persistence store:', error);
        }

        // If this is from auto-processing, dispatch an event with the detection result
        // for other components like EntityDetectionSidebar to update their state
        if (isAutoProcess) {
            window.dispatchEvent(new CustomEvent('auto-processing-complete', {
                detail: {
                    fileKey,
                    hasEntityResults: true,
                    detectionResult: detectionResult,
                    timestamp: Date.now()
                }
            }));

            // Also update the processing state service with the detection result
            processingStateService.completeProcessing(fileKey, true, detectionResult);
        }

        return highlightIds;
    }

    /**
     * Get the appropriate color for an entity model
     * @param model The model name (presidio, gliner, gemini, etc.)
     * @returns Hex color code
     */
    private static getColorForModel(model: string): string {
        // Define color mapping for different models
        const colorMap: Record<string, string> = {
            'presidio': '#ffd771', // Yellow
            'gliner': '#ff7171',   // Red
            'gemini': '#7171ff',   // Blue
            'hideme': '#71ffa0',   // Green
            'default': '#757575'   // Gray
        };

        // Return the color if it exists in the map, otherwise return default color
        return colorMap[model.toLowerCase()] || colorMap.default;
    }
}
