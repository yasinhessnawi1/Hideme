// Enhanced ProcessingStateService.ts with improved file deletion handling

import { getFileKey } from '../contexts/PDFViewerContext';

/**
 * File processing status types
 */
export type ProcessingStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Processing information model
 */
export interface ProcessingInfo {
    status: ProcessingStatus;
    progress: number;
    startTime?: number;
    endTime?: number;
    pageCount?: number;
    totalPages?: number;
    method?: 'auto' | 'manual';
    error?: string;
    detectionResult?: any; // Added to store detection result
}

// Storage keys for persistence
const PROCESSED_FILES_STORAGE_KEY = 'pdf-processed-files';

/**
 * Service for managing file processing state across the application
 * - Tracks which files have been processed with what methods
 * - Provides centralized loading states and progress tracking
 * - Emits events when processing state changes
 * - Now with persistence support for tracking processed files
 */
class ProcessingStateService {
    private static instance: ProcessingStateService;
    private processedFiles: Map<string, ProcessingInfo> = new Map();
    private listeners: Set<Function> = new Set();

    // Expected processing time per page in milliseconds (adjust based on benchmarks)
    private readonly DEFAULT_PROCESSING_TIME_PER_PAGE_MS = 1700;

    private constructor() {
        // Load saved state on initialization
        this.loadFromStorage();
    }

    public static getInstance(): ProcessingStateService {
        if (!this.instance) {
            this.instance = new ProcessingStateService();
        }
        return this.instance;
    }

    /**
     * Get processing info for a file
     */
    public getProcessingInfo(fileKey: string): ProcessingInfo | undefined {
        return this.processedFiles.get(fileKey);
    }

    /**
     * Get all processed file keys
     */
    public getProcessedFileKeys(): string[] {
        return Array.from(this.processedFiles.keys());
    }

    /**
     * Count files that have been successfully processed
     */
    public getProcessedFilesCount(): number {
        let count = 0;
        this.processedFiles.forEach(info => {
            if (info.status === 'completed') count++;
        });
        return count;
    }

    /**
     * Count files that are currently being processed
     */
    public getProcessingFilesCount(): number {
        let count = 0;
        this.processedFiles.forEach(info => {
            if (info.status === 'processing' || info.status === 'queued') count++;
        });
        return count;
    }

    /**
     * Start processing a file
     */
    public startProcessing(
        file: File,
        options: {
            method?: 'auto' | 'manual',
            pageCount?: number,
            expectedTotalTimeMs?: number
        } = {}
    ): string {
        const fileKey = getFileKey(file);
        const method = options.method || 'manual';
        const pageCount = options.pageCount || 1;

        const info: ProcessingInfo = {
            status: 'processing',
            progress: 0,
            startTime: Date.now(),
            pageCount,
            totalPages: pageCount,
            method
        };

        this.processedFiles.set(fileKey, info);
        this.notifyListeners(fileKey, info);
        this.saveToStorage();

        // Start the progress simulation
        this.simulateProgress(fileKey, pageCount, options.expectedTotalTimeMs);

        return fileKey;
    }

    /**
     * Update processing state
     */
    public updateProcessingInfo(
        fileKey: string,
        updatedInfo: Partial<ProcessingInfo>
    ): void {
        const currentInfo = this.processedFiles.get(fileKey);

        if (currentInfo) {
            const newInfo = { ...currentInfo, ...updatedInfo };

            // If we're completing the process, set progress to 100%
            if (updatedInfo.status === 'completed' && currentInfo.status !== 'completed') {
                newInfo.progress = 100;
                newInfo.endTime = Date.now();
            }

            // If we're failing the process, stop progress
            if (updatedInfo.status === 'failed' && currentInfo.status !== 'failed') {
                newInfo.endTime = Date.now();
            }

            this.processedFiles.set(fileKey, newInfo);
            this.notifyListeners(fileKey, newInfo);
            this.saveToStorage();
        }
    }

    /**
     * Complete processing of a file with optional detection result
     */
    public completeProcessing(fileKey: string, success: boolean = true, detectionResult?: any): void {
        const currentInfo = this.processedFiles.get(fileKey);

        if (currentInfo) {
            const updatedInfo: ProcessingInfo = {
                ...currentInfo,
                status: success ? 'completed' : 'failed',
                progress: success ? 100 : currentInfo.progress,
                endTime: Date.now(),
                detectionResult: detectionResult || currentInfo.detectionResult
            };

            this.processedFiles.set(fileKey, updatedInfo);
            this.notifyListeners(fileKey, updatedInfo);
            this.saveToStorage();

            // Dispatch global event for other components
            window.dispatchEvent(new CustomEvent('file-processing-state-changed', {
                detail: {
                    fileKey,
                    status: updatedInfo.status,
                    method: updatedInfo.method,
                    detectionResult: updatedInfo.detectionResult,
                    timestamp: Date.now()
                }
            }));

            // Also dispatch auto-processing-complete for consistency
            if (success && updatedInfo.method === 'auto') {
                window.dispatchEvent(new CustomEvent('auto-processing-complete', {
                    detail: {
                        fileKey,
                        hasEntityResults: !!updatedInfo.detectionResult,
                        detectionResult: updatedInfo.detectionResult,
                        timestamp: Date.now()
                    }
                }));
            }
        }
    }

    /**
     * Remove a file from tracking (when file is deleted)
     */
    public removeFile(fileKey: string): void {
        if (this.processedFiles.has(fileKey)) {
            this.processedFiles.delete(fileKey);
            this.saveToStorage();

            // Notify with null to indicate removal
            this.notifyListeners(fileKey, null);

            // Dispatch global event for file removal - ensure consistency with naming
            window.dispatchEvent(new CustomEvent('processed-file-removed', {
                detail: {
                    fileKey,
                    timestamp: Date.now()
                }
            }));

            // Also dispatch a more generic event that other components can listen for
            window.dispatchEvent(new CustomEvent('file-removed', {
                detail: {
                    fileKey,
                    timestamp: Date.now()
                }
            }));
        }
    }

    /**
     * Clear all processing data
     */
    public clearAll(): void {
        this.processedFiles.clear();
        this.saveToStorage();
        this.notifyListeners('all', null);
    }

    /**
     * Subscribe to changes
     */
    public subscribe(callback: (fileKey: string, info: ProcessingInfo | null) => void): { unsubscribe: () => void } {
        this.listeners.add(callback);

        return {
            unsubscribe: () => {
                this.listeners.delete(callback);
            }
        };
    }

    /**
     * Check if a file is available and update processed files accordingly
     * This ensures we only track files that still exist
     */
    public validateFiles(availableFileKeys: string[]): void {
        const keysToRemove: string[] = [];

        // Find keys that no longer exist
        this.processedFiles.forEach((_, key) => {
            if (!availableFileKeys.includes(key)) {
                keysToRemove.push(key);
            }
        });

        // Remove any invalid files
        keysToRemove.forEach(key => this.removeFile(key));
    }

    /**
     * Save current state to localStorage
     */
    private saveToStorage(): void {
        try {
            // Only persist completed files for long-term storage
            const completedFiles: Record<string, ProcessingInfo> = {};
            this.processedFiles.forEach((info, key) => {
                if (info.status === 'completed') {
                    completedFiles[key] = info;
                }
            });

            localStorage.setItem(PROCESSED_FILES_STORAGE_KEY, JSON.stringify(completedFiles));
        } catch (error) {
            console.error('[ProcessingStateService] Error saving to localStorage:', error);
        }
    }

    /**
     * Load state from localStorage
     */
    private loadFromStorage(): void {
        try {
            const savedData = localStorage.getItem(PROCESSED_FILES_STORAGE_KEY);
            if (savedData) {
                const parsed = JSON.parse(savedData) as Record<string, ProcessingInfo>;

                Object.entries(parsed).forEach(([key, info]) => {
                    this.processedFiles.set(key, info);
                });

                console.log(`[ProcessingStateService] Loaded ${this.processedFiles.size} processed files from storage`);
            }
        } catch (error) {
            console.error('[ProcessingStateService] Error loading from localStorage:', error);
        }
    }

    /**
     * Simulate progress based on file size and page count
     * Uses dynamic algorithm to:
     * 1. Start fast and slow down as progress increases
     * 2. Never reach 100% until actually complete
     * 3. Adjust speed based on page count
     */
    private simulateProgress(
        fileKey: string,
        pageCount: number = 1,
        expectedTotalTimeMs?: number
    ): void {
        // Determine expected processing time based on page count
        const estimatedTimeMs = expectedTotalTimeMs || pageCount * this.DEFAULT_PROCESSING_TIME_PER_PAGE_MS;
        const startTime = Date.now();
        const maxProgress = 99; // Max progress before actual completion
        const updateFrequencyMs = Math.min(Math.max(100, estimatedTimeMs / 50), 500); // Update frequency between 100ms and 500ms

        const updateProgress = () => {
            const currentInfo = this.processedFiles.get(fileKey);

            // Stop if the file is no longer being processed
            if (!currentInfo || currentInfo.status !== 'processing') {
                return;
            }

            const elapsedTimeMs = Date.now() - startTime;
            const progressRatio = elapsedTimeMs / estimatedTimeMs;

            // Non-linear progress curve that slows down as it approaches 100%
            // Formula gives:
            // - 0.5 estimated time → ~70% progress
            // - 1.0 estimated time → ~90% progress
            // - 2.0 estimated time → ~98% progress
            let calculatedProgress = 100 * (1 - 1/(1 + 3*progressRatio));

            // Cap progress at maxProgress
            calculatedProgress = Math.min(calculatedProgress, maxProgress);

            // Special handling for very high progress - slow down even more
            if (calculatedProgress > 90) {
                // Stretch the last 10% to take an additional 50% of the time
                calculatedProgress = 90 + (calculatedProgress - 90) * 0.5;
            }

            // Update progress
            this.updateProcessingInfo(fileKey, { progress: Math.floor(calculatedProgress) });

            // Schedule next update if still below maxProgress
            if (calculatedProgress < maxProgress) {
                // Reduce frequency as we get closer to completion
                const nextUpdateInterval = progressRatio > 1
                    ? updateFrequencyMs * 2
                    : updateFrequencyMs;

                setTimeout(updateProgress, nextUpdateInterval);
            }
        };

        // Start progress updates
        setTimeout(updateProgress, 100);
    }

    /**
     * Notify all listeners of state change
     */
    private notifyListeners(fileKey: string, info: ProcessingInfo | null): void {
        this.listeners.forEach(callback => {
            try {
                callback(fileKey, info);
            } catch (error) {
                console.error('[ProcessingStateService] Error in listener:', error);
            }
        });

        // Also dispatch a general event that doesn't require subscription
        window.dispatchEvent(new CustomEvent('processing-state-updated', {
            detail: {
                fileKey,
                info,
                timestamp: Date.now(),
                totalProcessed: this.getProcessedFilesCount(),
                totalProcessing: this.getProcessingFilesCount()
            }
        }));
    }
}

// Export singleton instance
export const processingStateService = ProcessingStateService.getInstance();

export default processingStateService;
