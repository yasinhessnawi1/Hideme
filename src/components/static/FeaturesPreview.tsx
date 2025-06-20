import React from 'react';
import {useLanguage} from '../../contexts/LanguageContext';
import CountUp from '../common/CountUp';

interface ToolPreviewCardProps {
    title: string;
    description: string;
    icon: string;
    category: 'tool' | 'detection';
}

const ToolPreviewCard: React.FC<ToolPreviewCardProps> = ({ title, description, icon, category }) => {
    return (
        <div className={`tool-preview-card ${category}`}>
            <div className="tool-preview-icon">{icon}</div>
            <h4>{title}</h4>
            <p>{description}</p>
        </div>
    );
};

const FeaturesPreview: React.FC = () => {
    const { t } = useLanguage();

    const coreTools = [
        {
            title: t('featuresPreview', 'smartRedactionTitle'),
            description: t('featuresPreview', 'smartRedactionDescription'),
            icon: '🤖',
            category: 'tool' as const
        },
        {
            title: t('features', 'manualHighlightingTitle'),
            description: t('features', 'manualHighlightingDescription'),
            icon: '✏️',
            category: 'tool' as const
        },
        {
            title: t('featuresPreview', 'searchRedactTitle'),
            description: t('featuresPreview', 'searchRedactDescription'),
            icon: '🔍',
            category: 'tool' as const
        },
        {
            title: t('features', 'imageRedactionTitle'),
            description: t('features', 'imageRedactionDescription'),
            icon: '🖼️',
            category: 'tool' as const
        },
        {
            title: t('features', 'autoProcessingTitle'),
            description: t('features', 'autoProcessingDescription'),
            icon: '⚡',
            category: 'tool' as const
        },
        {
            title: t('featuresPreview', 'privacyProtectionTitle'),
            description: t('featuresPreview', 'privacyProtectionDescription'),
            icon: '🔐',
            category: 'tool' as const
        }
    ];

    const detectionMethods = [
        {
            title: t('featuresPreview', 'hidemeAIRecommendedTitle'),
            description: t('featuresPreview', 'hidemeAIRecommendedDescription'),
            icon: '🚀',
            category: 'detection' as const
        },
        {
            title: t('features', 'presidioMLDetectionTitle'),
            description: t('featuresPreview', 'presidioMLDescription'),
            icon: '🛡️',
            category: 'detection' as const
        },
        {
            title: t('featuresPreview', 'glinerMLTitle'),
            description: t('featuresPreview', 'glinerMLDescription'),
            icon: '🔒',
            category: 'detection' as const
        },
        {
            title: t('features', 'geminiAI'),
            description: t('featuresPreview', 'geminiAIDescription'),
            icon: '🤖',
            category: 'detection' as const
        }
    ];

    return (
        <section className="features-preview">
            <div className="features-preview-container">
                <div className="features-preview-header">
                    <h2>{t('featuresPreview', 'powerfulRedactionTools')}</h2>
                    <p>{t('featuresPreview', 'everythingYouNeed')}</p>
                </div>

                <div className="tools-preview-section">
                    <h3>{t('featuresPreview', 'coreFeatures')}</h3>
                    <div className="tools-preview-grid">
                        {coreTools.map((tool, index) => (
                            <ToolPreviewCard
                                key={index}
                                title={tool.title}
                                description={tool.description}
                                icon={tool.icon}
                                category={tool.category}
                            />
                        ))}
                    </div>
                </div>

                <div className="detection-preview-section">
                    <h3>{t('featuresPreview', 'aiDetectionMethods')}</h3>
                    <div className="detection-preview-grid">
                        {detectionMethods.map((method, index) => (
                            <ToolPreviewCard
                                key={index}
                                title={method.title}
                                description={method.description}
                                icon={method.icon}
                                category={method.category}
                            />
                        ))}
                    </div>
                </div>

                <div className="features-preview-footer">
                    <div className="preview-stats">
                        <div className="stat-item">
                            <span className="stat-number"><CountUp
                                from={0}
                                to={20}
                                separator=","
                                direction="up"
                                duration={1}
                                className="count-up-text"
                            />+</span>
                            <span className="stat-label">{t('pdf', 'redactionTools')}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number"><CountUp
                                from={0}
                                to={50}
                                separator=","
                                direction="up"
                                duration={1}
                                className="count-up-text"
                            />+</span>
                            <span className="stat-label">{t('featuresPreview', 'entityTypes')}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number"><CountUp
                                from={0}
                                to={4}
                                separator=","
                                direction="up"
                                duration={1}
                                className="count-up-text"
                            />+</span>
                            <span className="stat-label">{t('featuresPreview', 'aiModels')}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">100%</span>
                            <span className="stat-label">{t('featuresPreview', 'privacySafe')}</span>
                        </div>
                    </div>

                    <div className="preview-cta">
                        <a href="/features" className="features-link-button">
                            {t('featuresPreview', 'viewAllFeatures')}
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FeaturesPreview; 