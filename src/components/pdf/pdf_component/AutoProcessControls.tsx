// src/components/pdf/pdf_component/AutoProcessControls.tsx
import React, { useState } from 'react';
import useSettings from '../../../hooks/settings/useSettings';
import StorageSettings from './StorageSettings';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'; // Added Loader2
import './../../../styles/modules/pdf/AutoProcessControls.css'
import {useLoading} from "../../../contexts/LoadingContext";
/**
 * Control component for auto-processing settings and storage persistence
 * Can be added to settings menus or toolbars
 */
const AutoProcessControls: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { settings, updateSettings, isLoading: userLoading } = useSettings(); // Use the settings hook
    const isAutoProcessingEnabled = settings?.auto_processing ?? false; // Default to false
    const { startLoading, stopLoading, isLoading: isGlobalLoading } = useLoading();

    const handleToggleAutoProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const enabled = e.target.checked;
        stopLoading('auto_processing.update');
        try {
            await updateSettings({ auto_processing: enabled });
            console.log('[AutoProcessControls] Updated auto_detect setting successfully.');
        } catch (error) {
            console.error('[AutoProcessControls] Failed to update auto_detect setting:', error);
            // Optionally revert UI or show error
        } finally {
            stopLoading('auto_processing.update');
        }
    };
    return (
        <div className="settings-controls-wrapper">
            <div className="auto-process-controls">
                <label className={`control-label ${userLoading || isGlobalLoading('auto_processing.update')? 'disabled' : ''}`}>
                    <input
                        type="checkbox"
                        checked={isAutoProcessingEnabled}
                        onChange={handleToggleAutoProcess} // Use the new handler
                        disabled={userLoading || isGlobalLoading('auto_processing.update')} // Disable while loading/updating
                    />
                    <span className="label-text">Auto-process new files</span>
                    {(userLoading ||isGlobalLoading('auto_processing.update') ) && <Loader2 size={16} className="animate-spin loading-indicator" />}
                </label>
                <div className="help-text">
                    {isAutoProcessingEnabled ? (
                        <span>New files will automatically use saved detection settings</span>
                    ) : (
                        <span>New files will not be automatically processed</span>
                    )}
                </div>
            </div>

            {/* Toggle advanced button remains the same */}
            <button
                className="toggle-advanced-button"
                onClick={() => setIsExpanded(!isExpanded)}
                disabled={userLoading} // Optionally disable if needed
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
