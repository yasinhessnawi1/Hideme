import React from 'react';
import AppRouter from './routes/AppRouter';
import { FileProvider } from './contexts/FileContext';
import { PDFViewerProvider } from './contexts/PDFViewerContext';
import { EditProvider } from './contexts/EditContext';
import { HighlightProvider } from './contexts/HighlightContext';
import { UserContextProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from "./contexts/ErrorBoundary";
import Navbar from "./components/static/Navbar";
import {BatchSearchProvider} from "./contexts/SearchContext";
import AutoProcessProvider from "./contexts/AutoProcessProvider";

const App: React.FC = () => {

    return (
        <ErrorBoundary>
            <UserContextProvider>
                <ThemeProvider >
                    <FileProvider>
                        <PDFViewerProvider>
                            <HighlightProvider>
                                <EditProvider>
                                    <BatchSearchProvider>
                                        <AutoProcessProvider>
                                            <AppRouter/>
                                        </AutoProcessProvider>
                                    </BatchSearchProvider>
                                </EditProvider>
                            </HighlightProvider>
                        </PDFViewerProvider>
                    </FileProvider>
                </ThemeProvider>
            </UserContextProvider>
        </ErrorBoundary>

    );
};

export default App;
