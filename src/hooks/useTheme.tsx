// src/hooks/useTheme.ts
import { useState, useEffect } from 'react';

export default function useTheme(defaultTheme: 'light' | 'dark' = 'light') {
    const [theme, setTheme] = useState<'light' | 'dark'>(defaultTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    return { theme, toggleTheme };
}
