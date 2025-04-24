import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useFileContext } from '../../contexts/FileContext';
import { getFileKey, usePDFViewerContext } from '../../contexts/PDFViewerContext';
import PDFDocumentWrapper from './PDFDocumentWrapper';
import scrollManager from '../../services/ScrollManagerService';

/**
 * Virtual item renderer for PDF files
 */
interface FileItemData {
    files: File[];
    currentFile: File | null;
    onSelect: (file: File) => void;
    onRemove: (file: File, e: React.MouseEvent) => void;
}

/**
 * Component that renders a virtualized list of PDF files
 */
const MultiPDFRenderer: React.FC = () => {
    const {
        activeFiles,
        currentFile,
        setCurrentFile,
        files,
        removeFile
    } = useFileContext();

    const {
        mainContainerRef,
        getFileNumPages
    } = usePDFViewerContext();

    // State for window dimensions
    const [dimensions, setDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });

    // Refs for tracking file operations
    const fileChangeInProgressRef = useRef<boolean>(false);
    const listRef = useRef<List | null>(null);

    // Calculate estimated file heights for virtualization
    const fileHeights = useMemo(() => {
        return activeFiles.map(file => {
            // Get number of pages in this file
            const fileKey = getFileKey(file);
            const numPages = getFileNumPages(fileKey) || 1;

            // Use a base height plus height per page
            const baseHeight = 100; // Header, margins, etc.
            const pageHeight = 800; // Average page height

            return baseHeight + (numPages * pageHeight);
        });
    }, [activeFiles, getFileNumPages]);

    // Total height of all files
    const totalHeight = useMemo(() => {
        return fileHeights.reduce((sum, height) => sum + height, 0);
    }, [fileHeights]);

    // Function to find file index by key
    const getFileIndex = useCallback((file: File) => {
        return files.findIndex(f =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );
    }, [files]);

    // Handle file selection with throttling
    const handleFileSelection = useCallback((file: File) => {
        // Don't reselect the same file
        if (currentFile === file) return;

        // Skip if a file change is already in progress
        if (fileChangeInProgressRef.current) return;

        try {
            // Mark that a file change is in progress
            fileChangeInProgressRef.current = true;
            scrollManager.setFileChanging(true);

            console.log(`[VirtualizedPDFRenderer] Switching to file: ${file.name} (${getFileKey(file)})`);

            // Get current scroll position before changing file
            const currentScrollPosition = mainContainerRef.current?.scrollTop ?? 0;

            // Store current file's scroll position
            if (currentFile) {
                const currentFileKey = getFileKey(currentFile);
                scrollManager.saveScrollPosition(currentFileKey, currentScrollPosition);
            }

            // Set new current file
            setCurrentFile(file);

            // After switching files, try to restore the saved position
            const fileKey = getFileKey(file);
            const savedPosition = scrollManager.getSavedScrollPosition(fileKey);

            // Restore scroll position after a delay
            setTimeout(() => {
                if (mainContainerRef.current) {
                    const positionToRestore = savedPosition ?? currentScrollPosition;

                    if (typeof positionToRestore === "number") {
                        mainContainerRef.current.scrollTop = positionToRestore;
                    }

                    console.log(`[VirtualizedPDFRenderer] Restored scroll position: ${positionToRestore} for file ${fileKey}`);
                }

                // Reset flags
                scrollManager.setFileChanging(false);

                setTimeout(() => {
                    fileChangeInProgressRef.current = false;
                }, 300);
            }, 50);
        } catch (error) {
            console.error("[MultiPDFRenderer] Error selecting file:", error);

            // Reset flags in case of error
            fileChangeInProgressRef.current = false;
            scrollManager.setFileChanging(false);
        }
    }, [currentFile, setCurrentFile, mainContainerRef]);

    // Handle file removal
    const handleRemoveFile = useCallback((file: File, e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            const index = getFileIndex(file);
            if (index !== -1) {
                // Get fileKey before removing
                const fileKey = getFileKey(file);

                // Remove file
                removeFile(index);

                // Dispatch event to notify all components
                window.dispatchEvent(new CustomEvent('file-removed', {
                    detail: {
                        fileKey,
                        fileName: file.name,
                        timestamp: Date.now()
                    }
                }));
            }
        } catch (error) {
            console.error("[MultiPDFRenderer] Error removing file:", error);
        }
    }, [getFileIndex, removeFile]);

    // Prepare data for the virtualized list
    const itemData: FileItemData = useMemo(() => ({
        files: activeFiles,
        currentFile,
        onSelect: handleFileSelection,
        onRemove: handleRemoveFile
    }), [activeFiles, currentFile, handleFileSelection, handleRemoveFile]);

    // Render a file item in the virtualized list
    const FileItem = useCallback(({ index, style, data }: any) => {
        const { files, currentFile, onSelect, onRemove } = data as FileItemData;
        const file = files[index];
        const fileKey = getFileKey(file);
        const isCurrentFile = currentFile === file;

        return (
            <div
                style={style}
                className="virtual-file-container"
                data-file-index={index}
            >
                <div
                    className={`pdf-file-container ${isCurrentFile ? 'current' : ''}`}
                    onClick={() => onSelect(file)}
                    data-file-key={fileKey}
                    data-file-name={file.name}
                >
                    <div className="pdf-file-header">
                        <h3 className="pdf-file-title">{file.name}</h3>
                        <div className="pdf-file-actions">
                            <button
                                className="pdf-file-action-button"
                                onClick={(e) => onRemove(file, e)}
                                title="Remove file"
                            >
                                <span>✕</span>
                            </button>
                        </div>
                    </div>

                    <PDFDocumentWrapper file={file} fileKey={fileKey} />
                </div>
            </div>
        );
    }, []);

    // Update dimensions on window resize
    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Initialize observers after render
    useEffect(() => {
        // Wait for DOM to stabilize
        const timeoutId = setTimeout(() => {
            // Refresh intersection observers
            scrollManager.refreshObservers();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [activeFiles]);

    // If no active files, show message
    if (activeFiles.length === 0) {
        return (
            <div className="no-files-message">
                <p>No PDF files loaded. Please upload some files.</p>
            </div>
        );
    }

    // Calculate container dimensions
    const containerWidth = mainContainerRef.current?.clientWidth || dimensions.width;
    const containerHeight = mainContainerRef.current?.clientHeight || dimensions.height;

    return (
        <div className="multi-pdf-container">
            {/*
        We're not using react-window's VariableSizeList here because we would
        need a more complex implementation to handle dynamic PDF heights.
        Instead, we render the PDFs directly for better control.
      */}
            {activeFiles.map((file) => {
                const isCurrentFileMatch = currentFile === file;
                const fileKey = getFileKey(file);

                return (
                    <div
                        key={fileKey}
                        className="pdf-file-wrapper"
                    >
                        <div
                            className={`pdf-file-container ${isCurrentFileMatch ? 'current' : ''}`}
                            onClick={() => handleFileSelection(file)}
                            data-file-key={fileKey}
                            data-file-name={file.name}
                        >
                            <div className="pdf-file-header">
                                <h3 className="pdf-file-title">{file.name}</h3>
                                <div className="pdf-file-actions">
                                    <button
                                        className="pdf-file-action-button"
                                        onClick={(e) => handleRemoveFile(file, e)}
                                        title="Remove file"
                                    >
                                        <span>✕</span>
                                    </button>
                                </div>
                            </div>

                            <PDFDocumentWrapper file={file} fileKey={fileKey} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MultiPDFRenderer;
