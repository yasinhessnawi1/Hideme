import React from 'react';
import { useEditContext } from '../../contexts/EditContext';
import '../../styles/modules/pdf/Toolbar.css'; // Assuming shared styles
import { useNotification } from '../../contexts/NotificationContext';

const ToolbarSettingsMenu: React.FC = () => {
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
        manualColor
    } = useEditContext();

    const { notify } = useNotification();


    const handleManualColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setManualColor(e.target.value);
    };

    //see edit context states.
    const handleResetEntityColors = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPresidioColor('#ffd771'); // Yellow
        setGlinerColor('#ff7171'); // Red
        setGeminiColor('#7171ff'); // Blue
        setHidemeColor('#71ffa0'); // Gr
        setSearchColor('#71c4ff');
        setManualColor('#00ff15');
        notify({
            type: 'success',
            message: 'Colors reset successfully!',
            position: 'top-right'
        });
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
                            value={manualColor}
                            onChange={handleManualColorChange}
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
