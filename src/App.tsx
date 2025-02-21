import React from 'react'
import AppRouter from './routes/AppRouter'
import useTheme from './hooks/useTheme'

const App: React.FC = () => {
    const [theme, toggleTheme] = useTheme('light')

    return (
        <AppRouter theme={theme} toggleTheme={toggleTheme} />
    )
}

export default App
