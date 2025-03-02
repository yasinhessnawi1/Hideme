import React, { useState, useEffect } from 'react';
import { usePDFContext, RedactionMapping } from '../../contexts/PDFContext';
import { useHighlightContext, HighlightType } from '../../contexts/HighlightContext';
import { usePDFApi } from '../../hooks/usePDFApi';
import { createFullRedactionMapping, getRedactionStatistics } from '../../utils/redactionUtils';
import '../../styles/pdf/SettingsSidebar.css';

const RedactionSidebar: React.FC = () => {
    const {
        file,
        detectionMapping,
        setDetectionMapping,
        setFile,
    } = usePDFContext();

    const {
        annotations,
        clearAnnotationsByType
    } = useHighlightContext();

    const { runRedactPdf } = usePDFApi();

    const [isRedacting, setIsRedacting] = useState(false);

    const [redactionOptions, setRedactionOptions] = useState({
        includeSearchHighlights: true,
        includeEntityHighlights: true,
        includeManualHighlights: true
    });

    const [redactionPreview, setRedactionPreview] = useState<{
        mapping: RedactionMapping | null;
        stats: any;
    }>({
        mapping: null,
        stats: null
    });

    // Generate redaction preview when relevant state changes
    useEffect(() => {
        if (!file) {
            setRedactionPreview({ mapping: null, stats: null });
            return;
        }

        const { includeSearchHighlights, includeEntityHighlights, includeManualHighlights } = redactionOptions;

        const fullMapping = createFullRedactionMapping(
            annotations,
            detectionMapping,
            includeSearchHighlights,
            includeEntityHighlights,
            includeManualHighlights
        );

        const stats = getRedactionStatistics(fullMapping);

        setRedactionPreview({
            mapping: fullMapping,
            stats
        });
    }, [
        file,
        annotations,
        detectionMapping,
        redactionOptions.includeSearchHighlights,
        redactionOptions.includeEntityHighlights,
        redactionOptions.includeManualHighlights
    ]);

    // Handle redaction using the current detection mapping
    const handleRedact = async () => {
        if (!file || !redactionPreview.mapping || redactionPreview.mapping.pages.length === 0) {
            alert('No redaction items found. Please add highlights or detect entities first.');
            return;
        }

        if (!window.confirm('Are you sure you want to redact the highlighted content? This will create a new PDF document.')) {
            return;
        }

        try {
            setIsRedacting(true);

            console.log('Running redaction with mapping:', redactionPreview.mapping);
            const redactedBlob = await runRedactPdf(file, redactionPreview.mapping);

            // Create a new File object from the Blob
            const redactedFile = new File([redactedBlob], 'redacted.pdf', { type: 'application/pdf' });

            // Update the current file with the redacted version
            setFile(redactedFile);

            // Also trigger download of the redacted PDF
            const url = URL.createObjectURL(redactedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'redacted.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Clear highlights since they're now redacted
            clearAnnotationsByType(HighlightType.MANUAL);
            clearAnnotationsByType(HighlightType.SEARCH);
            clearAnnotationsByType(HighlightType.ENTITY);

            // Clear detection mapping
            setDetectionMapping(null);

            console.log('Redaction complete, redacted PDF set as current document');
        } catch (error) {
            console.error('Error during redaction:', error);
            alert('An error occurred during redaction. Please try again.');
        } finally {
            setIsRedacting(false);
        }
    };

    return (
        <div className="redaction-sidebar">
            <div className="sidebar-header">
                <h3>Redaction Tools</h3>
                <div className="redaction-mode-badge">Redaction Mode</div>
            </div>

            <div className="sidebar-content">
                <div className="sidebar-section">
                    <h4>Redaction Options</h4>
                    <div className="checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={redactionOptions.includeManualHighlights}
                                onChange={() => setRedactionOptions(prev => ({
                                    ...prev,
                                    includeManualHighlights: !prev.includeManualHighlights
                                }))}
                            />
                            <span className="checkmark"></span>
                            Include Manual Highlights
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={redactionOptions.includeSearchHighlights}
                                onChange={() => setRedactionOptions(prev => ({
                                    ...prev,
                                    includeSearchHighlights: !prev.includeSearchHighlights
                                }))}
                            />
                            <span className="checkmark"></span>
                            Include Search Highlights
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={redactionOptions.includeEntityHighlights}
                                onChange={() => setRedactionOptions(prev => ({
                                    ...prev,
                                    includeEntityHighlights: !prev.includeEntityHighlights
                                }))}
                            />
                            <span className="checkmark"></span>
                            Include Detected Entities
                        </label>
                    </div>
                </div>

                {redactionPreview.stats && redactionPreview.stats.totalItems > 0 ? (
                    <div className="sidebar-section">
                        <h4>Redaction Preview</h4>
                        <div className="detection-stats">
                            <div className="stat-item">
                                <span className="stat-label">Total Items</span>
                                <span className="stat-value">{redactionPreview.stats.totalItems}</span>
                            </div>

                            <div className="stat-item">
                                <span className="stat-label">Entity Types</span>
                                <span className="stat-value">{Object.keys(redactionPreview.stats.byType).length}</span>
                            </div>
                        </div>

                        <h5>By Entity Type</h5>
                        <div className="stat-breakdown">
                            {Object.entries(redactionPreview.stats.byType).map(([type, count]) => (
                                <div key={type} className="stat-row">
                                    <span className="entity-type">{type}</span>
                                    <span className="entity-count">{count as number}</span>
                                </div>
                            ))}
                        </div>

                        <h5>By Page</h5>
                        <div className="stat-breakdown">
                            {Object.entries(redactionPreview.stats.byPage).map(([pageStr, count]) => {
                                const page = parseInt(pageStr);
                                return (
                                    <div key={`page-${page}`} className="stat-row">
                                        <span className="page-number">Page {page}</span>
                                        <span className="entity-count">{count as number}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="sidebar-section button-group">
                            <button
                                className="sidebar-button primary-button redact-button"
                                onClick={handleRedact}
                                disabled={isRedacting || !redactionPreview.mapping}
                            >
                                {isRedacting ? 'Processing...' : 'Redact Content'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="sidebar-section empty-state">
                        <div className="empty-message">
                            <p>No content selected for redaction.</p>
                            <p>Use the options above to include highlighted content.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RedactionSidebar;
