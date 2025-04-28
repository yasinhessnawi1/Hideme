import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { getFileKey } from './PDFViewerContext';
import { autoProcessManager } from '../managers/AutoProcessManager';
import pdfStorageService from '../services/PDFStorageService';
import { pdfjs } from 'react-pdf';
import { StorageStats } from '../types';
import { useHighlightStore } from "./HighlightStoreContext";
import processingStateService from "../services/ProcessingStateService";
import summaryPersistenceStore from "../store/SummaryPersistenceStore";
import { useLoading } from './LoadingContext';
import { useSettings } from '../hooks/settings/useSettings';
import { useNotification } from './NotificationContext';

const loadPdfWorker = () => {
    return new Promise<void>((resolve) => {
        // Check if worker is already loaded
        if (pdfjs.GlobalWorkerOptions.workerPort) {
            console.log('PDF.js worker already initialized');
            resolve();
            return;
        }

        // Set worker source if not already set
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
        }

        // Wait for the worker to be ready
        setTimeout(() => {
            resolve();
        }, 5);
    });
};

interface FileContextProps {
    // File management
    files: File[];
    addFile: (file: File) => void;
    addFiles: (newFiles: File[], replace?: boolean) => void;
    removeFile: (fileIndex: number) => void;
    setCurrentFile: (file: File | null) => void;
    clearFiles: () => void;
    currentFile: File | null;
    // File selection for batch operations
    selectedFiles: File[];
    selectFile: (file: File) => void;
    deselectFile: (file: File) => void;
    toggleFileSelection: (file: File) => void;
    isFileSelected: (file: File) => boolean;
    selectAllFiles: () => void;
    deselectAllFiles: () => void;

    // Active files (currently displayed in the viewer)
    activeFiles: File[];
    addToActiveFiles: (file: File) => void;
    removeFromActiveFiles: (file: File) => void;
    toggleActiveFile: (file: File) => void;
    isFileActive: (file: File) => boolean;

    // Storage-related properties and functions
    isStoragePersistenceEnabled: boolean;
    setStoragePersistenceEnabled: (enabled: boolean) => void;
    storageStats: StorageStats | null;
    clearStoredFiles: () => Promise<void>;

    // File utility functions
    getFileByKey: (fileKey: string) => File | null;
    openFiles: File[];
    openFile: (file: File) => void;
    closeFile: (file: File) => void;
    toggleFileOpen: (file: File) => void;
    isFileOpen: (file: File) => boolean;
    openAllFiles: () => void;
    closeAllFiles: () => void;
    setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const FileContext = createContext<FileContextProps | undefined>(undefined);

export const useFileContext = () => {
    const context = useContext(FileContext);
    if (!context) {
        throw new Error('useFileContext must be used within a FileProvider');
    }
    return context;
};

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [activeFiles, setActiveFiles] = useState<File[]>([]); // Files currently displayed
    const [openFiles, setOpenFiles] = useState<File[]>([]);
    const [isStoragePersistenceEnabled, setIsStoragePersistenceEnabled] = useState<boolean>(false);
    const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
    const { removeHighlightsFromFile } = useHighlightStore();
    const { settings } = useSettings();
    const { isLoading: globalLoading, startLoading, stopLoading } = useLoading();
    const { notify } = useNotification();
    // Keep a queue of newly added files that need processing
    const processingQueue = useRef<File[]>([]);
    const [queueTrigger, setQueueTrigger] = useState(0);

    // Flag to track initial loading
    const initialLoadComplete = useRef<boolean>(false);

    // Ref to track storage loading attempts
    const storageLoadAttempted = useRef<boolean>(false);

    // Initialize PDF.js worker first
    useEffect(() => {
        startLoading('file.worker');
        const initializeWorker = async () => {
            try {
                await loadPdfWorker();
            } catch (error) {
                console.error('❌ [FileContext] Failed to initialize PDF.js worker:', error);
            }
        };

        initializeWorker().then(() => {
            stopLoading('file.worker');
        });
    }, []);

    // Initialize storage persistence settings from the service
    useEffect(() => {
        const initStorageSettings = async () => {
            try {                // Get current storage status from the service
                const enabled = pdfStorageService.isStorageEnabled();
                setIsStoragePersistenceEnabled(enabled);
                // Load storage statistics
                const stats = await pdfStorageService.getStorageStats();
                setStorageStats({
                    totalSizeFormatted: stats.totalSizeFormatted,
                    fileCount: stats.fileCount,
                    percentUsed: stats.percentUsed
                });

            } catch (error) {
                console.error('❌ [FileContext] Error initializing storage service:', error);
            }
        };

        initStorageSettings().then();
    }, []);


    // Load files from storage - using a separate effect with fewer dependencies
    useEffect(() => {
        // Skip if either PDF worker or storage initialization is not complete
        if (!globalLoading(['file.worker'])) {
            return;
        }

        if (!isStoragePersistenceEnabled) {
            return;
        }

        // Prevent multiple load attempts
        if (storageLoadAttempted.current) {
            return;
        }

        // Mark that we've attempted loading
        storageLoadAttempted.current = true;

        // This is the main loading function
        const loadFilesFromStorage = async () => {
            try {
                let storedFiles = await pdfStorageService.getAllFiles();

                // Ensure files are properly converted and valid
                storedFiles = storedFiles.filter(file => {
                    // Validate file is a proper PDF
                    const isValidPdf = file &&
                        file instanceof File &&
                        (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));

                    if (!isValidPdf) {
                        console.warn(`⚠️ [FileContext] Invalid PDF file found in storage, skipping:`, file);
                    }
                    return isValidPdf;
                });

                if (storedFiles.length > 0) {

                    // Update files state with stored files
                    setFiles(storedFiles);

                    // Wait for state to update before setting current file
                    setTimeout(() => {
                        if (storedFiles.length > 0) {
                            // Set only the first file as active initially
                            setActiveFiles(storedFiles);
                            setCurrentFile(storedFiles[0]);
                        }

                        initialLoadComplete.current = true;
                    }, 300);
                } else {
                    console.log('ℹ️ [FileContext] No valid stored files found');
                    initialLoadComplete.current = true;
                }
            } catch (error) {
                console.error('❌ [FileContext] Error loading files from storage:', error);
            }
        };

        setTimeout(() => {
            loadFilesFromStorage().then(() => { });
        }, 80);

    }, [isStoragePersistenceEnabled]);

    // Update storage stats when files change
    useEffect(() => {
        const updateStorageStats = async () => {
            if (!isStoragePersistenceEnabled) return;

            try {
                const stats = await pdfStorageService.getStorageStats();
                setStorageStats({
                    totalSizeFormatted: stats.totalSizeFormatted,
                    fileCount: stats.fileCount,
                    percentUsed: stats.percentUsed
                });
            } catch (error) {
                console.error('❌ [FileContext] Error updating storage stats:', error);
            }
        };

        updateStorageStats().then(() => { });
    }, [files, isStoragePersistenceEnabled]);

    // Toggle storage persistence setting
    const handleToggleStoragePersistence = useCallback(async (enabled: boolean) => {
        try {
            // Update the service setting
            await pdfStorageService.setStorageEnabled(enabled);

            // Update local state
            setIsStoragePersistenceEnabled(enabled);


            // If enabling, and we have files, store them
            if (enabled && files.length > 0 && initialLoadComplete.current) {

                // Store all current files
                for (const file of files) {
                    await pdfStorageService.storeFile(file);
                }
            }

            // Update storage stats
            const stats = await pdfStorageService.getStorageStats();
            setStorageStats({
                totalSizeFormatted: stats.totalSizeFormatted,
                fileCount: stats.fileCount,
                percentUsed: stats.percentUsed
            });
        } catch (error) {
            console.error('❌ [FileContext] Error toggling storage persistence:', error);
        }
    }, [files]);

    // Clear all stored files
    const clearStoredFiles = useCallback(async () => {
        try {
            await pdfStorageService.clearAllFiles();

            // Update storage stats
            const stats = await pdfStorageService.getStorageStats();
            setStorageStats({
                totalSizeFormatted: stats.totalSizeFormatted,
                fileCount: stats.fileCount,
                percentUsed: stats.percentUsed
            });

        } catch (error) {
            console.error('❌ [FileContext] Error clearing stored files:', error);
        }
    }, []);


    // Functions to manage active files (files currently displayed in the viewer)
    const addToActiveFiles = useCallback((file: File) => {
        setActiveFiles(prev => {
            if (prev.some(f => f.name === file.name && f.lastModified === file.lastModified)) {
                return prev;
            }
            return [...prev, file];
        });
    }, []);

    const removeFromActiveFiles = useCallback((file: File) => {
        setActiveFiles(prev => prev.filter(f =>
            f.name !== file.name || f.lastModified !== file.lastModified
        ));
    }, []);

    // Toggle active file status
    const toggleActiveFile = useCallback((file: File) => {
        setActiveFiles(prev => {
            if (prev.some(f => f.name === file.name && f.lastModified === file.lastModified)) {
                return prev.filter(f => f.name !== file.name || f.lastModified !== file.lastModified);
            }
            return [...prev, file];
        });
    }, []);

    const isFileActive = useCallback((file: File) => {
        return activeFiles.some(f =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );
    }, [activeFiles]);

    // Process queued files in a controlled manner
    useEffect(() => {
        const processQueue = async () => {
            if (globalLoading(['file.processing']) || processingQueue.current.length === 0) {
                return;
            }

            startLoading('file.processing');

            try {
                // Get files to process (up to 3 at a time)
                const filesToProcess = processingQueue.current.splice(0, 3);

                if (filesToProcess.length > 0) {

                    // Process files with current settings
                    await autoProcessManager.processNewFiles(filesToProcess);
                }
            } catch (error) {
                console.error('[FileContext] Error processing file queue:', error);
            } finally {
                stopLoading('file.processing');

                // Continue processing queue if there are more files
                if (processingQueue.current.length > 0) {
                    // Trigger another processing round after a delay
                    setTimeout(() => {
                        setQueueTrigger(prev => prev + 1);
                    }, 300);
                }
            }
        };

        // Start processing if needed
        if (processingQueue.current.length > 0 && !globalLoading(['file.processing'])) {
            processQueue().then();
        }
    }, [queueTrigger]);

    // If processing is in progress, set a timeout to clear it if it gets stuck
    useEffect(() => {
        if (globalLoading(['file.processing'])) {
            const timeoutId = setTimeout(() => {
                stopLoading('file.processing');

                // Trigger processing again if there are files in the queue
                if (processingQueue.current.length > 0) {
                    setQueueTrigger(prev => prev + 1);
                }
            }, 60000 * 10); // 10 min
            return () => clearTimeout(timeoutId);
        }
    }, [queueTrigger]);

    const openFile = useCallback((file: File) => {
        setOpenFiles(prev => {
            if (prev.some(f => f.name === file.name && f.lastModified === file.lastModified)) {
                return prev;
            }
            return [...prev, file];
        });

        // Also make the file active when opened
        addToActiveFiles(file);
    }, []);

    // File management functions with storage integration
    const addFile = useCallback((file: File) => {
        setFiles((prevFiles) => {
            if (prevFiles.length >= 20) {
                notify({
                    message: `Maximum file limit reached. Only the first 20 files will be added.`,
                    type: 'error',
                    duration: 3000
                }); return prevFiles;
            }

            // Check if file already exists in array (by name and size)
            const fileExists = prevFiles.some(f =>
                f.name === file.name &&
                f.size === file.size &&
                f.lastModified === file.lastModified
            );

            if (fileExists) {
                setCurrentFile(file);
                notify({
                    message: `File "${file.name}" already exists`,
                    type: 'info',
                    duration: 3000
                });
                // Open the file if it's not already open
                openFile(file);
                return prevFiles;
            }

            // Otherwise add to array
            const newFiles = [file, ...prevFiles];

            // Automatically set as current file if it's the first one
            if (prevFiles.length === 0) {
                setCurrentFile(file);
            }



            // Always queue file for auto-processing
            // The AutoProcessManager will handle the decision about whether to process it
            if (settings?.auto_processing) {
                processingQueue.current.push(file);
                setQueueTrigger(prev => prev + 1);
            }

            // Store file in persistent storage if enabled
            if (isStoragePersistenceEnabled) {
                pdfStorageService.storeFile(file)
                    .catch(error => {
                        console.error(`[FileContext] Error storing file "${file.name}":`, error);
                    });
            }
            // Automatically open the new file
            if (!isFileOpen(file)) {
                addToActiveFiles(file);
                openFile(file);
            }

            return newFiles;
        });
    }, [openFile, isStoragePersistenceEnabled, setCurrentFile]);

    // Modified addFiles method - simplified queueing logic
    const addFiles = useCallback((newFiles: File[], replace = false) => {
        setFiles((prevFiles) => {
            // Start with either the existing files or an empty array if replace=true
            const baseFiles = replace ? [] : [...prevFiles];

            if (!isFileOpen(newFiles[0])) {
                openFile(newFiles[0]);
                setTimeout(() => {
                }, 1000);
            }

            // Filter out files that already exist
            const uniqueNewFiles = newFiles.filter(newFile =>
                !baseFiles.some(existingFile =>
                    existingFile.name === newFile.name &&
                    existingFile.size === newFile.size &&
                    existingFile.lastModified === newFile.lastModified
                )
            );
            let redactedFiles = baseFiles.filter(file => file.name.includes('redacted')); // don't count the redacted files in the total file count
            redactedFiles = redactedFiles.concat(uniqueNewFiles.filter(file => file.name.includes('redacted')));


            // Limit the number of files to 20
            const totalFiles = baseFiles.length + uniqueNewFiles.length - redactedFiles.length;
            if (totalFiles > 20) {
                notify({
                    message: `Maximum file limit reached. Only the first 20 files will be added.`,
                    type: 'error',
                    duration: 3000
                });
                uniqueNewFiles.splice(20 - baseFiles.length);
            }

            const updatedFiles = [...uniqueNewFiles, ...baseFiles];

            if ((replace || !currentFile) && updatedFiles.length > 0) {
                setActiveFiles([]);
                setCurrentFile(updatedFiles[0]);
            }

            // If any of the files exist in the active files, remove them
            const filteredActiveFiles = activeFiles.filter(activeFile =>
                !uniqueNewFiles.some(newFile =>
                    activeFile.name === newFile.name &&
                    activeFile.size === newFile.size &&
                    activeFile.lastModified === newFile.lastModified
                )
            );
            setActiveFiles(filteredActiveFiles);

            // Add new files to active files
            uniqueNewFiles.forEach(file => {
                addToActiveFiles(file);

                // Store file in persistent storage if enabled
                if (isStoragePersistenceEnabled) {
                    pdfStorageService.storeFile(file)
                        .catch(error => {
                            notify({
                                message: `Error storing file "${file.name}" in storage: ${error}`,
                                type: 'error',
                                duration: 3000
                            });
                        });
                }
            });

            // Let the AutoProcessManager handle the decision logic
            if (uniqueNewFiles.length > 0) {
                // Avoid duplicates in the queue
                const existingFileKeys = new Set(processingQueue.current.map(file => getFileKey(file)));
                const filesToQueue = uniqueNewFiles.filter(file => {

                    const fileKey = getFileKey(file);
                    return !existingFileKeys.has(fileKey);
                });

                if (filesToQueue.length > 0) {
                    processingQueue.current.push(...filesToQueue);
                    setQueueTrigger(prev => prev + 1);
                }
            }


            return updatedFiles;
        });
    }, [currentFile, addToActiveFiles, activeFiles, isStoragePersistenceEnabled, setCurrentFile]);

    const removeFile = useCallback((fileIndex: number) => {
        setFiles((prevFiles) => {
            if (fileIndex < 0 || fileIndex >= prevFiles.length) {
                return prevFiles;
            }

            const newFiles = [...prevFiles];
            const removedFile = prevFiles[fileIndex];
            const fileKey = getFileKey(removedFile);

            newFiles.splice(fileIndex, 1);

            // Remove from active files
            removeFromActiveFiles(removedFile);

            // Also remove from open files
            setOpenFiles(prev => prev.filter(f =>
                f.name !== removedFile.name || f.lastModified !== removedFile.lastModified
            ));

            // Deselect the removed file if it was selected
            setSelectedFiles(prev => prev.filter(f => f !== removedFile));

            // Clean up highlight tracking for the removed file
            removeHighlightsFromFile(fileKey).catch(error => {
                console.error(`[FileContext] Error cleaning up highlights for file "${removedFile.name}":`, error);
            });

            // Notify of file removal via event
            processingStateService.removeFile(fileKey);

            // Clear file from persistence store summaries
            summaryPersistenceStore.removeFileFromSummaries('entity', fileKey);
            summaryPersistenceStore.removeFileFromSummaries('search', fileKey);

            // Dispatch a more detailed event for comprehensive notification
            window.dispatchEvent(new CustomEvent('file-removed', {
                detail: {
                    fileKey,
                    fileName: removedFile.name,
                    timestamp: Date.now()
                }
            }));

            // Remove file from persistent storage if enabled
            if (isStoragePersistenceEnabled) {
                pdfStorageService.deleteFile(fileKey)
                    .catch(error => {
                        console.error(`[FileContext] Error removing file "${removedFile.name}" from storage:`, error);
                    });
            }

            // If we removed the current file, select a new one
            if (currentFile === removedFile) {
                // Select the next file, or the previous if we removed the last one
                let newIndex = -1;
                if (newFiles.length > 0) {
                    newIndex = fileIndex >= newFiles.length ? newFiles.length - 1 : fileIndex;
                    setCurrentFile(newFiles[newIndex]);
                } else {
                    setCurrentFile(null);
                }
            }

            return newFiles;
        });
    }, [currentFile, removeFromActiveFiles, isStoragePersistenceEnabled, setCurrentFile, removeHighlightsFromFile]);

    const clearFiles = useCallback(() => {
        setFiles([]);
        setCurrentFile(null);
        setSelectedFiles([]);
        setActiveFiles([]);
        processingQueue.current = [];

        // Clear files from persistent storage if enabled
        if (isStoragePersistenceEnabled) {
            pdfStorageService.clearAllFiles()
                .catch(error => {
                    console.error('[FileContext] Error clearing files from storage:', error);
                });
        }
    }, [isStoragePersistenceEnabled]);


    const closeFile = useCallback((file: File) => {
        setOpenFiles(prev => prev.filter(f =>
            f.name !== file.name || f.lastModified !== file.lastModified
        ));
    }, []);

    // Toggle file open/closed state
    const toggleFileOpen = useCallback((file: File) => {
        setOpenFiles(prev => {
            if (prev.some(f => f.name === file.name && f.lastModified === file.lastModified)) {
                return prev.filter(f => f.name !== file.name || f.lastModified !== file.lastModified);
            }
            // Also make the file active when opened
            addToActiveFiles(file);
            return [...prev, file];
        });
    }, [addToActiveFiles]);

    // Check if a file is open
    const isFileOpen = useCallback((file: File) => {
        return openFiles.some(f =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );
    }, [openFiles]);

    // Open all files
    const openAllFiles = useCallback(() => {
        setOpenFiles([...files]);
        setActiveFiles([...files]);
    }, [files]);

    // Close all files
    const closeAllFiles = useCallback(() => {
        setOpenFiles([]);
    }, []);

    // File selection methods for batch operations
    const selectFile = useCallback((file: File) => {
        setSelectedFiles(prev => {
            if (!prev.includes(file)) {
                return [...prev, file];
            }
            return prev;
        });
    }, []);

    const deselectFile = useCallback((file: File) => {
        setSelectedFiles(prev => prev.filter(f => f !== file));
    }, []);

    const toggleFileSelection = useCallback((file: File) => {
        setSelectedFiles(prev => {
            if (prev.includes(file)) {
                return prev.filter(f => f !== file);
            } else {
                return [...prev, file];
            }
        });
    }, []);

    const isFileSelected = useCallback((file: File) => {
        return selectedFiles.includes(file);
    }, [selectedFiles]);

    const selectAllFiles = useCallback(() => {
        setSelectedFiles([...files]);
    }, [files]);

    const deselectAllFiles = useCallback(() => {
        setSelectedFiles([]);
    }, []);

    // Utility function to get a file by its key
    const getFileByKey = useCallback((fileKey: string): File | null => {
        const file = files.find(f => getFileKey(f) === fileKey);
        return file || null;
    }, [files]);


    const contextValue = useMemo(() => ({
        // File management
        files,
        currentFile,
        addFile,
        addFiles,
        removeFile,
        setCurrentFile,
        clearFiles,
        // File selection
        selectedFiles,
        selectFile,
        deselectFile,
        toggleFileSelection,
        isFileSelected,
        selectAllFiles,
        deselectAllFiles,

        // Active files
        activeFiles,
        addToActiveFiles,
        removeFromActiveFiles,
        toggleActiveFile,
        isFileActive,

        // Storage-related properties and functions
        isStoragePersistenceEnabled,
        setStoragePersistenceEnabled: handleToggleStoragePersistence,
        storageStats,
        clearStoredFiles,
        openFiles,
        openFile,
        closeFile,
        toggleFileOpen,
        isFileOpen,
        openAllFiles,
        closeAllFiles,
        // Utilities
        getFileByKey,
        setSelectedFiles,
    }), [
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
        handleToggleStoragePersistence,
        storageStats,
        clearStoredFiles,
        openFiles,
        openFile,
        closeFile,
        toggleFileOpen,
        isFileOpen,
        openAllFiles,
        closeAllFiles,
        getFileByKey,
        setSelectedFiles,
    ]);

    return (
        <FileContext.Provider value={contextValue}>
            {children}
        </FileContext.Provider>
    );
};
