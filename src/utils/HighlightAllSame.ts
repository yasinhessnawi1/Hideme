// src/utils/HighlightAllSame.ts
import { getFileKey } from '../contexts/PDFViewerContext';
import {HighlightRect, HighlightType} from '../contexts/HighlightContext';
import highlightManager from './HighlightManager';

/**
 * Utility for highlighting all occurrences of the same text
 * Integrated with PDF.js to find text within the document
 */
class HighlightAllSameUtility {
    private static instance: HighlightAllSameUtility;

    // Reference to the PDFDocumentProxy
    private pdfDocuments: Map<string, any> = new Map();

    private constructor() {
        this.initEventListeners();
    }

    public static getInstance(): HighlightAllSameUtility {
        if (!HighlightAllSameUtility.instance) {
            HighlightAllSameUtility.instance = new HighlightAllSameUtility();
        }
        return HighlightAllSameUtility.instance;
    }

    /**
     * Register a PDF document for a file
     */
    public registerPdfDocument(fileKey: string, pdfDocument: any): void {
        this.pdfDocuments.set(fileKey, pdfDocument);
        console.log(`[HighlightAllSame] Registered PDF document for file ${fileKey}`);
    }

    /**
     * Unregister a PDF document when not needed
     */
    public unregisterPdfDocument(fileKey: string): void {
        this.pdfDocuments.delete(fileKey);
    }

    /**
     * Initialize event listeners for highlight-all-same-text event
     */
    private initEventListeners(): void {
        window.addEventListener('highlight-all-same-text', (event: Event) => {
            const customEvent = event as CustomEvent;
            const { text, fileKey, highlightType, color } = customEvent.detail || {};

            if (!text || !fileKey) {
                console.error('[HighlightAllSame] Missing required parameters in event');
                return;
            }

            this.findAllTextOccurrences(text, fileKey, color, highlightType);
        });
    }

    /**
     * Find all occurrences of a text in a document and highlight them
     */
    private async findAllTextOccurrences(
        text: string,
        fileKey: string,
        color: string,
        highlightType: HighlightType = HighlightType.MANUAL
    ): Promise<void> {
        const pdfDocument = this.pdfDocuments.get(fileKey);
        if (!pdfDocument) {
            console.error(`[HighlightAllSame] No PDF document registered for file ${fileKey}`);
            return;
        }

        try {
            // Get number of pages
            const numPages = pdfDocument.numPages;
            console.log(`[HighlightAllSame] Searching for "${text}" in ${numPages} pages of file ${fileKey}`);

            // Dispatch event to notify search started
            window.dispatchEvent(new CustomEvent('highlight-all-same-search-started', {
                detail: { text, fileKey, totalPages: numPages }
            }));

            let totalOccurrences = 0;
            const occurrencesByPage: Map<number, any[]> = new Map();

            // Create an array of promises for finding text in each page
            const pagePromises = [];
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const pagePromise = this.findTextInPage(pdfDocument, pageNum, text, fileKey)
                    .then(occurrences => {
                        if (occurrences.length > 0) {
                            occurrencesByPage.set(pageNum, occurrences);
                            totalOccurrences += occurrences.length;

                            // Update progress
                            window.dispatchEvent(new CustomEvent('highlight-all-same-search-progress', {
                                detail: {
                                    text,
                                    fileKey,
                                    totalPages: numPages,
                                    currentPage: pageNum,
                                    newOccurrences: occurrences.length,
                                    totalOccurrencesFound: totalOccurrences
                                }
                            }));
                        }
                    })
                    .catch(error => {
                        console.error(`[HighlightAllSame] Error searching page ${pageNum}:`, error);
                    });

                pagePromises.push(pagePromise);
            }

            // Wait for all pages to be processed
            await Promise.all(pagePromises);

            // Create highlights for all occurrences
            const highlights: HighlightRect[] = [];

            occurrencesByPage.forEach((occurrences, pageNum) => {
                occurrences.forEach(occurrence => {
                    const highlight = {
                        id: highlightManager.generateUniqueId(highlightType),
                        page: pageNum,
                        x: occurrence.x,
                        y: occurrence.y,
                        w: occurrence.width,
                        h: occurrence.height,
                        color: color,
                        opacity: 0.4,
                        type: highlightType,
                        text: text,
                        fileKey: fileKey,
                        timestamp: Date.now()
                    };

                    highlights.push(highlight);
                });
            });

            // Dispatch event with all new highlights
            if (highlights.length > 0) {
                window.dispatchEvent(new CustomEvent('highlight-all-same-results', {
                    detail: {
                        text,
                        fileKey,
                        highlights,
                        totalOccurrences
                    }
                }));
            }

            console.log(`[HighlightAllSame] Found ${totalOccurrences} occurrences of "${text}" in file ${fileKey}`);

        } catch (error) {
            console.error('[HighlightAllSame] Error finding text occurrences:', error);
        }
    }

    /**
     * Find text in a specific page
     */
    private async findTextInPage(pdfDocument: any, pageNum: number, searchText: string, fileKey: string): Promise<any[]> {
        try {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });

            const normalizedSearchText = searchText.toLowerCase().trim();
            const occurrences: any[] | PromiseLike<any[]> = [];

            // Process each text item
            textContent.items.forEach((item: any) => {
                const itemText = item.str;
                if (!itemText) return;

                // Simple substring search - can be enhanced with regex or other methods
                let idx = itemText.toLowerCase().indexOf(normalizedSearchText);
                while (idx !== -1) {
                    // Calculate position and size
                    const match = this.calculateTextPosition(item, idx, searchText.length, viewport);

                    occurrences.push({
                        text: searchText,
                        page: pageNum,
                        x: match.x,
                        y: match.y,
                        width: match.width,
                        height: match.height
                    });

                    // Find next occurrence in the same item
                    idx = itemText.toLowerCase().indexOf(normalizedSearchText, idx + 1);
                }
            });

            return occurrences;

        } catch (error) {
            console.error(`[HighlightAllSame] Error processing page ${pageNum}:`, error);
            return [];
        }
    }

    /**
     * Calculate the position and size of a text match
     */
    private calculateTextPosition(item: any, startIdx: number, length: number, viewport: any): any {
        // This is a simplified implementation
        // In a real-world scenario, this would account for text styles,
        // character spacing, and other factors affecting text rendering

        const itemWidth = item.width || 0;
        const itemHeight = item.height || 20; // Default height if not provided

        // Calculate the width of the matching text portion
        // This is an approximation - a more accurate method would use character metrics
        const fullText = item.str;
        const matchProportion = length / fullText.length;
        const matchWidth = itemWidth * matchProportion;

        // Calculate starting position of the match
        const startProportion = startIdx / fullText.length;
        const startX = item.transform[4] + (itemWidth * startProportion);
        const startY = item.transform[5] - itemHeight; // PDF coordinates are from bottom-left

        // Apply viewport transform to get actual position on page
        const transformed = viewport.convertToViewportPoint(startX, startY);

        return {
            x: transformed[0],
            y: transformed[1],
            width: matchWidth * viewport.scale,
            height: itemHeight * viewport.scale
        };
    }
}

// Register event handler to listen for highlight-all-same-results
// to update the UI with the new highlights
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('highlight-all-same-results', (event: Event) => {
        const customEvent = event as CustomEvent;
        const { highlights, fileKey, text } = customEvent.detail || {};

        if (!highlights || !Array.isArray(highlights) || highlights.length === 0) {
            return;
        }

        // We need to add all these highlights to the context
        // However, this utility doesn't have direct access to the context
        // So we'll use a different approach - create a custom event that can be listened for
        // in components that have access to the context

        window.dispatchEvent(new CustomEvent('add-highlights-batch', {
            detail: {
                highlights,
                fileKey,
                text,
                source: 'highlight-all-same'
            }
        }));
    });
});

export const highlightAllSameUtility = HighlightAllSameUtility.getInstance();
export default highlightAllSameUtility;
