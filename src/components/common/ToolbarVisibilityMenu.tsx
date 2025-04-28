import React from 'react';
import { useEditContext } from '../../contexts/EditContext';
import { useHighlightStore } from '../../contexts/HighlightStoreContext';
import { HighlightType } from '../../types';
import '../../styles/modules/pdf/Toolbar.css'; // Assuming shared styles
import { useFileContext } from '../../contexts/FileContext';
import { useNotification } from '../../contexts/NotificationContext';

const ToolbarVisibilityMenu: React.FC = () => {
    const {
        showSearchHighlights,
        setShowSearchHighlights,
        showEntityHighlights,
        setShowEntityHighlights,
        showManualHighlights,
        setShowManualHighlights
    } = useEditContext();
    const {files , selectedFiles} = useFileContext();
    const filesToClear = selectedFiles.length > 0 ? selectedFiles : files;
    const {notify} = useNotification();

    const {
        removeAllHighlights,
        removeAllHighlightsByType
    } = useHighlightStore();

    const handleToggleManualHighlights = (e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setShowManualHighlights(!showManualHighlights);
        notify({
            type: 'success',
            message: 'Manual Highlights is now ' + (!showManualHighlights ? 'visible' : 'hidden') + '!',
            position: 'top-right'
        });
    };

    const handleToggleSearchHighlights = (e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setShowSearchHighlights(!showSearchHighlights);
        notify({
            type: 'success',
            message: 'Search Highlights is now ' + (showSearchHighlights ? 'visible' : 'hidden') + '!',
            position: 'top-right'
        });
    };

    const handleToggleEntityHighlights = (e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setShowEntityHighlights(!showEntityHighlights);
        notify({
            type: 'success',
            message: 'Entity Highlights is now ' + (showEntityHighlights ? 'visible' : 'hidden') + '!',
            position: 'top-right'
        });
    };

    const handleClearAllHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        removeAllHighlights(filesToClear);
        notify({
            type: 'success',
            message: 'All Highlights Cleared!',
            position: 'top-right'
        });
    };

    const handleClearManualHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        removeAllHighlightsByType(HighlightType.MANUAL, filesToClear);
        notify({
            type: 'success',
            message: 'Manual Highlights Cleared!',
            position: 'top-right'
        });
    };

    const handleClearSearchHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        removeAllHighlightsByType(HighlightType.SEARCH, filesToClear);
        notify({
            type: 'success',
            message: 'Search Highlights Cleared!',
            position: 'top-right'
        });
    };

    const handleClearEntityHighlights = (e: React.MouseEvent) => {
        e.stopPropagation();
        removeAllHighlightsByType(HighlightType.ENTITY,  filesToClear);
        notify({
            type: 'success',
            message: 'Entity Highlights Cleared!',
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
                    Manual Highlights
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
                    Search Highlights
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
                    Entity Highlights
                </label>
            </div>
            <div className="dropdown-divider"></div>
            <div className="dropdown-item">
                <button onClick={handleClearAllHighlights}>Clear All</button>
            </div>
            <div className="dropdown-item">
                <button onClick={handleClearManualHighlights}>Clear Manual</button>
            </div>
            <div className="dropdown-item">
                <button onClick={handleClearSearchHighlights}>Clear Search</button>
            </div>
            <div className="dropdown-item">
                <button onClick={handleClearEntityHighlights}>Clear Entity</button>
            </div>
        </>
    );
};

export default ToolbarVisibilityMenu;
