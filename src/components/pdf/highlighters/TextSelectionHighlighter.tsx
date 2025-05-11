import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useEditContext } from '../../../contexts/EditContext';
import { ManualHighlightProcessor } from '../../../managers/ManualHighlightProcessor';
import { PDFPageViewport, ViewportSize, HighlightCreationMode } from '../../../types/pdfTypes';

interface TextSelectionHighlighterProps {
    pageNumber: number;
    viewport: PDFPageViewport;
    isEditingMode: boolean;
    pageSize: ViewportSize;
    fileKey?: string;
    isActive: boolean; // Whether text selection mode is active
}

const TextSelectionHighlighter: React.FC<TextSelectionHighlighterProps> = ({
                                                                               pageNumber,
                                                                               viewport,
                                                                               isEditingMode,
                                                                               pageSize,
                                                                               fileKey,
                                                                               isActive
                                                                           }) => {
    const { manualColor } = useEditContext();

    // State to track if we're currently processing a selection
    const [isProcessingSelection, setIsProcessingSelection] = useState(false);
    const selectionTimeoutRef = useRef<number | null>(null);

    // Reference to track which text layer we've modified
    const modifiedTextLayerRef = useRef<HTMLElement | null>(null);

    // Container for holding all highlight preview elements
    const highlightContainerRef = useRef<HTMLDivElement | null>(null);

    // Initialize the highlight container that will hold all selection preview spans
    useEffect(() => {
        if (isActive && isEditingMode) {
            // Find the page container
            let pageContainer;
            const selectors = [
                `.pdf-page-wrapper[data-page-number="${pageNumber}"][data-file="${fileKey || '_default'}"]`,
                `.pdf-page-wrapper[data-page-number="${pageNumber}"][data-file-key="${fileKey || '_default'}"]`,
                `[data-file-key="${fileKey || '_default'}"] [data-page-number="${pageNumber}"]`,
                `[data-page-number="${pageNumber}"]`
            ];

            for (const selector of selectors) {
                const container = document.querySelector(selector);
                if (container) {
                    pageContainer = container;
                    break;
                }
            }

            if (pageContainer) {
                // Remove existing container if present
                if (highlightContainerRef.current) {
                    highlightContainerRef.current.remove();
                    highlightContainerRef.current = null;
                }

                // Create new highlight container
                const container = document.createElement('div');
                container.className = 'text-selection-highlight-container';
                container.style.position = 'absolute';
                container.style.top = '0';
                container.style.left = '0';
                container.style.right = '0';
                container.style.bottom = '0';
                container.style.pointerEvents = 'none';
                container.style.zIndex = '999';
                container.style.overflow = 'visible';

                pageContainer.appendChild(container);
                highlightContainerRef.current = container;

                // Add data attribute for debugging
                container.setAttribute('data-page', pageNumber.toString());
                container.setAttribute('data-file', fileKey || '_default');
            }
        }

        return () => {
            // Clean up the container on unmount
            if (highlightContainerRef.current) {
                highlightContainerRef.current.remove();
                highlightContainerRef.current = null;
            }
        };
    }, [isActive, isEditingMode, pageNumber, fileKey]);

    // When text selection mode is activated, enable text selection on the page
    useEffect(() => {
        const cleanup = () => {
            if (modifiedTextLayerRef.current) {
                modifiedTextLayerRef.current.classList.remove('text-selection-enabled');
                modifiedTextLayerRef.current.style.pointerEvents = 'none';
                modifiedTextLayerRef.current.style.userSelect = 'none';
                modifiedTextLayerRef.current = null;
            }
        };

        if (isActive && isEditingMode) {
            // Find the text layer for this page
            let pageContainer;
            let textLayer;

            // Try several selector strategies
            const selectors = [
                `.pdf-page-wrapper[data-page-number="${pageNumber}"][data-file="${fileKey || '_default'}"]`,
                `.pdf-page-wrapper[data-page-number="${pageNumber}"][data-file-key="${fileKey || '_default'}"]`,
                `[data-file-key="${fileKey || '_default'}"] [data-page-number="${pageNumber}"]`,
                `[data-page-number="${pageNumber}"]`
            ];

            for (const selector of selectors) {
                pageContainer = document.querySelector(selector);
                if (pageContainer) {
                    textLayer = pageContainer.querySelector('.react-pdf__Page__textContent');
                    if (textLayer instanceof HTMLElement) break;
                }
            }

            if (textLayer instanceof HTMLElement) {
                cleanup();

                // Save reference to this text layer
                modifiedTextLayerRef.current = textLayer;

                // Enable text selection
                textLayer.style.pointerEvents = 'auto';
                textLayer.style.userSelect = 'text';

                // Set page indicator if container found
                if (pageContainer && pageContainer.classList.contains('pdf-page-wrapper')) {
                    pageContainer.classList.add('text-selection-mode');
                    pageContainer.setAttribute('data-mode-hint', 'Text Selection Mode');
                }
            }
        } else {
            cleanup();

            // Remove page indicator
            const pageContainer = document.querySelector(
                `.pdf-page-wrapper[data-page-number="${pageNumber}"][data-file="${fileKey || '_default'}"]`
            );

            if (pageContainer) {
                pageContainer.classList.remove('text-selection-mode');
                pageContainer.removeAttribute('data-mode-hint');
            }
        }

        return cleanup;
    }, [isActive, isEditingMode, pageNumber, fileKey]);

    // Create selection highlight spans for each text selection rectangle
    const createHighlightSpans = useCallback((range: Range, pageRect: DOMRect) => {
        if (!highlightContainerRef.current) return;

        // Clear existing highlights
        highlightContainerRef.current.innerHTML = '';

        // Get all client rects from the selection range
        const rects = range.getClientRects();
        if (!rects || rects.length === 0) return;

        // Create individual highlight spans for each rectangle
        for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];

            // Skip very small rects (typically representing whitespace)
            if (rect.width < 1 || rect.height < 1) continue;

            const offsetX = 0; // Adjust this value to move horizontally (positive = right, negative = left)
            const offsetY = -2; // Adjust this value to move vertically (positive = down, negative = up)

            const relativeX = rect.left - pageRect.left + offsetX;
            const relativeY = rect.top - pageRect.top + offsetY;

            // Create highlight span
            const highlight = document.createElement('span');
            highlight.className = 'text-selection-highlight-span';
            highlight.style.position = 'absolute';
            highlight.style.left = `${relativeX}px`;
            highlight.style.top = `${relativeY}px`;
            highlight.style.width = `${rect.width}px`;
            highlight.style.height = `${rect.height}px`;
            highlight.style.backgroundColor = `${manualColor}4D`; // 30% opacity
            highlight.style.border = `1px solid ${manualColor}99`; // 60% opacity
            highlight.style.pointerEvents = 'none';
            highlight.style.borderRadius = '1px';
            highlight.style.transition = 'all 0.05s ease';
            highlight.style.zIndex = '1000';

            highlightContainerRef.current.appendChild(highlight);
        }
    }, [manualColor]);

    // Track selection changes to show highlight spans
    useEffect(() => {
        if (!isActive || !isEditingMode || !highlightContainerRef.current) return;

        const handleSelectionChange = () => {
            // Clear existing highlight spans if container exists
            if (highlightContainerRef.current) {
                highlightContainerRef.current.innerHTML = '';
            }

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
                return;
            }

            // Find the page container to get its position
            let pageContainer;
            const selectors = [
                `.pdf-page-wrapper[data-page-number="${pageNumber}"][data-file="${fileKey || '_default'}"]`,
                `.pdf-page-wrapper[data-page-number="${pageNumber}"][data-file-key="${fileKey || '_default'}"]`,
                `[data-file-key="${fileKey || '_default'}"] [data-page-number="${pageNumber}"]`,
                `[data-page-number="${pageNumber}"]`
            ];

            for (const selector of selectors) {
                const container = document.querySelector(selector);
                if (container) {
                    pageContainer = container;
                    break;
                }
            }

            if (!pageContainer) return;

            // Get the range from the selection
            const range = selection.getRangeAt(0);

            // Make sure the selection is within our page
            const commonAncestor = range.commonAncestorContainer;
            if (!pageContainer.contains(commonAncestor)) {
                return;
            }

            // Get page position
            const pageRect = pageContainer.getBoundingClientRect();

            // Create highlight spans for this selection
            createHighlightSpans(range, pageRect);
        };

        // Update on selection change
        document.addEventListener('selectionchange', handleSelectionChange);

        // Also update on mouseup to catch the final selection
        const handleMouseUp = () => {
            // Small delay to ensure selection is complete
            setTimeout(handleSelectionChange, 0);
        };

        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isActive, isEditingMode, pageNumber, fileKey, createHighlightSpans]);

    // Safely trim trailing whitespace while preserving selection boundaries
    const getCleanRects = (rects: DOMRectList, range: Range, pageRect: DOMRect) => {
        // Clone the range to work with (so we don't modify the original selection)
        const rangeClone = range.cloneRange();
        const originalText = rangeClone.toString();

        // Skip processing for very short selections (likely no trailing spaces)
        if (originalText.length <= 3) {
            return Array.from(rects);
        }

        // For longer text, process the selection more carefully
        let lineRects = Array.from(rects);

        // Sort rectangles by vertical position (top to bottom)
        lineRects.sort((a, b) => a.top - b.top);

        // Group rectangles by line based on Y-coordinate proximity
        const lineGroups = [];
        let currentGroup = [lineRects[0]];
        let currentY = lineRects[0].top;
        const lineGroupTolerance = 5; // Tolerance for considering rects as part of the same line

        for (let i = 1; i < lineRects.length; i++) {
            const rect = lineRects[i];

            // If this rect is close to the current Y position, add to current group
            if (Math.abs(rect.top - currentY) <= lineGroupTolerance) {
                currentGroup.push(rect);
            } else {
                // Otherwise start a new group
                lineGroups.push(currentGroup);
                currentGroup = [rect];
                currentY = rect.top;
            }
        }

        // Add the last group
        lineGroups.push(currentGroup);

        // Process each line group to handle trailing spaces
        const processedRects: DOMRect[] = [];

        lineGroups.forEach((group) => {
            // Sort rects in the group by horizontal position (left to right)
            group.sort((a, b) => a.left - b.left);

            // For each group (line), check if there's a trailing space rect
            if (group.length > 1) {
                const lastRect = group[group.length - 1];
                const secondLastRect = group[group.length - 2];

                // Analyze the last rectangle - if it's very narrow and isolated, it might be a space
                const isTrailingSpace =
                    lastRect.width < 5 && // Very narrow rect
                    (lastRect.left - (secondLastRect.left + secondLastRect.width) > 1); // Separated from previous text

                if (isTrailingSpace) {
                    // Remove the trailing space rect by taking all except the last one
                    processedRects.push(...group.slice(0, -1));
                } else {
                    // If no trailing space detected, use all rects
                    processedRects.push(...group);
                }
            } else {
                // If there's only one rect in this line, keep it
                processedRects.push(...group);
            }
        });

        return processedRects;
    };

    const processTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const selectedText = selection.toString().trim();
        if (!selectedText) return;

        const range = selection.getRangeAt(0);

        // Find the page container - Make sure we use file-specific selector
        const safeFileKey = fileKey || '_default';

        // Try different selector strategies to ensure we find the right page
        let pageContainer;

        const selectors = [
            `.pdf-page-wrapper[data-page-number="${pageNumber}"][data-file="${safeFileKey}"]`,
            `.pdf-page-wrapper[data-page-number="${pageNumber}"][data-file-key="${safeFileKey}"]`,
            `[data-file-key="${safeFileKey}"] [data-page-number="${pageNumber}"]`,
            `[data-page-number="${pageNumber}"]`
        ];

        for (const selector of selectors) {
            const container = document.querySelector(selector);
            if (container) {
                pageContainer = container;
                break;
            }
        }

        if (!pageContainer) {
            console.warn(`[TextSelectionHighlighter] Could not find page container for page ${pageNumber} of file ${safeFileKey}`);
            return;
        }

        // Check if selection is within our page
        if (!pageContainer.contains(range.commonAncestorContainer)) {
            console.warn(`[TextSelectionHighlighter] Selection not within page ${pageNumber} of file ${safeFileKey}`);
            return;
        }

        // Calculate the bounding rectangle of the selection
        const rects = range.getClientRects();
        if (rects.length === 0) return;

        // Get the page position
        const pageRect = pageContainer.getBoundingClientRect();

        // Get clean rectangles with trailing spaces handled
        const cleanRects = getCleanRects(rects, range, pageRect);

        // Detect if this is a multi-line selection by checking if we have multiple rects
        // with significantly different y-coordinates
        const isMultiLine = cleanRects.length > 1;

        // Line group tolerance - group rects that are within this Y distance as same line
        const lineGroupTolerance = 5;

        // If it's a multi-line selection, create a highlight for each line
        if (isMultiLine) {
            // Sort rectangles by vertical position (top to bottom)
            cleanRects.sort((a, b) => a.top - b.top);

            // Group rectangles by line based on Y-coordinate proximity
            const lineGroups = [];
            let currentGroup = [cleanRects[0]];
            let currentY = cleanRects[0].top;

            for (let i = 1; i < cleanRects.length; i++) {
                const rect = cleanRects[i];

                // If this rect is close to the current Y position, add to current group
                if (Math.abs(rect.top - currentY) <= lineGroupTolerance) {
                    currentGroup.push(rect);
                } else {
                    // Otherwise start a new group
                    lineGroups.push(currentGroup);
                    currentGroup = [rect];
                    currentY = rect.top;
                }
            }

            // Add the last group
            lineGroups.push(currentGroup);

            // Process each line group and create a highlight for it
            const highlightPromises = lineGroups.map(async (group, index) => {
                // Calculate bounds for this line group
                let lineMinX = Infinity, lineMinY = Infinity;
                let lineMaxX = -Infinity, lineMaxY = -Infinity;

                group.forEach(rect => {
                    // Get coordinates relative to the page
                    const relativeX = rect.left - pageRect.left;
                    const relativeY = rect.top - pageRect.top;
                    const relativeRight = relativeX + rect.width;
                    const relativeBottom = relativeY + rect.height;

                    // Update line bounds
                    lineMinX = Math.min(lineMinX, relativeX);
                    lineMinY = Math.min(lineMinY, relativeY);
                    lineMaxX = Math.max(lineMaxX, relativeRight);
                    lineMaxY = Math.max(lineMaxY, relativeBottom);
                });

                // Apply coordinate correction
                const correctionX = -6;
                const correctionY = -6;

                lineMinX += correctionX;
                lineMinY += correctionY;
                lineMaxX += correctionX;
                lineMaxY += correctionY;

                // Apply padding for better visual appearance
                const horizontalPadding = 4;
                const verticalPadding = 2;

                lineMinX = Math.max(0, lineMinX - horizontalPadding);
                lineMinY = Math.max(0, lineMinY - verticalPadding);
                lineMaxX = Math.min(pageSize.cssWidth, lineMaxX);
                lineMaxY = Math.min(pageSize.cssHeight, lineMaxY + verticalPadding);

                // Account for current zoom level
                const zoomFactor = viewport.scale || 1;

                // Convert coordinates to unzoomed values
                const unzoomedMinX = lineMinX / zoomFactor;
                const unzoomedMinY = lineMinY / zoomFactor;
                const unzoomedMaxX = lineMaxX / zoomFactor;
                const unzoomedMaxY = lineMaxY / zoomFactor;

                // Extract just this line's text content if possible
                let lineText = "";
                try {
                    // Create a range for just this line to extract its text
                    const lineRange = new Range();
                    const startNode = document.caretRangeFromPoint(
                        group[0].left,
                        group[0].top + (group[0].height / 2)
                    )?.startContainer;

                    const endNode = document.caretRangeFromPoint(
                        group[group.length - 1].right - 1,
                        group[group.length - 1].top + (group[group.length - 1].height / 2)
                    )?.endContainer;

                    if (startNode && endNode) {
                        lineRange.setStart(startNode, 0);
                        lineRange.setEnd(endNode, endNode.textContent?.length || 0);
                        lineText = lineRange.toString().trim();
                    }
                } catch (e) {
                    // Fallback if text extraction fails
                    lineText = `${selectedText} (line ${index + 1})`;
                }

                // If we couldn't extract text properly, use the fallback
                if (!lineText) {
                    lineText = `${selectedText} (line ${index + 1})`;
                }

                // Create the highlight for this line
                return ManualHighlightProcessor.createRectangleHighlight(
                    fileKey || '_default',
                    pageNumber,
                    unzoomedMinX,
                    unzoomedMinY,
                    unzoomedMaxX,
                    unzoomedMaxY,
                    manualColor,
                    lineText,
                    HighlightCreationMode.TEXT_SELECTION
                );
            });

            // Wait for all highlights to be created
            Promise.all(highlightPromises).then(highlights => {
                // Clear the selection after creating all highlights
                selection.removeAllRanges();

                // Clear highlight spans
                if (highlightContainerRef.current) {
                    highlightContainerRef.current.innerHTML = '';
                }
            }).catch(error => {
                console.error('Error creating line highlights:', error);
            });

        } else {
            // For single-line text, process normally but still trim any trailing spaces
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            cleanRects.forEach(rect => {
                // Get coordinates relative to the page
                const relativeX = rect.left - pageRect.left;
                const relativeY = rect.top - pageRect.top;
                const relativeRight = relativeX + rect.width;
                const relativeBottom = relativeY + rect.height;

                // Update overall bounding box
                minX = Math.min(minX, relativeX);
                minY = Math.min(minY, relativeY);
                maxX = Math.max(maxX, relativeRight);
                maxY = Math.max(maxY, relativeBottom);
            });

            // Apply coordinate correction
            const correctionX = -2;
            const correctionY = -6;

            minX += correctionX;
            minY += correctionY;
            maxX += correctionX;
            maxY += correctionY;

            // Apply padding
            const horizontalPadding = 2;
            const verticalPadding = 4;

            minX = Math.max(0, minX - horizontalPadding);
            minY = Math.max(0, minY );
            maxX = Math.min(pageSize.cssWidth, maxX + horizontalPadding );
            maxY = Math.min(pageSize.cssHeight, maxY + verticalPadding);

            // Account for current zoom level
            const zoomFactor = viewport.scale || 1;

            // Convert coordinates to unzoomed values
            const unzoomedMinX = minX / zoomFactor;
            const unzoomedMinY = minY / zoomFactor;
            const unzoomedMaxX = maxX / zoomFactor;
            const unzoomedMaxY = maxY / zoomFactor;

            // Create the highlight for this single line
            ManualHighlightProcessor.createRectangleHighlight(
                fileKey || '_default',
                pageNumber,
                unzoomedMinX,
                unzoomedMinY,
                unzoomedMaxX,
                unzoomedMaxY,
                manualColor,
                selectedText.trim(), // Make sure to trim the text
                HighlightCreationMode.TEXT_SELECTION
            ).then(highlight => {
                if (highlight) {
                    // Clear selection after creating highlight
                    selection.removeAllRanges();

                    // Clear highlight spans
                    if (highlightContainerRef.current) {
                        highlightContainerRef.current.innerHTML = '';
                    }
                }
            });
        }

    }, [isActive, isEditingMode, pageNumber, fileKey, viewport, pageSize, manualColor]);

    // Set up listeners for text selection with anti-flickering protection
    useEffect(() => {
        if (!isActive || !isEditingMode) return;

        // Handler for when mouse button is released (selection is complete)
        const handleMouseUp = (e: MouseEvent) => {
            // Clear any existing timeout
            if (selectionTimeoutRef.current) {
                clearTimeout(selectionTimeoutRef.current);
            }

            // If we're already processing a selection, don't start another one
            if (isProcessingSelection) return;

            // Set a short timeout to stabilize the selection before processing
            selectionTimeoutRef.current = window.setTimeout(() => {
                setIsProcessingSelection(true);

                try {
                    processTextSelection();
                } finally {
                    // Always reset the processing flag
                    setTimeout(() => {
                        setIsProcessingSelection(false);
                    }, 50);
                }
            }, 10); // Very short delay to ensure selection is complete
        };

        // Handler for mousedown to prevent processing during selection
        const handleMouseDown = () => {
            // Clear any existing timeout
            if (selectionTimeoutRef.current) {
                clearTimeout(selectionTimeoutRef.current);
                selectionTimeoutRef.current = null;
            }

            // Cancel any in-progress processing
            setIsProcessingSelection(false);
        };

        // Now add both event listeners
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mousedown', handleMouseDown);

        // Cleanup
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mousedown', handleMouseDown);

            if (selectionTimeoutRef.current) {
                clearTimeout(selectionTimeoutRef.current);
            }
        };
    }, [isActive, isEditingMode, isProcessingSelection, processTextSelection]);

    // This component doesn't render anything visible
    return null;
};

export default TextSelectionHighlighter;
