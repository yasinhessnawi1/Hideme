import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

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
            title: 'Smart Redaction',
            description: 'AI-powered automatic detection and redaction of sensitive information',
            icon: '🤖',
            category: 'tool' as const
        },
        {
            title: 'Manual Highlighting',
            description: 'Precise manual control with text selection and rectangular tools',
            icon: '✏️',
            category: 'tool' as const
        },
        {
            title: 'Search & Redact',
            description: 'Find and redact specific words or patterns across documents',
            icon: '🔍',
            category: 'tool' as const
        },
        {
            title: 'Image Redaction',
            description: 'Redact sensitive information from images and scanned documents',
            icon: '🖼️',
            category: 'tool' as const
        },
        {
            title: 'Auto Processing',
            description: 'Automatically process new files with your saved settings',
            icon: '⚡',
            category: 'tool' as const
        },
        {
            title: 'Privacy Protection',
            description: 'End-to-end encryption ensures your data is secure - files encrypted before backend processing',
            icon: '🔐',
            category: 'tool' as const
        }
    ];

    const detectionMethods = [
        {
            title: 'HideMeAI (Recommended)',
            description: 'Our proprietary AI model with 89% precision and full local processing',
            icon: '🚀',
            category: 'detection' as const
        },
        {
            title: 'Presidio ML',
            description: 'Microsoft\'s open-source model with 86% precision, privacy-safe',
            icon: '🛡️',
            category: 'detection' as const
        },
        {
            title: 'GLiNER ML',
            description: 'Lightweight model with 78% precision, fully local processing',
            icon: '🔒',
            category: 'detection' as const
        },
        {
            title: 'Gemini AI',
            description: 'Google\'s AI with 92% precision but processes data externally',
            icon: '🤖',
            category: 'detection' as const
        }
    ];

    return (
        <section className="features-preview">
            <div className="features-preview-container">
                <div className="features-preview-header">
                    <h2>Powerful Redaction Tools</h2>
                    <p>Everything you need to protect sensitive information in documents</p>
                </div>

                <div className="tools-preview-section">
                    <h3>Core Features</h3>
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
                    <h3>AI Detection Methods</h3>
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
                            <span className="stat-number">20+</span>
                            <span className="stat-label">Redaction Tools</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">50+</span>
                            <span className="stat-label">Entity Types</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">4</span>
                            <span className="stat-label">AI Models</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">100%</span>
                            <span className="stat-label">Privacy Safe</span>
                        </div>
                    </div>
                    
                    <div className="preview-cta">
                        <a href="/features" className="features-link-button">
                            View All Features
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FeaturesPreview; 