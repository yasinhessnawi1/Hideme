import React, { useRef, useEffect, useCallback } from 'react';
import { useFileContext } from '../../contexts/FileContext';
import PDFViewerContainer from './PDFViewerContainer';
import { Plus } from 'lucide-react';
import '../../styles/modules/pdf/PdfViewer.css';
import ProcessingStatus from "./pdf_component/ProcessingStatus";
import ScrollSync from './ScrollSync';
import ViewportNavigationIntegrator from './ViewportNavigationIntegrator'; // Import our new component
import { usePDFViewerContext } from '../../contexts/PDFViewerContext';
import scrollingService from '../../services/UnifiedScrollingService';

/**
 * PDFViewer is the main component for PDF rendering and interaction.
 * It has been refactored to use a more modular architecture with
 * separate concerns managed by dedicated components and hooks.
 */
const PDFViewer: React.FC = () => {
    const { addFiles, currentFile } = useFileContext();
    const { mainContainerRef } = usePDFViewerContext();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Reference to track if initial render has completed
    const initialRenderRef = useRef<boolean>(true);

    // Flag to disable scrolling during initial render
    const disableScrollRestorationRef = useRef<boolean>(true);

    // Timeout reference for cleanup
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleAddFilesClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);

            // Disable scroll restoration while adding files
            disableScrollRestorationRef.current = true;

            // Add the files
            addFiles(newFiles, false); // Don't replace existing files

            // Re-enable scroll restoration after files are processed
            setTimeout(() => {
                disableScrollRestorationRef.current = false;
            }, 1000);
        }
    }, [addFiles]);

    // Add class to the main container for scroll optimization
    useEffect(() => {
        if (mainContainerRef.current) {
            mainContainerRef.current.classList.add('optimized-scrolling');

            // Set scroll behavior to auto initially to prevent jumps
            mainContainerRef.current.style.scrollBehavior = 'auto';

            // Switch to smooth scrolling after initial render
            setTimeout(() => {
                if (mainContainerRef.current) {
                    mainContainerRef.current.style.scrollBehavior = 'smooth';
                }
            }, 1000);
        }

        // Clean up function
        return () => {
            if (mainContainerRef.current) {
                mainContainerRef.current.classList.remove('optimized-scrolling');
            }

            // Clear any pending timeouts
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [mainContainerRef]);

    // Handle scroll position restoration when current file changes
    useEffect(() => {
        // Skip during initial render
        if (initialRenderRef.current) {
            initialRenderRef.current = false;
            return;
        }

        // Skip if scroll restoration is disabled
        if (disableScrollRestorationRef.current) {
            return;
        }

        // If changing to a different file, try to restore saved scroll position
        if (currentFile && mainContainerRef.current) {
            const fileKey = getFileKey(currentFile);
            const savedPosition = scrollingService.getSavedScrollPosition(fileKey);

            // If there's a saved position, restore it
            if (savedPosition !== undefined) {
                console.log(`[PDFViewer] Restoring saved scroll position: ${savedPosition} for ${fileKey}`);

                // Mark that we're changing files to prevent scroll jumps
                scrollingService.setFileChangeScroll(true);

                // Clear any existing timeouts
                if (scrollTimeoutRef.current) {
                    clearTimeout(scrollTimeoutRef.current);
                }

                // Use a short delay to ensure rendering has completed
                scrollTimeoutRef.current = setTimeout(() => {
                    if (mainContainerRef.current) {
                        // Set scroll position
                        mainContainerRef.current.scrollTop = savedPosition;

                        // Reset the file change flag after a brief delay
                        setTimeout(() => {
                            scrollingService.setFileChangeScroll(false);
                        }, 100);
                    }
                }, 150);
            }
        }
    }, [currentFile, mainContainerRef]);

    // Helper to get file key - inlined for convenience
    const getFileKey = (file: File): string => {
        return `${file.name}-${file.lastModified}`;
    };

    return (
        <div className="pdf-viewer-container">
            {currentFile && (
                <>
                    <button
                        className="pdf-add-file-button"
                        onClick={handleAddFilesClick}
                        title="Add more files"
                    >
                        <Plus size={24} className="pdf-add-file-icon" />
                    </button>
                    <input
                        type="file"
                        accept="application/pdf"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        multiple
                    />
                </>
            )}
            <ProcessingStatus/>

            {/* Add ScrollSync component to coordinate scrolling */}
            <ScrollSync />

            {/* Add our new ViewportNavigationIntegrator */}
            <ViewportNavigationIntegrator />

            <PDFViewerContainer />
        </div>
    );
};

export default PDFViewer;
