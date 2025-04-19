import { v4 as uuidv4 } from 'uuid';
import { HighlightRect, HighlightType } from '../types/pdfTypes';
import pdfHighlightStorageService from '../services/PDFHighlightStorageService';

class HighlightManager {
    private static instance: HighlightManager;
    private usedIds: Set<string> = new Set();
    private storageKey = 'pdf-highlight-ids';
    private highlightData: Map<string, HighlightRect> = new Map();
    private useIndexedDB: boolean = true; // Control whether to use IndexedDB
    private constructor() {
        this.initializeFromStorage();
    }

    public static getInstance(): HighlightManager {
        if (!HighlightManager.instance) {
            HighlightManager.instance = new HighlightManager();
        }
        return HighlightManager.instance;
    }

    /**
     * Initialize highlight data from storage (IndexedDB)
     */
    private async initializeFromStorage(): Promise<void> {
        try {

            if (this.useIndexedDB) {
                // Then load from IndexedDB and merge
                await this.loadHighlightDataFromIndexedDB();
            }
        } catch (error) {
            console.error('[HighlightManager] Error initializing from storage:', error);
        }
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
        return id;
    }

    /**
     * Store highlight data for persistence
     */
    public async storeHighlightData(highlightData: HighlightRect): Promise<void> {
        this.highlightData.set(highlightData.id, highlightData);

        // Save to storage - uses new method name
        await this.saveHighlightData();

        // Store in IndexedDB
        if (this.useIndexedDB) {
            pdfHighlightStorageService.storeHighlight(highlightData).catch(error => {
                console.error('[HighlightManager] Error storing highlight in IndexedDB:', error);
            });
        }
    }


    /**
     * Remove highlight data by ID
     * @returns true if the highlight was found and removed, false otherwise
     */
    public async removeHighlightData(id: string): Promise<boolean> {
        const result = this.highlightData.delete(id);

        if (result) {
            // Save to storage
            await this.saveHighlightData();

            // Remove from IndexedDB
            if (this.useIndexedDB) {
                pdfHighlightStorageService.deleteHighlight(id).catch(error => {
                    console.error(`[HighlightManager] Error removing highlight ${id} from IndexedDB:`, error);
                });
            }
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
    public async removeHighlightsByType(type: HighlightType, fileKey?: string, pageNumber?: number): Promise<number> {
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
            // Save to storage
            await this.saveHighlightData();

            // Remove from IndexedDB
            if (this.useIndexedDB) {
                if (fileKey) {
                    if (pageNumber !== undefined) {
                        // Remove highlights for specific file and page and type
                        // First get all highlights for the file and page
                        const highlights = await pdfHighlightStorageService.getHighlightsByFilePage(fileKey, pageNumber);

                        // Filter by type and delete each one
                        const toDelete = highlights.filter(h => h.type === type);
                        for (const highlight of toDelete) {
                            pdfHighlightStorageService.deleteHighlight(highlight.id).catch(error => {
                                console.error(`[HighlightManager] Error removing highlight ${highlight.id} from IndexedDB:`, error);
                            });
                        }
                    } else {
                        // Remove all highlights for specific file and type
                        pdfHighlightStorageService.deleteHighlightsByFileAndType(fileKey, type).catch(error => {
                            console.error(`[HighlightManager] Error removing highlights of type ${type} for file ${fileKey} from IndexedDB:`, error);
                        });
                    }
                } else {
                    // Remove all highlights of specific type (across all files)
                    const highlights = await pdfHighlightStorageService.getHighlightsByType(type);
                    for (const highlight of highlights) {
                        pdfHighlightStorageService.deleteHighlight(highlight.id).catch(error => {
                            console.error(`[HighlightManager] Error removing highlight ${highlight.id} from IndexedDB:`, error);
                        });
                    }
                }
            }

            console.log(`[HighlightManager] Removed ${removedCount} highlights of type ${type}${fileKey ? ` for file ${fileKey}` : ''}${pageNumber !== undefined ? ` on page ${pageNumber}` : ''}`);
        }

        return removedCount;
    }

    /**
     * Remove all highlights for a specific file
     * @param fileKey The file key to remove highlights for
     * @returns The number of highlights removed
     */
    public async removeHighlightsByFile(fileKey: string): Promise<number> {
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
            // Save to storage
            await this.saveHighlightData();

            // Remove from IndexedDB
            if (this.useIndexedDB) {
                pdfHighlightStorageService.deleteHighlightsByFile(fileKey).catch(error => {
                    console.error(`[HighlightManager] Error removing highlights for file ${fileKey} from IndexedDB:`, error);
                });
            }

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
    public async removeHighlightsByText(text: string, fileKey?: string): Promise<number> {
        if (!text) {
            console.warn('[HighlightManager] Attempted to remove highlights with empty text');
            return 0;
        }

        // Find highlights that match the text
        const highlights = await this.findHighlightsByText(text, fileKey);

        if (highlights.length === 0) {
            return 0;
        }

        // Extract IDs of highlights to remove
        const idsToRemove = highlights.map(h => h.id);

        // Remove from local cache
        idsToRemove.forEach(id => {
            this.highlightData.delete(id);
        });

        // Save to storage
        await this.saveHighlightData();

        // Remove from IndexedDB
        if (this.useIndexedDB) {
            const deletePromises = highlights.map(highlight =>
                pdfHighlightStorageService.deleteHighlight(highlight.id)
            );

            Promise.all(deletePromises).catch(error => {
                console.error(`[HighlightManager] Error removing highlights with text "${text}" from IndexedDB:`, error);
            });
        }

        console.log(`[HighlightManager] Removed ${highlights.length} highlights with text "${text}"${fileKey ? ` for file ${fileKey}` : ''}`);

        return highlights.length;
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
            this.saveHighlightData();
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
            this.saveHighlightData();
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
     * Load highlight data from IndexedDB
     */
    private async loadHighlightDataFromIndexedDB(): Promise<void> {
        if (!this.useIndexedDB) return;

        try {
            // Get all highlights from IndexedDB
            const count = await pdfHighlightStorageService.countAllHighlights();

            if (count === 0) {
                return; // No highlights in IndexedDB
            }

            // Get highlights for all files (this could be optimized to load per file later)
            const files = new Set<string>();

            // Use our existing data map to find files
            for (const highlight of this.highlightData.values()) {
                if (highlight.fileKey) {
                    files.add(highlight.fileKey);
                }
            }

            // If we don't have file information from our local map, try to get it directly
            if (files.size === 0) {
                // This is a workaround to efficiently get all highlights
                // when we can't directly query the entire store
                const dummyHighlights = await pdfHighlightStorageService.getHighlightsByType(HighlightType.MANUAL);
                dummyHighlights.forEach(h => {
                    if (h.fileKey) files.add(h.fileKey);
                });

                const searchHighlights = await pdfHighlightStorageService.getHighlightsByType(HighlightType.SEARCH);
                searchHighlights.forEach(h => {
                    if (h.fileKey) files.add(h.fileKey);
                });

                const entityHighlights = await pdfHighlightStorageService.getHighlightsByType(HighlightType.ENTITY);
                entityHighlights.forEach(h => {
                    if (h.fileKey) files.add(h.fileKey);
                });
            }

            // If we still don't have file info, log this issue
            if (files.size === 0) {
                console.warn('[HighlightManager] Could not determine files for highlight loading');
                return;
            }

            let totalHighlights = 0;

            // Load highlights for each file
            for (const fileKey of files) {
                const fileHighlights = await pdfHighlightStorageService.getHighlightsByFile(fileKey);

                fileHighlights.forEach(highlight => {
                    this.highlightData.set(highlight.id, highlight);
                    this.usedIds.add(highlight.id);
                });

                totalHighlights += fileHighlights.length;
            }

            console.log(`[HighlightManager] Loaded ${totalHighlights} highlights from IndexedDB`);
        } catch (error) {
            console.error('[HighlightManager] Error loading highlight data from IndexedDB:', error);
        }
    }

    /**
     * Save highlight data to storage
     */
    private async saveHighlightData(): Promise<void> {
        try {
            const dataArray = Array.from(this.highlightData.values());

            // If IndexedDB is enabled, also save there
            if (this.useIndexedDB) {
                // We don't await this to avoid blocking
                pdfHighlightStorageService.storeHighlights(dataArray).catch(error => {
                    console.error('[HighlightManager] Error saving to IndexedDB:', error);
                });
            }
        } catch (error) {
            console.error('[HighlightManager] Error saving highlight data:', error);
        }
    }

    /**
     * Clear all data - use with caution!
     */
    public async clearAllData(): Promise<void> {
        this.usedIds.clear();
        this.highlightData.clear();
        // Clear IndexedDB if enabled
        if (this.useIndexedDB) {
            pdfHighlightStorageService.clearAllHighlights().catch(error => {
                console.error('[HighlightManager] Error clearing all highlights from IndexedDB:', error);
            });
        }
    }

    /**
     * Export highlight data for a specific file
     */
    public async exportHighlights(fileKey?: string): Promise<HighlightRect[]> {
        // If IndexedDB is enabled and a file key is provided, get the highlights from IndexedDB
        if (this.useIndexedDB && fileKey) {
            try {
                const highlights = await pdfHighlightStorageService.getHighlightsByFile(fileKey);
                return highlights;
            } catch (error) {
                console.error(`[HighlightManager] Error exporting highlights for file ${fileKey} from IndexedDB:`, error);
            }
        }

        // Fall back to the in-memory map
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
     * @param highlights Array of highlights to import
     * @returns Promise that resolves when the import is complete
     */
    public async importHighlights(highlights: HighlightRect[]): Promise<number> {
        if (highlights.length === 0) return 0;

        try {
            console.log(`[HighlightManager] Importing ${highlights.length} highlights`);

            // Track the number of newly added highlights vs updated ones
            let newCount = 0;
            let updatedCount = 0;

            // Group highlights by fileKey for better logging
            const fileKeys = new Set<string>();
            highlights.forEach(h => {
                if (h.fileKey) fileKeys.add(h.fileKey);
            });

            // Process each highlight to ensure it has a valid ID and timestamp
            const processedHighlights = highlights.map(highlight => {
                // Create a copy to avoid mutating the original
                const processedHighlight = { ...highlight };

                // Ensure each highlight has a unique ID
                if (!processedHighlight.id || this.usedIds.has(processedHighlight.id)) {
                    processedHighlight.id = this.generateUniqueId(processedHighlight.type);
                    newCount++;
                } else {
                    // ID already exists, we're updating
                    this.usedIds.add(processedHighlight.id);
                    updatedCount++;
                }

                // Ensure each highlight has a timestamp
                if (!processedHighlight.timestamp) {
                    processedHighlight.timestamp = Date.now();
                }

                // Add to local map
                this.highlightData.set(processedHighlight.id, processedHighlight);

                return processedHighlight;
            });

            // Save to storage
            await this.saveHighlightData();

            // Save to IndexedDB if enabled
            if (this.useIndexedDB) {
                try {
                    await pdfHighlightStorageService.storeHighlights(processedHighlights);
                    console.log(`[HighlightManager] Successfully stored ${processedHighlights.length} highlights in IndexedDB`);
                } catch (error) {
                    console.error('[HighlightManager] Error importing highlights to IndexedDB:', error);
                }
            }

            // Log summary information
            console.log(`[HighlightManager] Import complete - Added: ${newCount}, Updated: ${updatedCount}`);
            if (fileKeys.size > 0) {
                console.log(`[HighlightManager] Imported highlights for files: ${Array.from(fileKeys).join(', ')}`);
            }

            return processedHighlights.length;
        } catch (error) {
            console.error('[HighlightManager] Error during highlight import:', error);
            return 0;
        }
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
