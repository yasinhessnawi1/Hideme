import React from 'react';
import Spinner from './Spinner';
import '../../styles/components/LoadingWrapper.css';

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
    if (!isLoading) {
        return <>{children}</>;
    }

    if (overlay) {
        return (
            <div className="loading-wrapper-container">
                <div className="loading-wrapper-overlay">
                    {fallback && <span>{fallback}</span>}
                    <Spinner size={24} />
                </div>
                {children}
            </div>
        );
    }

    return fallback || (
        <div className="loading-wrapper-centered">
            <Spinner size={24} />
        </div>
    );
};

export default LoadingWrapper;
