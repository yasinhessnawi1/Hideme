// src/components/pdf/pdf_component/AutoProcessControls.tsx
import React, { useState } from 'react';
import { useFileContext } from '../../../contexts/FileContext';
import StorageSettings from './StorageSettings';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './../../../styles/modules/pdf/AutoProcessControls.css'
/**
 * Control component for auto-processing settings and storage persistence
 * Can be added to settings menus or toolbars
 */
const AutoProcessControls: React.FC = () => {
    const { isAutoProcessingEnabled, setAutoProcessingEnabled } = useFileContext();
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="settings-controls-wrapper">
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

            <button
                className="toggle-advanced-button"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? (
                    <>
                        <span>Hide Advanced Settings</span>
                        <ChevronUp size={16} />
                    </>
                ) : (
                    <>
                        <span>Show Advanced Settings</span>
                        <ChevronDown size={16} />
                    </>
                )}
            </button>

            {isExpanded && (
                <div className="advanced-settings">
                    <StorageSettings />
                </div>
            )}
        </div>
    );
};

export default AutoProcessControls;
