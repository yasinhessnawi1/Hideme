import React from 'react'
import { Moon, Sun } from 'lucide-react'
import '../../styles/components/ThemeToggle.css'

interface ThemeToggleProps {
    isDarkMode: boolean
    toggleTheme: () => void
}

const ThemeToggler: React.FC<ThemeToggleProps> = ({ isDarkMode, toggleTheme }) => {
    return (
        <button className="theme-toggle" onClick={toggleTheme}>
            {isDarkMode ? <Sun className="theme-icon" /> : <Moon className="theme-icon" />}
        </button>
    )
}

export default ThemeToggler
