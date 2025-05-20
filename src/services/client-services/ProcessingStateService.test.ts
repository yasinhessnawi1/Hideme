import { describe, test, expect, vi, beforeEach } from 'vitest';
import processingStateService, { ProcessingStatus, ProcessingInfo } from '../../services/client-services/ProcessingStateService';
import { getFileKey } from '../../contexts/PDFViewerContext';

// Mock dependencies
vi.mock('../../contexts/PDFViewerContext', () => ({
    getFileKey: vi.fn()
}));

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
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.dispatchEvent
window.dispatchEvent = vi.fn();

describe('ProcessingStateService', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.resetAllMocks();

        // Default mock implementation for getFileKey
        vi.mocked(getFileKey).mockImplementation((file: { name: any }) => file.name);

        // Reset localStorage mock
        localStorageMock.clear();

        // Create a clean mock for window.dispatchEvent
        (window.dispatchEvent as any).mockReset();
    });

    describe('Basic operations', () => {
        test('should get processing info for a file', () => {
            const testFile = new File(['test'], 'test.pdf');
            const fileKey = 'test.pdf';

            // Start processing for the test file
            processingStateService.startProcessing(testFile);

            // Get processing info
            const info = processingStateService.getProcessingInfo(fileKey);

            // Verify info
            expect(info).toBeDefined();
            expect(info?.status).toBe('processing');
            expect(info?.progress).toBeGreaterThanOrEqual(0);
            expect(info?.method).toBe('manual');
        });

        test('should start processing a file with custom options', () => {
            const testFile = new File(['test'], 'test.pdf');
            const options = {
                method: 'auto' as const,
                pageCount: 5,
                expectedTotalTimeMs: 10000
            };

            // Start processing with options
            const fileKey = processingStateService.startProcessing(testFile, options);

            // Verify file key
            expect(fileKey).toBe('test.pdf');

            // Verify info was created correctly
            const info = processingStateService.getProcessingInfo(fileKey);
            expect(info).toBeDefined();
            expect(info?.status).toBe('processing');
            expect(info?.method).toBe('auto');
            expect(info?.pageCount).toBe(5);
            expect(info?.totalPages).toBe(5);

            // Verify localStorage was updated
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });

        test('should update processing info correctly', () => {
            const testFile = new File(['test'], 'test.pdf');
            const fileKey = processingStateService.startProcessing(testFile);

            // Update progress
            processingStateService.updateProcessingInfo(fileKey, { progress: 50 });

            // Verify update
            const info = processingStateService.getProcessingInfo(fileKey);
            expect(info?.progress).toBe(50);

            // Update status to completed
            processingStateService.updateProcessingInfo(fileKey, { status: 'completed' });

            // Verify completed state
            const updatedInfo = processingStateService.getProcessingInfo(fileKey);
            expect(updatedInfo?.status).toBe('completed');
            expect(updatedInfo?.progress).toBe(100); // Should be set to 100% when completed
            expect(updatedInfo?.endTime).toBeDefined();
        });

        test('should handle failed status correctly', () => {
            const testFile = new File(['test'], 'test.pdf');
            const fileKey = processingStateService.startProcessing(testFile);

            // Set progress to track it doesn't change on failure
            processingStateService.updateProcessingInfo(fileKey, { progress: 75 });

            // Update status to failed
            processingStateService.updateProcessingInfo(fileKey, { status: 'failed' });

            // Verify failed state
            const updatedInfo = processingStateService.getProcessingInfo(fileKey);
            expect(updatedInfo?.status).toBe('failed');
            expect(updatedInfo?.endTime).toBeDefined();
        });

        test('should complete processing with success', () => {
            const testFile = new File(['test'], 'test.pdf');
            const fileKey = processingStateService.startProcessing(testFile);

            // Mock detection result
            const detectionResult = { someData: 'test result' };

            // Complete processing
            processingStateService.completeProcessing(fileKey, true, detectionResult);

            // Verify completed state
            const info = processingStateService.getProcessingInfo(fileKey);
            expect(info?.status).toBe('completed');
            expect(info?.progress).toBe(100);
            expect(info?.detectionResult).toEqual(detectionResult);

            // Verify event was dispatched
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'file-processing-state-changed',
                    detail: expect.objectContaining({
                        fileKey,
                        status: 'completed'
                    })
                })
            );
        });

        test('should complete processing with failure', () => {
            const testFile = new File(['test'], 'test.pdf');
            const fileKey = processingStateService.startProcessing(testFile);

            // Set progress to track it doesn't change
            processingStateService.updateProcessingInfo(fileKey, { progress: 75 });

            // Complete processing with failure
            processingStateService.completeProcessing(fileKey, false);

            // Verify failed state
            const info = processingStateService.getProcessingInfo(fileKey);
            expect(info?.status).toBe('failed');
            expect(info?.progress).toBe(75); // Should not change when failed

            // Verify event was dispatched
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'file-processing-state-changed',
                    detail: expect.objectContaining({
                        fileKey,
                        status: 'failed'
                    })
                })
            );
        });

        test('should dispatch auto-processing-complete event', () => {
            const testFile = new File(['test'], 'test.pdf');
            const fileKey = processingStateService.startProcessing(testFile, { method: 'auto' });

            // Complete processing
            processingStateService.completeProcessing(fileKey, true);

            // Verify auto-processing-complete event was dispatched
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'auto-processing-complete',
                    detail: expect.objectContaining({
                        fileKey,
                        hasEntityResults: false
                    })
                })
            );
        });

        test('should remove a file from tracking', () => {
            const testFile = new File(['test'], 'test.pdf');
            const fileKey = processingStateService.startProcessing(testFile);

            // Verify file is tracked
            expect(processingStateService.getProcessingInfo(fileKey)).toBeDefined();

            // Remove file
            processingStateService.removeFile(fileKey);

            // Verify file is no longer tracked
            expect(processingStateService.getProcessingInfo(fileKey)).toBeUndefined();

            // Verify events were dispatched
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'processed-file-removed'
                })
            );
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'file-removed'
                })
            );
        });

        test('should clear all processing data', () => {
            // Setup multiple files
            const file1 = new File(['test1'], 'file1.pdf');
            const file2 = new File(['test2'], 'file2.pdf');

            processingStateService.startProcessing(file1);
            processingStateService.startProcessing(file2);

            // Verify files are tracked
            expect(processingStateService.getProcessedFileKeys().length).toBe(2);

            // Clear all
            processingStateService.clearAll();

            // Verify all files are removed
            expect(processingStateService.getProcessedFileKeys().length).toBe(0);

            // Verify localStorage was updated
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe('Subscription and notification', () => {
        test('should notify subscribers when processing state changes', () => {
            const mockCallback = vi.fn();

            // Subscribe to changes
            const subscription = processingStateService.subscribe(mockCallback);

            // Start processing a file
            const testFile = new File(['test'], 'test.pdf');
            const fileKey = processingStateService.startProcessing(testFile);

            // Verify callback was called
            expect(mockCallback).toHaveBeenCalledWith(fileKey, expect.objectContaining({
                status: 'processing'
            }));

            // Update processing
            processingStateService.updateProcessingInfo(fileKey, { progress: 50 });

            // Verify callback was called again
            expect(mockCallback).toHaveBeenCalledWith(fileKey, expect.objectContaining({
                progress: 50
            }));

            // Unsubscribe
            subscription.unsubscribe();

            // Reset mock
            mockCallback.mockReset();

            // Update again
            processingStateService.updateProcessingInfo(fileKey, { progress: 75 });

            // Verify callback was not called after unsubscribing
            expect(mockCallback).not.toHaveBeenCalled();
        });

        test('should handle errors in subscribers gracefully', () => {
            // Create a subscriber that throws an error
            const errorCallback = vi.fn().mockImplementation(() => {
                throw new Error('Subscription error');
            });

            // Mock console.error
            const originalConsoleError = console.error;
            console.error = vi.fn();

            try {
                // Subscribe error callback
                processingStateService.subscribe(errorCallback);

                // Start processing a file
                const testFile = new File(['test'], 'test.pdf');
                processingStateService.startProcessing(testFile);

                // Verify error was logged but processing continued
                expect(console.error).toHaveBeenCalled();
                expect(window.dispatchEvent).toHaveBeenCalled(); // Event should still be dispatched
            } finally {
                // Restore console.error
                console.error = originalConsoleError;
            }
        });
    });

    describe('File validation', () => {
        test('should validate files against available keys', () => {
            // Setup test files
            const file1 = new File(['test1'], 'file1.pdf');
            const file2 = new File(['test2'], 'file2.pdf');
            const file3 = new File(['test3'], 'file3.pdf');

            // Start processing all files
            processingStateService.startProcessing(file1);
            processingStateService.startProcessing(file2);
            processingStateService.startProcessing(file3);

            // Mock removeFile method
            const removeFileSpy = vi.spyOn(processingStateService, 'removeFile');

            // Validate with only file1 and file3
            processingStateService.validateFiles(['file1.pdf', 'file3.pdf']);

            // Verify file2 was removed
            expect(removeFileSpy).toHaveBeenCalledWith('file2.pdf');
            expect(removeFileSpy).not.toHaveBeenCalledWith('file1.pdf');
            expect(removeFileSpy).not.toHaveBeenCalledWith('file3.pdf');

            // Restore original method
            removeFileSpy.mockRestore();
        });
    });

    describe('Storage persistence', () => {
        test('should save processing state to localStorage', () => {
            // Setup test file
            const testFile = new File(['test'], 'test.pdf');

            // Start processing
            processingStateService.startProcessing(testFile);

            // Complete processing
            processingStateService.completeProcessing('test.pdf', true);

            // Verify localStorage.setItem was called
            expect(localStorageMock.setItem).toHaveBeenCalled();

            // Verify only completed files are stored
            const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
            const storedData = JSON.parse(lastCall[1]);

            expect(storedData['test.pdf']).toBeDefined();
            expect(storedData['test.pdf'].status).toBe('completed');
        });

        test('should handle localStorage errors gracefully', () => {
            // Mock console.error
            const originalConsoleError = console.error;
            console.error = vi.fn();

            try {
                // Mock localStorage.setItem to throw error
                localStorageMock.setItem.mockImplementationOnce(() => {
                    throw new Error('localStorage error');
                });

                // Start processing a file
                const testFile = new File(['test'], 'test.pdf');
                processingStateService.startProcessing(testFile);

                // Verify error was logged
                expect(console.error).toHaveBeenCalledWith(
                    expect.stringContaining('[ProcessingStateService] Error saving to localStorage:'),
                    expect.any(Error)
                );
            } finally {
                // Restore console.error
                console.error = originalConsoleError;
            }
        });
    });

    describe('Utility methods', () => {
        /*
        test('should get processed file keys', () => {
            // Setup test files
            const file1 = new File(['test1'], 'file1.pdf');
            const file2 = new File(['test2'], 'file2.pdf');

            // Start processing
            processingStateService.startProcessing(file1);
            processingStateService.startProcessing(file2);

            // Get keys
            const keys = processingStateService.getProcessedFileKeys();

            // Verify keys
            expect(keys).toContain('file1.pdf');
            expect(keys).toContain('file2.pdf');
            expect(keys.length).toBe(2);
        });
        */

        test('should count processed files correctly', () => {
            // Setup test files
            const file1 = new File(['test1'], 'file1.pdf');
            const file2 = new File(['test2'], 'file2.pdf');
            const file3 = new File(['test3'], 'file3.pdf');

            // Start processing
            processingStateService.startProcessing(file1);
            processingStateService.startProcessing(file2);
            processingStateService.startProcessing(file3);

            // Complete processing for file1 and file2
            processingStateService.completeProcessing('file1.pdf', true);
            processingStateService.completeProcessing('file2.pdf', true);

            // Count completed files
            const completedCount = processingStateService.getProcessedFilesCount();

            // Verify count
            expect(completedCount).toBe(2);
        });

        /*
        test('should count files in progress correctly', () => {
            // Setup test files
            const file1 = new File(['test1'], 'file1.pdf');
            const file2 = new File(['test2'], 'file2.pdf');
            const file3 = new File(['test3'], 'file3.pdf');

            // Start processing
            processingStateService.startProcessing(file1);
            processingStateService.startProcessing(file2);
            processingStateService.startProcessing(file3);

            // Complete processing for file1
            processingStateService.completeProcessing('file1.pdf', true);

            // Count files in progress
            const inProgressCount = processingStateService.getProcessingFilesCount();

            // Verify count
            expect(inProgressCount).toBe(2);
        });
        */
    });


    describe('Progress simulation', () => {
        test('should handle case when file processing is completed manually', async () => {
            // Setup test file
            const testFile = new File(['test'], 'test.pdf');

            // Start processing
            const fileKey = processingStateService.startProcessing(testFile);

            // Complete processing immediately
            processingStateService.completeProcessing(fileKey, true);

            // Check progress is set to 100%
            const info = processingStateService.getProcessingInfo(fileKey);
            expect(info?.progress).toBe(100);
        });

        /*
        test('should not update progress after processing is completed', async () => {
            // Setup test file
            const testFile = new File(['test'], 'test.pdf');

            // Start processing
            const fileKey = processingStateService.startProcessing(testFile);

            // Complete processing immediately
            processingStateService.completeProcessing(fileKey, true);

            // Try to update progress after completion
            processingStateService.updateProcessingInfo(fileKey, { progress: 50 });

            // Check progress is still 100%
            const info = processingStateService.getProcessingInfo(fileKey);
            expect(info?.progress).toBe(100);
        });
        */
    });
});