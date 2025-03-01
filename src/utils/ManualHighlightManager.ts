import { HighlightRect, HighlightType } from '../contexts/HighlightContext';

/**
 * Manager for user-created manual highlights
 * Handles both text selection and mouse drag highlighting
 */
export class ManualHighlightManager {
    private pageNumber: number;
    private getNextHighlightId: (type: HighlightType) => string;
    private addAnnotation: (page: number, ann: HighlightRect) => void;
    private highlightColor: string;

    constructor(
        pageNumber: number,
        getNextHighlightId: (type: HighlightType) => string,
        addAnnotation: (page: number, ann: HighlightRect) => void,
        highlightColor: string = '#02ff02'
    ) {
        this.pageNumber = pageNumber;
        this.getNextHighlightId = getNextHighlightId;
        this.addAnnotation = addAnnotation;
        this.highlightColor = highlightColor;
    }

    /**
     * Create a manual rectangle highlight through mouse drag
     */
    createRectangleHighlight(
        startX: number,
        startY: number,
        endX: number,
        endY: number
    ): HighlightRect | null {
        // Calculate highlight rectangle dimensions
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const w = Math.abs(startX - endX);
        const h = Math.abs(startY - endY);

        // Only create highlight if it has reasonable dimensions
        if (w < 5 || h < 5) {
            console.log(`[ManualHighlightManager] Highlight too small (${w}x${h}), ignored`);
            return null;
        }

        // Create highlight rectangle
        const highlightId = this.getNextHighlightId(HighlightType.MANUAL);
        const highlight: HighlightRect = {
            id: highlightId,
            page: this.pageNumber,
            x,
            y,
            w,
            h,
            color: this.highlightColor,
            opacity: 0.5,
            type: HighlightType.MANUAL
        };

        // Add to annotations
        this.addAnnotation(this.pageNumber, highlight);

        console.log(
            `[ManualHighlightManager] Created manual rectangle highlight on page ${this.pageNumber} at x=${x.toFixed(1)}, y=${y.toFixed(1)}, w=${w.toFixed(1)}, h=${h.toFixed(1)}`
        );

        return highlight;
    }

    /**
     * Update the highlight color
     */
    setHighlightColor(color: string): void {
        this.highlightColor = color;
    }

}
