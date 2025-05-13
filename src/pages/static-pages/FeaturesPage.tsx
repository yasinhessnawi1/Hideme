import React, { useState } from 'react';
import Navbar from '../../components/static/Navbar';
import '../../styles/FeaturesPage.css';
import { useLanguage } from '../../contexts/LanguageContext';

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
}



// Feature Card Component
const FeatureCard: React.FC<FeatureCardProps> = ({
                                                     title,
                                                     description,
                                                     icon,
                                                     isSafeForData,
                                                     entities,
                                                     precision,
                                                 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { t } = useLanguage();

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
const ToolFeatureCard: React.FC<{ title: string; description: string; icon: string }> = ({
                                                                                             title,
                                                                                             description,
                                                                                             icon
                                                                                         }) => {
    return (
        <div className="tool-feature-card">
            <div className="tool-feature-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    );
};

const FeaturesPage= () => {
    const { t } = useLanguage();
    // Presidio ML entity options
    const presidioOptions: OptionType[] = [
        { value: 'CRYPTO', label: 'Crypto Wallet' },
        { value: 'DATE_TIME', label: 'Date/Time' },
        { value: 'EMAIL_ADDRESS', label: 'Email Address' },
        { value: 'IBAN_CODE', label: 'IBAN' },
        { value: 'IP_ADDRESS', label: 'IP Address' },
        { value: 'NRP', label: 'NRP' },
        { value: 'LOCATION', label: 'Location' },
        { value: 'PERSON', label: 'Person' },
        { value: 'PHONE_NUMBER', label: 'Phone Number' },
        { value: 'MEDICAL_LICENSE', label: 'Medical License' },
        { value: 'URL', label: 'URL' },
        { value: 'NO_ADDRESS', label: 'Norwegian Address' },
        { value: 'NO_PHONE_NUMBER', label: 'Norwegian Phone' },
        { value: 'NO_FODSELSNUMMER', label: 'Norwegian ID' },
    ];

    // Gliner ML entity options
    const glinerOptions: OptionType[] = [
        { value: 'PERSON', label: 'Person' },
        { value: 'BOOK', label: 'Book' },
        { value: 'LOCATION', label: 'Location' },
        { value: 'DATE', label: 'Date' },
        { value: 'ACTOR', label: 'Actor' },
        { value: 'CHARACTER', label: 'Character' },
        { value: 'ORGANIZATION', label: 'Organization' },
        { value: 'PHONE_NUMBER', label: 'Phone Number' },
        { value: 'ADDRESS', label: 'Address' },
        { value: 'PASSPORT_NUMBER', label: 'Passport Number' },
        { value: 'EMAIL', label: 'Email' },
        { value: 'CREDIT_CARD_NUMBER', label: 'Credit Card Number' },
        { value: 'SOCIAL_SECURITY_NUMBER', label: 'Social Security Number' },
        { value: 'HEALTH_INSURANCE_ID_NUMBER', label: 'Health Insurance ID number' },
        { value: 'DATE_OF_BIRTH', label: 'Date of Birth' },
        { value: 'MOBILE_PHONE_NUMBER', label: 'Mobile Phone Number' },
        { value: 'BANK_ACCOUNT_NUMBER', label: 'Bank Account Number' },
        { value: 'MEDICATION', label: 'Medication' },
        { value: 'CPF', label: 'CPF' },
        { value: 'TAX_IDENTIFICATION_NUMBER', label: 'tax identification number' },
        { value: 'MEDICAL_CONDITION', label: 'Medical Condition' },
        { value: 'IDENTITY_CARD_NUMBER', label: 'Identity Card Number' },
        { value: 'NATIONAL_ID_NUMBER', label: 'National ID Number' },
        { value: 'IP_ADDRESS', label: 'IP Address' },
        { value: 'EMAIL_ADDRESS', label: 'Email Address' },
        { value: 'IBAN', label: 'IBAN' },
        { value: 'CREDIT_CARD_EXPIRATION_DATE', label: 'Credit Card Expiration Date' },
        { value: 'USERNAME', label: 'Username' },
        { value: 'BLOOD_TYPE', label: 'Blood Type' },
        { value: 'CVV', label: 'CVV' },
        { value: 'CVC', label: 'CVC' },
    ];

    // Gemini AI entity options
    const geminiOptions: OptionType[] = [
        { value: 'PHONE', label: 'Phone' },
        { value: 'EMAIL', label: 'Email' },
        { value: 'ADDRESS', label: 'Address' },
        { value: 'DATE', label: 'Date' },
        { value: 'GOVID', label: 'Gov ID' },
        { value: 'FINANCIAL', label: 'Financial' },
        { value: 'EMPLOYMENT', label: 'Employment' },
        { value: 'HEALTH', label: 'Health' },
        { value: 'SEXUAL', label: 'Sexual' },
        { value: 'CRIMINAL', label: 'Criminal' },
        { value: 'CONTEXT', label: 'Context' },
        { value: 'INFO', label: 'Info' },
        { value: 'FAMILY', label: 'Family' },
        { value: 'BEHAVIORAL_PATTERN', label: 'Behavioral Pattern' },
        { value: 'POLITICAL_CASE', label: 'Political Case' },
        { value: 'ECONOMIC_STATUS', label: 'Economic Status' },
    ];

    return (
        <div className="features-page">
            <Navbar  />

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

                    <div className="tools-grid">
                        <ToolFeatureCard
                            title={t('features', 'manualHighlightingTitle')}
                            icon="✏️"
                            description={t('features', 'manualHighlightingDescription')}
                        />
                        <ToolFeatureCard
                            title={t('features', 'searchHighlightingTitle')}
                            icon="🔍"
                            description={t('features', 'searchHighlightingDescription')}
                        />
                        <ToolFeatureCard
                            title={t('features', 'regexSearchTitle')}
                            icon="⚙️"
                            description={t('features', 'regexSearchDescription')}
                        />
                        <ToolFeatureCard
                            title={t('features', 'caseSensitiveSearchTitle')}
                            icon="Aa"
                            description={t('features', 'caseSensitiveSearchDescription')}
                        />
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
                            precision={t('features', 'testingInProgress')}
                        />

                        <FeatureCard
                            title={t('features', 'glinerMLDetectionTitle')}
                            description={t('features', 'glinerMLDetectionDescription')}
                            icon="🔒"
                            isSafeForData={true}
                            entities={glinerOptions}
                            precision={t('features', 'testingInProgress')}
                        />

                        <FeatureCard
                            title={t('features', 'presidioMLDetectionTitle')}
                            description={t('features', 'presidioMLDetectionDescription')}
                            icon="🛡️"
                            isSafeForData={true}
                            entities={presidioOptions}
                            precision={t('features', 'testingInProgress')}
                        />
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
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <td>{t('features', 'dataPrivacy')}</td>
                                <td className="negative">{t('features', 'processesDataExternally')}</td>
                                <td className="positive">{t('features', 'fullyLocalProcessing')}</td>
                                <td className="positive">{t('features', 'fullyLocalProcessing')}</td>
                            </tr>
                            <tr>
                                <td>{t('features', 'entityTypes')}</td>
                                <td>{geminiOptions.length}</td>
                                <td>{glinerOptions.length}</td>
                                <td>{presidioOptions.length}</td>
                            </tr>
                            <tr>
                                <td>{t('features', 'performance')}</td>
                                <td>{t('features', 'fast')}</td>
                                <td>{t('features', 'medium')}</td>
                                <td>{t('features', 'medium')}</td>
                            </tr>
                            <tr>
                                <td>{t('features', 'contextualUnderstanding')}</td>
                                <td className="positive">{t('features', 'high')}</td>
                                <td className="neutral">{t('features', 'medium')}</td>
                                <td className="neutral">{t('features', 'medium')}</td>
                            </tr>
                            <tr>
                                <td>{t('features', 'accuracy')}</td>
                                <td colSpan={3} className="centered">{t('features', 'testingInProgress')}</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>


        </div>
    );
};

export default FeaturesPage;
