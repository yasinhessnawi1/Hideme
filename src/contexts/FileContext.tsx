import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getFileKey } from './PDFViewerContext';

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
            // This will ensure proper highlighting for the new file
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

            return newFiles;
        });
    }, [addToActiveFiles]);

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

            return updatedFiles;
        });
    }, [currentFile, addToActiveFiles]);

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

                // Utilities
                getFileByKey
            }}
        >
            {children}
        </FileContext.Provider>
    );
};
