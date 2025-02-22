// src/components/playground/PlaygroundToolbar.tsx
import React, { useRef } from 'react';
import { FaUpload, FaSearchPlus, FaSearchMinus, FaHighlighter, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { usePdfContext } from '../../contexts/PdfContext';
import '../../styles/playground/Toolbar.css';

const PlaygroundToolbar: React.FC = () => {
    const {
        setFile,
        zoomLevel, setZoomLevel,
        isEditingMode, setIsEditingMode,
    } = usePdfContext();

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleZoomIn = () => {
        setZoomLevel(zoomLevel + 0.2);
    };

    const handleZoomOut = () => {
        if (zoomLevel > 0.4) {
            setZoomLevel(zoomLevel - 0.2);
        }
    };


    // Toggle editing mode (which controls whether user can create new highlights)
    const toggleEditing = () => {
        setIsEditingMode(!isEditingMode);
    };

    return (
        <div className="playground-toolbar">
            <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
            />
            <button onClick={handleUploadClick} className="toolbar-button" title="Upload PDF">
                <FaUpload className="toolbar-icon" />
            </button>
            <button onClick={toggleEditing} className="toolbar-button" title="Toggle Highlight Mode">
                {isEditingMode ? (
                    <>
                        <FaHighlighter className="toolbar-icon active" /> <span>Highlight ON</span>
                    </>
                ) : (
                    <>
                        <FaHighlighter className="toolbar-icon" /> <span>Highlight OFF</span>
                    </>
                )}
            </button>

            <button onClick={handleZoomIn} className="toolbar-button" title="Zoom In">
                <FaSearchPlus className="toolbar-icon" />
            </button>
            <button onClick={handleZoomOut} className="toolbar-button" title="Zoom Out">
                <FaSearchMinus className="toolbar-icon" />
            </button>
        </div>
    );
};

export default PlaygroundToolbar;
