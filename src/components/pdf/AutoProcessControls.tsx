// src/components/pdf/pdf_component/AutoProcessControls.tsx
import React from 'react';
import { useFileContext } from '../../contexts/FileContext';

/**
 * Control component for auto-processing settings
 * Can be added to settings menus or toolbars
 */
const AutoProcessControls: React.FC = () => {
    const { isAutoProcessingEnabled, setAutoProcessingEnabled } = useFileContext();

    return (
        <div className="auto-process-controls">
            <label className="control-label">
                <input
                    type="checkbox"
                    checked={isAutoProcessingEnabled}
                    onChange={(e) => setAutoProcessingEnabled(e.target.checked)}
                />
                <span className="label-text">Auto-process new files</span>
            </label>
            <div className="help-text">
                {isAutoProcessingEnabled ? (
                    <span>New files will automatically inherit current entity and search settings</span>
                ) : (
                    <span>New files will not be automatically processed</span>
                )}
            </div>
        </div>
    );
};

export default AutoProcessControls;
