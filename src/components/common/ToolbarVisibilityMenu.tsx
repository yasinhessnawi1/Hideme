import React from 'react';
import { useEditContext } from '../../contexts/EditContext';
import { useHighlightStore } from '../../contexts/HighlightStoreContext';
import { HighlightType } from '../../types';
import '../../styles/modules/pdf/Toolbar.css'; // Assuming shared styles
import { useFileContext } from '../../contexts/FileContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useBatchSearch } from '../../contexts/SearchContext';
import { useFileSummary } from '../../contexts/FileSummaryContext';
import { useLanguage } from '../../contexts/LanguageContext';

const ToolbarVisibilityMenu: React.FC = () => {
    const {
        showSearchHighlights,
        setShowSearchHighlights,
        showEntityHighlights,
        setShowEntityHighlights,
        showManualHighlights,
        setShowManualHighlights,
        setDetectionMapping
    } = useEditContext();
    const {files, selectedFiles, currentFile} = useFileContext();
    const filesToClear = selectedFiles.length > 0 ? selectedFiles : files;
    const {notify} = useNotification();
    const { clearAllSearches } = useBatchSearch();
    const { 
        clearAllEntityData, 
        clearAllSearchData 
    } = useFileSummary();
    const { t } = useLanguage();

    const {
        removeAllHighlights,
        removeAllHighlightsByType
    } = useHighlightStore();

    const handleToggleManualHighlights = (e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setShowManualHighlights(!showManualHighlights);
        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'manualHighlightsVisible').replace('{visible}', !showManualHighlights ? t('common', 'visible') : t('common', 'hidden')),
            position: 'top-right'
        });
    };

    const handleToggleSearchHighlights = (e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setShowSearchHighlights(!showSearchHighlights);
        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'searchHighlightsVisible').replace('{visible}', showSearchHighlights ? t('common', 'visible') : t('common', 'hidden')),
            position: 'top-right'
        });
    };

    const handleToggleEntityHighlights = (e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setShowEntityHighlights(!showEntityHighlights);
        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'entityHighlightsVisible').replace('{visible}', showEntityHighlights ? t('common', 'visible') : t('common', 'hidden')),
            position: 'top-right'
        });
    };

    const handleClearAllHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        
        // Clear all highlights using the highlight store
        removeAllHighlights(filesToClear);
        
        // Clear search state
        clearAllSearches();
        
        // Clear all data using the FileSummary context
        clearAllEntityData();
        clearAllSearchData();
        
        // Reset current detection mapping if there's a current file
        if (currentFile) {
            setDetectionMapping(null);
        }
        
        // Dispatch event to clear all highlights and summaries
        window.dispatchEvent(new CustomEvent('highlights-cleared', {
            detail: {
                allTypes: true
            }
        }));
        
        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'allHighlightsCleared'),
            position: 'top-right'
        });
    };

    const handleClearManualHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        
        // Clear manual highlights
        removeAllHighlightsByType(HighlightType.MANUAL, filesToClear);
        
        // Dispatch event for manual highlights cleared
        window.dispatchEvent(new CustomEvent('highlights-cleared', {
            detail: {
                type: HighlightType.MANUAL
            }
        }));
        
        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'manualHighlightsCleared'),
            position: 'top-right'
        });
    };

    const handleClearSearchHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        
        // Clear search highlights
        removeAllHighlightsByType(HighlightType.SEARCH, filesToClear);
        
        // Use search context to clear state
        clearAllSearches();
        
        // Clear all search data using FileSummary context
        clearAllSearchData();
        
        // Dispatch event for search highlights cleared
        window.dispatchEvent(new CustomEvent('search-highlights-cleared', {
            detail: {
                type: HighlightType.SEARCH
            }
        }));
        
        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'searchHighlightsCleared'),
            position: 'top-right'
        });
    };

    const handleClearEntityHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        
        // Clear entity highlights
        removeAllHighlightsByType(HighlightType.ENTITY, filesToClear);
        
        // Clear all entity data using FileSummary context
        clearAllEntityData();
        
        // Reset detection mapping if there's a current file
        if (currentFile) {
            setDetectionMapping(null);
        }
        
        // Dispatch event for entity highlights cleared
        window.dispatchEvent(new CustomEvent('entity-highlights-cleared', {
            detail: {
                type: HighlightType.ENTITY
            }
        }));
        
        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'entityHighlightsCleared'),
            position: 'top-right'
        });
    };

    return (
        <>
            <div className="dropdown-item">
                <label onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={showManualHighlights}
                        onClick={handleToggleManualHighlights}
                        readOnly
                    />
                    {t('toolbarVisibilityMenu', 'manualHighlights')}
                </label>
            </div>
            <div className="dropdown-item">
                <label onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={showSearchHighlights}
                        onClick={handleToggleSearchHighlights}
                        readOnly
                    />
                    {t('toolbarVisibilityMenu', 'searchHighlights')}
                </label>
            </div>
            <div className="dropdown-item">
                <label onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={showEntityHighlights}
                        onClick={handleToggleEntityHighlights}
                        readOnly
                    />
                    {t('toolbarVisibilityMenu', 'entityHighlights')}
                </label>
            </div>
            <div className="dropdown-divider"></div>
            <div className="dropdown-item">
                <button onClick={handleClearAllHighlights}>{t('toolbarVisibilityMenu', 'clearAll')}</button>
            </div>
            <div className="dropdown-item">
                <button onClick={handleClearManualHighlights}>{t('toolbarVisibilityMenu', 'clearManual')}</button>
            </div>
            <div className="dropdown-item">
                <button onClick={handleClearSearchHighlights}>{t('toolbarVisibilityMenu', 'clearSearch')}</button>
            </div>
            <div className="dropdown-item">
                <button onClick={handleClearEntityHighlights}>{t('toolbarVisibilityMenu', 'clearEntity')}</button>
            </div>
        </>
    );
};

export default ToolbarVisibilityMenu;
