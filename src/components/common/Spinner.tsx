import React from 'react';
import { Loader2 } from 'lucide-react';
import '../../styles/components/LoadingWrapper.css'; // Use the same CSS file
import { useLanguage } from '../../contexts/LanguageContext';

interface SpinnerProps {
    size?: number;
    className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
                                                    size = 16,
                                                    className = ''
                                                }) => {
    const { t } = useLanguage();
    return (
        <Loader2
            size={size}
            className={`spinner ${className}`}
            aria-label={t('common', 'loading')}
        />
    );
};

export default Spinner;
