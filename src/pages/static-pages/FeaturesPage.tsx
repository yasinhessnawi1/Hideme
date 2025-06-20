import React, {useState} from 'react';
import Navbar from '../../components/static/Navbar';
import {useLanguage} from '../../contexts/LanguageContext';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import {getGeminiOptions, getGlinerOptions, getHidemeOptions, getPresidioOptions} from '../../utils/EntityUtils';
import Footer from '../../components/static/Footer';

interface OptionType {
    value: string;
    label: string;
}

interface FeatureCardProps {
    title: string;
    description: string;
    icon: string;
    isSafeForData: boolean;
    entities: OptionType[];
    precision: string;
    accuracyData?: {
        precision: number;
        recall: number;
        f1Score: number;
    };
}

// Feature Card Component
const FeatureCard: React.FC<FeatureCardProps> = ({
    title,
    description,
    icon,
    isSafeForData,
    entities,
    precision,
    accuracyData
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { t } = useLanguage();

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

    // Prepare data for the chart
    const chartData = accuracyData ? [
        { name: 'Precision', value: accuracyData.precision },
        { name: 'Recall', value: accuracyData.recall },
        { name: 'F1 Score', value: accuracyData.f1Score }
    ] : [];

    return (
        <div className={`feature-card ${isExpanded ? 'expanded' : ''}`}>
            <div className="feature-card-header">
                <div className="feature-icon">{icon}</div>
                <h3>{title}</h3>
                <div className={`data-safety-badge ${isSafeForData ? 'safe' : 'not-safe'}`}>
                    {isSafeForData ? t('features', 'safeForData') : t('features', 'notSafeForData')}
                </div>
            </div>

            <p className="feature-description">{description}</p>

            <div className="feature-precision">
                <strong>{t('features', 'precisionAndAccuracy')}</strong> {precision}
            </div>

            {accuracyData && (
                <div className="accuracy-chart">
                    <h4>{t('features', 'accuracyMetrics')}</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 1]} />
                            <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`} />
                            <Bar dataKey="value" fill="#8884d8">
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="feature-entities-preview">
                <strong>{t('features', 'supportedEntities')}</strong>
                <div className="entity-tags">
                    {entities.slice(0, 5).map((entity, index) => (
                        <span key={index} className="entity-tag">{entity.label}</span>
                    ))}
                    {entities.length > 5 && (
                        <span className="entity-tag more-tag">{t('features', 'moreEntities').replace('{count}', String(entities.length - 5))}</span>
                    )}
                </div>
            </div>

            <button
                className="view-all-button"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? t('features', 'showLess') : t('features', 'viewAllEntities')}
            </button>

            {isExpanded && (
                <div className="expanded-entities">
                    <h4>{t('features', 'allSupportedEntities')}</h4>
                    <div className="entity-grid">
                        {entities.map((entity, index) => (
                            <div key={index} className="entity-item">
                                <span className="entity-dot"></span>
                                {entity.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Tools Feature Card Component
const ToolFeatureCard: React.FC<{ title: string; description: string; icon: string; modes?: string[] }> = ({
    title,
    description,
    icon,
    modes
}) => {
    const {t} = useLanguage();
    
    return (
        <div className="tool-feature-card">
            <div className="tool-feature-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{description}</p>
            {modes && modes.length > 0 && (
                <div className="selection-modes">
                    <span className="modes-label">{t('features', 'modes')}: </span>
                    {modes.map((mode, index) => (
                        <span key={index} className="mode-tag">
                            {t('features', mode.toLowerCase().replace(/\s+/g, '') as any)}
                            {index < modes.length - 1 ? ', ' : ''}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

const FeaturesPage = () => {
    const { t } = useLanguage();
    
    // Radar chart data for model comparison
    const radarChartData = [
        { subject: 'Precision', Presidio: 0.86, Gliner: 0.78, Gemini: 0.92, HideMeAI: 0.89 },
        { subject: 'Recall', Presidio: 0.73, Gliner: 0.82, Gemini: 0.85, HideMeAI: 0.91 },
        { subject: 'Latency', Presidio: 0.88, Gliner: 0.86, Gemini: 0.62, HideMeAI: 0.76 },
        { subject: 'Coverage', Presidio: 0.65, Gliner: 0.72, Gemini: 0.95, HideMeAI: 0.88 },
        { subject: 'Privacy', Presidio: 0.95, Gliner: 0.95, Gemini: 0.45, HideMeAI: 0.92 },
    ];

    // Pie chart data for entity type distribution
    const entityDistributionData = [
        { name: 'Personal', value: 35 },
        { name: 'Financial', value: 25 },
        { name: 'Medical', value: 20 },
        { name: 'Location', value: 15 },
        { name: 'Other', value: 5 },
    ];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    // Get entity options from EntityUtils
    // Type cast the translation function to match the expected signature
    const translateFn = ((ns: string, key: string) => t(ns as any, key as any)) as (ns: string, key: string) => string;
    const presidioOptions = getPresidioOptions(translateFn);
    const glinerOptions = getGlinerOptions(translateFn);
    const geminiOptions = getGeminiOptions(translateFn);
    const hidemeOptions = getHidemeOptions(translateFn);

    return (
        <div className="features-page">
            <Navbar />

            <div className="features-hero">
                <div className="features-hero-content">
                    <h1>{t('features', 'featuresTitle')}</h1>
                    <p>
                        {t('features', 'featuresDescription')}
                    </p>
                </div>
            </div>

            <div className="features-container">
                <section className="tools-section">
                    <h2>{t('features', 'redactionTools')}</h2>
                    <p className="section-description">
                        {t('features', 'toolsSectionDescription')}
                    </p>

                    <div className="tools-categories">
                        <div className="tools-category">
                            <h3>{t('features', 'coreRedactionTools')}</h3>
                            <div className="tools-grid">
                                <ToolFeatureCard
                                    title={t('features', 'manualHighlightingTitle')}
                                    icon="✏️"
                                    description={t('features', 'manualHighlightingDescription')}
                                    modes={['textselection', 'rectangular']}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'searchHighlightingTitle')}
                                    icon="🔍"
                                    description={t('features', 'searchHighlightingDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'imageRedactionTitle')}
                                    icon="🖼️"
                                    description={t('features', 'imageRedactionDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'highlightManipulationTitle')}
                                    icon="🖌️"
                                    description={t('features', 'highlightManipulationDescription')}
                                />
                            </div>
                        </div>

                        <div className="tools-category">
                            <h3>{t('features', 'documentManagement')}</h3>
                            <div className="tools-grid">
                                <ToolFeatureCard
                                    title={t('features', 'documentHistoryTitle')}
                                    icon="📋"
                                    description={t('features', 'documentHistoryDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'thumbnailNavigationTitle')}
                                    icon="🖼️"
                                    description={t('features', 'thumbnailNavigationDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'fullscreenViewTitle')}
                                    icon="🔳"
                                    description={t('features', 'fullscreenViewDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'fileManipulationTitle')}
                                    icon="📄"
                                    description={t('features', 'fileManipulationDescription')}
                                    modes={['save', 'print', 'select', 'delete']}
                                />
                            </div>
                        </div>

                        <div className="tools-category">
                            <h3>{t('features', 'automationAndSettings')}</h3>
                            <div className="tools-grid">
                                <ToolFeatureCard
                                    title={t('features', 'autoProcessingTitle')}
                                    icon="⚡"
                                    description={t('features', 'autoProcessingDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'settingsImportExportTitle')}
                                    icon="⚙️"
                                    description={t('features', 'settingsImportExportDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'detectionPrecisionTitle')}
                                    icon="🎯"
                                    description={t('features', 'detectionPrecisionDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'accountManagementTitle')}
                                    icon="👤"
                                    description={t('features', 'accountManagementDescription')}
                                />
                            </div>
                        </div>

                        <div className="tools-category">
                            <h3>{t('features', 'accuracyOptimization')}</h3>
                            <div className="tools-grid">
                                <ToolFeatureCard
                                    title={t('features', 'ignoreListTitle')}
                                    icon="🚫"
                                    description={t('features', 'ignoreListDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'searchWordsTitle')}
                                    icon="🔎"
                                    description={t('features', 'searchWordsDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'customEntityRulesTitle')}
                                    icon="📝"
                                    description={t('features', 'customEntityRulesDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'confidenceThresholdTitle')}
                                    icon="📊"
                                    description={t('features', 'confidenceThresholdDescription')}
                                />
                            </div>
                        </div>

                        <div className="tools-category">
                            <h3>{t('features', 'privacyAndStorage')}</h3>
                            <div className="tools-grid">
                                <ToolFeatureCard
                                    title={t('features', 'inBrowserStorageTitle')}
                                    icon="💾"
                                    description={t('features', 'inBrowserStorageDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'coordinateOnlyHistoryTitle')}
                                    icon="📍"
                                    description={t('features', 'coordinateOnlyHistoryDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'optionalDataPersistenceTitle')}
                                    icon="🔐"
                                    description={t('features', 'optionalDataPersistenceDescription')}
                                />
                                <ToolFeatureCard
                                    title={t('features', 'localProcessingTitle')}
                                    icon="🏠"
                                    description={t('features', 'localProcessingDescription')}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="detection-methods-section">
                    <h2>{t('features', 'entityDetectionMethods')}</h2>
                    <p className="section-description">
                        {t('features', 'detectionMethodsDescription')}
                    </p>

                    <div className="methods-grid">
                        <FeatureCard
                            title={t('features', 'geminiAIDetectionTitle')}
                            description={t('features', 'geminiAIDetectionDescription')}
                            icon="🤖"
                            isSafeForData={false}
                            entities={geminiOptions}
                            precision={t('features', 'highPrecisionScore')}
                            accuracyData={{
                                precision: 0.92,
                                recall: 0.85,
                                f1Score: 0.88
                            }}
                        />

                        <FeatureCard
                            title={t('features', 'glinerMLDetectionTitle')}
                            description={t('features', 'glinerMLDetectionDescription')}
                            icon="🔒"
                            isSafeForData={true}
                            entities={glinerOptions}
                            precision={t('features', 'highPrecisionScore')}
                            accuracyData={{
                                precision: 0.78,
                                recall: 0.82,
                                f1Score: 0.80
                            }}
                        />

                        <FeatureCard
                            title={t('features', 'presidioMLDetectionTitle')}
                            description={t('features', 'presidioMLDetectionDescription')}
                            icon="🛡️"
                            isSafeForData={true}
                            entities={presidioOptions}
                            precision={t('features', 'mediumPrecisionScore')}
                            accuracyData={{
                                precision: 0.86,
                                recall: 0.73,
                                f1Score: 0.79
                            }}
                        />

                        <FeatureCard
                            title={t('features', 'hidemeAIDetectionTitle')}
                            description={t('features', 'hidemeAIDetectionDescription')}
                            icon="🚀"
                            isSafeForData={true}
                            entities={hidemeOptions}
                            precision={t('features', 'veryHighPrecisionScore')}
                            accuracyData={{
                                precision: 0.89,
                                recall: 0.91,
                                f1Score: 0.90
                            }}
                        />
                    </div>
                </section>

                <section className="visualization-section">
                    <h2>{t('features', 'modelComparisonVisualization')}</h2>
                    <p className="section-description">
                        {t('features', 'modelComparisonDescription')}
                    </p>

                    <div className="charts-grid">
                        <div className="chart-container">
                            <h3>{t('features', 'modelPerformanceComparison')}</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <RadarChart outerRadius={150} data={radarChartData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis domain={[0, 1]} />
                                    <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`} />
                                    <Radar name="Presidio" dataKey="Presidio" stroke="#8884d8" fill="#8884d8" fillOpacity={0.4} />
                                    <Radar name="Gliner" dataKey="Gliner" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.4} />
                                    <Radar name="Gemini" dataKey="Gemini" stroke="#ffc658" fill="#ffc658" fillOpacity={0.4} />
                                    <Radar name="HideMeAI" dataKey="HideMeAI" stroke="#ff8042" fill="#ff8042" fillOpacity={0.4} />
                                    <Legend />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-container">
                            <h3>{t('features', 'entityTypeDistribution')}</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Pie
                                        data={entityDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={true}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={150}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {entityDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `${value}%`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </section>

                <section className="comparison-section">
                    <h2>{t('features', 'detectionMethodsComparison')}</h2>
                    <div className="comparison-table-container">
                        <table className="comparison-table">
                            <thead>
                            <tr>
                                <th>{t('features', 'feature')}</th>
                                <th>{t('features', 'geminiAI')}</th>
                                <th>{t('features', 'glinerML')}</th>
                                <th>{t('features', 'presidioML')}</th>
                                <th>{t('features', 'hidemeAI')}</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <td>{t('features', 'dataPrivacy')}</td>
                                <td className="negative">{t('features', 'processesDataExternally')}</td>
                                <td className="positive">{t('features', 'fullyLocalProcessing')}</td>
                                <td className="positive">{t('features', 'fullyLocalProcessing')}</td>
                                <td className="positive">{t('features', 'fullyLocalProcessing')}</td>
                            </tr>
                            <tr>
                                <td>{t('features', 'entityTypes')}</td>
                                <td>{geminiOptions.length - 1}</td>
                                <td>{glinerOptions.length - 1}</td>
                                <td>{presidioOptions.length - 1}</td>
                                <td>{hidemeOptions.length - 1}</td>
                            </tr>
                            <tr>
                                <td>{t('features', 'performance')}</td>
                                <td>{t('features', 'fast')}</td>
                                <td>{t('features', 'medium')}</td>
                                <td>{t('features', 'veryFast')}</td>
                                <td>{t('features', 'medium')}</td>
                            </tr>
                            <tr>
                                <td>{t('features', 'contextualUnderstanding')}</td>
                                <td className="positive">{t('features', 'high')}</td>
                                <td className="positive">{t('features', 'high')}</td>
                                <td className="neutral">{t('features', 'medium')}</td>
                                <td className="positive">{t('features', 'high')}</td>
                            </tr>
                            <tr>
                                <td>{t('features', 'accuracy')}</td>
                                <td className="positive">92%</td>
                                <td className="neutral">78%</td>
                                <td className="positive">86%</td>
                                <td className="positive">89%</td>
                            </tr>
                            <tr>
                                <td>{t('features', 'recall')}</td>
                                <td className="positive">85%</td>
                                <td className="positive">82%</td>
                                <td className="neutral">73%</td>
                                <td className="positive">91%</td>
                            </tr>
                            <tr>
                                <td>{t('features', 'f1Score')}</td>
                                <td className="positive">88%</td>
                                <td className="neutral">80%</td>
                                <td className="neutral">79%</td>
                                <td className="positive">90%</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
};

export default FeaturesPage;
