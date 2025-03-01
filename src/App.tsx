import React from 'react'
import AppRouter from './routes/AppRouter'
import {PDFProvider} from "./contexts/PDFContext";
import useTheme from "./hooks/useTheme";
import {HighlightProvider} from "./contexts/HighlightContext";


const App: React.FC = () => {
    const { theme, toggleTheme } = useTheme('light');
    return (
        <HighlightProvider>
                <PDFProvider>
                    <AppRouter theme={theme} toggleTheme={toggleTheme} />
                </PDFProvider>
        </HighlightProvider>

    )
}

export default App
