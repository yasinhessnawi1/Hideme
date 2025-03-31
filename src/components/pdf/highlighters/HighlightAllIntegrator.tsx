// src/components/pdf/highlighters/HighlightAllIntegrator.tsx
import React, { useEffect, useCallback } from 'react';
import { useHighlightContext, HighlightType } from '../../../contexts/HighlightContext';
import { usePDFViewerContext, getFileKey } from '../../../contexts/PDFViewerContext';
import { useFileContext } from '../../../contexts/FileContext';
import highlightAllSameUtility from '../../../utils/HighlightAllSame';

/**
 * This component doesn't render anything visible but serves as an integration
 * point between the PDF viewer, highlight context, and highlight-all-same utility.
 * It listens for events and coordinates actions between these systems.
 */
const HighlightAllIntegrator: React.FC = () => {
    const { addAnnotation } = useHighlightContext();
    const { currentFile } = useFileContext();

    // Handler for the add-highlights-batch event
    const handleAddHighlightsBatch = useCallback((event: Event) => {
        const customEvent = event as CustomEvent;
        const { highlights, fileKey, text, source } = customEvent.detail || {};

        if (!highlights || !Array.isArray(highlights) || highlights.length === 0) {
            return;
        }

        console.log(`[HighlightAllIntegrator] Adding ${highlights.length} highlights for "${text}" in file ${fileKey}`);

        // Add each highlight to the context
        highlights.forEach(highlight => {
            addAnnotation(highlight.page, highlight, fileKey);
        });

        // Let the user know what happened
        const message = `Added ${highlights.length} highlights for "${text}"`;

        // You can use a toast notification library here if you have one
        // For now, we'll use a simple alert
        // In a production app, you might want to use a more elegant notification
        alert(message);

    }, [addAnnotation]);

    // Register PDF document with the utility when it becomes available
    useEffect(() => {
        if (!currentFile) return;

        const fileKey = getFileKey(currentFile);

        // Function to register the PDF document
        const registerPdfDocument = async () => {
            try {

                if (currentFile) {
                    // Register the document with our utility
                    highlightAllSameUtility.registerPdfDocument(fileKey,currentFile);
                }
            } catch (error) {
                console.error('[HighlightAllIntegrator] Error registering PDF document:', error);
            }
        };

        // Try to register the document
        registerPdfDocument();

        // Cleanup function
        return () => {
            highlightAllSameUtility.unregisterPdfDocument(fileKey);
        };
    }, [currentFile]);

    // Listen for the add-highlights-batch event
    useEffect(() => {
        window.addEventListener('add-highlights-batch', handleAddHighlightsBatch);

        return () => {
            window.removeEventListener('add-highlights-batch', handleAddHighlightsBatch);
        };
    }, [handleAddHighlightsBatch]);

    // This component doesn't render anything
    return null;
};

export default HighlightAllIntegrator;
