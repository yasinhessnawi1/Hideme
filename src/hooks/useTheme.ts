import { useState, useEffect } from 'react'

export default function useTheme(defaultTheme: string = 'light'): [string, () => void] {
    const [theme, setTheme] = useState<string>(defaultTheme)

    useEffect(() => {
        // Use data-theme to switch CSS variables or your styling approach
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    }

    return [theme, toggleTheme]
}
