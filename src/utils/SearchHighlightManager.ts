import { HighlightType } from "../types/types";
import {ExtracteText} from "../types/pdfTypes";

export interface SearchOptions {
    isCaseSensitive: boolean;
    isRegexSearch: boolean;
}

export class SearchHighlightManager {
    private extractedText: ExtracteText;
    private queries: string[];
    private getNextHighlightId: () => string;
    private addAnnotation: (page: number, annotation: any) => void;
    private isCaseSensitive: boolean;
    private isRegexSearch: boolean;

    constructor(
        extractedText: ExtracteText,
        queries: string[],
        getNextHighlightId: () => string,
        addAnnotation: (page: number, annotation: any) => void,
        options: SearchOptions = {
            isCaseSensitive: false,
            isRegexSearch: false
        }
    ) {
        this.extractedText = extractedText;
        this.queries = queries;
        this.getNextHighlightId = getNextHighlightId;
        this.addAnnotation = addAnnotation;
        this.isCaseSensitive = options.isCaseSensitive;
        this.isRegexSearch = options.isRegexSearch;
    }

    public processHighlights(): void {
        console.log('[SearchDebug] extractedText:', this.extractedText);
        // Loop over each page from the extracted text
        this.extractedText.pages.forEach((page) => {
            // For each word on the page...
            page.words.forEach((word) => {
                const originalText = word.text;
                // For each search query, check if it occurs in this word
                this.queries.forEach((query) => {
                    let searchQuery = query;
                    let wordText = originalText;
                    if (!this.isCaseSensitive) {
                        searchQuery = query.toLowerCase();
                        wordText = originalText.toLowerCase();
                    }
                    const index = wordText.indexOf(searchQuery);
                    if (index !== -1) {
                        // Compute the fractional horizontal boundaries
                        const wordLength = originalText.length;
                        const fractionStart = index / wordLength;
                        const fractionEnd = (index + query.length) / wordLength;
                        const wordWidth = word.x1 - word.x0;
                        const highlightX = word.x0 + fractionStart * wordWidth;
                        const highlightW = (fractionEnd - fractionStart) * wordWidth;
                        // Use the full vertical extent of the word.
                        const highlightY = word.y0;
                        const highlightH = word.y1 - word.y0;

                        const annotation = {
                            id: this.getNextHighlightId(),
                            type: HighlightType.SEARCH,
                            x: highlightX,
                            y: highlightY,
                            w: highlightW,
                            h: highlightH,
                            text: originalText.substring(index, index + query.length),
                            color: '#028dff',
                            opacity: 0.4,
                        };

                        console.log('[SearchDebug] final highlight box:', annotation);
                        this.addAnnotation(page.page, annotation);
                    }
                });
            });
        });
    }
}
