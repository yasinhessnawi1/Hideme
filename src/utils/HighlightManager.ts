import { v4 as uuidv4 } from 'uuid';
import { HighlightRect, HighlightType } from '../contexts/HighlightContext';

class HighlightManager {
    private static instance: HighlightManager;
    private usedIds: Set<string> = new Set();
    private storageKey = 'pdf-highlight-ids';
    private storageKeyData = 'pdf-highlight-data';
    private highlightData: Map<string, HighlightRect> = new Map();

    private constructor() {
        this.loadUsedIdsFromStorage();
        this.loadHighlightDataFromStorage();
    }

    public static getInstance(): HighlightManager {
        if (!HighlightManager.instance) {
            HighlightManager.instance = new HighlightManager();
        }
        return HighlightManager.instance;
    }

    /**
     * Generates a new unique highlight ID that doesn't conflict with existing IDs
     */
    public generateUniqueId(prefix: string = ''): string {
        const timestamp = Date.now();
        const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        let id = `${prefix ? prefix + '-' : ''}${timestamp}-${randomPart}-${uuidv4().slice(0, 8)}`;

        // Ensure the ID is unique
        while (this.usedIds.has(id)) {
            id = `${prefix ? prefix + '-' : ''}${timestamp}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}-${uuidv4().slice(0, 8)}`;
        }

        this.usedIds.add(id);
        this.saveUsedIdsToStorage();
        return id;
    }

    /**
     * Store highlight data for persistence
     */
    public storeHighlightData(highlightData: HighlightRect): void {
        this.highlightData.set(highlightData.id, highlightData);
        this.saveHighlightDataToStorage();
    }

    /**
     * Remove highlight data by ID
     * @returns true if the highlight was found and removed, false otherwise
     */
    public removeHighlightData(id: string): boolean {
        const result = this.highlightData.delete(id);
        if (result) {
            this.saveHighlightDataToStorage();
            // Note: We don't remove the ID from usedIds to prevent ID reuse
            console.log(`[HighlightManager] Removed highlight with ID: ${id}`);
        }
        return result;
    }

    /**
     * Remove all highlights of a specific type
     * @param type The type of highlights to remove
     * @param fileKey Optional file key to limit deletion to a specific file
     * @param pageNumber Optional page number to limit deletion to a specific page
     * @returns The number of highlights removed
     */
    public removeHighlightsByType(type: HighlightType, fileKey?: string, pageNumber?: number): number {
        let removedCount = 0;
        const idsToRemove: string[] = [];

        this.highlightData.forEach((highlight, id) => {
            if (highlight.type === type) {
                // If fileKey is provided, only remove highlights from that file
                if (fileKey && highlight.fileKey !== fileKey) {
                    return;
                }

                // If pageNumber is provided, only remove highlights from that page
                if (pageNumber !== undefined && highlight.page !== pageNumber) {
                    return;
                }

                idsToRemove.push(id);
                removedCount++;
            }
        });

        // Remove all collected IDs
        idsToRemove.forEach(id => {
            this.highlightData.delete(id);
        });

        // Only save if we actually removed something
        if (removedCount > 0) {
            this.saveHighlightDataToStorage();
            console.log(`[HighlightManager] Removed ${removedCount} highlights of type ${type}${fileKey ? ` for file ${fileKey}` : ''}${pageNumber !== undefined ? ` on page ${pageNumber}` : ''}`);
        }

        return removedCount;
    }

    /**
     * Remove all highlights for a specific file
     * @param fileKey The file key to remove highlights for
     * @returns The number of highlights removed
     */
    public removeHighlightsByFile(fileKey: string): number {
        if (!fileKey) {
            console.warn('[HighlightManager] Attempted to remove highlights with empty fileKey');
            return 0;
        }

        let removedCount = 0;
        const idsToRemove: string[] = [];

        this.highlightData.forEach((highlight, id) => {
            if (highlight.fileKey === fileKey) {
                idsToRemove.push(id);
                removedCount++;
            }
        });

        // Remove all collected IDs
        idsToRemove.forEach(id => {
            this.highlightData.delete(id);
        });

        // Only save if we actually removed something
        if (removedCount > 0) {
            this.saveHighlightDataToStorage();
            console.log(`[HighlightManager] Removed ${removedCount} highlights for file ${fileKey}`);
        }

        return removedCount;
    }

    /**
     * Remove highlights by text content
     * @param text The text content to match
     * @param fileKey Optional file key to limit deletion to a specific file
     * @returns The number of highlights removed
     */
    public removeHighlightsByText(text: string, fileKey?: string): number {
        if (!text) {
            console.warn('[HighlightManager] Attempted to remove highlights with empty text');
            return 0;
        }

        let removedCount = 0;
        const idsToRemove: string[] = [];
        const normalizedText = text.toLowerCase().trim();

        this.highlightData.forEach((highlight, id) => {
            // Skip if no text property
            if (!highlight.text) return;

            const highlightText = highlight.text.toLowerCase().trim();
            if (highlightText === normalizedText) {
                // If fileKey is provided, only remove highlights from that file
                if (fileKey && highlight.fileKey !== fileKey) {
                    return;
                }

                idsToRemove.push(id);
                removedCount++;
            }
        });

        // Remove all collected IDs
        idsToRemove.forEach(id => {
            this.highlightData.delete(id);
        });

        // Only save if we actually removed something
        if (removedCount > 0) {
            this.saveHighlightDataToStorage();
            console.log(`[HighlightManager] Removed ${removedCount} highlights with text "${text}"${fileKey ? ` for file ${fileKey}` : ''}`);
        }

        return removedCount;
    }

    /**
     * Remove highlights by text content and type
     * @param text The text content to match
     * @param type The type of highlights to remove
     * @param fileKey Optional file key to limit deletion to a specific file
     * @returns The number of highlights removed
     */
    public removeHighlightsByTextAndType(text: string, type: HighlightType, fileKey?: string): number {
        if (!text) {
            console.warn('[HighlightManager] Attempted to remove highlights with empty text');
            return 0;
        }

        let removedCount = 0;
        const idsToRemove: string[] = [];
        const normalizedText = text.toLowerCase().trim();

        this.highlightData.forEach((highlight, id) => {
            // Skip if no text property or wrong type
            if (!highlight.text || highlight.type !== type) return;

            const highlightText = highlight.text.toLowerCase().trim();
            if (highlightText === normalizedText) {
                // If fileKey is provided, only remove highlights from that file
                if (fileKey && highlight.fileKey !== fileKey) {
                    return;
                }

                idsToRemove.push(id);
                removedCount++;
            }
        });

        // Remove all collected IDs
        idsToRemove.forEach(id => {
            this.highlightData.delete(id);
        });

        // Only save if we actually removed something
        if (removedCount > 0) {
            this.saveHighlightDataToStorage();
            console.log(`[HighlightManager] Removed ${removedCount} highlights of type ${type} with text "${text}"${fileKey ? ` for file ${fileKey}` : ''}`);
        }

        return removedCount;
    }

    /**
     * Remove highlights by entity type
     * @param entityType The entity type to match
     * @param fileKey Optional file key to limit deletion to a specific file
     * @returns The number of highlights removed
     */
    public removeHighlightsByEntityType(entityType: string, fileKey?: string): number {
        if (!entityType) {
            console.warn('[HighlightManager] Attempted to remove highlights with empty entity type');
            return 0;
        }

        let removedCount = 0;
        const idsToRemove: string[] = [];

        this.highlightData.forEach((highlight, id) => {
            if (highlight.entity === entityType) {
                // If fileKey is provided, only remove highlights from that file
                if (fileKey && highlight.fileKey !== fileKey) {
                    return;
                }

                idsToRemove.push(id);
                removedCount++;
            }
        });

        // Remove all collected IDs
        idsToRemove.forEach(id => {
            this.highlightData.delete(id);
        });

        // Only save if we actually removed something
        if (removedCount > 0) {
            this.saveHighlightDataToStorage();
            console.log(`[HighlightManager] Removed ${removedCount} highlights with entity type "${entityType}"${fileKey ? ` for file ${fileKey}` : ''}`);
        }

        return removedCount;
    }

    /**
     * Get all highlights with the same text
     */
    public findHighlightsByText(text: string, fileKey?: string): HighlightRect[] {
        const results: HighlightRect[] = [];

        // Normalize the search text
        const normalizedText = text.toLowerCase().trim();

        this.highlightData.forEach(highlight => {
            // Only include highlights from the same file if fileKey is provided
            if (fileKey && highlight.fileKey !== fileKey) {
                return;
            }

            const highlightText = highlight.text?.toLowerCase().trim() || '';
            if (highlightText === normalizedText) {
                results.push(highlight);
            }
        });

        return results;
    }

    /**
     * Get all highlights for a specific file and page
     */
    public getHighlightsForPage(page: number, fileKey?: string): HighlightRect[] {
        const results: HighlightRect[] = [];

        this.highlightData.forEach(highlight => {
            if (highlight.page === page) {
                // If fileKey is provided, only include highlights from that file
                if (!fileKey || highlight.fileKey === fileKey) {
                    results.push(highlight);
                }
            }
        });

        return results;
    }

    /**
     * Clear all highlights by type
     */
    public clearHighlightsByType(type: HighlightType, fileKey?: string): void {
        this.removeHighlightsByType(type, fileKey);
    }

    /**
     * Load used IDs from localStorage
     */
    private loadUsedIdsFromStorage(): void {
        try {
            const storedIds = localStorage.getItem(this.storageKey);
            if (storedIds) {
                const idArray = JSON.parse(storedIds) as string[];
                this.usedIds = new Set(idArray);
            }
        } catch (error) {
            console.error('Error loading highlight IDs from storage:', error);
            this.usedIds = new Set();
        }
    }

    /**
     * Save used IDs to localStorage
     */
    private saveUsedIdsToStorage(): void {
        try {
            const idArray = Array.from(this.usedIds);
            localStorage.setItem(this.storageKey, JSON.stringify(idArray));
        } catch (error) {
            console.error('Error saving highlight IDs to storage:', error);
        }
    }

    /**
     * Load highlight data from localStorage
     */
    private loadHighlightDataFromStorage(): void {
        try {
            const storedData = localStorage.getItem(this.storageKeyData);
            if (storedData) {
                const dataArray = JSON.parse(storedData) as HighlightRect[];
                this.highlightData = new Map(
                    dataArray.map(highlight => [highlight.id, highlight])
                );

                // Also add all IDs to the usedIds set
                dataArray.forEach(highlight => {
                    this.usedIds.add(highlight.id);
                });
            }
        } catch (error) {
            console.error('Error loading highlight data from storage:', error);
            this.highlightData = new Map();
        }
    }

    /**
     * Save highlight data to localStorage
     */
    private saveHighlightDataToStorage(): void {
        try {
            const dataArray = Array.from(this.highlightData.values());
            localStorage.setItem(this.storageKeyData, JSON.stringify(dataArray));
        } catch (error) {
            console.error('Error saving highlight data to storage:', error);
        }
    }

    /**
     * Clear all data - use with caution!
     */
    public clearAllData(): void {
        this.usedIds.clear();
        this.highlightData.clear();
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.storageKeyData);
    }

    /**
     * Export highlight data for a specific file
     */
    public exportHighlights(fileKey?: string): HighlightRect[] {
        const results: HighlightRect[] = [];

        this.highlightData.forEach(highlight => {
            if (!fileKey || highlight.fileKey === fileKey) {
                results.push(highlight);
            }
        });

        return results;
    }

    /**
     * Import highlight data
     */
    public importHighlights(highlights: HighlightRect[]): void {
        highlights.forEach(highlight => {
            // Ensure each highlight has a unique ID
            if (!highlight.id || this.usedIds.has(highlight.id)) {
                highlight.id = this.generateUniqueId(highlight.type);
            } else {
                this.usedIds.add(highlight.id);
            }

            // Ensure each highlight has a timestamp
            if (!highlight.timestamp) {
                highlight.timestamp = Date.now();
            }

            this.highlightData.set(highlight.id, highlight);
        });

        this.saveHighlightDataToStorage();
        this.saveUsedIdsToStorage();
    }
    /**
     * Find highlights with the same entity type
     */
    public findHighlightsByEntityType(entityType: string, fileKey?: string): HighlightRect[] {
        const results: HighlightRect[] = [];

        this.highlightData.forEach(highlight => {
            // Only include highlights from the same file if fileKey is provided
            if (fileKey && highlight.fileKey !== fileKey) {
                return;
            }

            if (highlight.entity === entityType) {
                results.push(highlight);
            }
        });

        return results;
    }

    /**
     * Find highlights near a specific position within a tolerance range
     * Useful for finding overlapping or nearby highlights
     */
    public findHighlightsByPosition(
        page: number,
        x: number,
        y: number,
        width: number,
        height: number,
        tolerance: number = 5,
        fileKey?: string
    ): HighlightRect[] {
        const results: HighlightRect[] = [];

        this.highlightData.forEach(highlight => {
            // Skip if not on the same page or not in the same file
            if (highlight.page !== page) return;
            if (fileKey && highlight.fileKey !== fileKey) return;

            // Check if this highlight is near the specified position
            if (
                highlight.x !== undefined &&
                highlight.y !== undefined &&
                highlight.w !== undefined &&
                highlight.h !== undefined
            ) {
                // Check if the highlights overlap or are within tolerance
                const xOverlap =
                    Math.abs((highlight.x + highlight.w/2) - (x + width/2)) <
                    (highlight.w/2 + width/2 + tolerance);

                const yOverlap =
                    Math.abs((highlight.y + highlight.h/2) - (y + height/2)) <
                    (highlight.h/2 + height/2 + tolerance);

                if (xOverlap && yOverlap) {
                    results.push(highlight);
                }
            }
        });

        return results;
    }
}

export const highlightManager = HighlightManager.getInstance();
export default highlightManager;
