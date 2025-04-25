import React from 'react';
import { useEditContext } from '../../contexts/EditContext';
import '../../styles/modules/pdf/Toolbar.css'; // Assuming shared styles

const ToolbarSettingsMenu: React.FC = () => {
    const {
        highlightColor,
        setHighlightColor,
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
    } = useEditContext();

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setHighlightColor(e.target.value);
    };

    const handleResetEntityColors = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Assuming reset logic is handled within setPresidioColor, etc. or needs a specific context function
        // For now, just setting default colors (replace with actual defaults or context call)
        setPresidioColor('#FFDDC1'); // Example default
        setGlinerColor('#C1FFD7'); // Example default
        setGeminiColor('#D1C1FF'); // Example default
        setHidemeColor('#FFC1E3'); // Example default
        setSearchColor('#FFFFC1'); // Example default
    };

    return (
        <>
            <div className="dropdown-section">
                <h5 className="dropdown-title">Manual Highlight</h5>
                <div className="dropdown-item">
                    <label onClick={(e) => e.stopPropagation()}>
                        Color
                        <input
                            type="color"
                            value={highlightColor}
                            onChange={handleColorChange}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </label>
                </div>
            </div>

            <div className="dropdown-section">
                <h5 className="dropdown-title">Entity Model Colors</h5>
                <div className="dropdown-item">
                    <label onClick={(e) => e.stopPropagation()}>
                        Presidio
                        <input
                            type="color"
                            value={presidioColor}
                            onChange={(e) => setPresidioColor(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </label>
                </div>
                <div className="dropdown-item">
                    <label onClick={(e) => e.stopPropagation()}>
                        Gliner
                        <input
                            type="color"
                            value={glinerColor}
                            onChange={(e) => setGlinerColor(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </label>
                </div>
                <div className="dropdown-item">
                    <label onClick={(e) => e.stopPropagation()}>
                        Gemini
                        <input
                            type="color"
                            value={geminiColor}
                            onChange={(e) => setGeminiColor(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </label>
                </div>
                <div className="dropdown-item">
                    <label onClick={(e) => e.stopPropagation()}>
                        HideMe AI
                        <input
                            type="color"
                            value={hidemeColor}
                            onChange={(e) => setHidemeColor(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </label>
                </div>
                <div className="dropdown-item">
                    <label onClick={(e) => e.stopPropagation()}>
                        Search
                        <input
                            type="color"
                            value={searchColor}
                            onChange={(e) => setSearchColor(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </label>
                </div>
                <div className="dropdown-item">
                    <button onClick={handleResetEntityColors}>Reset Entity Colors</button>
                </div>
            </div>
        </>
    );
};

export default ToolbarSettingsMenu; 