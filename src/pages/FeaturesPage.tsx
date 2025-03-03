import React, { useState } from 'react';
import Navbar from '../components/static/Navbar';
import '../styles/pages/FeaturesPage.css';

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
    theme: string;
}

interface FeaturesPageProps {
    theme: string;
    toggleTheme: () => void;
}

// Feature Card Component
const FeatureCard: React.FC<FeatureCardProps> = ({
                                                     title,
                                                     description,
                                                     icon,
                                                     isSafeForData,
                                                     entities,
                                                     precision,
                                                     theme
                                                 }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`feature-card ${isExpanded ? 'expanded' : ''}`}>
            <div className="feature-card-header">
                <div className="feature-icon">{icon}</div>
                <h3>{title}</h3>
                <div className={`data-safety-badge ${isSafeForData ? 'safe' : 'not-safe'}`}>
                    {isSafeForData ? 'Safe for Data' : 'Not Safe for Data'}
                </div>
            </div>

            <p className="feature-description">{description}</p>

            <div className="feature-precision">
                <strong>Precision & Accuracy:</strong> {precision}
            </div>

            <div className="feature-entities-preview">
                <strong>Supported Entities:</strong>
                <div className="entity-tags">
                    {entities.slice(0, 5).map((entity, index) => (
                        <span key={index} className="entity-tag">{entity.label}</span>
                    ))}
                    {entities.length > 5 && (
                        <span className="entity-tag more-tag">{`+${entities.length - 5} more`}</span>
                    )}
                </div>
            </div>

            <button
                className="view-all-button"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? 'Show Less' : 'View All Entities'}
            </button>

            {isExpanded && (
                <div className="expanded-entities">
                    <h4>All Supported Entities</h4>
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

const FeaturesPage: React.FC<FeaturesPageProps> = ({ theme, toggleTheme }) => {
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
            <Navbar theme={theme} toggleTheme={toggleTheme} />

            <div className="features-hero">
                <div className="features-hero-content">
                    <h1>HideMeAI Features</h1>
                    <p>
                        Discover the powerful capabilities of our privacy-focused document redaction platform.
                        HideMeAI offers multiple detection methods and tools to ensure your sensitive data
                        remains protected.
                    </p>
                </div>
            </div>

            <div className="features-container">
                <section className="tools-section">
                    <h2>Redaction Tools</h2>
                    <p className="section-description">
                        Our platform offers various tools to help you identify and redact sensitive information
                        in your documents with precision and ease.
                    </p>

                    <div className="tools-grid">
                        <ToolFeatureCard
                            title="Manual Highlighting"
                            icon="✏️"
                            description="Select and highlight specific content you want to redact with our intuitive interface."
                        />
                        <ToolFeatureCard
                            title="Search Highlighting"
                            icon="🔍"
                            description="Search for specific terms or patterns and highlight all matches across your document."
                        />
                        <ToolFeatureCard
                            title="Regex Search"
                            icon="⚙️"
                            description="Use regular expressions to find complex patterns of sensitive information."
                        />
                        <ToolFeatureCard
                            title="Case Sensitive Search"
                            icon="Aa"
                            description="Toggle case sensitivity for more precise control over your search results."
                        />
                    </div>
                </section>

                <section className="detection-methods-section">
                    <h2>Entity Detection Methods</h2>
                    <p className="section-description">
                        HideMeAI offers multiple detection methods to identify sensitive information in your documents,
                        each with different capabilities and privacy considerations.
                    </p>

                    <div className="methods-grid">
                        <FeatureCard
                            title="Gemini AI Detection"
                            description="Leverage Google's Gemini AI model to identify a wide range of sensitive entities with high accuracy. Note that this method processes data on Google's servers."
                            icon="🤖"
                            isSafeForData={false}
                            entities={geminiOptions}
                            precision="Testing in progress"
                            theme={theme}
                        />

                        <FeatureCard
                            title="Gliner ML Detection"
                            description="A locally running machine learning model that identifies sensitive entities without sending your data to external servers, ensuring complete privacy."
                            icon="🔒"
                            isSafeForData={true}
                            entities={glinerOptions}
                            precision="Testing in progress"
                            theme={theme}
                        />

                        <FeatureCard
                            title="Presidio ML Detection"
                            description="Microsoft's Presidio framework with Kushtrim extensions running locally for enhanced privacy protection and specialized entity recognition."
                            icon="🛡️"
                            isSafeForData={true}
                            entities={presidioOptions}
                            precision="Testing in progress"
                            theme={theme}
                        />
                    </div>
                </section>

                <section className="comparison-section">
                    <h2>Detection Methods Comparison</h2>
                    <div className="comparison-table-container">
                        <table className="comparison-table">
                            <thead>
                            <tr>
                                <th>Feature</th>
                                <th>Gemini AI</th>
                                <th>Gliner ML</th>
                                <th>Presidio ML</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <td>Data Privacy</td>
                                <td className="negative">Processes data externally</td>
                                <td className="positive">Fully local processing</td>
                                <td className="positive">Fully local processing</td>
                            </tr>
                            <tr>
                                <td>Entity Types</td>
                                <td>{geminiOptions.length}</td>
                                <td>{glinerOptions.length}</td>
                                <td>{presidioOptions.length}</td>
                            </tr>
                            <tr>
                                <td>Performance</td>
                                <td>Fast</td>
                                <td>Medium</td>
                                <td>Medium</td>
                            </tr>
                            <tr>
                                <td>Contextual Understanding</td>
                                <td className="positive">High</td>
                                <td className="neutral">Medium</td>
                                <td className="neutral">Medium</td>
                            </tr>
                            <tr>
                                <td>Accuracy</td>
                                <td colSpan={3} className="centered">Testing in progress</td>
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
