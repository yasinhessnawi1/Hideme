// src/components/pdf/highlighters/HighlightContextMenu.tsx - Updated to use highlightUtils
import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Highlighter, X } from 'lucide-react';
import { useHighlightContext } from '../../../contexts/HighlightContext';
import { HighlightRect } from '../../../types/pdfTypes';
import { useViewportSize } from '../../../hooks/useViewportSize';
import '../../../styles/modules/pdf/HighlightContextMenu.css'
import highlightManager from "../../../utils/HighlightManager";
import {useBatchSearch} from "../../../contexts/SearchContext";
import {useFileContext} from "../../../contexts/FileContext";
import {getFileKey} from "../../../contexts/PDFViewerContext";
import {getFileHighlights} from "../../../utils/highlightUtils";

interface HighlightContextMenuProps {
    highlight: HighlightRect;
    onClose: () => void;
    wrapperRef?: React.RefObject<HTMLDivElement | null>;
    viewport?: any;
    zoomLevel?: number;
}

const HighlightContextMenu: React.FC<HighlightContextMenuProps> = ({
                                                                       highlight,
                                                                       onClose,
                                                                       wrapperRef = { current: null },
                                                                       viewport = null,
                                                                       zoomLevel = 1.0
                                                                   }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { removeAnnotation, findHighlightsByText } = useHighlightContext();
    const { batchSearch } = useBatchSearch();
    const { files, selectedFiles } = useFileContext();
    // Use the viewport size hook
    const { viewportSize } = useViewportSize(wrapperRef, viewport, zoomLevel);

    // Handle delete current highlight
    const handleDelete = () => {
        if (highlight?.id) {
            removeAnnotation(highlight.page, highlight.id, highlight.fileKey);
            onClose();
        }
    };

    const  handleDeleteAllSameText = async () => {
        // First, ensure we have a file key and text
        if (!highlight.fileKey) {
            console.warn("[HighlightContextMenu] Missing fileKey when trying to delete all same");
            onClose();
            return;
        }

        // Determine which text to delete
        let textToDelete = '';
        if (highlight.text) {
            textToDelete = highlight.text;
        } else if (highlight.entity && highlight.x !== undefined && highlight.y !== undefined) {
            // Find similar highlights at this position
            const similarHighlights = highlightManager.findHighlightsByPosition(
                highlight.page,
                highlight.x,
                highlight.y,
                highlight.w,
                highlight.h,
                10, // Position tolerance
                highlight.fileKey
            );

            // Use text from any similar highlight that has it
            const highlightWithText = similarHighlights.find(h => h.text);
            if (highlightWithText?.text) {
                textToDelete = highlightWithText.text;
            } else {
                // Fallback - just delete this specific highlight
                removeAnnotation(highlight.page, highlight.id, highlight.fileKey);
                alert("Could not determine text content to delete. Only removed this highlight.");
                onClose();
                return;
            }
        }

        if (!textToDelete) {
            alert("No text content found to delete.");
            onClose();
            return;
        }

        console.log(`[HighlightContextMenu] Deleting all highlights with text "${textToDelete}" in file ${highlight.fileKey}`);

        // STEP 1: First find all matching highlights for all file in selected files if its not empty otherwise all the files, merge all results in one highlights to delete
        const allFiles = selectedFiles.length > 0 ? selectedFiles : files;
        const highlightsToDelete: HighlightRect[] = [];
        allFiles.forEach(file => {
            const highlights = findHighlightsByText(textToDelete, getFileKey(file));
            highlightsToDelete.push(...highlights);
        });

        if (highlightsToDelete.length === 0) {
            alert(`No highlights found with text "${textToDelete}"`);
            onClose();
            return;
        }

        console.log(`[HighlightContextMenu] Found ${highlightsToDelete.length} highlights to delete`);

        // STEP 2: Track all affected pages
        const affectedPages = new Set<number>();

        // STEP 3: Delete highlights from the highlightManager and HighlightContext
        highlightsToDelete.forEach(h => {
            // Record affected pages
            if (h.page) {
                affectedPages.add(h.page);
            }

            // Remove from data store
             highlightManager.removeHighlightData(h.id);

            // Also remove from the HighlightContext directly
            if (h.page) {
                removeAnnotation(h.page, h.id, h.fileKey);
            }
        });

        // STEP 4: Dispatch multiple targeted events for each affected page
        affectedPages.forEach(page => {
            console.log(`[HighlightContextMenu] Dispatching page update event for page ${page}`);
            window.dispatchEvent(new CustomEvent('highlights-removed-from-page', {
                detail: {
                    fileKey: highlight.fileKey,
                    page,
                    text: textToDelete,
                    count: highlightsToDelete.length,
                    timestamp: Date.now()
                }
            }));
        });

        // STEP 5: Dispatch a specific event for this deletion operation
        window.dispatchEvent(new CustomEvent('highlights-removed-by-text', {
            detail: {
                text: textToDelete,
                fileKey: highlight.fileKey,
                count: highlightsToDelete.length,
                affectedPages: Array.from(affectedPages),
                timestamp: Date.now(),
                // This flag signals this is a direct UI update request
                forceUIUpdate: true
            }
        }));

        // STEP 6: Force a global refresh with minimal delay
        setTimeout(() => {
            console.log(`[HighlightContextMenu] Forcing global highlight refresh`);
            window.dispatchEvent(new CustomEvent('force-refresh-highlights', {
                detail: {
                    fileKey: highlight.fileKey,
                    timestamp: Date.now(),
                    forceUIUpdate: true
                }
            }));
        }, 50);

        // STEP 7: Also dispatch a general application state update event
        setTimeout(() => {
            console.log(`[HighlightContextMenu] Dispatching application state update`);
            window.dispatchEvent(new CustomEvent('application-state-changed', {
                detail: {
                    type: 'highlights-deleted',
                    fileKey: highlight.fileKey,
                    timestamp: Date.now()
                }
            }));
        }, 100);

        // Show success message
        alert(`Deleted ${highlightsToDelete.length} highlights with text "${textToDelete}"`);

        onClose();
    };

    // Handle highlight all instances of the same text
    const handleHighlightAllSame = () => {
        if (!highlight.text || !highlight.fileKey) {
            onClose();
            return;
        }

        console.log(`[HighlightContextMenu] Using batch search to highlight all occurrences of "${highlight.text}" }`);

        // Use the batch search functionality to highlight all occurrences
        batchSearch(
            selectedFiles.length === 0 ? files : selectedFiles,
            highlight.text,
            {
                isCaseSensitive: false,
                isAiSearch: false
            }
        ).then(() => {
            console.log(`[HighlightContextMenu] Successfully highlighted all occurrences of "${highlight.text}"`);
        }).catch(error => {
            console.error('[HighlightContextMenu] Error highlighting all occurrences:', error);
            alert('An error occurred while highlighting all occurrences.');
        });

        onClose();
    };


    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        // Auto-close menu after 5 seconds
        const timeoutId = setTimeout(onClose, 5000);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            clearTimeout(timeoutId);
        };
    }, [onClose]);

    // Adjust position if menu would render outside viewport
    const [adjustedPosition, setAdjustedPosition] = useState({ x: highlight.x, y: highlight.y });

    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newX = highlight.x;
            let newY = highlight.y;

            // Adjust horizontal position if needed
            if (highlight.x + rect.width > viewportWidth) {
                newX = Math.max(viewportWidth - rect.width - 10, 10);
            }

            // Adjust vertical position if needed
            if (highlight.y + rect.height > viewportHeight) {
                newY = Math.max(viewportHeight - rect.height - 10, 10);
            }

            setAdjustedPosition({ x: newX, y: newY });
        }
    }, [highlight, viewportSize]); // Add viewportSize to dependencies

    // Only show text-specific options if highlight has text
    const showTextOptions = !!highlight.text;

    return (
        <div
            ref={containerRef}
            className="highlight-context-menu-container"
            style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998 }}
        >
            <div
                ref={menuRef}
                className="highlight-context-menu"
                style={{
                    position: 'fixed',
                    left: adjustedPosition.x ,
                    top: adjustedPosition.y + 15 ,
                    zIndex: 9999, // Higher than container to ensure it's on top
                    pointerEvents: 'auto', // Make sure menu receives clicks
                    backgroundColor: 'var(--background)',
                    boxShadow: 'var(--shadow-md)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--border)',
                    padding: '4px 0',
                    minWidth: '180px',
                    animation: 'fadeIn 0.2s ease'
                }}
            >
                <div className="context-menu-header" style={{
                    padding: '4px 8px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                        {highlight.text ? `"${highlight.text.length > 15 ? highlight.text.substring(0, 15) + '...' : highlight.text}"` :
                            highlight.entity ? `Entity: ${highlight.entity}` : 'Highlight'}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="context-menu-item" onClick={handleDelete}>
                    <Trash2 size={16} />
                    <span>Delete</span>
                </div>

                {showTextOptions && (
                    <>
                        <div className="context-menu-item" onClick={handleDeleteAllSameText}>
                            <Trash2 size={16} />
                            <span>Delete All Same Text</span>
                        </div>
                        <div className="context-menu-item" onClick={handleHighlightAllSame}>
                            <Highlighter size={16} />
                            <span>Highlight All Same</span>
                        </div>
                    </>
                )}

                {highlight.entity && (
                    <div className="context-menu-item-info" style={{
                        padding: '4px 16px',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--muted-foreground)',
                        borderTop: '1px solid var(--border)',
                        marginTop: '4px'
                    }}>
                        {highlight.model && `Model: ${highlight.model}`}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HighlightContextMenu;
