import { HighlightRect, HighlightType } from '../types/pdfTypes';
import { highlightStore } from '../store/HighlightStore';

/**
 * Processes manual highlights from user interactions
 */
export class ManualHighlightProcessor {
    /**
     * Create a rectangle highlight from mouse coordinates
     * @param fileKey The file key
     * @param pageNumber The page number
     * @param startX Start X coordinate
     * @param startY Start Y coordinate
     * @param endX End X coordinate
     * @param endY End Y coordinate
     * @param color Highlight color (hex)
     * @returns Promise resolving to the created highlight or null if invalid
     */
    static async createRectangleHighlight(
        fileKey: string,
        pageNumber: number,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        color: string = '#00ff15'
    ): Promise<HighlightRect | null> {
        // Calculate highlight rectangle dimensions
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const w = Math.abs(startX - endX);
        const h = Math.abs(startY - endY);

        // Only create highlight if it has reasonable dimensions
        if (w < 2 || h < 2) {
            console.log('[ManualHighlightProcessor] Highlight too small, ignoring');
            return null;
        }

        // Create the highlight object
        const highlight: HighlightRect = {
            id: `manual-${fileKey}-${pageNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            page: pageNumber,
            x,
            y,
            w,
            h,
            color,
            opacity: 0.5,
            type: HighlightType.MANUAL,
            fileKey,
            timestamp: Date.now()
        };

        // Add the highlight to the store
        const id = await highlightStore.addHighlight(highlight);

        console.log(`[ManualHighlightProcessor] Created manual highlight ID ${id} at (${x},${y}) with size ${w}x${h} on page ${pageNumber} for file ${fileKey}`);

        // Update the highlight object with the assigned ID
        highlight.id = id;

        return highlight;
    }

    /**
     * Find highlights at a specific position
     * @param fileKey The file key
     * @param pageNumber The page number
     * @param x X coordinate
     * @param y Y coordinate
     * @param width Width of search area
     * @param height Height of search area
     * @param tolerance Distance tolerance
     * @returns Array of highlights at the position
     */
    static findHighlightsByPosition(
        fileKey: string,
        pageNumber: number,
        x: number,
        y: number,
        width: number,
        height: number,
        tolerance: number = 5
    ): HighlightRect[] {
        // Get all highlights for this page
        const pageHighlights = highlightStore.getHighlightsForPage(fileKey, pageNumber);

        // Filter highlights by position
        return pageHighlights.filter(highlight => {
            // Skip if highlight doesn't have position data
            if (
                highlight.x === undefined ||
                highlight.y === undefined ||
                highlight.w === undefined ||
                highlight.h === undefined
            ) {
                return false;
            }

            // Check if highlights overlap or are within tolerance
            const xOverlap =
                Math.abs((highlight.x + highlight.w/2) - (x + width/2)) -
                (highlight.w/2 + width/2 + tolerance);

            const yOverlap =
                Math.abs((highlight.y + highlight.h/2) - (y + height/2)) -
                (highlight.h/2 + height/2 + tolerance);

            return xOverlap && yOverlap;
        });
    }
}
