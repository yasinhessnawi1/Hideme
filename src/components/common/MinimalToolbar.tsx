import React from 'react';
import {
    FaCog,
    FaHighlighter,
    FaRegEye,
    FaRegEyeSlash,
    FaSearchMinus,
    FaSearchPlus,
    FaDrawPolygon,
    FaFont
} from 'react-icons/fa';
import { HighlightCreationMode } from '../../types';
import ToolbarVisibilityMenu from './ToolbarVisibilityMenu';
import ToolbarSettingsMenu from './ToolbarSettingsMenu';
import '../../styles/modules/pdf/Toolbar.css';

interface MinimalToolbarProps {
    zoomLevel: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;

    isEditingMode: boolean;
    highlightingMode: HighlightCreationMode;
    onEditModeToggle: (e: React.MouseEvent) => void;
    onSetRectangularHighlightingMode: () => void;
    onSetTextSelectionHighlightingMode: () => void;
    isEditMenuOpen: boolean;
    editButtonRef: React.RefObject<HTMLButtonElement | null>;
    editMenuRef: React.RefObject<HTMLDivElement | null>;

    showManualHighlights: boolean;
    showSearchHighlights: boolean;
    showEntityHighlights: boolean;
    onVisibilityToggle: (e: React.MouseEvent) => void;
    isVisibilityMenuOpen: boolean;
    visibilityButtonRef: React.RefObject<HTMLButtonElement | null>;
    visibilityMenuRef: React.RefObject<HTMLDivElement | null>;

    onSettingsToggle: (e: React.MouseEvent) => void;
    isSettingsMenuOpen: boolean;
    settingsButtonRef: React.RefObject<HTMLButtonElement | null>;
    settingsMenuRef: React.RefObject<HTMLDivElement | null>;
}

const MinimalToolbar: React.FC<MinimalToolbarProps> = ({
                                                           zoomLevel,
                                                           onZoomIn,
                                                           onZoomOut,
                                                           onZoomReset,
                                                           isEditingMode,
                                                           highlightingMode,
                                                           onEditModeToggle,
                                                           onSetRectangularHighlightingMode,
                                                           onSetTextSelectionHighlightingMode,
                                                           isEditMenuOpen,
                                                           editButtonRef,
                                                           editMenuRef,
                                                           showManualHighlights,
                                                           showSearchHighlights,
                                                           showEntityHighlights,
                                                           onVisibilityToggle,
                                                           isVisibilityMenuOpen,
                                                           visibilityButtonRef,
                                                           visibilityMenuRef,
                                                           onSettingsToggle,
                                                           isSettingsMenuOpen,
                                                           settingsButtonRef,
                                                           settingsMenuRef,
                                                       }) => {

    const getHighlightIcon = () => {
        if (!isEditingMode) return <FaRegEye />;
        switch (highlightingMode) {
            case HighlightCreationMode.RECTANGULAR:
                return <FaDrawPolygon />;
            case HighlightCreationMode.TEXT_SELECTION:
                return <FaFont />;
            default:
                return <FaHighlighter />; // Default or fallback icon
        }
    };

    const getHighlightLabel = () => {
        if (!isEditingMode) return 'View';
        switch (highlightingMode) {
            case HighlightCreationMode.RECTANGULAR:
                return 'Area';
            case HighlightCreationMode.TEXT_SELECTION:
                return 'Text';
            default:
                return 'Edit';
        }
    };

    return (
        <>
            {/* Edit Mode / Visibility / Settings Section */}
            <div className="toolbar-section">
                <div className="toolbar-dropdown">
                    <button
                        ref={editButtonRef}
                        onClick={onEditModeToggle} // Use the passed toggle handler
                        className={`toolbar-button ${isEditingMode ? 'active' : ''}`}
                        title={isEditingMode ? `Highlight Mode: ${getHighlightLabel()}` : "Enable Editing Mode"}
                    >
                        {getHighlightIcon()}
                        <span className="button-label">{getHighlightLabel()}</span>
                    </button>

                    {isEditMenuOpen && (
                        <div
                            className="dropdown-menu"
                            ref={editMenuRef}
                            onClick={(e) => e.stopPropagation()} // Prevent menu close on item click
                        >
                            <div className="dropdown-section">
                                <h5 className="dropdown-title">Highlight Mode</h5>
                                <div
                                    className={`dropdown-item ${highlightingMode === HighlightCreationMode.RECTANGULAR ? 'active' : ''}`}
                                    onClick={onSetRectangularHighlightingMode}
                                >
                                    <FaDrawPolygon size={16} />
                                    <span>Rectangular Selection</span>
                                </div>
                                <div
                                    className={`dropdown-item ${highlightingMode === HighlightCreationMode.TEXT_SELECTION ? 'active' : ''}`}
                                    onClick={onSetTextSelectionHighlightingMode}
                                >
                                    <FaFont size={16} />
                                    <span>Text Selection</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="toolbar-dropdown">
                    <button
                        ref={visibilityButtonRef}
                        onClick={onVisibilityToggle}
                        className="toolbar-button visibility-toggle"
                        title="Highlight Visibility"
                    >
                        {showManualHighlights && showSearchHighlights && showEntityHighlights ? (
                            <FaRegEye/>
                        ) : (
                            <FaRegEyeSlash/>
                        )}
                        <span className="button-label">Show</span>
                    </button>
                    {isVisibilityMenuOpen && (
                        <div
                            className="dropdown-menu"
                            ref={visibilityMenuRef}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ToolbarVisibilityMenu />
                        </div>
                    )}
                </div>

                <div className="toolbar-dropdown">
                    <button
                        ref={settingsButtonRef}
                        onClick={onSettingsToggle}
                        className="toolbar-button settings-toggle"
                        title="Settings"
                    >
                        <FaCog/>
                        <span className="button-label">Settings</span>
                    </button>
                    {isSettingsMenuOpen && (
                        <div
                            className="dropdown-menu"
                            ref={settingsMenuRef}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ToolbarSettingsMenu />
                        </div>
                    )}
                </div>
            </div>

            {/* Zoom Section */}
            <div className="toolbar-section">
                <button
                    onClick={onZoomOut}
                    className="toolbar-button"
                    title="Zoom Out"
                    disabled={zoomLevel <= 0.5}
                >
                    <FaSearchMinus/>
                </button>

                {/* Use onClick for reset zoom */}
                <span className="zoom-level" onClick={onZoomReset} title="Reset Zoom (100%)" style={{ cursor: 'pointer' }}>
                    {Math.round(zoomLevel * 100)}%
                </span>

                <button
                    onClick={onZoomIn}
                    className="toolbar-button"
                    title="Zoom In"
                    disabled={zoomLevel >= 3.0}
                >
                    <FaSearchPlus/>
                </button>
            </div>
        </>
    );
};

export default MinimalToolbar; 