import React, {useEffect, useRef, useState} from 'react';
import {Ban, Highlighter, Trash2, X} from 'lucide-react';
import {useHighlightStore} from '../../../contexts/HighlightStoreContext';
import {HighlightCreationMode, HighlightRect, HighlightType} from '../../../types';
import {useFileContext} from '../../../contexts/FileContext';
import {getFileKey} from '../../../contexts/PDFViewerContext';
import {usePDFApi} from '../../../hooks/general/usePDFApi';
import {SearchHighlightProcessor} from '../../../managers/SearchHighlightProcessor';
import {SearchResult} from "../../../services/processing-backend-services/BatchSearchService";
import {getCorrectedBoundingBox} from "../../../utils/utilities";
import {useNotification} from '../../../contexts/NotificationContext';
import useBanList from '../../../hooks/settings/useBanList';
import {createPortal} from 'react-dom';
import {useLanguage} from '../../../contexts/LanguageContext';
import {getEntityTranslationKeyAndModel} from '../../../utils/EntityUtils';
import {mapBackendErrorToMessage} from '../../../utils/errorUtils';

interface HighlightContextMenuProps {
    highlight: HighlightRect;
    onClose: () => void;
    viewport?: any;
    zoomLevel?: number;
    containerRef: React.RefObject<HTMLDivElement | null>;
}


const HighlightContextMenu: React.FC<HighlightContextMenuProps> = ({
                                                                       highlight,
                                                                       onClose,
                                                                       viewport = null,
                                                                       zoomLevel = 1.0,
                                                                       containerRef
                                                                   }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const {
        removeHighlight,
        removeHighlightsByPropertyFromAllFiles,
        removeHighlightsByPosition,
    } = useHighlightStore();
    const { files, selectedFiles } = useFileContext();
    const { runFindWords } = usePDFApi();
    const {notify, confirmWithText} = useNotification();
    const {addBanListWords} = useBanList();
    const { t } = useLanguage();

    // Helper to get translated entity name
    const getTranslatedEntity = (entity: string | undefined) => {
        if (!entity) return '';
        const { key } = getEntityTranslationKeyAndModel(entity);
        return key ? t('entityDetection', key) : entity;
    };

    // Handle delete current highlight
    const handleDelete = () => {
        if (highlight?.id) {
            removeHighlight(highlight.id);
            onClose();
            notify({
                type: 'success',
                message: t('toolbar', 'highlightDeleted'),
                position: 'top-right'
            });
        }
    };

    const handleAddToBanList = async () => {
        if (highlight.text && highlight.creationMode === HighlightCreationMode.TEXT_SELECTION) {
            addBanListWords([highlight.text]);
            notify({
                type: 'success',
                message: t('toolbar', 'addedToIgnoreList'),
                position: 'top-right'
            });
            onClose();
            return;
        }else {
           const text = await confirmWithText({
                type: 'error',
                title: t('toolbar', 'noTextToAddToIgnoreListTitle'),
                message: t('toolbar', 'noTextToAddToIgnoreListMessage'),
                confirmButton: {
                    label: t('toolbar', 'addToIgnoreList'),
                },
                inputLabel: t('toolbar', 'inputLabel'),
                inputPlaceholder: t('toolbar', 'inputPlaceholder'),
                inputType: 'text',
            }
            );
            if(text) {
                addBanListWords([text]);
                notify({
                    type: 'success',
                    message: t('toolbar', 'addedToIgnoreList'),
                    position: 'top-right'
                });
                onClose();
            }
            return;
        }


    };

    // Delete all occurrences of the same entity type
    const handleDeleteAllSameEntityType = () => {
        if (!highlight.entity || !highlight.fileKey) {
            notify({
                type: 'error',
                message: t('toolbar', 'deleteAllSameFailed'),
                position: 'top-right'
            });
            onClose();
            return;
        }
        const allFiles = selectedFiles.length > 0 ? selectedFiles : files;
        const entityType = highlight.entity;
        removeHighlightsByPropertyFromAllFiles( 'entity', entityType, allFiles)
            .then(success => {
                onClose();
                notify({
                    type: 'success',
                    message: t('toolbar', 'allHighlightsDeleted', { entity: entityType }),
                    position: 'top-right'
                });
            })
            .catch(error => {
                notify({
                    type: 'error',
                    message: t('toolbar', 'deleteAllSameFailed') + ' ' + error.message,
                    position: 'top-right'
                });
                onClose();
            });
    };

    // Delete all occurrences of the same text
    // Updated handleDeleteAllSameText function using removeHighlightsByPosition

    const handleDeleteAllSameText = async () => {
        if (!highlight.fileKey) {
            notify({
                type: 'error',
                message: t('toolbar', 'deleteAllSameFailed'),
                position: 'top-right'
            });
            onClose();
            return;
        }

        try {
            // Determine which text to delete
            let textToDelete = highlight.text || highlight.entity || '';


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
                        notify({
                            type: 'success',
                            message: t('toolbar', 'deletedHighlightsForOccurrences', { count: totalDeleted }),
                            position: 'top-right'
                        });
                } else {
                    notify({
                        type: 'error',
                        message: t('toolbar', 'noMatchingHighlightsFound'),
                        position: 'top-right'
                    });
                }
            }
        } catch (error) {
                notify({
                    type: 'error',
                    message: mapBackendErrorToMessage(error) || t('toolbar', 'errorRemovingHighlightsByText', { error: error.message }),
                    position: 'top-right'
                });
        }

        onClose();
    };

    // Handle highlight all instances of the same text
    const handleHighlightAllSame = async () => {
        if (!highlight.fileKey) {
            notify({
                type: 'error',
                message: t('toolbar', 'highlightAllSameFailed'),
                position: 'top-right'
            });
            onClose();
            return;
        }

        try {
            const textToHighlight = highlight.text ?? highlight.entity ?? '';



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
                                color: highlight.color || '#71c4ff',
                                opacity: highlight.opacity ?? 0.4,
                                type: highlight.type || HighlightType.SEARCH,
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
                    notify({
                        type: 'success',
                        message: t('toolbar', 'addedHighlightsForText', { count: totalCount, text: textToHighlight }),
                        position: 'top-right'
                    });
                } else {
                    notify({
                        type: 'error',
                        message: t('toolbar', 'noAdditionalOccurrencesFound', { text: textToHighlight }),
                    })
                }
            }
        } catch (error) {
            notify({
                type: 'error',
                message: mapBackendErrorToMessage(error) || t('toolbar', 'errorHighlightingAllOccurrences', { error: error.message }),
                position: 'top-right'
            });
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
    const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });

    // Calculate position relative to the viewport using the container's bounding rect
    useEffect(() => {
        if (!containerRef.current) return;
        const rect = menuRef.current?.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const highlightX = (highlight.originalX ?? highlight.x) * zoomLevel;
        const highlightY = (highlight.originalY ?? highlight.y) * zoomLevel;
        let newX = containerRect.left + highlightX;
        let newY = containerRect.top + highlightY;

        // Adjust for menu size if needed
        if (rect) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            if (newX + rect.width > viewportWidth) {
                newX = Math.max(viewportWidth - rect.width - 10, 10);
            }
            if (newY + rect.height > viewportHeight) {
                newY = Math.max(viewportHeight - rect.height - 10, 10);
            }
        }
        setAdjustedPosition({ x: newX, y: newY });
    }, [highlight, zoomLevel, containerRef]);

    // Only show text-specific options if highlight has text
    const showTextOptions = true;
    // Check if this is an entity highlight
    const isEntityHighlight = highlight.type === 'ENTITY';

    return (
        createPortal(
            <div
                ref={menuRef}
                className="highlight-context-menu"
                style={{
                    position: 'fixed',
                    left: adjustedPosition.x,
                    top: adjustedPosition.y + 20 * (zoomLevel ?? 1),
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
                            highlight.entity ? `Entity: ${getTranslatedEntity(highlight.entity)}` : 'Highlight'}
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
                    <span>{t('entityDetection', 'delete')}</span>
                </div>
                { showTextOptions && (
                    <>

                {/* Delete options based on highlight type */}
                {isEntityHighlight && (
                    <div className="context-menu-item" onClick={handleDeleteAllSameEntityType}>
                        <Trash2 size={16}/>
                        <span>{t('toolbar', 'deleteAll', { entity: getTranslatedEntity(highlight.entity) })}</span>
                    </div>
                )}

                <div className="context-menu-item" onClick={handleDeleteAllSameText}>
                    <Trash2 size={16}/>
                    <span>{t('toolbar', 'deleteAllSameText')}</span>
                </div>

                <div className="context-menu-item" onClick={handleHighlightAllSame}>
                    <Highlighter size={16}/>
                    <span>{t('toolbar', 'highlightAllSame')}</span>
                </div>
                    </>
                )}
                <div className="context-menu-item" onClick={handleAddToBanList}>
                    <Ban size={16}/>
                    <span>{t('toolbar', 'addToIgnoreList')}</span>
                </div>

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
            </div>,
            document.body
        )
    );
};

export default HighlightContextMenu;
