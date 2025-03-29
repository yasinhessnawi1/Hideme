import React, {useEffect} from 'react';
import Navbar from '../components/static/Navbar'; // Import your Navbar component
import '../styles/HowToPage.css'; // Import your styles

interface HowToPageProps {
    theme: string;
    toggleTheme: () => void;
}

const HowToPage: React.FC<HowToPageProps> = ({theme, toggleTheme}) => {
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
            <Navbar theme={theme} toggleTheme={toggleTheme}/>

            <div className="how-to-container">
                <div className="how-to-header">
                    <h1>How to Redact Content Using HideMeAI</h1>
                    <p className="how-to-description">
                        This guide will walk you through the process of redacting sensitive information
                        in your documents using our HideMeAI tool. Follow these simple steps to protect
                        your private data before sharing documents.
                    </p>
                </div>

                <div className="scribe-embed-container">
                    <iframe
                        src="https://scribehow.com/embed/How_to_Redact_Content_Using_HideMeAI__285wa5cPRcGs_tnUL1ELzQ?as=scrollable"
                        width="120%" height="640" allowFullScreen frameBorder="0"></iframe>
                </div>

                <div className="how-to-additional-info">
                    <h2>Additional Resources</h2>
                    <div className="resource-cards">
                        <div className="resource-card">
                            <div className="card-icon">📋</div>
                            <h3>Frequently Asked Questions</h3>
                            <p>Find answers to common questions about the redaction process and capabilities.</p>
                            <a href="/#" className="card-link">View FAQs</a>
                        </div>

                        <div className="resource-card">
                            <div className="card-icon">📘</div>
                            <h3>Advanced Redaction Techniques</h3>
                            <p>Learn about pattern-based redaction and other advanced features.</p>
                            <a href="/#" className="card-link">Read Advanced Guide</a>
                        </div>

                        <div className="resource-card">
                            <div className="card-icon">📹</div>
                            <h3>Video Tutorials</h3>
                            <p>Watch step-by-step video guides for visual learners.</p>
                            <a href="/#" className="card-link">Watch Tutorials</a>
                        </div>
                    </div>
                </div>

                <div className="how-to-feedback">
                    <h2>Was this guide helpful?</h2>
                    <div className="feedback-buttons">
                        <button className="feedback-button">👍 Yes</button>
                        <button className="feedback-button">👎 No</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HowToPage;
