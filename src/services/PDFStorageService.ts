// src/services/PDFStorageService.ts
import {DBSchema, IDBPDatabase, openDB} from 'idb';
import {getFileKey} from '../contexts/PDFViewerContext';
import { HighlightRect, StorageStats } from '../types/pdfTypes';

/**
 * Schema definition for our PDF storage database
 */
interface PDFStorageDB extends DBSchema {
    'pdf-files': {
        key: string;
        value: {
            id: string;
            file: Blob;
            name: string;
            size: number;
            type: string;
            lastModified: number;
            timestamp: number;
            metadata?: Record<string, any>;
        };
        indexes: { 'by-timestamp': number };
    };
    'pdf-highlights': {
        key: string; // Highlight ID
        value: HighlightRect;
        indexes: { 
            'by-fileKey': string; 
            'by-page': number;
            'by-type': string;
            'by-fileKey-page': [string, number];
            'by-fileKey-type': [string, string];
        };
    };
    'storage-settings': {
        key: string;
        value: {
            id: string;
            enabled: boolean;
            maxStorageSize: number; // In bytes
            maxStorageTime: number; // In milliseconds
            lastCleaned: number;
        };
    };
}

/**
 * Service to handle PDF file persistence using IndexedDB
 * - Stores PDF files to survive browser refreshes
 * - Manages storage limitations
 * - Handles consent and privacy features
 */
class PDFStorageService {
    private db: IDBPDatabase<PDFStorageDB> | null = null;
    private readonly dbName = 'pdf-storage-db';
    private readonly dbVersion = 2; // Increment version to trigger database upgrade
    private isInitialized = false;
    private initPromise: Promise<boolean> | null = null;

    // Default settings
    private maxStorageSize = 100 * 1024 * 1024; // 100MB default max
    private maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days default max age
    private storageEnabled = true;

    constructor() {
        this.initPromise = this.initDatabase();
    }

    /**
     * Initialize the IndexedDB database
     */
    private async initDatabase(): Promise<boolean> {
        if (this.isInitialized) return true;

        try {
            this.db = await openDB<PDFStorageDB>(this.dbName, this.dbVersion, {
                upgrade(db) {
                    // Create PDF files store with timestamp index
                    if (!db.objectStoreNames.contains('pdf-files')) {
                        const pdfStore = db.createObjectStore('pdf-files', { keyPath: 'id' });
                        pdfStore.createIndex('by-timestamp', 'timestamp');
                    }

                    // Create highlights store
                    if (!db.objectStoreNames.contains('pdf-highlights')) {
                        const highlightStore = db.createObjectStore('pdf-highlights', { keyPath: 'id' });
                        highlightStore.createIndex('by-fileKey', 'fileKey');
                        highlightStore.createIndex('by-page', 'page');
                        highlightStore.createIndex('by-type', 'type');
                        highlightStore.createIndex('by-fileKey-page', ['fileKey', 'page']);
                        highlightStore.createIndex('by-fileKey-type', ['fileKey', 'type']);
                    }

                    // Create settings store
                    if (!db.objectStoreNames.contains('storage-settings')) {
                        db.createObjectStore('storage-settings', { keyPath: 'id' });
                    }
                },
            });

            // Load settings or initialize with defaults
            await this.loadSettings();
            console.log('✅ [PDFStorage] Database initialized successfully');

            // Schedule cleanup of old files
            await this.cleanupOldFiles();

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('❌ [PDFStorage] Failed to initialize database:', error);
            return false;
        }
    }

    /**
     * Load storage settings from the database or create with defaults
     */
    private async loadSettings(): Promise<void> {
        if (!this.db) return;

        try {
            const settings = await this.db.get('storage-settings', 'default');

            if (settings) {
                this.storageEnabled = settings.enabled;
                this.maxStorageSize = settings.maxStorageSize;
                this.maxAgeMs = settings.maxStorageTime;
            } else {
                // Create default settings if none exists
                await this.db.put('storage-settings', {
                    id: 'default',
                    enabled: this.storageEnabled,
                    maxStorageSize: this.maxStorageSize,
                    maxStorageTime: this.maxAgeMs,
                    lastCleaned: Date.now()
                });
            }

            console.log(`🔧 [PDFStorage] Settings loaded - Storage ${this.storageEnabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('❌ [PDFStorage] Failed to load settings:', error);
        }
    }

    /**
     * Update storage settings
     */
    public async updateSettings(settings: {
        enabled?: boolean;
        maxStorageSize?: number;
        maxStorageTime?: number;
    }): Promise<boolean> {
        if (!this.db) await this.ensureInitialized();
        if (!this.db) return false;

        try {
            const currentSettings = await this.db.get('storage-settings', 'default') || {
                id: 'default',
                enabled: this.storageEnabled,
                maxStorageSize: this.maxStorageSize,
                maxStorageTime: this.maxAgeMs,
                lastCleaned: Date.now()
            };

            const updatedSettings = {
                ...currentSettings,
                ...(settings.enabled !== undefined && { enabled: settings.enabled }),
                ...(settings.maxStorageSize !== undefined && { maxStorageSize: settings.maxStorageSize }),
                ...(settings.maxStorageTime !== undefined && { maxStorageTime: settings.maxStorageTime })
            };

            await this.db.put('storage-settings', updatedSettings);

            // Update local state
            this.storageEnabled = updatedSettings.enabled;
            this.maxStorageSize = updatedSettings.maxStorageSize;
            this.maxAgeMs = updatedSettings.maxStorageTime;

            console.log('✅ [PDFStorage] Settings updated successfully', {
                enabled: this.storageEnabled,
                maxSize: this.formatBytes(this.maxStorageSize),
                maxAge: `${this.maxAgeMs / (24 * 60 * 60 * 1000)} days`
            });

            return true;
        } catch (error) {
            console.error('❌ [PDFStorage] Failed to update settings:', error);
            return false;
        }
    }

    /**
     * Store a PDF file in IndexedDB
     */
    public async storeFile(file: File, metadata?: Record<string, any>): Promise<boolean> {
        await this.ensureInitialized();
        if (!this.db || !this.storageEnabled) return false;

        try {
            const fileKey = getFileKey(file);

            // Check if we're within storage limits before storing
            if (!await this.checkStorageLimits(file.size)) {
                console.warn('⚠️ [PDFStorage] Storage limits reached, file not stored');
                return false;
            }

            // Store the file with metadata
            await this.db.put('pdf-files', {
                id: fileKey,
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                timestamp: Date.now(),
                metadata
            });

            console.log(`✅ [PDFStorage] File stored successfully: ${file.name} (${this.formatBytes(file.size)})`);
            return true;
        } catch (error) {
            console.error('❌ [PDFStorage] Failed to store file:', error);
            return false;
        }
    }

    /**
     * Retrieve a stored PDF file by its key
     */
    public async getFile(fileKey: string): Promise<File | null> {
        await this.ensureInitialized();
        if (!this.db || !this.storageEnabled) return null;

        try {
            const entry = await this.db.get('pdf-files', fileKey);

            if (!entry) {
                console.log(`ℹ️ [PDFStorage] File not found: ${fileKey}`);
                return null;
            }

            // Convert the stored Blob back to a File object
            const file = new File([entry.file], entry.name, {
                type: entry.type,
                lastModified: entry.lastModified
            });

            console.log(`✅ [PDFStorage] File retrieved successfully: ${entry.name} (${this.formatBytes(entry.size)})`);
            return file;
        } catch (error) {
            console.error('❌ [PDFStorage] Failed to retrieve file:', error);
            return null;
        }
    }

    /**
     * Get all stored PDF files with improved blob-to-file conversion
     */
    public async getAllFiles(): Promise<File[]> {
        await this.ensureInitialized();
        if (!this.db || !this.storageEnabled) return [];

        try {
            console.log('🔍 [PDFStorage] Retrieving all stored files');
            const entries = await this.db.getAll('pdf-files');

            if (entries.length === 0) {
                console.log('ℹ️ [PDFStorage] No stored files found');
                return [];
            }

            // Convert all entries to proper File objects with correct handling
            const files = await Promise.all(entries.map(async entry => {
                try {
                    // Ensure we have a valid blob/file
                    if (!entry.file || !(entry.file instanceof Blob)) {
                        console.warn(`⚠️ [PDFStorage] Invalid file data for ${entry.name}`);
                        return null;
                    }

                    // Make sure we're extracting all the necessary properties from the stored object
                    const fileOptions = {
                        type: entry.type || 'application/pdf',
                        lastModified: entry.lastModified || Date.now()
                    };

                    // Create a new File object with the same properties as the original
                    // Use a more reliable approach by first ensuring we have a valid Blob
                    const fileBlob = new Blob([entry.file], { type: fileOptions.type });
                    const file = new File([fileBlob], entry.name, fileOptions);

                    // Validate the file
                    if (file.size === 0) {
                        console.warn(`⚠️ [PDFStorage] Zero-size file detected for ${entry.name}`);
                        return null;
                    }

                    return file;
                } catch (error) {
                    console.error(`❌ [PDFStorage] Error converting stored entry to File: ${entry.name}`, error);
                    return null;
                }
            }));

            // Filter out any null values from failed conversions
            const validFiles = files.filter(file => file !== null);

            console.log(`✅ [PDFStorage] Retrieved ${validFiles.length} stored files:`);
            validFiles.forEach(file => {
                console.log(`  - ${file.name} (${this.formatBytes(file.size)})`);
            });

            return validFiles;
        } catch (error) {
            console.error('❌ [PDFStorage] Failed to retrieve files:', error);
            return [];
        }
    }

    /**
     * Delete a PDF file from storage
     */
    public async deleteFile(fileKey: string): Promise<boolean> {
        await this.ensureInitialized();
        if (!this.db) return false;

        try {
            await this.db.delete('pdf-files', fileKey);
            console.log(`✅ [PDFStorage] File deleted: ${fileKey}`);
            return true;
        } catch (error) {
            console.error('❌ [PDFStorage] Failed to delete file:', error);
            return false;
        }
    }

    /**
     * Clear all stored PDF files
     */
    public async clearAllFiles(): Promise<boolean> {
        await this.ensureInitialized();
        if (!this.db) return false;

        try {
            await this.db.clear('pdf-files');
            console.log('✅ [PDFStorage] All files cleared from storage');
            return true;
        } catch (error) {
            console.error('❌ [PDFStorage] Failed to clear files:', error);
            return false;
        }
    }

    /**
     * Check if storage is enabled
     */
    public isStorageEnabled(): boolean {
        return this.storageEnabled;
    }

    /**
     * Enable or disable storage
     */
    public async setStorageEnabled(enabled: boolean): Promise<boolean> {
        return this.updateSettings({ enabled });
    }

    /**
     * Get the current storage usage
     */
    public async getStorageUsage(): Promise<{
        totalSize: number;
        fileCount: number;
        maxSize: number;
        percentUsed: number;
    }> {
        await this.ensureInitialized();
        if (!this.db) {
            return { totalSize: 0, fileCount: 0, maxSize: this.maxStorageSize, percentUsed: 0 };
        }

        try {
            const entries = await this.db.getAll('pdf-files');
            const totalSize = entries.reduce((sum: any, entry: { size: any; }) => sum + entry.size, 0);
            const percentUsed = (totalSize / this.maxStorageSize) * 100;

            return {
                totalSize,
                fileCount: entries.length,
                maxSize: this.maxStorageSize,
                percentUsed
            };
        } catch (error) {
            console.error('❌ [PDFStorage] Failed to calculate storage usage:', error);
            return { totalSize: 0, fileCount: 0, maxSize: this.maxStorageSize, percentUsed: 0 };
        }
    }

    /**
     * Get storage statistics in a human-readable format
     */
    public async getStorageStats(): Promise<StorageStats> {
        const { totalSize, fileCount, maxSize, percentUsed } = await this.getStorageUsage();

        return {
            totalSizeFormatted: totalSize,
            fileCount,
            percentUsed
        };
    }

    /**
     * Check if adding a new file exceeds storage limits
     * If yes, attempt to free up space by removing old files
     */
    private async checkStorageLimits(additionalBytes: number): Promise<boolean> {
        const { totalSize, maxSize } = await this.getStorageUsage();

        // Check if adding this file would exceed the max size
        if (totalSize + additionalBytes > maxSize) {
            console.log(`⚠️ [PDFStorage] Adding ${this.formatBytes(additionalBytes)} would exceed storage limit`);

            // Try to free up space by removing older files
            return this.freeUpStorage(additionalBytes);
        }

        return true;
    }

    /**
     * Free up storage by removing older files
     */
    private async freeUpStorage(bytesNeeded: number): Promise<boolean> {
        if (!this.db) return false;

        try {
            // Get current usage
            const { totalSize, maxSize } = await this.getStorageUsage();
            const targetSize = totalSize + bytesNeeded;

            // If we can't make enough space, return false
            if (targetSize > maxSize) {
                // Calculate how much storage we need to free
                const bytesToFree = targetSize - maxSize;
                console.log(`⚠️ [PDFStorage] Need to free ${this.formatBytes(bytesToFree)} of storage`);

                // Get files sorted by age (oldest first)
                const tx = this.db.transaction('pdf-files', 'readwrite');
                const index = tx.store.index('by-timestamp');
                let cursor = await index.openCursor();
                let freedBytes = 0;

                // Delete oldest files until we've freed enough space
                while (cursor && freedBytes < bytesToFree) {
                    const file = cursor.value;
                    await cursor.delete();
                    freedBytes += file.size;
                    console.log(`🗑️ [PDFStorage] Removed old file: ${file.name} (${this.formatBytes(file.size)})`);
                    cursor = await cursor.continue();
                }

                await tx.done;

                // Check if we freed enough space
                if (freedBytes >= bytesToFree) {
                    console.log(`✅ [PDFStorage] Successfully freed ${this.formatBytes(freedBytes)} of storage`);
                    return true;
                } else {
                    console.warn(`⚠️ [PDFStorage] Could only free ${this.formatBytes(freedBytes)}, needed ${this.formatBytes(bytesToFree)}`);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('❌ [PDFStorage] Error freeing storage:', error);
            return false;
        }
    }

    /**
     * Clean up files that are older than the max age
     */
    private async cleanupOldFiles(): Promise<void> {
        if (!this.db || !this.storageEnabled) return;

        try {
            const cutoffTime = Date.now() - this.maxAgeMs;
            const tx = this.db.transaction('pdf-files', 'readwrite');
            const index = tx.store.index('by-timestamp');
            let cursor = await index.openCursor();
            let deletedCount = 0;

            while (cursor) {
                if (cursor.value.timestamp < cutoffTime) {
                    await cursor.delete();
                    deletedCount++;
                }
                cursor = await cursor.continue();
            }

            await tx.done;

            if (deletedCount > 0) {
                console.log(`🧹 [PDFStorage] Cleaned up ${deletedCount} old files`);
            }

            // Update last cleaned timestamp
            const settings = await this.db.get('storage-settings', 'default');
            if (settings) {
                await this.db.put('storage-settings', {
                    ...settings,
                    lastCleaned: Date.now()
                });
            }
        } catch (error) {
            console.error('❌ [PDFStorage] Error cleaning up old files:', error);
        }
    }

    /**
     * Format bytes to human-readable format
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Ensure database is initialized
     */
    private async ensureInitialized(): Promise<boolean> {
        if (this.isInitialized) return true;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this.initDatabase();
        return this.initPromise;
    }
}

// Create and export a singleton instance
const pdfStorageService = new PDFStorageService();
export default pdfStorageService;
