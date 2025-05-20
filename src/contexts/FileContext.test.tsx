import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileProvider, useFileContext } from '../contexts/FileContext';
import pdfStorageService from '../services/client-services/PDFStorageService';
import { autoProcessManager } from '../managers/AutoProcessManager';
import { useHighlightStore } from '../contexts/HighlightStoreContext';
import processingStateService from '../services/client-services/ProcessingStateService';
import summaryPersistenceStore from '../store/SummaryPersistenceStore';
import { useSettings } from '../hooks/settings/useSettings';
import { ConfirmationButton, ConfirmationType, useNotification} from '../contexts/NotificationContext';
import * as PDFViewerContext from '../contexts/PDFViewerContext';
import {LoadingProvider} from '../contexts/LoadingContext';
import {UserSettings} from '../types';

// Mock dependencies
vi.mock('../services/client-services/PDFStorageService', () => ({
    default: {
        isStorageEnabled: vi.fn(),
        setStorageEnabled: vi.fn(),
        getStorageStats: vi.fn(),
        getAllFiles: vi.fn(),
        storeFile: vi.fn(),
        deleteFile: vi.fn(),
        clearAllFiles: vi.fn()
    }
}));

vi.mock('../managers/AutoProcessManager', () => ({
    autoProcessManager: {
        processNewFile: vi.fn(),
        processNewFiles: vi.fn()
    }
}));

vi.mock('../contexts/HighlightStoreContext', () => ({
    useHighlightStore: vi.fn()
}));

vi.mock('../services/client-services/ProcessingStateService', () => ({
    default: {
        removeFile: vi.fn()
    }
}));

vi.mock('../store/SummaryPersistenceStore', () => ({
    default: {
        removeFileFromSummaries: vi.fn()
    }
}));

vi.mock('../hooks/settings/useSettings', () => ({
    useSettings: vi.fn()
}));

vi.mock('../contexts/NotificationContext', () => ({
    useNotification: vi.fn()
}));

vi.mock('../contexts/PDFViewerContext', () => ({
    getFileKey: vi.fn((file) => `key-${file?.name ?? 'unknown'}`)
}));

// Mock the LoadingContext to avoid the error
vi.mock('../contexts/LoadingContext', () => ({
    ...vi.importActual('../contexts/LoadingContext'),
    useLoading: vi.fn(() => ({
        isLoading: vi.fn((keys) => false),
        startLoading: vi.fn(),
        stopLoading: vi.fn(),
        loadingStates: {},
        anyLoading: false
    })),
    LoadingProvider: ({children}: { children: React.ReactNode }) => <>{children}</>
}));

// Mock for Worker setup
vi.mock('react-pdf', () => ({
    pdfjs: {
        GlobalWorkerOptions: {
            workerSrc: null,
            workerPort: null
        }
    }
}));

// Test consumer component to access context methods
const TestConsumer = () => {
    const {
        files,
        currentFile,
        addFile,
        addFiles,
        removeFile,
        setCurrentFile,
        clearFiles,
        selectedFiles,
        selectFile,
        deselectFile,
        toggleFileSelection,
        isFileSelected,
        selectAllFiles,
        deselectAllFiles,
        activeFiles,
        addToActiveFiles,
        removeFromActiveFiles,
        toggleActiveFile,
        isFileActive,
        isStoragePersistenceEnabled,
        setStoragePersistenceEnabled,
        storageStats,
        clearStoredFiles,
        getFileByKey,
        openFiles,
        openFile,
        closeFile,
        toggleFileOpen,
        isFileOpen,
        openAllFiles,
        closeAllFiles
    } = useFileContext();

    return (
        <div>
            <div data-testid="files-count">{files.length}</div>
            <div data-testid="current-file">{currentFile?.name || 'none'}</div>
            <div data-testid="selected-files-count">{selectedFiles.length}</div>
            <div data-testid="active-files-count">{activeFiles.length}</div>
            <div data-testid="open-files-count">{openFiles.length}</div>
            <div data-testid="storage-enabled">{isStoragePersistenceEnabled.toString()}</div>

            <button data-testid="add-file"
                    onClick={() => addFile(new File([], 'test.pdf', {type: 'application/pdf'}))}>Add File
            </button>
            <button data-testid="add-files" onClick={() => addFiles([
                new File([], 'test1.pdf', {type: 'application/pdf'}),
                new File([], 'test2.pdf', {type: 'application/pdf'})
            ])}>Add Files
            </button>
            <button data-testid="remove-file" onClick={() => removeFile(0)}>Remove File</button>
            <button data-testid="set-current-file" onClick={() => setCurrentFile(files[0])}>Set Current File</button>
            <button data-testid="clear-files" onClick={clearFiles}>Clear Files</button>

            <button data-testid="select-file" onClick={() => selectFile(files[0])}>Select File</button>
            <button data-testid="deselect-file" onClick={() => deselectFile(files[0])}>Deselect File</button>
            <button data-testid="toggle-selection" onClick={() => toggleFileSelection(files[0])}>Toggle Selection
            </button>
            <button data-testid="select-all-files" onClick={selectAllFiles}>Select All Files</button>
            <button data-testid="deselect-all-files" onClick={deselectAllFiles}>Deselect All Files</button>

            <button data-testid="add-to-active-files" onClick={() => addToActiveFiles(files[0])}>Add to Active Files
            </button>
            <button data-testid="remove-from-active-files" onClick={() => removeFromActiveFiles(files[0])}>Remove from
                Active Files
            </button>
            <button data-testid="toggle-active-file" onClick={() => toggleActiveFile(files[0])}>Toggle Active File
            </button>

            <button data-testid="toggle-storage"
                    onClick={() => setStoragePersistenceEnabled(!isStoragePersistenceEnabled)}>Toggle Storage
            </button>
            <button data-testid="clear-stored-files" onClick={clearStoredFiles}>Clear Stored Files</button>

            <button data-testid="open-file" onClick={() => openFile(files[0])}>Open File</button>
            <button data-testid="close-file" onClick={() => closeFile(files[0])}>Close File</button>
            <button data-testid="toggle-file-open" onClick={() => toggleFileOpen(files[0])}>Toggle File Open</button>
            <button data-testid="open-all-files" onClick={openAllFiles}>Open All Files</button>
            <button data-testid="close-all-files" onClick={closeAllFiles}>Close All Files</button>

            <div data-testid="is-file-selected">{files.length > 0 && isFileSelected(files[0]) ? 'true' : 'false'}</div>
            <div data-testid="is-file-active">{files.length > 0 && isFileActive(files[0]) ? 'true' : 'false'}</div>
            <div data-testid="is-file-open">{files.length > 0 && isFileOpen(files[0]) ? 'true' : 'false'}</div>
            <div data-testid="get-file-by-key">{getFileByKey('key-test.pdf')?.name || 'not found'}</div>
        </div>
    );
};

// Wrap the TestConsumer with the needed provider
const TestWrapper = ({children}: { children: React.ReactNode }) => (
    <LoadingProvider>
        <FileProvider>
            {children}
        </FileProvider>
    </LoadingProvider>
);

describe('FileContext', () => {
    // Mock file objects
    const mockFile1 = new File([], 'test.pdf', {type: 'application/pdf'});
    const mockFile2 = new File([], 'test2.pdf', {type: 'application/pdf'});

    // Mock default values for hooks
    const mockRemoveHighlightsFromFile = vi.fn().mockResolvedValue(undefined);
    const mockGetConfig = vi.fn(() => ({auto_processing: true}));
    const mockNotify = vi.fn();

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Default mock implementations
        vi.mocked(pdfStorageService.isStorageEnabled).mockReturnValue(false);
        vi.mocked(pdfStorageService.getStorageStats).mockResolvedValue({
            totalSizeFormatted: 1,
            fileCount: 0,
            percentUsed: 0
        });
        vi.mocked(pdfStorageService.getAllFiles).mockResolvedValue([]);

        vi.mocked(useHighlightStore).mockReturnValue({
            removeHighlightsFromFile: mockRemoveHighlightsFromFile,
            addHighlight: vi.fn(),
            removeHighlight: vi.fn(),
            addMultipleHighlights: vi.fn(),
            removeMultipleHighlights: vi.fn(),
            getHighlightsForPage: vi.fn(),
            addHighlightsToPage: vi.fn(),
            removeHighlightsFromPage: vi.fn(),
            getHighlightsForFile: vi.fn(),
            addHighlightsToFile: vi.fn(),
            getHighlightsByType: vi.fn(),
            addHighlightsByType: vi.fn(),
            removeHighlightsByType: vi.fn(),
            getHighlightsByProperty: vi.fn(),
            removeHighlightsByProperty: vi.fn(),
            removeHighlightsByPropertyFromAllFiles: vi.fn(),
            getHighlightsByText: vi.fn(),
            removeHighlightsByText: vi.fn(),
            removeAllHighlights: vi.fn(),
            removeAllHighlightsByType: vi.fn(),
            removeHighlightsByPosition: vi.fn(),
            refreshTrigger: 0
        });

        vi.mocked(useSettings).mockReturnValue({
            settings: {
                auto_processing: true,
                id: 0,
                user_id: 0,
                theme: '',
                remove_images: false,
                created_at: '',
                updated_at: ''
            },
            getSettings: vi.fn().mockResolvedValue({auto_processing: true}),
            updateSettings: vi.fn(),
            isLoading: false,
            error: null,
            clearError: vi.fn(),
            isInitialized: true,
            exportSettings: function (): Promise<void> {
                throw new Error('Function not implemented.');
            },
            importSettings: function (settingsFile: File): Promise<UserSettings | null> {
                throw new Error('Function not implemented.');
            }
        });

        vi.mocked(useNotification).mockReturnValue({
            notify: mockNotify,
            toasts: [],
            removeToast: vi.fn(),
            clearToasts: vi.fn(),
            confirmation: null,
            confirm: vi.fn(),
            closeConfirmation: vi.fn(),
            confirmWithText: function (options: {
                type: ConfirmationType;
                title: string;
                message: string;
                confirmButton?: Partial<ConfirmationButton>;
                cancelButton?: Partial<ConfirmationButton>;
                additionalButtons?: ConfirmationButton[];
                inputLabel?: string;
                inputPlaceholder?: string;
                inputDefaultValue?: string;
                inputType?: string;
            }): Promise<string> {
                throw new Error('Function not implemented.');
            }
        });

        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn()
            },
            writable: true,
            configurable: true
        });

        // Mock window.dispatchEvent
        window.dispatchEvent = vi.fn();

        // Reset HTML timers
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('should initialize with default empty state', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Initial state should be empty
        expect(screen.getByTestId('files-count').textContent).toBe('0');
        expect(screen.getByTestId('current-file').textContent).toBe('none');
        expect(screen.getByTestId('selected-files-count').textContent).toBe('0');
        expect(screen.getByTestId('active-files-count').textContent).toBe('0');
        expect(screen.getByTestId('open-files-count').textContent).toBe('0');
        expect(screen.getByTestId('storage-enabled').textContent).toBe('false');

        // Verify storage service was checked
        expect(pdfStorageService.isStorageEnabled).toHaveBeenCalled();
        expect(pdfStorageService.getStorageStats).toHaveBeenCalled();
    });

    /*
    test('should add a file', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Initial count should be 0
        expect(screen.getByTestId('files-count').textContent).toBe('0');

        // Add a file
        fireEvent.click(screen.getByTestId('add-file'));

        // Count should increase
        expect(screen.getByTestId('files-count').textContent).toBe('1');
        expect(screen.getByTestId('current-file').textContent).toBe('test.pdf');

        // File should be processed if auto_processing is enabled
        expect(autoProcessManager.processNewFile).toHaveBeenCalled();
    });
    */

    test('should add multiple files', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Initial count should be 0
        expect(screen.getByTestId('files-count').textContent).toBe('0');

        // Add multiple files
        fireEvent.click(screen.getByTestId('add-files'));

        // Count should increase by the number of files added
        expect(screen.getByTestId('files-count').textContent).toBe('2');
        expect(screen.getByTestId('current-file').textContent).toBe('test1.pdf');

        // Files should be queued for processing
        expect(autoProcessManager.processNewFiles).toHaveBeenCalled();
    });

    /*
    test('should remove a file', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Add a file first
        fireEvent.click(screen.getByTestId('add-file'));
        expect(screen.getByTestId('files-count').textContent).toBe('1');

        // Remove the file
        fireEvent.click(screen.getByTestId('remove-file'));

        // Count should decrease
        expect(screen.getByTestId('files-count').textContent).toBe('0');
        expect(screen.getByTestId('current-file').textContent).toBe('none');

        // Cleanup operations should be performed
        expect(mockRemoveHighlightsFromFile).toHaveBeenCalled();
        expect(processingStateService.removeFile).toHaveBeenCalled();
        expect(summaryPersistenceStore.removeFileFromSummaries).toHaveBeenCalled();
        expect(window.dispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'file-removed' })
        );
    });
    */

    test('should set current file', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Add a file first
        fireEvent.click(screen.getByTestId('add-file'));

        // Reset to null
        fireEvent.click(screen.getByTestId('clear-files'));
        expect(screen.getByTestId('current-file').textContent).toBe('none');

        // Add again and explicitly set current file
        fireEvent.click(screen.getByTestId('add-file'));
        fireEvent.click(screen.getByTestId('set-current-file'));

        // Current file should be updated
        expect(screen.getByTestId('current-file').textContent).toBe('test.pdf');
    });

    /*
    test('should clear all files', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Add files first
        fireEvent.click(screen.getByTestId('add-files'));
        expect(screen.getByTestId('files-count').textContent).toBe('2');

        // Clear files
        fireEvent.click(screen.getByTestId('clear-files'));

        // All counts should be reset
        expect(screen.getByTestId('files-count').textContent).toBe('0');
        expect(screen.getByTestId('current-file').textContent).toBe('none');
        expect(screen.getByTestId('selected-files-count').textContent).toBe('0');
        expect(screen.getByTestId('active-files-count').textContent).toBe('0');
        expect(screen.getByTestId('open-files-count').textContent).toBe('0');
    });
    */

    test('should handle file selection operations', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Add a file first
        fireEvent.click(screen.getByTestId('add-file'));
        expect(screen.getByTestId('files-count').textContent).toBe('1');

        // Initially no files are selected
        expect(screen.getByTestId('selected-files-count').textContent).toBe('0');
        expect(screen.getByTestId('is-file-selected').textContent).toBe('false');

        // Select the file
        fireEvent.click(screen.getByTestId('select-file'));
        expect(screen.getByTestId('selected-files-count').textContent).toBe('1');
        expect(screen.getByTestId('is-file-selected').textContent).toBe('true');

        // Deselect the file
        fireEvent.click(screen.getByTestId('deselect-file'));
        expect(screen.getByTestId('selected-files-count').textContent).toBe('0');
        expect(screen.getByTestId('is-file-selected').textContent).toBe('false');

        // Toggle selection
        fireEvent.click(screen.getByTestId('toggle-selection'));
        expect(screen.getByTestId('selected-files-count').textContent).toBe('1');
        expect(screen.getByTestId('is-file-selected').textContent).toBe('true');

        // Toggle again
        fireEvent.click(screen.getByTestId('toggle-selection'));
        expect(screen.getByTestId('selected-files-count').textContent).toBe('0');
        expect(screen.getByTestId('is-file-selected').textContent).toBe('false');

        // Add another file
        fireEvent.click(screen.getByTestId('add-files'));
        expect(screen.getByTestId('files-count').textContent).toBe('3');

        // Select all files
        fireEvent.click(screen.getByTestId('select-all-files'));
        expect(screen.getByTestId('selected-files-count').textContent).toBe('3');

        // Deselect all files
        fireEvent.click(screen.getByTestId('deselect-all-files'));
        expect(screen.getByTestId('selected-files-count').textContent).toBe('0');
    });

    /*
    test('should handle active files operations', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Add a file first
        fireEvent.click(screen.getByTestId('add-file'));
        expect(screen.getByTestId('files-count').textContent).toBe('1');

        // Initially the file is not active
        expect(screen.getByTestId('active-files-count').textContent).toBe('0');
        expect(screen.getByTestId('is-file-active').textContent).toBe('false');

        // Add file to active files
        fireEvent.click(screen.getByTestId('add-to-active-files'));
        expect(screen.getByTestId('active-files-count').textContent).toBe('1');
        expect(screen.getByTestId('is-file-active').textContent).toBe('true');

        // Remove from active files
        fireEvent.click(screen.getByTestId('remove-from-active-files'));
        expect(screen.getByTestId('active-files-count').textContent).toBe('0');
        expect(screen.getByTestId('is-file-active').textContent).toBe('false');

        // Toggle active file
        fireEvent.click(screen.getByTestId('toggle-active-file'));
        expect(screen.getByTestId('active-files-count').textContent).toBe('1');
        expect(screen.getByTestId('is-file-active').textContent).toBe('true');

        // Toggle again
        fireEvent.click(screen.getByTestId('toggle-active-file'));
        expect(screen.getByTestId('active-files-count').textContent).toBe('0');
        expect(screen.getByTestId('is-file-active').textContent).toBe('false');
    });
    */

    /*
    test('should handle storage operations', async () => {
        // Mock storage methods for this test
        vi.mocked(pdfStorageService.setStorageEnabled).mockResolvedValue(true);
        vi.mocked(pdfStorageService.clearAllFiles).mockResolvedValue(true);

        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Storage is initially disabled
        expect(screen.getByTestId('storage-enabled').textContent).toBe('false');

        // Enable storage
        await act(async () => {
            fireEvent.click(screen.getByTestId('toggle-storage'));
        });

        // Storage service should be called
        expect(pdfStorageService.setStorageEnabled).toHaveBeenCalledWith(true);

        // Add a file to test storage
        await act(async () => {
            fireEvent.click(screen.getByTestId('add-file'));
        });

        // File should be stored
        expect(pdfStorageService.storeFile).toHaveBeenCalled();

        // Clear stored files
        await act(async () => {
            fireEvent.click(screen.getByTestId('clear-stored-files'));
        });

        // Storage should be cleared
        expect(pdfStorageService.clearAllFiles).toHaveBeenCalled();
    });
    */

    /*
    test('should handle open/close file operations', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Add a file first
        fireEvent.click(screen.getByTestId('add-file'));
        expect(screen.getByTestId('files-count').textContent).toBe('1');

        // Initially no files are open
        expect(screen.getByTestId('open-files-count').textContent).toBe('0');
        expect(screen.getByTestId('is-file-open').textContent).toBe('false');

        // Open the file
        fireEvent.click(screen.getByTestId('open-file'));
        expect(screen.getByTestId('open-files-count').textContent).toBe('1');
        expect(screen.getByTestId('is-file-open').textContent).toBe('true');

        // Opening a file should also make it active
        expect(screen.getByTestId('active-files-count').textContent).toBe('1');
        expect(screen.getByTestId('is-file-active').textContent).toBe('true');

        // Close the file
        fireEvent.click(screen.getByTestId('close-file'));
        expect(screen.getByTestId('open-files-count').textContent).toBe('0');
        expect(screen.getByTestId('is-file-open').textContent).toBe('false');

        // Toggle file open
        fireEvent.click(screen.getByTestId('toggle-file-open'));
        expect(screen.getByTestId('open-files-count').textContent).toBe('1');
        expect(screen.getByTestId('is-file-open').textContent).toBe('true');

        // Toggle again
        fireEvent.click(screen.getByTestId('toggle-file-open'));
        expect(screen.getByTestId('open-files-count').textContent).toBe('0');
        expect(screen.getByTestId('is-file-open').textContent).toBe('false');

        // Add more files
        fireEvent.click(screen.getByTestId('add-files'));
        expect(screen.getByTestId('files-count').textContent).toBe('3');

        // Open all files
        fireEvent.click(screen.getByTestId('open-all-files'));
        expect(screen.getByTestId('open-files-count').textContent).toBe('3');
        expect(screen.getByTestId('active-files-count').textContent).toBe('3');

        // Close all files
        fireEvent.click(screen.getByTestId('close-all-files'));
        expect(screen.getByTestId('open-files-count').textContent).toBe('0');
    });
    */

    test('should get a file by key', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Initially no file found
        expect(screen.getByTestId('get-file-by-key').textContent).toBe('not found');

        // Add a file
        await act(async () => {
            fireEvent.click(screen.getByTestId('add-file'));
            vi.advanceTimersByTime(0); // Allow state updates
        });

        // Now getFileByKey should find the file
        expect(screen.getByTestId('get-file-by-key').textContent).toBe('test.pdf');
    });

    /*
    test('should handle files loaded from storage', async () => {
        // Mock storage with files
        const storedFiles = [
            new File([], 'stored1.pdf', { type: 'application/pdf' }),
            new File([], 'stored2.pdf', { type: 'application/pdf' })
        ];
        vi.mocked(pdfStorageService.isStorageEnabled).mockReturnValue(true);
        vi.mocked(pdfStorageService.getAllFiles).mockResolvedValue(storedFiles);

        // Render with mocked storage
        let result;
        await act(async () => {
            result = render(
                <TestWrapper>
                    <TestConsumer />
                </TestWrapper>
            );

            // Need to advance timers to allow async useEffects to complete
            vi.advanceTimersByTime(500);
        });

        // Files should be loaded from storage
        await waitFor(() => {
            expect(screen.getByTestId('files-count').textContent).toBe('2');
            expect(screen.getByTestId('current-file').textContent).toBe('stored1.pdf');
        });
    });
    */

    test('should respect file limit of 20 files', async () => {
        // Create 21 files (more than limit)
        const manyFiles = Array.from({ length: 21 }, (_, i) =>
            new File([], `file${i}.pdf`, { type: 'application/pdf' })
        );

        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Use a custom component to access context directly
        const FileAdder = () => {
            const { addFiles } = useFileContext();

            // Add too many files
            React.useEffect(() => {
                addFiles(manyFiles);
            }, []);

            return null;
        };

        await act(async () => {
            render(
                <TestWrapper>
                    <FileAdder />
                </TestWrapper>
            );
            vi.advanceTimersByTime(100);
        });

        // Should show error notification
        expect(mockNotify).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'error',
                message: expect.stringContaining('Maximum file limit reached')
            })
        );
    });

    /*
    test('should not add duplicate files', async () => {
        // Create duplicate files
        const file1 = new File([], 'duplicate.pdf', { type: 'application/pdf' });
        Object.defineProperty(file1, 'lastModified', { value: 123456789 });

        const file2 = new File([], 'duplicate.pdf', { type: 'application/pdf' });
        Object.defineProperty(file2, 'lastModified', { value: 123456789 });

        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Use a custom component to access context directly
        const DuplicateAdder = () => {
            const { addFile } = useFileContext();

            // Add duplicate files
            React.useEffect(() => {
                addFile(file1);
                addFile(file2);
            }, []);

            return null;
        };

        await act(async () => {
            render(
                <TestWrapper>
                    <DuplicateAdder />
                </TestWrapper>
            );
            vi.advanceTimersByTime(100);
        });

        // Should only add one file
        expect(screen.getByTestId('files-count').textContent).toBe('1');

        // Should show notification about duplicate
        expect(mockNotify).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'info',
                message: expect.stringContaining('already exists')
            })
        );
    });

    test('should handle removal of current file', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Add multiple files
        await act(async () => {
            fireEvent.click(screen.getByTestId('add-files'));
            vi.advanceTimersByTime(50);
        });

        // Current file should be set to the first file
        expect(screen.getByTestId('current-file').textContent).toBe('test1.pdf');

        // Remove the current file
        await act(async () => {
            fireEvent.click(screen.getByTestId('remove-file'));
            vi.advanceTimersByTime(50);
        });

        // Current file should now be set to the next file
        expect(screen.getByTestId('files-count').textContent).toBe('1');
        expect(screen.getByTestId('current-file').textContent).toBe('test2.pdf');

        // Add another file and set as current
        await act(async () => {
            fireEvent.click(screen.getByTestId('add-file'));
            vi.advanceTimersByTime(50);
            fireEvent.click(screen.getByTestId('set-current-file'));
            vi.advanceTimersByTime(50);
        });

        // Remove the current file again
        await act(async () => {
            fireEvent.click(screen.getByTestId('remove-file'));
            vi.advanceTimersByTime(50);
        });

        // Current file should be reset to the remaining file
        expect(screen.getByTestId('files-count').textContent).toBe('1');
        expect(screen.getByTestId('current-file').textContent).toBe('test2.pdf');
    });

    test('should clean up resources when a file is removed', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Add a file
        await act(async () => {
            fireEvent.click(screen.getByTestId('add-file'));
            vi.advanceTimersByTime(50);
        });

        // Make the file active and selected
        await act(async () => {
            fireEvent.click(screen.getByTestId('add-to-active-files'));
            fireEvent.click(screen.getByTestId('select-file'));
            fireEvent.click(screen.getByTestId('open-file'));
            vi.advanceTimersByTime(50);
        });

        // Verify file is tracked
        expect(screen.getByTestId('active-files-count').textContent).toBe('1');
        expect(screen.getByTestId('selected-files-count').textContent).toBe('1');
        expect(screen.getByTestId('open-files-count').textContent).toBe('1');

        // Remove the file
        await act(async () => {
            fireEvent.click(screen.getByTestId('remove-file'));
            vi.advanceTimersByTime(50);
        });

        // File should be removed from all tracking collections
        expect(screen.getByTestId('active-files-count').textContent).toBe('0');
        expect(screen.getByTestId('selected-files-count').textContent).toBe('0');
        expect(screen.getByTestId('open-files-count').textContent).toBe('0');

        // Cleanup methods should be called
        expect(mockRemoveHighlightsFromFile).toHaveBeenCalled();
        expect(processingStateService.removeFile).toHaveBeenCalled();
        expect(summaryPersistenceStore.removeFileFromSummaries).toHaveBeenCalledTimes(2); // Called for entity and search
        expect(window.dispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'file-removed' })
        );
    });

    test('should process files with auto-processing enabled', async () => {
        render(
            <TestWrapper>
                <TestConsumer />
            </TestWrapper>
        );

        // Add a file
        await act(async () => {
            fireEvent.click(screen.getByTestId('add-file'));
            vi.advanceTimersByTime(50);
        });

        // Auto-processing should be triggered
        expect(autoProcessManager.processNewFile).toHaveBeenCalled();
    });
     */
});
