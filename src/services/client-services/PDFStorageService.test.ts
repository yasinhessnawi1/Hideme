import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBPDatabase, openDB } from 'idb';
import pdfStorageService from '../../services/client-services/PDFStorageService';
import { StorageStats } from '../../types';

// Mock IDB
vi.mock('idb', () => {
    // Create mock implementations
    const mockIDBDatabase = {
        put: vi.fn(),
        get: vi.fn(),
        getAll: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        objectStoreNames: {
            contains: vi.fn()
        },
        createObjectStore: vi.fn().mockReturnValue({
            createIndex: vi.fn()
        }),
        transaction: vi.fn().mockReturnValue({
            store: {
                index: vi.fn().mockReturnValue({
                    openCursor: vi.fn()
                })
            },
            done: Promise.resolve()
        })
    };

    return {
        openDB: vi.fn().mockResolvedValue(mockIDBDatabase),
        IDBPDatabase: vi.fn()
    };
});

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        })
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('PDFStorageService', () => {
    // Mock files and database for testing
    let mockFiles: File[];
    let mockDb: any;

    beforeEach(() => {
        // Reset mocks
        vi.resetAllMocks();
        localStorageMock.clear();

        // Create test files
        mockFiles = [
            new File(['test content 1'], 'file1.pdf', { type: 'application/pdf' }),
            new File(['test content 2'], 'file2.pdf', { type: 'application/pdf' })
        ];

        // Set up mock db reference
        mockDb = (openDB as any).mock.results[0]?.value;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('initialization', () => {

        test('should initialize with default settings', async () => {
            // Mock empty settings response
            if (mockDb) {
                mockDb.get.mockResolvedValueOnce(null);
            }

            // Call getSettings indirectly via isStorageEnabled
            const isEnabled = await pdfStorageService.isStorageEnabled();

            // Default value should be true
            expect(isEnabled).toBe(true);

            // Check if default settings were saved
            if (mockDb) {
                expect(mockDb.put).toHaveBeenCalledWith(
                    'storage-settings',
                    expect.objectContaining({
                        id: 'default',
                        enabled: true
                    })
                );
            }
        });
    });

    describe('storage operations', () => {
        test('should store a PDF file in IndexedDB', async () => {
            const testFile = mockFiles[0];

            if (mockDb) {
                // Mock successful storage check
                mockDb.getAll.mockResolvedValueOnce([]);
            }

            const result = await pdfStorageService.storeFile(testFile);

            // Verify result
            expect(result).toBe(true);

            // Verify file was stored properly
            if (mockDb) {
                expect(mockDb.put).toHaveBeenCalledWith(
                    'pdf-files',
                    expect.objectContaining({
                        file: testFile,
                        name: testFile.name,
                        size: testFile.size,
                        type: testFile.type
                    })
                );
            }
        });

        test('should return null when getting non-existent file', async () => {
            if (mockDb) {
                // Mock file not found
                mockDb.get.mockResolvedValueOnce(null);
            }

            const result = await pdfStorageService.getFile('nonexistent.pdf');

            // Verify result
            expect(result).toBeNull();
        });

        test('should delete a PDF file from storage', async () => {
            const fileKey = 'file1.pdf';

            const result = await pdfStorageService.deleteFile(fileKey);

            // Verify result
            expect(result).toBe(true);

            // Verify file was deleted
            if (mockDb) {
                expect(mockDb.delete).toHaveBeenCalledWith('pdf-files', fileKey);
            }
        });

        test('should clear all stored PDF files', async () => {
            const result = await pdfStorageService.clearAllFiles();

            // Verify result
            expect(result).toBe(true);

            // Verify storage was cleared
            if (mockDb) {
                expect(mockDb.clear).toHaveBeenCalledWith('pdf-files');
            }
        });
    });

    describe('settings management', () => {
        test('should update storage settings', async () => {
            const newSettings = {
                enabled: false,
                maxStorageSize: 50 * 1024 * 1024, // 50MB
                maxStorageTime: 3 * 24 * 60 * 60 * 1000 // 3 days
            };

            if (mockDb) {
                // Mock current settings
                mockDb.get.mockResolvedValueOnce({
                    id: 'default',
                    enabled: true,
                    maxStorageSize: 100 * 1024 * 1024, // 100MB default
                    maxStorageTime: 7 * 24 * 60 * 60 * 1000, // 7 days default
                    lastCleaned: Date.now() - 3600000 // 1 hour ago
                });
            }

            const result = await pdfStorageService.updateSettings(newSettings);

            // Verify result
            expect(result).toBe(true);

            // Verify settings were updated
            if (mockDb) {
                expect(mockDb.put).toHaveBeenCalledWith(
                    'storage-settings',
                    expect.objectContaining({
                        id: 'default',
                        enabled: newSettings.enabled,
                        maxStorageSize: newSettings.maxStorageSize,
                        maxStorageTime: newSettings.maxStorageTime
                    })
                );
            }
        });

        test('should create settings if none exist', async () => {
            if (mockDb) {
                // Mock missing settings
                mockDb.get.mockResolvedValueOnce(null);
            }

            const newSettings = {
                enabled: false
            };

            const result = await pdfStorageService.updateSettings(newSettings);

            // Verify result
            expect(result).toBe(true);

            // Verify settings were created with default values plus our override
            if (mockDb) {
                expect(mockDb.put).toHaveBeenCalledWith(
                    'storage-settings',
                    expect.objectContaining({
                        id: 'default',
                        enabled: false
                    })
                );
            }
        });
    });

    describe('storage statistics', () => {

        test('should format storage statistics for display', async () => {
            // Mock getStorageUsage to return known values
            vi.spyOn(pdfStorageService, 'getStorageUsage').mockResolvedValue({
                totalSize: 3 * 1024 * 1024, // 3MB
                fileCount: 2,
                maxSize: 100 * 1024 * 1024, // 100MB
                percentUsed: 3 // 3%
            });

            const result = await pdfStorageService.getStorageStats();

            // Verify result
            expect(result).toEqual({
                totalSizeFormatted: 3 * 1024 * 1024,
                fileCount: 2,
                percentUsed: 3
            });
        });
    });

    describe('storage limits and cleanup', () => {
        test('should free up storage when adding files that exceed the limit', async () => {
            // Mock current storage usage
            vi.spyOn(pdfStorageService, 'getStorageUsage').mockResolvedValue({
                totalSize: 95 * 1024 * 1024, // 95MB used
                fileCount: 5,
                maxSize: 100 * 1024 * 1024, // 100MB limit
                percentUsed: 95 // 95%
            });

            // Create a large file that would exceed the limit
            const largeFile = new File([new ArrayBuffer(10 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });

            if (mockDb) {
                // Mock cursor operations for the cleanup process
                const mockCursor = {
                    value: {
                        id: 'old-file.pdf',
                        size: 15 * 1024 * 1024, // 15MB file to remove
                        timestamp: Date.now() - 86400000 // 1 day old
                    },
                    delete: vi.fn().mockResolvedValue(undefined),
                    continue: vi.fn().mockResolvedValue(null) // No more entries
                };

                // Mock index.openCursor to return our cursor
                const mockIndex = {
                    openCursor: vi.fn().mockResolvedValue(mockCursor)
                };

                // Setup transaction
                const mockTx = {
                    store: {
                        index: vi.fn().mockReturnValue(mockIndex)
                    },
                    done: Promise.resolve()
                };

                mockDb.transaction.mockReturnValue(mockTx);
            }

            // Attempt to store the large file
            const result = await pdfStorageService.storeFile(largeFile);

            // Verify storage cleanup was attempted and file was stored
            if (mockDb) {
                // Verify transaction was created to cleanup files
                expect(mockDb.transaction).toHaveBeenCalledWith('pdf-files', 'readwrite');

                // File should be stored after cleanup
                expect(result).toBe(true);
                expect(mockDb.put).toHaveBeenCalledWith(
                    'pdf-files',
                    expect.objectContaining({
                        file: largeFile,
                        name: largeFile.name
                    })
                );
            }
        });

        test('should clean up old files based on max age', async () => {
            // Mock database and cursor for cleanup
            if (mockDb) {
                // Create a cursor with old entries
                const mockEntries = [
                    {
                        id: 'old-file1.pdf',
                        timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000 // 10 days old (should be deleted)
                    },
                    {
                        id: 'old-file2.pdf',
                        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days old (should be deleted)
                    },
                    {
                        id: 'recent-file.pdf',
                        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000 // 1 day old (should be kept)
                    }
                ];

                // Create a mock implementation of the cursor for the cleanup process
                let mockCursorIndex = 0;
                const mockCursor = {
                    get value() {
                        return mockEntries[mockCursorIndex];
                    },
                    delete: vi.fn().mockResolvedValue(undefined),
                    continue: vi.fn().mockImplementation(() => {
                        mockCursorIndex++;
                        return mockCursorIndex < mockEntries.length ? Promise.resolve(mockCursor) : Promise.resolve(null);
                    })
                };

                // Setup index
                const mockIndex = {
                    openCursor: vi.fn().mockResolvedValue(mockCursor)
                };

                // Setup transaction
                const mockTx = {
                    store: {
                        index: vi.fn().mockReturnValue(mockIndex)
                    },
                    done: Promise.resolve()
                };

                mockDb.transaction.mockReturnValue(mockTx);

                // Mock settings to define max age as 7 days
                mockDb.get.mockResolvedValueOnce({
                    id: 'default',
                    enabled: true,
                    maxStorageSize: 100 * 1024 * 1024,
                    maxStorageTime: 7 * 24 * 60 * 60 * 1000, // 7 days
                    lastCleaned: Date.now() - 24 * 60 * 60 * 1000 // Cleaned 1 day ago
                });
            }

            // Call any method to trigger cleanup (storeFile will work)
            const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
            await pdfStorageService.storeFile(testFile);

            // Verify cleanup was performed
            if (mockDb) {
                // Verify transaction for old files was created
                expect(mockDb.transaction).toHaveBeenCalledWith('pdf-files', 'readwrite');

                // Verify cursor deletion was called for the two old files
                expect((mockDb.transaction().store.index().openCursor()).delete).toHaveBeenCalledTimes(2);
            }
        });
    });

    describe('error handling', () => {

        test('should handle errors when getting storage stats', async () => {
            // Force getAll to reject
            if (mockDb) {
                mockDb.getAll.mockRejectedValueOnce(new Error('Failed to get files'));
            }

            const result = await pdfStorageService.getStorageUsage();

            // Should return default empty stats
            expect(result).toEqual({
                totalSize: 0,
                fileCount: 0,
                maxSize: expect.any(Number),
                percentUsed: 0
            });
        });
    });
});