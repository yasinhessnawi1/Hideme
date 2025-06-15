import React, {useCallback} from 'react';
import {CiEdit} from 'react-icons/ci';
import {ZoomControls} from "./Toolbar";
import {useEditContext} from "../../contexts/EditContext";
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface MinimalToolbarProps {
    zoomLevel: number;
    setZoomLevel: (zoomLevel: number) => void;
}

const MinimalToolbar: React.FC<MinimalToolbarProps> = ({
                                                           zoomLevel,
                                                           setZoomLevel,
                                                       }) => {
    const {
        setIsEditingMode,
        isEditingMode,
    } = useEditContext();

    const { t } = useLanguage();
    const {notify} = useNotification();

    // Simple toggle for edit mode
    const handleEditModeToggle = useCallback(() => {
        const newEditMode = !isEditingMode;
        setIsEditingMode(newEditMode);
        
        notify({
            type: 'success',
            message: newEditMode
                ? t('minimalToolbar', 'editModeEnabled')
                : t('minimalToolbar', 'editModeDisabled'),
            position: 'top-right'
        });
    }, [isEditingMode, setIsEditingMode, notify, t]);

    return (
        <>
            {/* Edit Mode Toggle Section */}
            <div className="toolbar-section">
                <button
                    onClick={handleEditModeToggle}
                    className={`toolbar-button ${isEditingMode ? 'active' : ''}`}
                    title={isEditingMode ? t('minimalToolbar', 'disableEditingMode') : t('minimalToolbar', 'enableEditingMode')}
                >
                    <CiEdit/>
                    <span className="button-label">{t('minimalToolbar', 'edit')}</span>
                </button>
            </div>

            {/* Zoom Section */}
            <div className="toolbar-section">
                <ZoomControls zoomLevel={zoomLevel} setZoomLevel={setZoomLevel}/>
            </div>
        </>
    );
};

export default MinimalToolbar;
