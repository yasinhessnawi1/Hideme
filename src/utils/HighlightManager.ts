// src/utils/HighlightManager.ts
import { v4 as uuidv4 } from 'uuid';
import {HighlightRect, HighlightType} from '../contexts/HighlightContext';

// Define a complete interface for a highlight


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
     * Remove highlight data
     */
    public removeHighlightData(id: string): boolean {
        const result = this.highlightData.delete(id);
        if (result) {
            this.saveHighlightDataToStorage();
        }
        return result;
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
        const idsToRemove: string[] = [];

        this.highlightData.forEach((highlight, id) => {
            if (highlight.type === type) {
                // If fileKey is provided, only remove highlights from that file
                if (!fileKey || highlight.fileKey === fileKey) {
                    idsToRemove.push(id);
                }
            }
        });

        // Remove the highlights
        idsToRemove.forEach(id => {
            this.highlightData.delete(id);
            // Don't remove from usedIds to prevent ID reuse
        });

        // Save changes
        this.saveHighlightDataToStorage();
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
     * Load highlight data from localStorage or IndexedDB
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
     * Save highlight data to localStorage or IndexedDB
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
}

export const highlightManager = HighlightManager.getInstance();
export default highlightManager;
