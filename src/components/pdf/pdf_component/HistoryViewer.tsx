import React, { useState, useEffect, useCallback } from 'react';
import { DocumentHistoryItem, useDocumentHistory, SingleDocumentItem } from '../../../hooks/useDocumentHistory';
import { useFileContext } from '../../../contexts/FileContext';
import { useHighlightStore } from '../../../contexts/HighlightStoreContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useEditContext } from '../../../contexts/EditContext';
import { 
    File as FileIcon, 
    Trash2, 
    RefreshCw, 
    Calendar, 
    Shield,
    FileText,
    Database
} from 'lucide-react';
import '../../../styles/modules/pdf/HistoryViewer.css';
import { EntityHighlightProcessor } from '../../../managers/EntityHighlightProcessor';
import { ManualHighlightProcessor } from '../../../managers/ManualHighlightProcessor';
import { SearchHighlightProcessor } from '../../../managers/SearchHighlightProcessor';
import { HighlightType } from '../../../types';

// Define interfaces for the redaction schema structure
interface BoundingBox {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

interface SensitiveItem {
    original_text: string;
    entity_type: string;
    score: number;
    start: number;
    end: number;
    bbox: BoundingBox;
    [key: string]: any; // For other properties
}

interface PageItem {
    page: number;
    sensitive: SensitiveItem[];
    [key: string]: any; // For other properties
}

interface RedactionSchema {
    pages: PageItem[];
    [key: string]: any; // For other properties
}

interface SearchResultItem {
    page: number;
    fileKey: string;
    x: number;
    y: number;
    w: number;
    h: number;
    text: string;
}

const HistoryViewer: React.FC = () => {
    const {
        documents,
        loading,
        error,
        getDocuments,
        deleteDocument,
        getDocumentById
    } = useDocumentHistory();

    const {
        files,
        addToActiveFiles,
        currentFile,
        setCurrentFile,
        getFileByKey
    } = useFileContext();

    const { setDetectionMapping, setFileDetectionMapping } = useEditContext();
    const { notify, confirm } = useNotification();
    const { removeHighlightsFromFile, addHighlight } = useHighlightStore();

    const [page, setPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Load documents on mount and when page changes
    useEffect(() => {
        fetchDocuments();
    }, [page]);

    // Function to fetch documents with loading state
    const fetchDocuments = useCallback(async () => {
        setIsRefreshing(true);
        await getDocuments(page, 100);
        setIsRefreshing(false);
    }, [getDocuments, page]);

    // Listen for redaction history updates
    useEffect(() => {
        const handleHistoryUpdate = () => {
            console.log('[HistoryViewer] Received redaction history update, refreshing documents');
            fetchDocuments();
        };

        window.addEventListener('redaction-history-updated', handleHistoryUpdate);

        return () => {
            window.removeEventListener('redaction-history-updated', handleHistoryUpdate);
        };
    }, [fetchDocuments]);

    /**
     * Correct the bounding box for manual highlights
     * @param bbox The original bounding box
     * @param hasText Whether the highlight contains text (true) or is a rectangle (false)
     * @returns The corrected bounding box coordinates
     */
    const correctManualHighlightBox = (bbox: BoundingBox, text?: string): { x0: number, y0: number, x1: number, y1: number } => {
        // Check if this is a text highlight or a drawn rectangle
        const hasText = !!text && text !== "Unknown" && text !== "Manual";
        
        if (hasText) {
            // Text selection highlights need minimal correction
            const paddingX = 4; // horizontal padding
            const paddingY = 1; // vertical padding
            const heightCorrection = 0; // adjust height to better fit text

            return {
                x0: bbox.x0 - paddingX,
                y0: bbox.y0 - paddingY,
                x1: bbox.x1 - paddingX,
                y1: bbox.y1 + paddingY + heightCorrection
            };
        } else {
            // Rectangle highlights need more vertical correction
            const paddingX = 2.5; // horizontal padding
            const paddingY = 3; // more vertical padding for rectangles

            return {
                x0: bbox.x0 - paddingX,
                y0: bbox.y0 - paddingY,
                x1: bbox.x1 -paddingX,
                y1: bbox.y1 - paddingY 
            };
        }
    };

    // Process each highlight in the redaction schema based on its type
    const processRedactionHighlights = useCallback(async (fileKey: string, redactionSchema: RedactionSchema) => {
        // Add detailed debugging of the schema
        console.log('[HistoryViewer] Processing redaction schema:', redactionSchema);
        console.log('[HistoryViewer] Type of redactionSchema:', typeof redactionSchema);
        console.log('[HistoryViewer] Keys in redactionSchema:', Object.keys(redactionSchema));
        console.log('[HistoryViewer] Has pages property:', redactionSchema.hasOwnProperty('pages'));
        
        if (redactionSchema.pages) {
            console.log('[HistoryViewer] Type of pages property:', typeof redactionSchema.pages);
            console.log('[HistoryViewer] Is pages an array:', Array.isArray(redactionSchema.pages));
            console.log('[HistoryViewer] Pages length:', redactionSchema.pages?.length);
        }

        // Check if we need to unwrap the schema from a potential wrapper object
        let schemaToProcess = redactionSchema;
        
        // If the schema doesn't have pages but has a redaction_schema property, try using that
        if ((!redactionSchema.pages || !Array.isArray(redactionSchema.pages)) && 
            redactionSchema.redaction_schema) {
            console.log('[HistoryViewer] Found nested redaction_schema, using that instead');
            schemaToProcess = redactionSchema.redaction_schema;
            
            // Log the unwrapped schema
            console.log('[HistoryViewer] Unwrapped schema:', schemaToProcess);
            console.log('[HistoryViewer] Unwrapped schema has pages:', 
                schemaToProcess.hasOwnProperty('pages') && Array.isArray(schemaToProcess.pages));
        }

        if (!schemaToProcess || !schemaToProcess.pages || !Array.isArray(schemaToProcess.pages)) {
            console.warn('[HistoryViewer] Invalid redaction schema format - missing pages array');
            return;
        }

        // Group highlights by type
        const manualHighlights: SensitiveItem[] = [];
        const searchHighlights: SensitiveItem[] = [];
        const entityHighlights: SensitiveItem[] = [];

        // Extract all highlights from each page
        schemaToProcess.pages.forEach((page: PageItem) => {
            if (!page.sensitive || !Array.isArray(page.sensitive)) {
                console.log(`[HistoryViewer] Page ${page.page} has no sensitive items or it's not an array`);
                return;
            }

            console.log(`[HistoryViewer] Processing page ${page.page} with ${page.sensitive.length} sensitive items`);
            
            page.sensitive.forEach((item: SensitiveItem) => {
                // Add page number and fileKey to each item for easier processing
                const enrichedItem = {
                    ...item,
                    fileKey,
                    page: page.page
                };

                // Sort by entity_type
                if (item.entity_type === 'MANUAL') {
                    manualHighlights.push(enrichedItem);
                } else if (item.entity_type === 'SEARCH') {
                    searchHighlights.push(enrichedItem);
                } else {
                    // Default to entity for any other type (like PERSON, EMAIL, etc.)
                    entityHighlights.push(enrichedItem);
                }
            });
        });

        console.log(`[HistoryViewer] Processing ${manualHighlights.length} manual, ${searchHighlights.length} search, and ${entityHighlights.length} entity highlights`);

        // Process manual highlights
        for (const item of manualHighlights) {
            if (!item.bbox) {
                console.warn('[HistoryViewer] Manual highlight missing bbox:', item);
                continue;
            }
            
            try {
                // Check if this is a text highlight or a drawn rectangle
                const hasText = !!item.original_text && item.original_text !== "Unknown";
                
                // Apply the bounding box correction
                const correctedBox = correctManualHighlightBox(item.bbox, item.original_text);
                const {x0, y0, x1, y1} = correctedBox;
                
                console.log(`[HistoryViewer] Creating manual highlight for "${item.original_text}" with corrected bbox:`, 
                    correctedBox, 
                    hasText ? '(text highlight)' : '(rectangle highlight)'
                );
                
                await ManualHighlightProcessor.createRectangleHighlight(
                    fileKey,
                    item.page,
                    x0,
                    y0,
                    x1,
                    y1,
                    '#00ff15', // Default manual highlight color
                    item.original_text
                );
            } catch (err) {
                console.error('[HistoryViewer] Error creating manual highlight:', err);
            }
        }

        // Process search highlights
        if (searchHighlights.length > 0) {
            // Convert to SearchResult format expected by SearchHighlightProcessor
            const searchResults: SearchResultItem[] = searchHighlights.map(item => {
                if (!item.bbox) {
                    console.warn('[HistoryViewer] Search highlight missing bbox:', item);
                    return null;
                }
                
                const {x0, y0, x1, y1} = item.bbox;
                return {
                    page: item.page,
                    fileKey,
                    x: x0,
                    y: y0,
                    w: x1 - x0,
                    h: y1 - y0,
                    text: item.original_text
                };
            }).filter(Boolean) as SearchResultItem[];

            // Use unique search terms
            const searchTerms = [...new Set(searchHighlights.map(item => item.original_text))];
            
            console.log(`[HistoryViewer] Processing search highlights with ${searchTerms.length} unique terms`);
            
            // Process each search term separately
            for (const term of searchTerms) {
                const resultsForTerm = searchResults.filter(result => result.text === term);
                if (resultsForTerm.length > 0) {
                    console.log(`[HistoryViewer] Processing ${resultsForTerm.length} search results for term "${term}"`);
                    await SearchHighlightProcessor.processSearchResults(fileKey, resultsForTerm as any, term);
                }
            }
        }

        // Process entity highlights if there are any
        if (entityHighlights.length > 0) {
            console.log(`[HistoryViewer] Processing ${entityHighlights.length} entity highlights`);
            
            // Create a proper entity detection format that EntityHighlightProcessor expects
            const entityDetectionResult = {
                pages: schemaToProcess.pages.map((page: PageItem) => ({
                    ...page,
                    sensitive: page.sensitive.filter((item: SensitiveItem) => 
                        item.entity_type !== 'MANUAL' && item.entity_type !== 'SEARCH'
                    )
                })).filter((page: PageItem) => page.sensitive.length > 0)
            };

            console.log('[HistoryViewer] Entity detection result:', entityDetectionResult);
            console.log('[HistoryViewer] Entity pages count:', entityDetectionResult.pages.length);

            if (entityDetectionResult.pages.length > 0) {
                await EntityHighlightProcessor.processDetectionResults(fileKey, entityDetectionResult);
            } else {
                console.log('[HistoryViewer] No entity pages to process after filtering');
            }
        }
        
        console.log('[HistoryViewer] Finished processing all highlight types');
    }, []);

    // Handle document click - if file exists, apply redaction mapping
    const handleDocumentClick = useCallback(async (document: DocumentHistoryItem) => {
        // Try to find a matching file by name
        const matchingFile = files.find(file => file.name === document.hashed_name);

        if (!matchingFile) {
            // File not uploaded yet
            notify({
                message: `Please upload "${document.hashed_name}" to see its redaction history`,
                type: 'warning',
                duration: 5000
            });
            return;
        }

        try {
            // Get redaction mapping from the server
            const redactionMapping = await getDocumentById(document.id);

            if (redactionMapping) {
                console.log('[HistoryViewer] Received redaction mapping:', redactionMapping);
                
                // Set as current file
                setCurrentFile(matchingFile);

                // Make sure file is active
                addToActiveFiles(matchingFile);

                // First clear any existing highlights for this file
                await removeHighlightsFromFile(matchingFile.name);

                // Parse the redaction schema which comes as a JSON string
                let parsedSchema;
                try {
                    // Check if it's a string that needs parsing
                    if (typeof redactionMapping.redaction_schema === 'string') {
                        console.log('[HistoryViewer] Parsing redaction schema from JSON string');
                        parsedSchema = JSON.parse(redactionMapping.redaction_schema);
                    } else {
                        // Already an object
                        parsedSchema = redactionMapping.redaction_schema;
                    }
                    
                    console.log('[HistoryViewer] Parsed schema:', parsedSchema);
                } catch (parseError) {
                    console.error('[HistoryViewer] Error parsing redaction schema:', parseError);
                    throw new Error('Failed to parse redaction schema');
                }

                // Apply redaction mapping to global state
                console.log('[HistoryViewer] Setting detection mapping with parsed schema');
                setDetectionMapping(parsedSchema);
                
                // Also update file detection mapping in global state
                setFileDetectionMapping(matchingFile.name, parsedSchema);
                
                // Process the redaction schema to add highlights to the store
                await processRedactionHighlights(matchingFile.name, parsedSchema);
            
                notify({
                    message: `Loaded redaction history for ${document.hashed_name}`,
                    type: 'success',
                    duration: 3000
                });

                // Dispatch event to switch to redaction tab
                window.dispatchEvent(new CustomEvent('activate-right-panel', {
                    detail: { navigateToTab: 'redact' }
                }));
            } else {
                throw new Error('Failed to fetch redaction mapping');
            }
        } catch (err) {
            console.error('Error loading redaction history:', err);
            notify({
                message: `Could not load redaction history for ${document.hashed_name}`,
                type: 'error',
                duration: 4000
            });
        }
    }, [files, getDocumentById, setCurrentFile, addToActiveFiles, setDetectionMapping, setFileDetectionMapping, notify, removeHighlightsFromFile, processRedactionHighlights]);

    // Handle document deletion
    const handleDeleteDocument = useCallback(async (e: React.MouseEvent, document: DocumentHistoryItem) => {
        e.stopPropagation(); // Prevent triggering the document click

        const confirmed = await confirm({
            title: 'Delete Document History',
            message: `Are you sure you want to delete the history for "${document.hashed_name}"?`,
            type: 'delete',
            confirmButton: {
                label: 'Delete',
                variant: 'danger'
            }
        });

        if (confirmed) {
            const success = await deleteDocument(document.id);

            if (success) {
                notify({
                    message: `History for "${document.hashed_name}" has been deleted`,
                    type: 'success',
                    duration: 3000
                });
            } else {
                notify({
                    message: `Could not delete history for "${document.hashed_name}"`,
                    type: 'error',
                    duration: 3000
                });
            }
        }
    }, [deleteDocument, confirm, notify]);

    // Format date for display - simplified
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString(undefined, {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    };
    
    // Helper to get appropriate icon for document
    const getDocumentIcon = (document: DocumentHistoryItem) => {
        if (document.hashed_name.includes('redacted')) {
            return <Shield size={18} />;
        } 
        return <FileText size={18} />;
    };

    return (
        <div className="history-viewer">
            <div className="history-viewer-header">
                <h3 className="history-viewer-title">Document History ({documents.length})</h3>
                <button
                    className="refresh-button"
                    onClick={fetchDocuments}
                    disabled={isRefreshing}
                    title="Refresh document history"
                >
                    <RefreshCw size={16} className={isRefreshing ? "spinning" : ""} />
                </button>
            </div>

            <div className="history-content">
                {loading && !isRefreshing ? (
                    <div className="history-loading">Loading document history...</div>
                ) : error ? (
                    <div className="history-error">
                        <p>Error loading document history</p>
                        <button onClick={fetchDocuments} className="retry-button">
                            Try again
                        </button>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="empty-history">
                        <FileIcon size={32} className="empty-icon" />
                        <p>No document history available</p>
                        <p className="empty-subtitle">
                            Redacted documents will appear here
                        </p>
                    </div>
                ) : (
                    <div className="document-list">
                        {documents.map((document) => {
                            // Check if this document has a matching file already uploaded
                            const hasMatchingFile = files.some(file =>
                                file.name === document.hashed_name
                            );

                            // Format entity count with proper text
                            const entityCount = document.entity_count !== undefined
                                ? `${document.entity_count} ${document.entity_count === 1 ? 'entity' : 'entities'}`
                                : '';

                            return (
                                <div
                                    key={document.id}
                                    className={`document-item ${hasMatchingFile ? 'available' : 'unavailable'}`}
                                    onClick={() => handleDocumentClick(document)}
                                >
                                    <div className="document-icon">
                                        {getDocumentIcon(document)}
                                    </div>
                                    <div className="document-details">
                                        <div className="document-name">
                                            <span className="doc-name-text">{document.hashed_name}</span>
                                            {!hasMatchingFile && (
                                                <span className="unavailable-badge">
                                                    Not uploaded
                                                </span>
                                            )}
                                        </div>
                                        <div className="document-meta">
                                            <span className="document-date">
                                                <Calendar size={12} />
                                                {formatDate(document.upload_timestamp)}
                                            </span>
                                            
                                            {document.entity_count !== undefined && (
                                                <span className="entity-count">
                                                    <Database size={12} />
                                                    {entityCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        className="document-delete"
                                        onClick={(e) => handleDeleteDocument(e, document)}
                                        title="Delete document history"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="tooltip">{document.hashed_name}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryViewer;
