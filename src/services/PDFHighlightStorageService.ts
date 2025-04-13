// src/services/PDFHighlightStorageService.ts
import { openDB } from 'idb';
import { HighlightRect, HighlightType } from '../types/pdfTypes';

/**
 * Service to handle PDF highlight persistence using IndexedDB
 * This service manages the 'pdf-highlights' object store within the PDF storage database
 * - Stores highlights linked to specific files
 * - Supports querying by file, page, and highlight type
 * - Handles bulk operations efficiently
 */
class PDFHighlightStorageService {
    private static instance: PDFHighlightStorageService;
    private readonly dbName = 'pdf-storage-db';
    private readonly dbVersion = 2; // Must match the version in PDFStorageService
    private isInitialized = false;
    private initPromise: Promise<boolean> | null = null;

    private constructor() {
        this.initPromise = this.ensureInitialized();
    }

    public static getInstance(): PDFHighlightStorageService {
        if (!PDFHighlightStorageService.instance) {
            PDFHighlightStorageService.instance = new PDFHighlightStorageService();
        }
        return PDFHighlightStorageService.instance;
    }

    /**
     * Ensure the database is initialized
     */
    private async ensureInitialized(): Promise<boolean> {
        if (this.isInitialized) return true;

        try {
            await openDB(this.dbName, this.dbVersion);
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('❌ [PDFHighlightStorage] Failed to initialize database:', error);
            return false;
        }
    }

    /**
     * Store a highlight in the database
     */
    public async storeHighlight(highlight: HighlightRect): Promise<boolean> {
        await this.ensureInitialized();

        try {
            // Ensure the highlight has a fileKey
            if (!highlight.fileKey) {
                console.warn('[PDFHighlightStorage] Highlight missing fileKey, using default');
                highlight.fileKey = '_default';
            }

            const db = await openDB(this.dbName, this.dbVersion);
            await db.put('pdf-highlights', highlight);
            return true;
        } catch (error) {
            console.error('❌ [PDFHighlightStorage] Failed to store highlight:', error);
            return false;
        }
    }

    /**
     * Store multiple highlights in a single transaction for better performance
     */
    public async storeHighlights(highlights: HighlightRect[]): Promise<boolean> {
        await this.ensureInitialized();

        if (highlights.length === 0) return true;

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            const tx = db.transaction('pdf-highlights', 'readwrite');
            
            // Process all highlights in parallel within the transaction
            const promises = highlights.map(highlight => {
                // Ensure the highlight has a fileKey
                if (!highlight.fileKey) {
                    highlight.fileKey = '_default';
                }
                return tx.store.put(highlight);
            });

            await Promise.all(promises);
            await tx.done;
            
            return true;
        } catch (error) {
            console.error('❌ [PDFHighlightStorage] Failed to store highlights in batch:', error);
            return false;
        }
    }

    /**
     * Get a single highlight by its ID
     */
    public async getHighlight(id: string): Promise<HighlightRect | null> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            return await db.get('pdf-highlights', id);
        } catch (error) {
            console.error('❌ [PDFHighlightStorage] Failed to get highlight:', error);
            return null;
        }
    }

    /**
     * Get all highlights for a specific file
     */
    public async getHighlightsByFile(fileKey: string): Promise<HighlightRect[]> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            return await db.getAllFromIndex('pdf-highlights', 'by-fileKey', fileKey);
        } catch (error) {
            console.error(`❌ [PDFHighlightStorage] Failed to get highlights for file ${fileKey}:`, error);
            return [];
        }
    }

    /**
     * Get all highlights for a specific file and page
     */
    public async getHighlightsByFilePage(fileKey: string, page: number): Promise<HighlightRect[]> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            return await db.getAllFromIndex('pdf-highlights', 'by-fileKey-page', [fileKey, page]);
        } catch (error) {
            console.error(`❌ [PDFHighlightStorage] Failed to get highlights for file ${fileKey} page ${page}:`, error);
            return [];
        }
    }

    /**
     * Get all highlights of a specific type for a file
     */
    public async getHighlightsByFileAndType(fileKey: string, type: HighlightType): Promise<HighlightRect[]> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            return await db.getAllFromIndex('pdf-highlights', 'by-fileKey-type', [fileKey, type]);
        } catch (error) {
            console.error(`❌ [PDFHighlightStorage] Failed to get highlights for file ${fileKey} type ${type}:`, error);
            return [];
        }
    }

    /**
     * Get all highlights for a specific page
     */
    public async getHighlightsByPage(page: number): Promise<HighlightRect[]> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            return await db.getAllFromIndex('pdf-highlights', 'by-page', page);
        } catch (error) {
            console.error(`❌ [PDFHighlightStorage] Failed to get highlights for page ${page}:`, error);
            return [];
        }
    }

    /**
     * Get all highlights of a specific type
     */
    public async getHighlightsByType(type: HighlightType): Promise<HighlightRect[]> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            return await db.getAllFromIndex('pdf-highlights', 'by-type', type);
        } catch (error) {
            console.error(`❌ [PDFHighlightStorage] Failed to get highlights of type ${type}:`, error);
            return [];
        }
    }

    /**
     * Delete a highlight by its ID
     */
    public async deleteHighlight(id: string): Promise<boolean> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            await db.delete('pdf-highlights', id);
            return true;
        } catch (error) {
            console.error(`❌ [PDFHighlightStorage] Failed to delete highlight ${id}:`, error);
            return false;
        }
    }

    /**
     * Delete all highlights for a specific file
     */
    public async deleteHighlightsByFile(fileKey: string): Promise<number> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            const highlights = await db.getAllFromIndex('pdf-highlights', 'by-fileKey', fileKey);
            
            if (highlights.length === 0) return 0;
            
            const tx = db.transaction('pdf-highlights', 'readwrite');
            const deletePromises = highlights.map(highlight => tx.store.delete(highlight.id));
            
            await Promise.all(deletePromises);
            await tx.done;
            
            return highlights.length;
        } catch (error) {
            console.error(`❌ [PDFHighlightStorage] Failed to delete highlights for file ${fileKey}:`, error);
            return 0;
        }
    }

    /**
     * Delete all highlights for a specific file and page
     */
    public async deleteHighlightsByFilePage(fileKey: string, page: number): Promise<number> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            const highlights = await db.getAllFromIndex('pdf-highlights', 'by-fileKey-page', [fileKey, page]);
            
            if (highlights.length === 0) return 0;
            
            const tx = db.transaction('pdf-highlights', 'readwrite');
            const deletePromises = highlights.map(highlight => tx.store.delete(highlight.id));
            
            await Promise.all(deletePromises);
            await tx.done;
            
            return highlights.length;
        } catch (error) {
            console.error(`❌ [PDFHighlightStorage] Failed to delete highlights for file ${fileKey} page ${page}:`, error);
            return 0;
        }
    }

    /**
     * Delete all highlights of a specific type for a file
     */
    public async deleteHighlightsByFileAndType(fileKey: string, type: HighlightType): Promise<number> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            const highlights = await db.getAllFromIndex('pdf-highlights', 'by-fileKey-type', [fileKey, type]);
            
            if (highlights.length === 0) return 0;
            
            const tx = db.transaction('pdf-highlights', 'readwrite');
            const deletePromises = highlights.map(highlight => tx.store.delete(highlight.id));
            
            await Promise.all(deletePromises);
            await tx.done;
            
            return highlights.length;
        } catch (error) {
            console.error(`❌ [PDFHighlightStorage] Failed to delete highlights for file ${fileKey} type ${type}:`, error);
            return 0;
        }
    }

    /**
     * Find highlights containing specific text
     */
    public async findHighlightsByText(text: string, fileKey?: string): Promise<HighlightRect[]> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            let highlights: HighlightRect[];
            
            if (fileKey) {
                highlights = await db.getAllFromIndex('pdf-highlights', 'by-fileKey', fileKey);
            } else {
                highlights = await db.getAll('pdf-highlights');
            }
            
            // Filter highlights by text content (case-insensitive)
            const normalizedText = text.toLowerCase().trim();
            return highlights.filter(highlight => {
                const highlightText = highlight.text?.toLowerCase().trim() || '';
                return highlightText === normalizedText;
            });
        } catch (error) {
            console.error(`❌ [PDFHighlightStorage] Failed to find highlights with text "${text}":`, error);
            return [];
        }
    }

    /**
     * Count all highlights in the database
     */
    public async countAllHighlights(): Promise<number> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            return await db.count('pdf-highlights');
        } catch (error) {
            console.error('❌ [PDFHighlightStorage] Failed to count highlights:', error);
            return 0;
        }
    }

    /**
     * Clear all highlights (use with caution!)
     */
    public async clearAllHighlights(): Promise<boolean> {
        await this.ensureInitialized();

        try {
            const db = await openDB(this.dbName, this.dbVersion);
            await db.clear('pdf-highlights');
            return true;
        } catch (error) {
            console.error('❌ [PDFHighlightStorage] Failed to clear all highlights:', error);
            return false;
        }
    }
}

// Create and export a singleton instance
const pdfHighlightStorageService = PDFHighlightStorageService.getInstance();
export default pdfHighlightStorageService;