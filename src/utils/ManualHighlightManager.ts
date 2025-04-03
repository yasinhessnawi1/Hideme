import { HighlightRect, HighlightType } from '../contexts/HighlightContext';
import { v4 as uuidv4 } from 'uuid';

/**
 * Manager for user-created manual highlights
 * Handles both text selection and mouse drag highlighting
 */
export class ManualHighlightManager {
    private readonly pageNumber: number;
    private readonly getNextHighlightId: () => string;
    private readonly addAnnotation: (page: number, ann: HighlightRect, fileKey?: string) => void;
    private readonly highlightColor: string;
    private readonly fileKey?: string;
    private lastProcessedId: string | null = null;
    private readonly processingTimestamp: number;
    private readonly instanceId: string;
    // Track the last highlight creation time to prevent duplicate processing
    private lastHighlightTime: number = 0;
    // Keep track of highlight IDs created by this instance
    private createdHighlightIds: Set<string> = new Set();

    constructor(
        pageNumber: number,
        getNextHighlightId: () => string,
        addAnnotation: (page: number, ann: HighlightRect, fileKey?: string) => void,
        highlightColor: string = '#02ff02',
        fileKey?: string
    ) {
        this.pageNumber = pageNumber;
        this.getNextHighlightId = getNextHighlightId;
        this.addAnnotation = addAnnotation;
        this.highlightColor = highlightColor;
        this.fileKey = fileKey;
        this.processingTimestamp = Date.now();
        // Create a unique instance ID for this manager using UUID
        this.instanceId = uuidv4();
    }

    /**
     * Generate a truly unique ID that incorporates all necessary context
     * to prevent ID collisions across files and pages
     */
    private generateUniqueId(): string {
        const uuid = uuidv4();
        const timestamp = Date.now();
        const fileMarker = this.fileKey ?? 'default';

        // Construct a highly specific ID that won't collide
        return `manual-${fileMarker}-${this.pageNumber}-${uuid}-${timestamp}-${this.instanceId}`;
    }

    /**
     * Create a manual rectangle highlight through mouse drag
     * Fixed to ensure all highlights persist and work on pages with existing highlights
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
        if (w < 2 || h < 2) { // Reduced from 3 to 2 to allow smaller highlights
            console.log('[ManualHighlight] Highlight too small, ignoring');
            return null;
        }

        // Prevent rapid duplicate highlight creation (debounce)
        const currentTime = Date.now();
        if (currentTime - this.lastHighlightTime < 100) { // 100ms debounce
            console.log('[ManualHighlight] Highlight creation too frequent, ignoring');
            return null;
        }
        this.lastHighlightTime = currentTime;

        // Generate a completely unique ID that won't collide with IDs from other files or pages
        const highlightId = this.generateUniqueId();

        // Track this ID to prevent duplicates
        this.createdHighlightIds.add(highlightId);

        // Create highlight rectangle with guaranteed unique ID
        const highlight: HighlightRect = {
            id: highlightId,
            page: this.pageNumber,
            x,
            y,
            w,
            h,
            color: this.highlightColor,
            opacity: 0.5,
            type: HighlightType.MANUAL,
            fileKey: this.fileKey,
            timestamp: currentTime, // Add timestamp for ordering and debugging
            instanceId: this.instanceId // Add the instance ID for additional uniqueness
        };

        // Save this ID to prevent duplicate processing
        this.lastProcessedId = highlightId;

        console.log(`[ManualHighlight] Created manual highlight ID ${highlightId} at (${x},${y}) with size ${w}x${h} on page ${this.pageNumber}${this.fileKey ? ` for file ${this.fileKey}` : ''}`);

        // Add to annotations
        this.addAnnotation(this.pageNumber, highlight, this.fileKey);
        return highlight;
    }
}
