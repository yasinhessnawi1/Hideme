import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getFileKey } from './PDFViewerContext';
import { autoProcessManager } from '../managers/AutoProcessManager';
import pdfStorageService from '../services/PDFStorageService';
import { pdfjs } from 'react-pdf';
import { StorageStats } from '../types';
import { useHighlightStore } from "./HighlightStoreContext";
import processingStateService from "../services/ProcessingStateService";
import summaryPersistenceStore from "../store/SummaryPersistenceStore";

// Ensure PDF.js worker is loaded
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
            console.log('Setting PDF.js worker source');
            pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
        }

        // Wait for the worker to be ready
        console.log('Waiting for PDF.js worker to initialize...');
        setTimeout(() => {
            console.log('PDF.js worker initialization timeout completed');
            resolve();
        }, 5);
    });
};

interface FileContextProps {
    // File management
    files: File[];
    currentFile: File | null;
    addFile: (file: File) => void;
    addFiles: (newFiles: File[], replace?: boolean) => void;
    removeFile: (fileIndex: number) => void;
    setCurrentFile: (file: File | null) => void;
    clearFiles: () => void;

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
    // Add state to track if PDF worker is ready
    const [isPdfWorkerReady, setIsPdfWorkerReady] = useState<boolean>(false);

    // Add a debug state to track loading attempts
    const [loadingDebugState, setLoadingDebugState] = useState<string>('initial');

    // Keep a queue of newly added files that need processing
    const processingQueue = useRef<File[]>([]);
    const processingInProgress = useRef<boolean>(false);
    const [queueTrigger, setQueueTrigger] = useState(0);

    // Flag to track initial loading
    const initialLoadComplete = useRef<boolean>(false);

    // Ref to track storage loading attempts
    const storageLoadAttempted = useRef<boolean>(false);

    // Initialize PDF.js worker first
    useEffect(() => {
        const initializeWorker = async () => {
            try {
                setLoadingDebugState('worker-initializing');
                console.log('🔄 [FileContext] Initializing PDF.js worker...');
                await loadPdfWorker();
                console.log('✅ [FileContext] PDF.js worker initialized successfully');
                setIsPdfWorkerReady(true);
                setLoadingDebugState('worker-ready');
            } catch (error) {
                console.error('❌ [FileContext] Failed to initialize PDF.js worker:', error);
                setLoadingDebugState('worker-error');
                // Set ready anyway after a timeout to prevent permanently blocking the app
                setTimeout(() => setIsPdfWorkerReady(true), 10);
            }
        };

        initializeWorker().then(() => {});
    }, []);

    // Initialize storage persistence settings from the service
    useEffect(() => {
        const initStorageSettings = async () => {
            try {
                setLoadingDebugState('storage-initializing');
                console.log('🔄 [FileContext] Initializing storage service...');
                // Get current storage status from the service
                const enabled = pdfStorageService.isStorageEnabled();
                setIsStoragePersistenceEnabled(enabled);

                // Load storage statistics
                const stats = await pdfStorageService.getStorageStats();
                setStorageStats({
                    totalSizeFormatted: stats.totalSizeFormatted,
                    fileCount: stats.fileCount,
                    percentUsed: stats.percentUsed
                });

                console.log('✅ [FileContext] Storage service initialized', {
                    enabled,
                    stats
                });
                setLoadingDebugState('storage-ready');
            } catch (error) {
                console.error('❌ [FileContext] Error initializing storage service:', error);
                setLoadingDebugState('storage-error');
            }
        };

        initStorageSettings().then();
    }, []);


    // Load files from storage - using a separate effect with fewer dependencies
    useEffect(() => {
        // Skip if either PDF worker or storage initialization is not complete
        if (!isPdfWorkerReady) {
            console.log('⏳ [FileContext] Waiting for PDF.js worker to initialize before loading files');
            return;
        }

        if (!isStoragePersistenceEnabled) {
            console.log('ℹ️ [FileContext] Storage persistence is disabled, not loading files');
            return;
        }

        // Prevent multiple load attempts
        if (storageLoadAttempted.current) {
            console.log('ℹ️ [FileContext] Storage load already attempted, skipping');
            return;
        }

        // Mark that we've attempted loading
        storageLoadAttempted.current = true;

        // This is the main loading function
        const loadFilesFromStorage = async () => {
            try {
                setLoadingDebugState('files-loading');
                console.log('🔄 [FileContext] Loading files from persistent storage');
                let storedFiles = await pdfStorageService.getAllFiles();

                console.log(`[FileContext] Storage returned ${storedFiles.length} files`);

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
                    console.log(`✅ [FileContext] Found ${storedFiles.length} valid files in storage`);

                    // Update files state with stored files
                    setFiles(storedFiles);
                    setLoadingDebugState('files-loaded');

                    // Wait for state to update before setting current file
                    setTimeout(() => {
                        if (storedFiles.length > 0) {
                            console.log(`🔄 [FileContext] Setting first file as current and active`);
                            // Set only the first file as active initially
                            setActiveFiles(storedFiles);
                            setCurrentFile(storedFiles[0]);
                        }

                        console.log(`✅ [FileContext] Loaded ${storedFiles.length} files from storage`);
                        initialLoadComplete.current = true;
                    }, 300);
                } else {
                    console.log('ℹ️ [FileContext] No valid stored files found');
                    setLoadingDebugState('no-files');
                    initialLoadComplete.current = true;
                }
            } catch (error) {
                console.error('❌ [FileContext] Error loading files from storage:', error);
                setLoadingDebugState('files-error');
            }
        };

        // Start loading files with a slight delay
        console.log('⏳ [FileContext] Scheduling file loading with delay...');
        setTimeout(() => {
            console.log('🔄 [FileContext] Starting file loading from storage');
            loadFilesFromStorage().then(() => {});
        }, 80);

    }, [isPdfWorkerReady, isStoragePersistenceEnabled]);

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

        updateStorageStats().then(() => {});
    }, [files, isStoragePersistenceEnabled]);

    // Toggle storage persistence setting
    const handleToggleStoragePersistence = useCallback(async (enabled: boolean) => {
        try {
            // Update the service setting
            await pdfStorageService.setStorageEnabled(enabled);

            // Update local state
            setIsStoragePersistenceEnabled(enabled);

            console.log(`✅ [FileContext] Storage persistence ${enabled ? 'enabled' : 'disabled'}`);

            // If enabling, and we have files, store them
            if (enabled && files.length > 0 && initialLoadComplete.current) {
                console.log(`🔄 [FileContext] Storing ${files.length} files in persistent storage`);

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

            console.log('✅ [FileContext] All stored files cleared');
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
            if (processingInProgress.current || processingQueue.current.length === 0) {
                return;
            }

            processingInProgress.current = true;

            try {
                // Get files to process (up to 3 at a time)
                const filesToProcess = processingQueue.current.splice(0, 3);

                if (filesToProcess.length > 0) {
                    console.log(`[FileContext] Processing ${filesToProcess.length} queued files`);

                    // Process files with current settings
                    const successCount = await autoProcessManager.processNewFiles(filesToProcess);
                    console.log(`[FileContext] Successfully processed ${successCount}/${filesToProcess.length} files`);
                }
            } catch (error) {
                console.error('[FileContext] Error processing file queue:', error);
            } finally {
                processingInProgress.current = false;

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
        if (processingQueue.current.length > 0 && !processingInProgress.current) {
            processQueue().then();
        }
    }, [queueTrigger]);

    // If processing is in progress, set a timeout to clear it if it gets stuck
    useEffect(() => {
        if (processingInProgress.current) {
            const timeoutId = setTimeout(() => {
                console.log('[FileContext] Processing timeout - resetting state');
                processingInProgress.current = false;

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
                console.warn(`[FileContext] Maximum file limit reached. Cannot add more files.`);
                return prevFiles;
            }

            // Check if file already exists in array (by name and size)
            const fileExists = prevFiles.some(f =>
                f.name === file.name &&
                f.size === file.size &&
                f.lastModified === file.lastModified
            );

            if (fileExists) {
                setCurrentFile(file);
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

            // Automatically open the new file
            openFile(file);

            // Always queue file for auto-processing
            // The AutoProcessManager will handle the decision about whether to process it
            processingQueue.current.push(file);
            setQueueTrigger(prev => prev + 1);
            console.log(`[FileContext] Queued new file for auto-processing: ${file.name}`);

            // Store file in persistent storage if enabled
            if (isStoragePersistenceEnabled) {
                pdfStorageService.storeFile(file)
                    .then(success => {
                        if (success) {
                            console.log(`[FileContext] File "${file.name}" stored in persistent storage`);
                        } else {
                            console.warn(`[FileContext] Failed to store file "${file.name}" in persistent storage`);
                        }
                    })
                    .catch(error => {
                        console.error(`[FileContext] Error storing file "${file.name}":`, error);
                    });
            }

            return newFiles;
        });
    }, [openFile, isStoragePersistenceEnabled, setCurrentFile]);

    // Modified addFiles method - simplified queueing logic
    const addFiles = useCallback((newFiles: File[], replace = false) => {
        setFiles((prevFiles) => {
            // Start with either the existing files or an empty array if replace=true
            const baseFiles = replace ? [] : [...prevFiles];

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
            console.warn(redactedFiles.length)
            console.warn(uniqueNewFiles.length)
            console.warn(totalFiles)
            if (totalFiles > 20) {
                console.warn(`[FileContext] Maximum file limit reached. Only the first 20 files will be added.`);
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
                        .then(success => {
                            if (success) {
                                console.log(`[FileContext] File "${file.name}" stored in persistent storage`);
                            } else {
                                console.warn(`[FileContext] Failed to store file "${file.name}" in persistent storage`);
                            }
                        })
                        .catch(error => {
                            console.error(`[FileContext] Error storing file "${file.name}":`, error);
                        });
                }
            });

            // SIMPLIFIED LOGIC: Always queue unique new files for auto-processing
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
                    console.log(`[FileContext] Queued ${filesToQueue.length} new files for auto-processing`);
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
                    .then(success => {
                        if (success) {
                            console.log(`[FileContext] File "${removedFile.name}" removed from persistent storage`);
                        }
                    })
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
                .then(() => {
                    console.log('[FileContext] All files cleared from persistent storage');
                })
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

    // Debug logging for component state
    useEffect(() => {
        console.log(`[FileContext] Current debug state: ${loadingDebugState}`);
        console.log(`[FileContext] Worker ready: ${isPdfWorkerReady}`);
        console.log(`[FileContext] Storage enabled: ${isStoragePersistenceEnabled}`);
        console.log(`[FileContext] Files count: ${files.length}`);
        console.log(`[FileContext] Active files count: ${activeFiles.length}`);
    }, [loadingDebugState, isPdfWorkerReady, isStoragePersistenceEnabled, files.length, activeFiles.length]);

    return (
        <FileContext.Provider
            value={{
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
            }}
        >
            {children}
        </FileContext.Provider>
    );
};
