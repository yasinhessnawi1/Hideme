import React, { useState } from 'react';
import Navbar from '../../components/static/Navbar'; // Import your Navbar component
import Footer from '../../components/static/Footer'; // Import the Footer component
import '../../styles/HowToPage.css'; // Import your styles
import { useLanguage } from '../../contexts/LanguageContext';

// Feature walkthrough component
const FeatureWalkthrough = ({ 
    title, 
    description, 
    steps, 
    icon, 
    imageUrl 
}: { 
    title: string; 
    description: string; 
    steps: {stepNumber: number; title: string; description: string;}[]; 
    icon: string; 
    imageUrl?: string; 
}) => {
    const [expanded, setExpanded] = useState(false);
    
    return (
        <div className={`feature-walkthrough ${expanded ? 'expanded' : ''}`}>
            <div className="feature-walkthrough-header" onClick={() => setExpanded(!expanded)}>
                <div className="feature-icon">{icon}</div>
                <div className="feature-title">
                    <h3>{title}</h3>
                    <p>{description}</p>
                </div>
                <div className="expand-icon">{expanded ? '−' : '+'}</div>
            </div>
            
            {expanded && (
                <div className="feature-walkthrough-content">
                    <div className="steps-container">
                        {steps.map((step) => (
                            <div key={step.stepNumber} className="step-item">
                                <div className="step-number">{step.stepNumber}</div>
                                <div className="step-content">
                                    <h4>{step.title}</h4>
                                    <p>{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {imageUrl && (
                        <div className="feature-image">
                            <img src={imageUrl} alt={title} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Define a type for workflow section data
interface WorkflowSectionData {
    icon: string;
    title: string;
    description: string;
    visual: React.ReactNode;
    steps: {
        title: string;
        description: string;
    }[];
}

// Main workflow component with tabs
const WorkflowExplainer = ({ sections }: { sections: WorkflowSectionData[] }) => {
    const [activeTab, setActiveTab] = useState(0);
    
    return (
        <div className="workflow-explainer">
            <div className="workflow-tabs">
                {sections.map((section, index) => (
                    <button 
                        key={index} 
                        className={`workflow-tab ${activeTab === index ? 'active' : ''}`}
                        onClick={() => setActiveTab(index)}
                    >
                        <span className="tab-icon">{section.icon}</span>
                        <span className="tab-label">{section.title}</span>
                    </button>
                ))}
            </div>
            
            <div className="workflow-content">
                <div className="workflow-heading">
                    <h3>{sections[activeTab].title}</h3>
                    <p>{sections[activeTab].description}</p>
                </div>
                
                <div className="workflow-visual">
                    {sections[activeTab].visual}
                </div>
                
                <div className="workflow-steps">
                    {sections[activeTab].steps.map((step, index) => (
                        <div key={index} className="workflow-step">
                            <div className="step-marker">{index + 1}</div>
                            <div className="step-details">
                                <h4>{step.title}</h4>
                                <p>{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const HowToPage = () => {
    const { t } = useLanguage();
    const [feedbackGiven, setFeedbackGiven] = useState<'yes' | 'no' | null>(null);
    
    // Helper function to get translation or fallback
    const getTranslation = (key: string, fallback: string): string => {
        // Type assertion to handle any keys
        return t('howto', key as any) || fallback;
    };

    // Handle feedback submission
    const handleFeedback = (feedback: 'yes' | 'no') => {
        setFeedbackGiven(feedback);
    };
    
    // Define the workflow sections
    const workflowSections: WorkflowSectionData[] = [
        {
            icon: '📤',
            title: getTranslation('uploadDocumentsTitle', 'Upload Documents'),
            description: getTranslation('uploadDocumentsDescription', 'Start by uploading your PDF documents to the system.'),
            visual: <div className="workflow-illustration upload-illustration"></div>,
            steps: [
                {
                    title: getTranslation('dragAndDropTitle', 'Drag & Drop'),
                    description: getTranslation('dragAndDropDescription', 'Drag and drop your files directly onto the upload area.')
                },
                {
                    title: getTranslation('selectFilesTitle', 'Select Files'),
                    description: getTranslation('selectFilesDescription', 'Or click the upload button to browse and select files from your computer.')
                },
                {
                    title: getTranslation('multipleFilesTitle', 'Multiple Files'),
                    description: getTranslation('multipleFilesDescription', 'You can upload multiple files at once for batch processing.')
                }
            ]
        },
        {
            icon: '🔍',
            title: getTranslation('detectEntitiesTitle', 'Detect Sensitive Information'),
            description: getTranslation('detectEntitiesDescription', 'Use AI-powered detection to identify sensitive information automatically.'),
            visual: <div className="workflow-illustration detection-illustration"></div>,
            steps: [
                {
                    title: getTranslation('selectModelTitle', 'Select Detection Model'),
                    description: getTranslation('selectModelDescription', 'Choose from Presidio, Gliner, Gemini, or HideMeAI detection models based on your needs.')
                },
                {
                    title: getTranslation('chooseEntitiesTitle', 'Choose Entities'),
                    description: getTranslation('chooseEntitiesDescription', 'Select which types of sensitive information you want to detect.')
                },
                {
                    title: getTranslation('adjustAccuracyTitle', 'Adjust Accuracy'),
                    description: getTranslation('adjustAccuracyDescription', 'Fine-tune the detection threshold to balance between catching all entities or reducing false positives.')
                },
                {
                    title: getTranslation('runDetectionTitle', 'Run Detection'),
                    description: getTranslation('runDetectionDescription', 'Process your documents to identify and highlight sensitive information.')
                }
            ]
        },
        {
            icon: '✏️',
            title: getTranslation('manualHighlightingTitle', 'Manual Highlighting'),
            description: getTranslation('manualHighlightingDescription', 'Add or refine highlights for information that needs redaction.'),
            visual: <div className="workflow-illustration highlighting-illustration"></div>,
            steps: [
                {
                    title: getTranslation('selectHighlightModeTitle', 'Select Highlight Mode'),
                    description: getTranslation('selectHighlightModeDescription', 'Choose between text selection or rectangular mode for highlighting.')
                },
                {
                    title: getTranslation('highlightTextTitle', 'Highlight Text'),
                    description: getTranslation('highlightTextDescription', 'Select text directly or draw rectangles around areas to be redacted.')
                },
                {
                    title: getTranslation('bulkActionsTitle', 'Bulk Actions'),
                    description: getTranslation('bulkActionsDescription', 'Use "Highlight All Same" to find and highlight all instances of the same text.')
                }
            ]
        },
        {
            icon: '🔎',
            title: getTranslation('searchTitle', 'Search Functionality'),
            description: getTranslation('searchDescription', 'Find specific text patterns across your documents.'),
            visual: <div className="workflow-illustration search-illustration"></div>,
            steps: [
                {
                    title: getTranslation('enterSearchTermsTitle', 'Enter Search Terms'),
                    description: getTranslation('enterSearchTermsDescription', 'Type keywords or phrases you want to find in your documents.')
                },
                {
                    title: getTranslation('useDefaultTermsTitle', 'Use Default Terms'),
                    description: getTranslation('useDefaultTermsDescription', 'Apply your saved default search terms to quickly find common patterns.')
                },
                {
                    title: getTranslation('navigateResultsTitle', 'Navigate Results'),
                    description: getTranslation('navigateResultsDescription', 'Use the next/previous buttons to move between search results.')
                }
            ]
        },
        {
            icon: '✂️',
            title: getTranslation('redactionTitle', 'Redaction Process'),
            description: getTranslation('redactionDescription', 'Create redacted versions of your documents with sensitive information removed.'),
            visual: <div className="workflow-illustration redaction-illustration"></div>,
            steps: [
                {
                    title: getTranslation('selectRedactionScopeTitle', 'Select Redaction Scope'),
                    description: getTranslation('selectRedactionScopeDescription', 'Choose to redact the current file, selected files, or all files.')
                },
                {
                    title: getTranslation('chooseHighlightsTitle', 'Choose Highlights'),
                    description: getTranslation('chooseHighlightsDescription', 'Select which types of highlights to include: manual, search, and/or detected entities.')
                },
                {
                    title: getTranslation('reviewAndRedactTitle', 'Review & Redact'),
                    description: getTranslation('reviewAndRedactDescription', 'Preview what will be redacted, then confirm to create new redacted documents.')
                },
                {
                    title: getTranslation('downloadResultsTitle', 'Download Results'),
                    description: getTranslation('downloadResultsDescription', 'Download the redacted documents for sharing or secure storage.')
                }
            ]
        }
    ];
    
    // Define the advanced features
    const advancedFeatures = [
        {
            title: getTranslation('documentHistoryTitle', 'Document History'),
            description: getTranslation('documentHistoryWalkthroughDescription', 'Track and access your document redaction history with comprehensive versioning.'),
            icon: '📋',
            steps: [
                {
                    stepNumber: 1,
                    title: getTranslation('viewHistoryTitle', 'View History'),
                    description: getTranslation('viewHistoryDescription', 'Access the document history tab to see all previous redacted versions.')
                },
                {
                    stepNumber: 2,
                    title: getTranslation('compareVersionsTitle', 'Compare Versions'),
                    description: getTranslation('compareVersionsDescription', 'Compare different redacted versions to see what was changed.')
                },
                {
                    stepNumber: 3,
                    title: getTranslation('downloadPreviousTitle', 'Download Previous Versions'),
                    description: getTranslation('downloadPreviousDescription', 'Download any previous version of your redacted documents as needed.')
                }
            ]
        },
        {
            title: getTranslation('highlightManipulationTitle', 'Highlight Manipulation'),
            description: getTranslation('highlightManipulationWalkthroughDescription', 'Take full control of highlights with powerful management tools.'),
            icon: '🖌️',
            steps: [
                {
                    stepNumber: 1,
                    title: getTranslation('bulkDeleteTitle', 'Bulk Delete'),
                    description: getTranslation('bulkDeleteDescription', 'Delete all highlights of a specific type or matching specific text.')
                },
                {
                    stepNumber: 2,
                    title: getTranslation('toggleVisibilityTitle', 'Toggle Visibility'),
                    description: getTranslation('toggleVisibilityDescription', 'Show or hide different types of highlights to focus on what matters.')
                },
                {
                    stepNumber: 3,
                    title: getTranslation('customizeColorsTitle', 'Customize Colors'),
                    description: getTranslation('customizeColorsDescription', 'Change highlight colors to better distinguish between different types of sensitive information.')
                }
            ]
        },
        {
            title: getTranslation('browserStorageTitle', 'In-Browser Storage'),
            description: getTranslation('browserStorageWalkthroughDescription', 'Store your documents securely in your browser for easy access.'),
            icon: '💾',
            steps: [
                {
                    stepNumber: 1,
                    title: getTranslation('enableStorageTitle', 'Enable Storage'),
                    description: getTranslation('enableStorageDescription', 'Turn on the browser storage feature in settings to save documents locally.')
                },
                {
                    stepNumber: 2,
                    title: getTranslation('manageStorageTitle', 'Manage Storage'),
                    description: getTranslation('manageStorageDescription', 'View and manage your stored files and monitor storage usage.')
                },
                {
                    stepNumber: 3,
                    title: getTranslation('clearStorageTitle', 'Clear Storage'),
                    description: getTranslation('clearStorageDescription', 'Clear stored files when needed to free up space or remove sensitive data.')
                }
            ]
        },
        {
            title: getTranslation('autoProcessingTitle', 'Auto Processing'),
            description: getTranslation('autoProcessingWalkthroughDescription', 'Save time with automatic processing of new documents.'),
            icon: '⚡',
            steps: [
                {
                    stepNumber: 1,
                    title: getTranslation('configureSettingsTitle', 'Configure Settings'),
                    description: getTranslation('configureSettingsDescription', 'Set up your preferred detection models and entity types in settings.')
                },
                {
                    stepNumber: 2,
                    title: getTranslation('enableAutoProcessingTitle', 'Enable Auto-Processing'),
                    description: getTranslation('enableAutoProcessingDescription', 'Turn on auto-processing to automatically apply detection to new files.')
                },
                {
                    stepNumber: 3,
                    title: getTranslation('reviewResultsTitle', 'Review Results'),
                    description: getTranslation('reviewResultsDescription', 'Review and refine the automatic detection results before redaction.')
                }
            ]
        }
    ];

    return (
        <div className="how-to-page">
            <Navbar />

            <div className="how-to-hero">
                <div className="how-to-hero-content">
                    <h1>{t('howto', 'howToRedactTitle')}</h1>
                    <p>{t('howto', 'howToRedactDescription')}</p>
                </div>
            </div>

            <div className="how-to-container">

                <div className="workflow-section">
                    <h2>{getTranslation('workflowTitle', 'How HideMeAI Works')}</h2>
                    <p className="section-description">
                        {getTranslation('workflowDescription', 'Follow these simple steps to redact sensitive information from your documents.')}
                    </p>
                    
                    <WorkflowExplainer sections={workflowSections} />
                </div>

                <div className="advanced-features-section">
                    <h2>{getTranslation('advancedFeaturesTitle', 'Advanced Features')}</h2>
                    <p className="section-description">
                        {getTranslation('advancedFeaturesDescription', 'Discover powerful features to enhance your redaction workflow.')}
                    </p>
                    
                    <div className="features-grid">
                        {advancedFeatures.map((feature, index) => (
                            <FeatureWalkthrough 
                                key={index}
                                title={feature.title}
                                description={feature.description}
                                steps={feature.steps}
                                icon={feature.icon}
                            />
                        ))}
                    </div>

                    <div className="view-more-features">
                        <a href="/features" className="view-more-button">
                            View All Features
                        </a>
                    </div>
                </div>

                <div className="how-to-additional-info">
                     {/*
                    <h2>{t('howto', 'additionalResources')}</h2>
                   
                    <div className="resource-cards">
                        <div className="resource-card">
                            <div className="card-icon">📋</div>
                            <h3>{t('howto', 'faqTitle')}</h3>
                            <p>{t('howto', 'faqDescription')}</p>
                            <a href="#" className="card-link">{t('howto', 'viewFaqs')}</a>
                        </div>
                        
                        <div className="resource-card">
                            <div className="card-icon">📘</div>
                            <h3>{t('howto', 'advancedRedactionTitle')}</h3>
                            <p>{t('howto', 'advancedRedactionDescription')}</p>
                            <a href="#" className="card-link">{t('howto', 'readAdvancedGuide')}</a>
                        </div>

                        <div className="resource-card">
                            <div className="card-icon">📹</div>
                            <h3>{t('howto', 'videoTutorialsTitle')}</h3>
                            <p>{t('howto', 'videoTutorialsDescription')}</p>
                            <a href="#" className="card-link">{t('howto', 'watchTutorials')}</a>
                        </div>
                    </div>
                    */}
                </div>
                
                <div className="how-to-feedback">
                    {!feedbackGiven ? (
                        <>
                            <h2>{t('howto', 'wasThisGuideHelpful')}</h2>
                            <div className="feedback-buttons">
                                <button 
                                    className="feedback-button" 
                                    onClick={() => handleFeedback('yes')}
                                >
                                    👍 {t('howto', 'yes')}
                                </button>
                                <button 
                                    className="feedback-button" 
                                    onClick={() => handleFeedback('no')}
                                >
                                    👎 {t('howto', 'no')}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="feedback-thank-you">
                            <div className="thank-you-icon">
                                {feedbackGiven === 'yes' ? '🎉' : '💭'}
                            </div>
                            <h2>
                                {feedbackGiven === 'yes' 
                                    ? getTranslation('thankYouPositive', 'Thank you for your positive feedback!')
                                    : getTranslation('thankYouNegative', 'Thank you for your feedback!')
                                }
                            </h2>
                            <p>
                                {feedbackGiven === 'yes'
                                    ? getTranslation('positiveMessage', 'We\'re glad this guide was helpful to you.')
                                    : getTranslation('negativeMessage', 'We appreciate your input and will work to improve this guide.')
                                }
                            </p>
                        </div>
                    )}
                </div>
               
            </div>
            
            <Footer />
        </div>
    );
};

export default HowToPage;
