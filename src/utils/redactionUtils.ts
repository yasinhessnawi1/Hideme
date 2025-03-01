import { HighlightRect, HighlightType } from '../contexts/HighlightContext';
import { RedactionMapping, RedactionItem } from '../contexts/PDFContext';

/**
 * Builds a redaction mapping from manual highlights
 *
 * @param annotations Object containing all highlight annotations
 * @returns A RedactionMapping object with manual highlights
 */
export const buildManualRedactionMapping = (
    annotations: Record<number, HighlightRect[]>
): RedactionMapping => {
    const pages: { page: number; sensitive: RedactionItem[] }[] = [];

    // Process each page with annotations
    Object.entries(annotations).forEach(([pageStr, highlights]) => {
        const page = parseInt(pageStr);
        const manualHighlights = highlights.filter(h => h.type === HighlightType.MANUAL);

        if (manualHighlights.length === 0) return;

        const sensitive: RedactionItem[] = manualHighlights.map(highlight => ({
            entity_type: "MANUAL",
            content: highlight.text || "",
            start: 0,
            end: 0,
            score: 1.0,
            bbox: {
                x0: highlight.x,
                y0: highlight.y,
                x1: highlight.x + highlight.w,
                y1: highlight.y + highlight.h,
            }
        }));

        pages.push({ page, sensitive });
    });

    return { pages };
};

/**
 * Builds a redaction mapping from search highlights
 *
 * @param annotations Object containing all highlight annotations
 * @returns A RedactionMapping object with search highlights
 */
export const buildSearchRedactionMapping = (
    annotations: Record<number, HighlightRect[]>
): RedactionMapping => {
    const pages: { page: number; sensitive: RedactionItem[] }[] = [];

    // Process each page with annotations
    Object.entries(annotations).forEach(([pageStr, highlights]) => {
        const page = parseInt(pageStr);
        const searchHighlights = highlights.filter(h => h.type === HighlightType.SEARCH);

        if (searchHighlights.length === 0) return;

        const sensitive: RedactionItem[] = searchHighlights.map(highlight => ({
            entity_type: "SEARCH",
            content: highlight.text || "",
            start: 0,
            end: 0,
            score: 1.0,
            bbox: {
                x0: highlight.x,
                y0: highlight.y,
                x1: highlight.x + highlight.w,
                y1: highlight.y + highlight.h,
            }
        }));

        pages.push({ page, sensitive });
    });

    return { pages };
};

/**
 * Merges multiple redaction mappings into a single mapping
 *
 * @param mappings Array of redaction mappings to merge
 * @returns A single merged RedactionMapping
 */
export const mergeRedactionMappings = (
    mappings: RedactionMapping[]
): RedactionMapping => {
    // Return empty mapping if no mappings provided
    if (!mappings.length) return { pages: [] };

    // Return the mapping directly if only one provided
    if (mappings.length === 1) return mappings[0];

    // Initialize merged result
    const mergedPages: { [key: number]: { page: number; sensitive: RedactionItem[] } } = {};

    // Process each mapping
    mappings.forEach(mapping => {
        if (!mapping.pages) return;

        mapping.pages.forEach(page => {
            const pageNumber = page.page;

            // Initialize page if not exists
            if (!mergedPages[pageNumber]) {
                mergedPages[pageNumber] = { page: pageNumber, sensitive: [] };
            }

            // Add sensitive items
            if (page.sensitive && Array.isArray(page.sensitive)) {
                mergedPages[pageNumber].sensitive = [
                    ...mergedPages[pageNumber].sensitive,
                    ...page.sensitive
                ];
            }
        });
    });

    // Convert object to array
    return {
        pages: Object.values(mergedPages)
    };
};

/**
 * Creates a full redaction mapping from all highlight types and detection mappings
 *
 * @param annotations Object containing all highlight annotations
 * @param detectionMapping Detection mapping from AI/ML detection
 * @param includeSearchHighlights Whether to include search highlights
 * @param includeEntityHighlights Whether to include entity highlights
 * @param includeManualHighlights Whether to include manual highlights
 * @returns A complete RedactionMapping
 */
export const createFullRedactionMapping = (
    annotations: Record<number, HighlightRect[]>,
    detectionMapping: RedactionMapping | null,
    includeSearchHighlights: boolean = true,
    includeEntityHighlights: boolean = true,
    includeManualHighlights: boolean = true
): RedactionMapping => {
    const mappingsToMerge: RedactionMapping[] = [];

    // Add detection mapping if available and entity highlights should be included
    if (detectionMapping && includeEntityHighlights) {
        mappingsToMerge.push(detectionMapping);
    }

    // Add manual highlights if requested
    if (includeManualHighlights) {
        mappingsToMerge.push(buildManualRedactionMapping(annotations));
    }

    // Add search highlights if requested
    if (includeSearchHighlights) {
        mappingsToMerge.push(buildSearchRedactionMapping(annotations));
    }

    // Merge all mappings
    return mergeRedactionMappings(mappingsToMerge);
};

/**
 * Extracts statistics from a redaction mapping
 *
 * @param mapping The redaction mapping to analyze
 * @returns Statistics about the redaction mapping
 */
export const getRedactionStatistics = (mapping: RedactionMapping) => {
    if (!mapping.pages) return {
        totalItems: 0,
        byType: {},
        byPage: {}
    };

    const stats = {
        totalItems: 0,
        byType: {} as { [key: string]: number },
        byPage: {} as { [key: number]: number }
    };

    mapping.pages.forEach(page => {
        const pageNumber = page.page;
        let pageCount = 0;

        if (page.sensitive && Array.isArray(page.sensitive)) {
            page.sensitive.forEach(item => {
                // Count total items
                stats.totalItems++;
                pageCount++;

                // Count by type
                const entityType = item.entity_type || 'UNKNOWN';
                stats.byType[entityType] = (stats.byType[entityType] || 0) + 1;
            });
        }

        // Store count by page
        if (pageCount > 0) {
            stats.byPage[pageNumber] = pageCount;
        }
    });

    return stats;
};
