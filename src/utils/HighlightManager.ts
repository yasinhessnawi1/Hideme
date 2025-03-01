import { HighlightRect, HighlightType } from '../contexts/HighlightContext';

/**
 * Abstract base class for all highlight managers
 * Provides common functionality for coordinate transformation and highlight creation
 */
export abstract class HighlightManager {
    protected pageNumber: number;
    protected viewport: any; // pdfjs.PageViewport
    protected textContent: any; // TextContent
    protected getNextHighlightId: (type: HighlightType) => string;
    protected addAnnotation: (page: number, ann: HighlightRect) => void;

    constructor(
        pageNumber: number,
        viewport: any,
        textContent: any,
        getNextHighlightId: (type: HighlightType) => string,
        addAnnotation: (page: number, ann: HighlightRect) => void
    ) {
        this.pageNumber = pageNumber;
        this.viewport = viewport;
        this.textContent = textContent;
        this.getNextHighlightId = getNextHighlightId;
        this.addAnnotation = addAnnotation;
    }

    /**
     * Creates a highlight rectangle with proper positioning
     */
    protected createHighlight(
        x: number,
        y: number,
        width: number,
        height: number,
        type: HighlightType,
        color: string,
        opacity: number = 0.6,
        additionalProps: Record<string, any> = {}
    ): HighlightRect {
        // Add padding to ensure complete coverage
        const padding = 2;
        const highlightId = this.getNextHighlightId(type);

        const highlight: HighlightRect = {
            id: highlightId,
            page: this.pageNumber,
            x: x - padding,
            y: y - padding,
            w: width + (padding * 2),
            h: height + (padding * 2),
            color,
            opacity,
            type,
            ...additionalProps
        };

        return highlight;
    }

    /**
     * Each specific manager must implement this method
     */
    abstract processHighlights(): void;
}
