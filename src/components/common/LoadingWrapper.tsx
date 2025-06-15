import React from 'react';
import Spinner from './Spinner';
import { useLanguage } from '../../contexts/LanguageContext';

interface LoadingWrapperProps {
    isLoading: boolean;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    overlay?: boolean;
}

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
                                                                  isLoading,
                                                                  children,
                                                                  fallback,
                                                                  overlay = false
                                                              }) => {
    const { t } = useLanguage();
    if (!isLoading) {
        return <>{children}</>;
    }

    if (overlay) {
        return (
            <div className="loading-wrapper-container">
                <div className="loading-wrapper-overlay">
                    {fallback ? <span>{fallback}</span> : <span>{t('common', 'loading')}</span>}
                    <Spinner size={24} />
                </div>
                {children}
            </div>
        );
    }

    return fallback || (
        <div className="loading-wrapper-centered">
            <Spinner size={24} />
            <span>{t('common', 'loading')}</span>
        </div>
    );
};

export default LoadingWrapper;
