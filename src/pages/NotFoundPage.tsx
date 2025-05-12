import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
    const { t } = useLanguage();
    return (
        <div className="not-found-page">
            <h1>{t('notFound', 'title')}</h1>
            <p>{t('notFound', 'description')}</p>
            <Link to="/">{t('notFound', 'goHome')}</Link>
        </div>
    );
}

export default NotFoundPage; 