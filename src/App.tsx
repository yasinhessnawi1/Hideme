// App.tsx
import React from 'react';
import AppRouter from './routes/AppRouter';
import { FileProvider } from './contexts/FileContext';
import { PDFViewerProvider } from './contexts/PDFViewerContext';
import { EditProvider } from './contexts/EditContext';
import { HighlightProvider } from './contexts/HighlightContext';
import useTheme from './hooks/useTheme';


const App: React.FC = () => {
    const { theme, toggleTheme } = useTheme('light');

    return (
        <FileProvider>
            <PDFViewerProvider>
                <EditProvider>
                    <HighlightProvider>
                        <AppRouter theme={theme} toggleTheme={toggleTheme} />
                    </HighlightProvider>
                </EditProvider>
            </PDFViewerProvider>
        </FileProvider>
    );
};

export default App;
