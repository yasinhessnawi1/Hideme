import React, {useEffect, useState} from 'react';
import {useLanguage} from '../../contexts/LanguageContext';
import '../../styles/components/Footer.css';
import {Link} from 'react-router-dom';

const Footer = () => {
  const { t } = useLanguage();
  const [year, setYear] = useState(new Date().getFullYear());
  
  useEffect(() => {
    // Update the year when the component mounts
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-heading">{t('footer', 'companyName') || 'HideMeAI'}</h3>
          <p className="footer-description">
            {t('footer', 'companyDescription') || 'Secure document redaction powered by AI'}
          </p>
        </div>
        
        <div className="footer-section">
          <h3 className="footer-heading">{t('footer', 'quickLinks') || 'Quick Links'}</h3>
          <ul className="footer-links">
            <li><Link to="/">{t('common', 'hideMe')}</Link></li>
            <li><Link to="/features">{t('common', 'features')}</Link></li>
              <li><Link to="/how-to">{t('common', 'howItWorks')}</Link></li>
            <li><Link to="/about">{t('common', 'about')}</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3 className="footer-heading">{t('footer', 'contact') || 'Contact'}</h3>
          <p>
            <a href="mailto:support@hidemeai.com" className="footer-contact-link">
              support@hidemeai.com
            </a>
          </p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="copyright">
          © {year} HideMeAI. {t('footer', 'allRightsReserved') || 'All Rights Reserved'}
        </div>
      </div>
    </footer>
  );
};

export default Footer; 