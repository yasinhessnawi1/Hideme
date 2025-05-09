import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FaCog, FaDrawPolygon, FaFont, FaHighlighter, FaRegEye, FaRegEyeSlash} from 'react-icons/fa';
import {CiEdit} from 'react-icons/ci';
import {HighlightCreationMode} from '../../types';
import ToolbarVisibilityMenu from './ToolbarVisibilityMenu';
import ToolbarSettingsMenu from './ToolbarSettingsMenu';
import '../../styles/modules/pdf/Toolbar.css';
import {ZoomControls} from "./Toolbar";
import {useEditContext} from "../../contexts/EditContext";
import { useNotification } from '../../contexts/NotificationContext';

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
        setHighlightingMode,
    } = useEditContext();
    // --- State and Refs for Toolbar Dropdowns --- //
    const visibilityButtonRef = useRef<HTMLButtonElement | null>(null);
    const visibilityMenuRef = useRef<HTMLDivElement | null>(null);
    const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
    const settingsMenuRef = useRef<HTMLDivElement | null>(null);
    const editButtonRef = useRef<HTMLButtonElement | null>(null);
    const editMenuRef = useRef<HTMLDivElement | null>(null);
    const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const {notify} = useNotification();
    const {
        isEditingMode,
        highlightingMode,
        showManualHighlights,
        showSearchHighlights,
        showEntityHighlights,
        // Colors are handled by ToolbarSettingsMenu
    } = useEditContext();


    const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);

    // --- Dropdown Toggle Handlers --- //
    const toggleVisibilityMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsVisibilityMenuOpen(prev => !prev);
        setIsSettingsMenuOpen(false);
        setIsEditMenuOpen(false);
    }, []);

    const toggleSettingsMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsSettingsMenuOpen(prev => !prev);
        setIsVisibilityMenuOpen(false);
        setIsEditMenuOpen(false);
    }, []);

    const handleEditModeToggle = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsEditMenuOpen(prev => !prev);
        setIsVisibilityMenuOpen(false);
        setIsSettingsMenuOpen(false);
    }, [isEditingMode, setIsEditingMode]);


    const getHighlightIcon = () => {
        if (!isEditingMode) return <CiEdit/>;
        switch (highlightingMode) {
            case HighlightCreationMode.RECTANGULAR:
                return <FaDrawPolygon/>;
            case HighlightCreationMode.TEXT_SELECTION:
                return <FaFont/>;
            default:
                return <FaHighlighter/>; // Default or fallback icon
        }
    };
    const onSetRectangularHighlightingMode = useCallback(() => {
        setHighlightingMode(HighlightCreationMode.RECTANGULAR);
        setIsEditingMode(true);
        setIsEditMenuOpen(false);
        notify({
            type: 'success',
            message: 'Highlighting mode set to rectangular',
            position: 'top-right'
        });
    }, [setHighlightingMode, setIsEditingMode]);

    const onSetTextSelectionHighlightingMode = useCallback(() => {
        setHighlightingMode(HighlightCreationMode.TEXT_SELECTION);
        setIsEditingMode(true);
        setIsEditMenuOpen(false);
        notify({
            type: 'success',
            message: 'Highlighting mode set to text selection',
            position: 'top-right'
        });
    }, [setHighlightingMode, setIsEditingMode]);
    const getHighlightLabel = () => {
        if (!isEditingMode) return 'Edit';
        switch (highlightingMode) {
            case HighlightCreationMode.RECTANGULAR:
                return 'Area';
            case HighlightCreationMode.TEXT_SELECTION:
                return 'Text';
            default:
                return 'Edit';
        }
    };
    // Handle clicks outside dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isVisibilityMenuOpen && visibilityMenuRef.current && !visibilityMenuRef.current.contains(event.target as Node) && !visibilityButtonRef.current?.contains(event.target as Node)) {
                setIsVisibilityMenuOpen(false);
            }
            if (isSettingsMenuOpen && settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node) && !settingsButtonRef.current?.contains(event.target as Node)) {
                setIsSettingsMenuOpen(false);
            }
            if (isEditMenuOpen && editMenuRef.current && !editMenuRef.current.contains(event.target as Node) && !editButtonRef.current?.contains(event.target as Node)) {
                setIsEditMenuOpen(false);
                setIsEditingMode(true);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisibilityMenuOpen, isSettingsMenuOpen, isEditMenuOpen]);
    return (
        <>
            {/* Edit Mode / Visibility / Settings Section */}
            <div className="toolbar-section">
                <div className="toolbar-dropdown">
                    <button
                        ref={editButtonRef}
                        onClick={handleEditModeToggle} // Use the passed toggle handler
                        onDoubleClick={() => setIsEditingMode(!isEditingMode)}
                        className={`toolbar-button ${isEditingMode ? 'active' : ''}`}
                        title={isEditingMode ? `Highlight Mode: ${getHighlightLabel()} (Double Click to Disable)` : "Enable Editing Mode"}
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
                                    <FaDrawPolygon size={16}/>
                                    <span>Rectangular Selection</span>
                                </div>
                                <div
                                    className={`dropdown-item ${highlightingMode === HighlightCreationMode.TEXT_SELECTION ? 'active' : ''}`}
                                    onClick={onSetTextSelectionHighlightingMode}
                                >
                                    <FaFont size={16}/>
                                    <span>Text Selection</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="toolbar-dropdown">
                    <button
                        ref={visibilityButtonRef}
                        onClick={toggleVisibilityMenu}
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
                            <ToolbarVisibilityMenu/>
                        </div>
                    )}
                </div>

                <div className="toolbar-dropdown">
                    <button
                        ref={settingsButtonRef}
                        onClick={toggleSettingsMenu}
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
                            <ToolbarSettingsMenu/>
                        </div>
                    )}
                </div>
            </div>

            {/* Zoom Section */}
            <div className="toolbar-section">
                <ZoomControls zoomLevel={zoomLevel} setZoomLevel={setZoomLevel}></ZoomControls>
            </div>
        </>
    );
};

export default MinimalToolbar;
