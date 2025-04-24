import React, { useEffect, useRef, useState } from 'react';
import { Highlighter, Trash2, X } from 'lucide-react';
import { useHighlightStore } from '../../../hooks/useHighlightStore';
import { HighlightRect } from '../../../types';
import { useFileContext } from '../../../contexts/FileContext';
import { getFileKey } from '../../../contexts/PDFViewerContext';
import { usePDFApi } from '../../../hooks/usePDFApi';
import { SearchHighlightProcessor } from '../../../managers/SearchHighlightProcessor';
import '../../../styles/modules/pdf/HighlightContextMenu.css';
import {SearchResult} from "../../../services/BatchSearchService";
import {getCorrectedBoundingBox} from "../../../utils/utilities";

interface HighlightContextMenuProps {
    highlight: HighlightRect;
    onClose: () => void;
    viewport?: any;
    zoomLevel?: number;
}


const HighlightContextMenu: React.FC<HighlightContextMenuProps> = ({
                                                                       highlight,
                                                                       onClose,
                                                                       viewport = null,
                                                                       zoomLevel = 1.0
                                                                   }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const {
        removeHighlight,
        removeHighlightsByPropertyFromAllFiles,
        removeHighlightsByPosition,
    } = useHighlightStore();
    const { files, selectedFiles } = useFileContext();
    const { runFindWords } = usePDFApi();

    // Handle delete current highlight
    const handleDelete = () => {
        if (highlight?.id) {
            removeHighlight(highlight.id);
            onClose();
        }
    };

    // Delete all occurrences of the same entity type
    const handleDeleteAllSameEntityType = () => {
        if (!highlight.entity || !highlight.fileKey) {
            console.warn("[HighlightContextMenu] Missing entity or fileKey");
            onClose();
            return;
        }
        const allFiles = selectedFiles.length > 0 ? selectedFiles : files;
        const entityType = highlight.entity;
        removeHighlightsByPropertyFromAllFiles( 'entity', entityType, allFiles)
            .then(success => {
                console.log(`[HighlightContextMenu] Deleted all highlights with entity type "${entityType}" in file ${highlight.fileKey}`);
                onClose();
            })
            .catch(error => {
                console.error('[HighlightContextMenu] Error deleting entity highlights:', error);
                onClose();
            });
    };

    // Delete all occurrences of the same text
    // Updated handleDeleteAllSameText function using removeHighlightsByPosition

    const handleDeleteAllSameText = async () => {
        if (!highlight.fileKey) {
            console.warn("[HighlightContextMenu] Missing fileKey");
            onClose();
            return;
        }

        try {
            // Determine which text to delete
            let textToDelete = highlight.text || highlight.entity || '';

            if (!textToDelete) {
                alert("No text content found to delete.");
                onClose();
                return;
            }

            console.log(`[HighlightContextMenu] Deleting all occurrences of text "${textToDelete}"`);

            // Get the bounding box from the current highlight
            const boundingBox = getCorrectedBoundingBox(highlight);

            // Use the runFindWords function to find all occurrences across files
            const filesToSearch = selectedFiles.length > 0 ? selectedFiles : files;
            const findWordsResponse = await runFindWords(
                files,
                boundingBox,
                filesToSearch
            );

            // Process the results and delete highlights by position
            if (findWordsResponse?.file_results) {
                let totalDeleted = 0;

                // Process each file's results
                for (const fileResult of findWordsResponse.file_results) {
                    if (fileResult.status !== 'success' || !fileResult.results?.pages) continue;

                    // Process all matches across pages
                    for (const page of fileResult.results.pages) {
                        if (!page.matches || !Array.isArray(page.matches)) continue;

                        // Process each match in this page
                        for (const match of page.matches) {
                            if (!match.bbox) continue;

                            const { x0, y0, x1, y1 } = match.bbox;
                            const allFiles = selectedFiles.length > 0 ? selectedFiles : files;
                            // Use the improved removeHighlightsByPosition method
                            const result = await removeHighlightsByPosition(
                                allFiles,
                                x0,
                                y0,
                                x1,
                                y1,
                                {
                                    iouThreshold: 0.05,
                                    centerDistThreshold: 50,
                                    sizeRatioDifference: 0.7,
                                    debug: false  // Set to true for debugging
                                }
                            );

                            if (result) {
                                totalDeleted++;
                            }
                        }
                    }
                }

                if (totalDeleted > 0) {
                    console.log(`[HighlightContextMenu] Deleted highlights for ${totalDeleted} text occurrences`);
                } else {
                    console.log(`[HighlightContextMenu] No matching highlights found to delete`);
                }
            }
        } catch (error) {
            console.error('[HighlightContextMenu] Error removing highlights by text:', error);
            alert('An error occurred while deleting highlights');
        }

        onClose();
    };

    // Handle highlight all instances of the same text
    const handleHighlightAllSame = async () => {
        if (!highlight.fileKey) {
            onClose();
            return;
        }

        try {
            const textToHighlight = highlight.text ?? highlight.entity ?? '';

            if (!textToHighlight) {
                alert("No text content found to highlight.");
                onClose();
                return;
            }

            console.log(`[HighlightContextMenu] Highlighting all occurrences of "${textToHighlight}"`);
            let boundingBox = getCorrectedBoundingBox(highlight);

            // Use the runFindWords function to find all occurrences
            const findWordsResponse = await runFindWords(
                files,
                boundingBox,
                selectedFiles
            );

            // Process the results using the SearchHighlightProcessor
            if (findWordsResponse?.file_results) {
                let totalCount = 0;

                // Process each file's results
                for (const fileResult of findWordsResponse.file_results) {
                    if (fileResult.status !== 'success' || !fileResult.results?.pages) continue;

                    const fileKey = fileResult.file;
                    const file = files.find(f => getFileKey(f) === fileKey);
                    if (!file) continue;

                    // Extract search results and convert to highlight format
                    const searchResults = new Array<SearchResult>();

                    for (const page of fileResult.results.pages) {
                        if (!page.matches || !Array.isArray(page.matches)) continue;

                        for (const match of page.matches) {
                            if (!match.bbox) continue;

                            const { x0, y0, x1, y1 } = match.bbox;
                            searchResults.push({
                                id: `search-${fileKey}-${page.page}-${textToHighlight}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                page: page.page,
                                x: x0 ,
                                y: y0 ,
                                w: (x1 - x0) ,
                                h: (y1 - y0) ,
                                text: textToHighlight,
                                fileKey,
                                color: highlight.color,
                                opacity: highlight.opacity ?? 0.4,
                                type: highlight.type,
                            });
                        }
                    }

                    if (searchResults.length > 0) {
                        // Process the results into highlights
                        const highlightIds = await SearchHighlightProcessor.processSearchResults(
                            fileKey,
                            searchResults,
                             'Highlight All Same Search' + highlight.id, // Use the same text as the original highlight
                        );

                        totalCount += highlightIds.length;
                    }
                }

                if (totalCount > 0) {
                    console.log(`[HighlightContextMenu] Added ${totalCount} highlights for text "${textToHighlight}"`);
                } else {
                    alert(`No additional occurrences of text "${textToHighlight}" found.`);
                }
            }
        } catch (error) {
            console.error('[HighlightContextMenu] Error highlighting all occurrences:', error);
            alert('An error occurred while highlighting all occurrences.');
        }

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
    const [adjustedPosition, setAdjustedPosition] = useState({x: highlight.x, y: highlight.y});

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

            setAdjustedPosition({x: newX, y: newY});
        }
    }, [highlight]);

    // Only show text-specific options if highlight has text
    const showTextOptions = true;
    // Check if this is an entity highlight
    const isEntityHighlight = highlight.type === 'ENTITY';

    return (
        <div
            className="highlight-context-menu-container"
            style={{position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998}}
        >
            <div
                ref={menuRef}
                className="highlight-context-menu"
                style={{
                    position: 'fixed',
                    left: adjustedPosition.x,
                    top: adjustedPosition.y + 15,
                    zIndex: 9999,
                    pointerEvents: 'auto',
                    backgroundColor: 'var(--background)',
                    boxShadow: 'var(--shadow-md)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--border)',
                    padding: '4px 0',
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
                        <X size={14}/>
                    </button>
                </div>

                <div className="context-menu-item" onClick={handleDelete}>
                    <Trash2 size={16}/>
                    <span>Delete</span>
                </div>
                { showTextOptions && (
                    <>

                {/* Delete options based on highlight type */}
                {isEntityHighlight && (
                    <div className="context-menu-item" onClick={handleDeleteAllSameEntityType}>
                        <Trash2 size={16}/>
                        <span>Delete All {highlight.entity}</span>
                    </div>
                )}

                <div className="context-menu-item" onClick={handleDeleteAllSameText}>
                    <Trash2 size={16}/>
                    <span>Delete All Same Text</span>
                </div>

                <div className="context-menu-item" onClick={handleHighlightAllSame}>
                    <Highlighter size={16}/>
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
