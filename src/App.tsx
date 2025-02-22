import React from 'react'
import AppRouter from './routes/AppRouter'
import {PdfProvider} from "./contexts/PdfContext";
import useTheme from "./hooks/useTheme";

const App: React.FC = () => {
    const { theme, toggleTheme } = useTheme('light');
    return (
                <PdfProvider>
                    <AppRouter theme={theme} toggleTheme={toggleTheme} />
                </PdfProvider>

    )
}

export default App
