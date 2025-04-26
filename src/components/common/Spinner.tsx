import React from 'react';
import { Loader2 } from 'lucide-react';
import '../../styles/components/LoadingWrapper.css'; // Use the same CSS file

interface SpinnerProps {
    size?: number;
    className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
                                                    size = 16,
                                                    className = ''
                                                }) => {
    return (
        <Loader2
            size={size}
            className={`spinner ${className}`}
        />
    );
};

export default Spinner;
