import React from 'react'
import { Moon, Sun } from 'lucide-react'
import '../../styles/components/ThemeToggle.css'

interface ThemeToggleProps {
    isDarkMode: boolean
    toggleTheme: () => void
}

const ThemeToggler: React.FC<ThemeToggleProps> = ({ isDarkMode, toggleTheme }) => {
    const { t } = require('../../contexts/LanguageContext').useLanguage();
    return (
        <button className="theme-toggle" onClick={toggleTheme} aria-label={t('settings', isDarkMode ? 'light' : 'dark')}>
            {isDarkMode ? <Sun className="theme-icon" /> : <Moon className="theme-icon" />}
        </button>
    )
}

export default ThemeToggler
