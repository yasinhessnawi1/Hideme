import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getFileKey } from './PDFViewerContext';
import { autoProcessManager } from '../utils/AutoProcessManager';

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

    // Auto-processing settings
    isAutoProcessingEnabled: boolean;
    setAutoProcessingEnabled: (enabled: boolean) => void;

    // File utility functions
    getFileByKey: (fileKey: string) => File | null;
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
    const [isAutoProcessingEnabled, setAutoProcessingEnabled] = useState<boolean>(true);

    // Keep a queue of newly added files that need processing
    const processingQueue = useRef<File[]>([]);
    const processingInProgress = useRef<boolean>(false);
    const [queueTrigger, setQueueTrigger] = useState(0);

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

    // Update auto-processing settings
    useEffect(() => {
        autoProcessManager.updateConfig({ isActive: isAutoProcessingEnabled });
    }, [isAutoProcessingEnabled]);

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
            processQueue();
        }
    }, [queueTrigger]); // Now depends on queueTrigger to activate when needed


    // File management functions
    const addFile = useCallback((file: File) => {
        setFiles((prevFiles) => {
            // Check if file already exists in array (by name and size)
            const fileExists = prevFiles.some(f =>
                f.name === file.name &&
                f.size === file.size &&
                f.lastModified === file.lastModified
            );

            if (fileExists) {
                setCurrentFile(file);
                return prevFiles;
            }

            // Otherwise add to array
            const newFiles = [...prevFiles, file];

            // Automatically set as current file if it's the first one
            if (prevFiles.length === 0) {
                setCurrentFile(file);
            }

            // Add to active files automatically
            addToActiveFiles(file);

            // Trigger initialization for the new file's highlights
            const fileKey = getFileKey(file);
            setTimeout(() => {
                // Use a small timeout to ensure the file is fully added to the context
                if (typeof window.resetEntityHighlightsForFile === 'function') {
                    window.resetEntityHighlightsForFile(fileKey);
                    console.log(`[FileContext] Initialized entity highlights for new file ${fileKey}`);
                }

                // Dispatch an event to trigger highlight processing for the new file
                window.dispatchEvent(new CustomEvent('reset-entity-highlights', {
                    detail: {
                        fileKey,
                        resetType: 'new-file',
                        forceProcess: true
                    }
                }));
            }, 100);

            // Queue file for auto-processing with current settings
            if (isAutoProcessingEnabled) {
                processingQueue.current.push(file);

                // Trigger queue processing with our state trigger
                setQueueTrigger(prev => prev + 1);

                console.log(`[FileContext] Queued new file for auto-processing: ${file.name}`);
            }

            return newFiles;
        });
    }, [addToActiveFiles, isAutoProcessingEnabled, setCurrentFile]);

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

            const updatedFiles = [...baseFiles, ...uniqueNewFiles];

            // If we're replacing files or no current file is set,
            // set the first new file as the current file
            if ((replace || !currentFile) && updatedFiles.length > 0) {
                setCurrentFile(updatedFiles[0]);
            }

            // Add new files to active files
            uniqueNewFiles.forEach(file => {
                addToActiveFiles(file);

                // Initialize highlighting for each new file
                const fileKey = getFileKey(file);
                setTimeout(() => {
                    // Use a small timeout to ensure the file is fully added to the context
                    if (typeof window.resetEntityHighlightsForFile === 'function') {
                        window.resetEntityHighlightsForFile(fileKey);
                        console.log(`[FileContext] Initialized entity highlights for new file ${fileKey}`);
                    }

                    // Dispatch an event to trigger highlight processing for the new file
                    window.dispatchEvent(new CustomEvent('reset-entity-highlights', {
                        detail: {
                            fileKey,
                            resetType: 'new-file',
                            forceProcess: true
                        }
                    }));
                }, 100);
            });

            // Queue new files for auto-processing with current settings
            if (isAutoProcessingEnabled && uniqueNewFiles.length > 0) {
                processingQueue.current.push(...uniqueNewFiles);

                // Trigger queue processing with our state trigger
                setQueueTrigger(prev => prev + 1);

                console.log(`[FileContext] Queued ${uniqueNewFiles.length} new files for auto-processing`);
            }

            return updatedFiles;
        });
    }, [currentFile, addToActiveFiles, isAutoProcessingEnabled, setCurrentFile]);


    const removeFile = useCallback((fileIndex: number) => {
        setFiles((prevFiles) => {
            if (fileIndex < 0 || fileIndex >= prevFiles.length) {
                return prevFiles;
            }

            const newFiles = [...prevFiles];
            const removedFile = prevFiles[fileIndex];
            newFiles.splice(fileIndex, 1);

            // Remove from active files
            removeFromActiveFiles(removedFile);

            // Deselect the removed file if it was selected
            setSelectedFiles(prev => prev.filter(f => f !== removedFile));

            // Clean up highlight tracking for the removed file
            const fileKey = getFileKey(removedFile);
            if (typeof window.removeFileHighlightTracking === 'function') {
                window.removeFileHighlightTracking(fileKey);
                console.log(`[FileContext] Removed highlight tracking for file ${fileKey}`);
            }

            // If we removed the current file, select a new one
            if (currentFile === removedFile) {
                if (newFiles.length > 0) {
                    // Select the next file, or the previous if we removed the last one
                    const newIndex = fileIndex >= newFiles.length ? newFiles.length - 1 : fileIndex;
                    setCurrentFile(newFiles[newIndex]);
                } else {
                    setCurrentFile(null);
                }
            }

            return newFiles;
        });
    }, [currentFile, removeFromActiveFiles]);

    const clearFiles = useCallback(() => {
        setFiles([]);
        setCurrentFile(null);
        setSelectedFiles([]);
        setActiveFiles([]);
        processingQueue.current = [];
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

    // Utility function to get a file by its key
    const getFileByKey = useCallback((fileKey: string): File | null => {
        const file = files.find(f => getFileKey(f) === fileKey);
        return file || null;
    }, [files]);

    // Persist files in localStorage when they change
    useEffect(() => {
        try {
            // We can't directly store File objects in localStorage,
            // so this is just a placeholder. In a real app, you would use
            // IndexedDB or other storage solutions for files
            localStorage.setItem('pdf-file-count', String(files.length));
        } catch (error) {
            console.error('Error saving file info to storage:', error);
        }
    }, [files]);
    useEffect(() => {
        // If processing is in progress, set a timeout to clear it if it gets stuck
        if (processingInProgress.current) {
            const timeoutId = setTimeout(() => {
                console.log('[FileContext] Processing timeout - resetting state');
                processingInProgress.current = false;

                // Trigger processing again if there are files in the queue
                if (processingQueue.current.length > 0) {
                    setQueueTrigger(prev => prev + 1);
                }
            }, 30000); // 30 second timeout

            return () => clearTimeout(timeoutId);
        }
    }, [queueTrigger]);
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

                // Auto-processing settings
                isAutoProcessingEnabled,
                setAutoProcessingEnabled,

                // Utilities
                getFileByKey
            }}
        >
            {children}
        </FileContext.Provider>
    );
};
