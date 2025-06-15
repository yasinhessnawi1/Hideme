import React, {useCallback} from 'react';
import {FaDrawPolygon, FaFont} from 'react-icons/fa';
import {useEditContext} from '../../../contexts/EditContext';
import {useHighlightStore} from '../../../contexts/HighlightStoreContext';
import {HighlightType, HighlightCreationMode} from '../../../types';
import {useFileContext} from '../../../contexts/FileContext';
import {useNotification} from '../../../contexts/NotificationContext';
import {useBatchSearch} from '../../../contexts/SearchContext';
import {useFileSummary} from '../../../contexts/FileSummaryContext';
import {useLanguage} from '../../../contexts/LanguageContext';

const SettingsSidebar: React.FC = () => {
    const {
        presidioColor,
        setPresidioColor,
        glinerColor,
        setGlinerColor,
        geminiColor,
        setGeminiColor,
        hidemeColor,
        setHidemeColor,
        searchColor,
        setSearchColor,
        setManualColor,
        manualColor,
        showSearchHighlights,
        setShowSearchHighlights,
        showEntityHighlights,
        setShowEntityHighlights,
        showManualHighlights,
        setShowManualHighlights,
        setDetectionMapping,
        // Edit mode related
        isEditingMode,
        setIsEditingMode,
        highlightingMode,
        setHighlightingMode
    } = useEditContext();

    const {files, selectedFiles, currentFile} = useFileContext();
    const filesToClear = selectedFiles.length > 0 ? selectedFiles : files;
    const {notify} = useNotification();
    const {clearAllSearches} = useBatchSearch();
    const {
        clearAllEntityData,
        clearAllSearchData
    } = useFileSummary();
    const {t} = useLanguage();

    const {
        removeAllHighlights,
        removeAllHighlightsByType
    } = useHighlightStore();

    // Edit mode functions
    const onSetRectangularHighlightingMode = useCallback(() => {
        setHighlightingMode(HighlightCreationMode.RECTANGULAR);
        setIsEditingMode(true);
        notify({
            type: 'success',
            message: t('minimalToolbar', 'highlightingModeSet').replace('{mode}', t('minimalToolbar', 'rectangular')),
            position: 'top-right'
        });
    }, [setHighlightingMode, setIsEditingMode, notify, t]);

    const onSetTextSelectionHighlightingMode = useCallback(() => {
        setHighlightingMode(HighlightCreationMode.TEXT_SELECTION);
        setIsEditingMode(true);
        notify({
            type: 'success',
            message: t('minimalToolbar', 'highlightingModeSet').replace('{mode}', t('minimalToolbar', 'textSelection')),
            position: 'top-right'
        });
    }, [setHighlightingMode, setIsEditingMode, notify, t]);

    // Color handling functions
    const handleManualColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setManualColor(e.target.value);
    };

    const handleResetEntityColors = () => {
        setPresidioColor('#ffd771'); // Yellow
        setGlinerColor('#ff7171'); // Red
        setGeminiColor('#7171ff'); // Blue
        setHidemeColor('#71ffa0'); // Green
        setSearchColor('#71c4ff');
        setManualColor('#00ff15');
        notify({
            type: 'success',
            message: t('toolbarSettingsMenu', 'colorsResetSuccess'),
            position: 'top-right'
        });
    };

    // Visibility toggle functions
    const handleToggleManualHighlights = () => {
        setShowManualHighlights(!showManualHighlights);
        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'manualHighlightsVisible').replace('{visible}', !showManualHighlights ? t('common', 'visible') : t('common', 'hidden')),
            position: 'top-right'
        });
    };

    const handleToggleSearchHighlights = () => {
        setShowSearchHighlights(!showSearchHighlights);
        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'searchHighlightsVisible').replace('{visible}', !showSearchHighlights ? t('common', 'visible') : t('common', 'hidden')),
            position: 'top-right'
        });
    };

    const handleToggleEntityHighlights = () => {
        setShowEntityHighlights(!showEntityHighlights);
        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'entityHighlightsVisible').replace('{visible}', !showEntityHighlights ? t('common', 'visible') : t('common', 'hidden')),
            position: 'top-right'
        });
    };

    // Clear functions
    const handleClearAllHighlights = () => {
        removeAllHighlights(filesToClear);
        clearAllSearches();
        clearAllEntityData();
        clearAllSearchData();

        if (currentFile) {
            setDetectionMapping(null);
        }

        window.dispatchEvent(new CustomEvent('highlights-cleared', {
            detail: {allTypes: true}
        }));

        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'allHighlightsCleared'),
            position: 'top-right'
        });
    };

    const handleClearManualHighlights = () => {
        removeAllHighlightsByType(HighlightType.MANUAL, filesToClear);

        window.dispatchEvent(new CustomEvent('highlights-cleared', {
            detail: {type: HighlightType.MANUAL}
        }));

        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'manualHighlightsCleared'),
            position: 'top-right'
        });
    };

    const handleClearSearchHighlights = () => {
        removeAllHighlightsByType(HighlightType.SEARCH, filesToClear);
        clearAllSearches();
        clearAllSearchData();

        window.dispatchEvent(new CustomEvent('search-highlights-cleared', {
            detail: {type: HighlightType.SEARCH}
        }));

        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'searchHighlightsCleared'),
            position: 'top-right'
        });
    };

    const handleClearEntityHighlights = () => {
        removeAllHighlightsByType(HighlightType.ENTITY, filesToClear);
        clearAllEntityData();

        if (currentFile) {
            setDetectionMapping(null);
        }

        window.dispatchEvent(new CustomEvent('entity-highlights-cleared', {
            detail: {type: HighlightType.ENTITY}
        }));

        notify({
            type: 'success',
            message: t('toolbarVisibilityMenu', 'entityHighlightsCleared'),
            position: 'top-right'
        });
    };

    return (
        <div className="settings-sidebar">
            {/* Edit Mode Settings Section */}

            <div className="settings-section">
                <h3 className="settings-section-title">Edit Mode Settings</h3>

                <div className="settings-item">
                    <label className="settings-item-label">Highlighting Mode:</label>
                    <div className="settings-radio-group">
                        <div
                            className={`settings-radio-item ${highlightingMode === HighlightCreationMode.RECTANGULAR ? 'active' : ''}`}
                            onClick={onSetRectangularHighlightingMode}
                        >
                            <FaDrawPolygon size={16}/>
                            <span>{t('minimalToolbar', 'rectangular')}</span>
                        </div>
                        <div
                            className={`settings-radio-item ${highlightingMode === HighlightCreationMode.TEXT_SELECTION ? 'active' : ''}`}
                            onClick={onSetTextSelectionHighlightingMode}
                        >
                            <FaFont size={16}/>
                            <span>{t('minimalToolbar', 'textSelection')}</span>
                        </div>
                    </div>
                </div>
            </div>


            {/* Highlight Visibility Section */}
            <div className="settings-section">
                <h3 className="settings-section-title">Highlight Visibility</h3>

                <div className="settings-item">
                    <label className="settings-checkbox-label">
                        <input
                            type="checkbox"
                            checked={showManualHighlights}
                            onChange={handleToggleManualHighlights}
                            className="settings-checkbox"
                        />
                        <span>{t('toolbarVisibilityMenu', 'manualHighlights')}</span>
                    </label>
                </div>

                <div className="settings-item">
                    <label className="settings-checkbox-label">
                        <input
                            type="checkbox"
                            checked={showSearchHighlights}
                            onChange={handleToggleSearchHighlights}
                            className="settings-checkbox"
                        />
                        <span>{t('toolbarVisibilityMenu', 'searchHighlights')}</span>
                    </label>
                </div>

                <div className="settings-item">
                    <label className="settings-checkbox-label">
                        <input
                            type="checkbox"
                            checked={showEntityHighlights}
                            onChange={handleToggleEntityHighlights}
                            className="settings-checkbox"
                        />
                        <span>{t('toolbarVisibilityMenu', 'entityHighlights')}</span>
                    </label>
                </div>
            </div>

            {/* Clear Actions Section */}
            <div className="settings-section">
                <h3 className="settings-section-title">Clear Highlights</h3>

                <div className="settings-buttons">
                    <button
                        onClick={handleClearAllHighlights}
                        className="settings-button settings-button-danger"
                    >
                        {t('toolbarVisibilityMenu', 'clearAll')}
                    </button>

                    <button
                        onClick={handleClearManualHighlights}
                        className="settings-button settings-button-secondary"
                    >
                        {t('toolbarVisibilityMenu', 'clearManual')}
                    </button>

                    <button
                        onClick={handleClearSearchHighlights}
                        className="settings-button settings-button-secondary"
                    >
                        {t('toolbarVisibilityMenu', 'clearSearch')}
                    </button>

                    <button
                        onClick={handleClearEntityHighlights}
                        className="settings-button settings-button-secondary"
                    >
                        {t('toolbarVisibilityMenu', 'clearEntity')}
                    </button>
                </div>
            </div>

            {/* Manual Highlight Colors Section */}
            <div className="settings-section">
                <h3 className="settings-section-title">{t('toolbarSettingsMenu', 'manualHighlight')}</h3>

                <div className="settings-item">
                    <label className="settings-color-label">
                        <span>{t('toolbarSettingsMenu', 'color')}</span>
                        <input
                            type="color"
                            value={manualColor}
                            onChange={handleManualColorChange}
                            className="settings-color-input"
                        />
                    </label>
                </div>
            </div>

            {/* Entity Model Colors Section */}
            <div className="settings-section">
                <h3 className="settings-section-title">{t('toolbarSettingsMenu', 'entityModelColors')}</h3>

                <div className="settings-item">
                    <label className="settings-color-label">
                        <span>{t('toolbarSettingsMenu', 'presidio')}</span>
                        <input
                            type="color"
                            value={presidioColor}
                            onChange={(e) => setPresidioColor(e.target.value)}
                            className="settings-color-input"
                        />
                    </label>
                </div>

                <div className="settings-item">
                    <label className="settings-color-label">
                        <span>{t('toolbarSettingsMenu', 'gliner')}</span>
                        <input
                            type="color"
                            value={glinerColor}
                            onChange={(e) => setGlinerColor(e.target.value)}
                            className="settings-color-input"
                        />
                    </label>
                </div>

                <div className="settings-item">
                    <label className="settings-color-label">
                        <span>{t('toolbarSettingsMenu', 'gemini')}</span>
                        <input
                            type="color"
                            value={geminiColor}
                            onChange={(e) => setGeminiColor(e.target.value)}
                            className="settings-color-input"
                        />
                    </label>
                </div>

                <div className="settings-item">
                    <label className="settings-color-label">
                        <span>{t('toolbarSettingsMenu', 'hidemeAI')}</span>
                        <input
                            type="color"
                            value={hidemeColor}
                            onChange={(e) => setHidemeColor(e.target.value)}
                            className="settings-color-input"
                        />
                    </label>
                </div>

                <div className="settings-item">
                    <label className="settings-color-label">
                        <span>{t('toolbarSettingsMenu', 'search')}</span>
                        <input
                            type="color"
                            value={searchColor}
                            onChange={(e) => setSearchColor(e.target.value)}
                            className="settings-color-input"
                        />
                    </label>
                </div>

                <div className="settings-item">
                    <button
                        onClick={handleResetEntityColors}
                        className="settings-button settings-button-primary"
                    >
                        {t('toolbarSettingsMenu', 'resetEntityColors')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsSidebar; 