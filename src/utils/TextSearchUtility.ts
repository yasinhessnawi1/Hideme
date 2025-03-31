// src/utils/TextSearchUtility.ts
import { PDFPageProxy } from 'pdfjs-dist';
import { HighlightType } from '../contexts/HighlightContext';
import highlightManager from './HighlightManager';

interface TextMatch {
    text: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Utility for searching text in PDFs and creating highlights
 */
class TextSearchUtility {
    private static instance: TextSearchUtility;

    private constructor() {}

    public static getInstance(): TextSearchUtility {
        if (!TextSearchUtility.instance) {
            TextSearchUtility.instance = new TextSearchUtility();
        }
        return TextSearchUtility.instance;
    }

    /**
     * Search for all occurrences of a text in a PDF page and create highlights
     * @param page PDFPageProxy object from pdf.js
     * @param searchText Text to search for
     * @param pageNumber Page number in the document
     * @param fileKey File identifier
     * @param color Color for the highlights
     * @param addHighlightCallback Function to add highlight to the context
     */
    public async findTextInPage(
        page: PDFPageProxy,
        searchText: string,
        pageNumber: number,
        fileKey: string,
        color: string,
        addHighlightCallback: (page: number, highlight: any, fileKey?: string) => void
    ): Promise<number> {
        try {
            // Get the text content from the page
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });
            const normalizedSearchText = searchText.toLowerCase().trim();

            let matches = 0;

            // Process each text item
            textContent.items.forEach((item: any) => {
                const itemText = item.str;
                if (!itemText) return;

                // Simple substring search - can be enhanced with regex or other methods
                let idx = itemText.toLowerCase().indexOf(normalizedSearchText);
                while (idx !== -1) {
                    // Calculate position and size
                    const match = this.calculateTextPosition(item, idx, searchText.length, viewport);

                    // Create and add highlight
                    const highlight = {
                        id: highlightManager.generateUniqueId('search'),
                        page: pageNumber,
                        x: match.x,
                        y: match.y,
                        w: match.width,
                        h: match.height,
                        color: color,
                        opacity: 0.4,
                        type: HighlightType.SEARCH,
                        text: searchText,
                        fileKey: fileKey,
                        timestamp: Date.now()
                    };

                    // Add the highlight using the callback
                    addHighlightCallback(pageNumber, highlight, fileKey);
                    matches++;

                    // Find next occurrence in the same item
                    idx = itemText.toLowerCase().indexOf(normalizedSearchText, idx + 1);
                }
            });

            return matches;
        } catch (error) {
            console.error('Error searching text in page:', error);
            return 0;
        }
    }

    /**
     * Calculate the position and size of a text match
     */
    private calculateTextPosition(item: any, startIdx: number, length: number, viewport: any): TextMatch {
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
            text: fullText.substr(startIdx, length),
            page: 0, // Will be set by the caller
            x: transformed[0],
            y: transformed[1],
            width: matchWidth * viewport.scale,
            height: itemHeight * viewport.scale
        };
    }
}

export const textSearchUtility = TextSearchUtility.getInstance();
export default textSearchUtility;
