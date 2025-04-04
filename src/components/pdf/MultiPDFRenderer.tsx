import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import {useFileContext} from '../../contexts/FileContext';
import {getFileKey, usePDFViewerContext} from '../../contexts/PDFViewerContext';
import {useHighlightContext} from '../../contexts/HighlightContext';
import PDFDocumentWrapper from './PDFDocumentWrapper';
import MultiFileUploader from './pdf_component/MultiFileUploader';
import {X} from 'lucide-react';
import '../../styles/modules/pdf/PdfViewer.css';
import scrollingService from '../../services/UnifiedScrollingService';

// Wrapper component for PDF file container that only re-renders when necessary
const PDFFileContainer = memo(({
                                   file,
                                   isCurrentFile,
                                   onSelect,
                                   onRemove
                               }: {
    file: File,
    isCurrentFile: boolean,
    onSelect: () => void,
    onRemove: (e: React.MouseEvent) => void
}) => {
    const fileKey = getFileKey(file);

    return (
        <div
            className={`pdf-file-container ${isCurrentFile ? 'current' : ''}`}
            onClick={onSelect}
            data-file-key={fileKey}
            data-file-name={file.name}
        >
            <div className="pdf-file-header">
                <h3 className="pdf-file-title">{file.name}</h3>
                <div className="pdf-file-actions">
                    <button
                        className="pdf-file-action-button"
                        onClick={onRemove}
                        title="Remove file"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <PDFDocumentWrapper file={file} fileKey={fileKey} />
        </div>
    );
}, (prevProps, nextProps) => {
    // Only re-render when current status changes or file changes
    return (
        prevProps.file === nextProps.file &&
        prevProps.isCurrentFile === nextProps.isCurrentFile
    );
});

const MultiPDFRenderer: React.FC = () => {
    // Hooks from contexts
    const {
        activeFiles,
        currentFile,
        setCurrentFile,
        files,
        removeFile
    } = useFileContext();
    const { clearAnnotations } = useHighlightContext();
    const { mainContainerRef } = usePDFViewerContext();
    const { resetProcessedEntityPages } = useHighlightContext();

    // State
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // All refs defined together
    const skipEntityResetRef = useRef<boolean>(false);
    const lastFileChangeTimeRef = useRef<number>(0);
    const fileChangeInProgressRef = useRef<boolean>(false);
    const scrollResetTimeoutRef = useRef<any>(null);

    // Function to find file index in the files array - defined consistently
    const getFileIndex = useCallback((file: File) => {
        return files.findIndex(f =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );
    }, [files]);

    // Throttled file selection handler - defined consistently
    const handleFileSelection = useCallback((file: File) => {
        // Don't reselect the same file
        if (currentFile === file) return;

        // Skip if a file change is already in progress
        if (fileChangeInProgressRef.current) return;

        // Implement throttling for file changes
        // Update throttling timestamp
        lastFileChangeTimeRef.current = Date.now();

        try {
            // Mark that a file change is in progress
            fileChangeInProgressRef.current = true;
            skipEntityResetRef.current = true;

            console.log(`[MultiPDFRenderer] Switching to file: ${file.name} (${getFileKey(file)})`);

            // Get current scroll position before changing file
            const currentScrollPosition = mainContainerRef.current?.scrollTop ?? 0;

            // Store current file's scroll position
            if (currentFile) {
                const currentFileKey = getFileKey(currentFile);
                scrollingService.saveScrollPosition(currentFileKey, currentScrollPosition);
            }

            // Mark that we're triggering a programmatic file change
            scrollingService.setFileChangeScroll(true);

            // Set new current file
            setCurrentFile(file);

            // After switching files, try to restore the saved position
            const fileKey = getFileKey(file);
            const savedPosition = scrollingService.getSavedScrollPosition(fileKey);

            // Restore scroll position after a delay to allow rendering to complete
            setTimeout(() => {
                if (mainContainerRef.current) {
                    const positionToRestore = savedPosition ?? undefined
                        ? savedPosition
                        : currentScrollPosition;

                    if (typeof positionToRestore === "number") {
                        mainContainerRef.current.scrollTop = positionToRestore;
                    }
                    console.log(`[MultiPDFRenderer] Restored scroll position: ${positionToRestore} for file ${fileKey}`);
                }

                // Mark that we're no longer in a file change
                scrollingService.setFileChangeScroll(false);

                // Reset flags after a longer delay
                setTimeout(() => {
                    fileChangeInProgressRef.current = false;
                    skipEntityResetRef.current = false;
                }, 500);
            }, 50);
        } catch (error) {
            console.error("[MultiPDFRenderer] Error selecting file:", error);
            setLoadError("Error selecting file. Please try again.");

            // Reset flags in case of error
            fileChangeInProgressRef.current = false;
            skipEntityResetRef.current = false;
        }
    }, [currentFile, setCurrentFile, mainContainerRef.current]);

    // Handler for removing a file - defined consistently
    const handleRemoveFile = useCallback((file: File, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const index = getFileIndex(file);
            if (index !== -1) {
                removeFile(index, clearAnnotations);
            }
        } catch (error) {
            console.error("[MultiPDFRenderer] Error removing file:", error);
        }
    }, [getFileIndex, removeFile, clearAnnotations]);

    // Save scroll positions when they change
    useEffect(() => {
        if (!mainContainerRef.current) return;

        const handleScroll = () => {
            // Skip if we're in a programmatic scroll
            if (scrollingService.isCurrentlyScrolling() ||
                scrollingService.isFileChangeScrollActive()) {
                return;
            }

            // During scrolling, prevent entity resets
            skipEntityResetRef.current = true;

            // If we have a current file, save its position
            if (currentFile) {
                const fileKey = getFileKey(currentFile);
                const scrollTop = mainContainerRef.current?.scrollTop ?? 0;
                scrollingService.saveScrollPosition(fileKey, scrollTop);
            }

            // Clear the entity reset prevention after scrolling stops
            if (scrollResetTimeoutRef.current) {
                clearTimeout(scrollResetTimeoutRef.current);
            }

            scrollResetTimeoutRef.current = setTimeout(() => {
                skipEntityResetRef.current = false;
            }, 1000);
        };

        const container = mainContainerRef.current;
        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollResetTimeoutRef.current) {
                clearTimeout(scrollResetTimeoutRef.current);
            }
        };
    }, [mainContainerRef, currentFile]);

    // Track when files change
    useEffect(() => {
        console.log(`[MultiPDFRenderer] Rendering ${activeFiles.length} active PDF files`);

        setIsLoading(true);

        if (activeFiles.length > 0) {
            try {
                activeFiles.forEach(file => {
                    console.log(`[MultiPDFRenderer] Active file: ${file.name} (${getFileKey(file)})`);
                });
            } catch (error) {
                console.error("[MultiPDFRenderer] Error processing active files:", error);
                setLoadError("Error loading PDF files. Please try again.");
            }
        }

        if (currentFile) {
            console.log(`[MultiPDFRenderer] Current file: ${currentFile.name} (${getFileKey(currentFile)})`);
        }

        // Clear loading state after a small delay
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [activeFiles, currentFile]);

    // Reset processed entity pages when appropriate
    useEffect(() => {
        try {
            if (skipEntityResetRef.current || fileChangeInProgressRef.current) {
                console.log('[MultiPDFRenderer] Skipping entity reset during scroll/file change');
            } else {
                resetProcessedEntityPages();
            }
        } catch (error) {
            console.error("[MultiPDFRenderer] Error resetting processed entity pages:", error);
        }
    }, [activeFiles, resetProcessedEntityPages]);

    // If there's a load error, show it
    if (loadError) {
        return (
            <div className="pdf-error-container">
                <h3>Error Loading PDFs</h3>
                <p>{loadError}</p>
                <button
                    onClick={() => {
                        setLoadError(null);
                        window.location.reload();
                    }}
                    className="reload-button"
                >
                    Reload Application
                </button>
                <div className="fallback-uploader">
                    <MultiFileUploader mode="replace" buttonType="full" />
                </div>
            </div>
        );
    }

    // If no active files, show the uploader
    if (activeFiles.length === 0) {
        return <MultiFileUploader mode="replace" buttonType="full" />;
    }

    return (
        <div className="multi-pdf-container">
            {activeFiles.map((file) => {
                const isCurrentFileMatch = currentFile === file;

                return (
                    <PDFFileContainer
                        key={getFileKey(file)}
                        file={file}
                        isCurrentFile={isCurrentFileMatch}
                        onSelect={() => handleFileSelection(file)}
                        onRemove={(e) => handleRemoveFile(file, e)}
                    />
                );
            })}
        </div>
    );
};

export default MultiPDFRenderer;
