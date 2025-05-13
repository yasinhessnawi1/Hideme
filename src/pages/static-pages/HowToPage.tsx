import React, {useEffect} from 'react';
import Navbar from '../../components/static/Navbar'; // Import your Navbar component
import '../../styles/HowToPage.css'; // Import your styles
import { useLanguage } from '../../contexts/LanguageContext';


const HowToPage = () => {
    const { t } = useLanguage();
    // Ensure iframe loads properly and handles messaging if needed
    useEffect(() => {
        const handleMessage = (event: { origin: string; data: any; }) => {
            if (event.origin === "https://scribehow.com") {
                // Handle any messages from the iframe if needed
                console.log("Message from Scribe:", event.data);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    return (
        <div className="how-to-page">
            <Navbar />

            <div className="how-to-container">
                <div className="how-to-header">
                    <h1>{t('howto', 'howToRedactTitle')}</h1>
                    <p className="how-to-description">
                        {t('howto', 'howToRedactDescription')}
                    </p>
                </div>

                <div className="scribe-embed-container">
                    <iframe
                        src="https://scribehow.com/embed/How_to_Redact_Content_Using_HideMeAI__285wa5cPRcGs_tnUL1ELzQ?as=scrollable"
                        width="120%" height="640" allowFullScreen frameBorder="0"></iframe>
                </div>

                <div className="how-to-additional-info">
                    <h2>{t('howto', 'additionalResources')}</h2>
                    <div className="resource-cards">
                        <div className="resource-card">
                            <div className="card-icon">📋</div>
                            <h3>{t('howto', 'faqTitle')}</h3>
                            <p>{t('howto', 'faqDescription')}</p>
                            <a href="/public#" className="card-link">{t('howto', 'viewFaqs')}</a>
                        </div>

                        <div className="resource-card">
                            <div className="card-icon">📘</div>
                            <h3>{t('howto', 'advancedRedactionTitle')}</h3>
                            <p>{t('howto', 'advancedRedactionDescription')}</p>
                            <a href="/public#" className="card-link">{t('howto', 'readAdvancedGuide')}</a>
                        </div>

                        <div className="resource-card">
                            <div className="card-icon">📹</div>
                            <h3>{t('howto', 'videoTutorialsTitle')}</h3>
                            <p>{t('howto', 'videoTutorialsDescription')}</p>
                            <a href="/public#" className="card-link">{t('howto', 'watchTutorials')}</a>
                        </div>
                    </div>
                </div>

                <div className="how-to-feedback">
                    <h2>{t('howto', 'wasThisGuideHelpful')}</h2>
                    <div className="feedback-buttons">
                        <button className="feedback-button">👍 {t('howto', 'yes')}</button>
                        <button className="feedback-button">👎 {t('howto', 'no')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HowToPage;
