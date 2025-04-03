import React, { useEffect, useState } from 'react';
import { useFileContext } from '../../../contexts/FileContext';
import { getFileKey } from '../../../contexts/PDFViewerContext';
import { autoProcessManager } from '../../../utils/AutoProcessManager';
import '../../../styles/modules/pdf/PdfViewer.css'
const ProcessingStatus: React.FC = () => {
    const { activeFiles } = useFileContext();
    const [processingFiles, setProcessingFiles] = useState<Record<string, string>>({});

    // Poll for status updates
    useEffect(() => {
        const interval = setInterval(() => {
            const statuses: Record<string, string> = {};

            activeFiles.forEach(file => {
                const fileKey = getFileKey(file);
                const status = autoProcessManager.getProcessingStatus(fileKey);

                if (status) {
                    if (status.status === 'processing') {
                        statuses[fileKey] = `Processing ${file.name}...`;
                    } else if (status.status === 'failed') {
                        statuses[fileKey] = `Failed to process ${file.name}`;
                    }
                }
            });

            setProcessingFiles(statuses);
        }, 500);

        return () => clearInterval(interval);
    }, [activeFiles]);

    if (Object.keys(processingFiles).length === 0) {
        return null;
    }

    return (
        <div className="processing-status-container">
            {Object.values(processingFiles).map((message, index) => (
                <div key={index} className="processing-status-message">
                    {message}
                </div>
            ))}
        </div>
    );
};

export default ProcessingStatus;
