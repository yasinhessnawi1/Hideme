import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import Navbar from '../../components/static/Navbar';
import Footer from '../../components/static/Footer';

const NotFoundPage = () => {
    const { t } = useLanguage();
    return (
        <div className="not-found-page">
            <Navbar />
            <div className="not-found-content">
                <h1>{t('notFound', 'title')}</h1>
                <p>{t('notFound', 'description')}</p>
                <Link to="/">{t('notFound', 'goHome')}</Link>
            </div>
            <Footer />
        </div>
    );
}

export default NotFoundPage;
