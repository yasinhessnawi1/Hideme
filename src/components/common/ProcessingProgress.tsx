import React from 'react';
import { ProcessingInfo } from '../../services/ProcessingStateService';
import '../../styles/modules/common/ProcessingProgress.css';
interface ProcessingProgressProps {
    processingInfo: ProcessingInfo;
    showPercentage?: boolean;
    showLabel?: boolean;
    customLabel?: string;
    className?: string;
    onCancel?: () => void;
}

/**
 * Reusable component for displaying processing progress
 * Features:
 * - Smooth progress bar animation
 * - Optional percentage display
 * - Optional status label
 * - Customizable appearance
 * - Optional cancel button
 */
const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
                                                                   processingInfo,
                                                                   showPercentage = true,
                                                                   showLabel = true,
                                                                   customLabel,
                                                                   className = '',
                                                                   onCancel
                                                               }) => {
    const { status, progress } = processingInfo;

    // Determine the label text based on status and custom label
    const getLabel = () => {
        if (customLabel) return customLabel;

        switch (status) {
            case 'queued':
                return 'Queued...';
            case 'processing':
                return 'Processing...';
            case 'completed':
                return 'Completed';
            case 'failed':
                return 'Failed';
            default:
                return 'Waiting...';
        }
    };

    // Determine color classes based on status
    const getColorClass = () => {
        switch (status) {
            case 'completed':
                return 'progress-success';
            case 'failed':
                return 'progress-error';
            case 'processing':
                return 'progress-processing';
            default:
                return '';
        }
    };

    return (
        <div className={`processing-progress-container ${className} ${getColorClass()}`}>
            {showLabel && (
                <div className="processing-label">
                    {getLabel()} {showPercentage && status === 'processing' && `${Math.round(progress)}%`}
                </div>
            )}

            <div className="progress-container">
                <div
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    role="progressbar"
                />
            </div>

            {onCancel && status === 'processing' && (
                <button
                    className="cancel-processing-button"
                    onClick={onCancel}
                    aria-label="Cancel processing"
                >
                    Cancel
                </button>
            )}
        </div>
    );
};

export default ProcessingProgress;
