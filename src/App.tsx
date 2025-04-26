import React from 'react';
import AppRouter from './routes/AppRouter';
import { FileProvider } from './contexts/FileContext';
import { PDFViewerProvider } from './contexts/PDFViewerContext';
import { EditProvider } from './contexts/EditContext';
import { HighlightStoreProvider } from './contexts/HighlightStoreContext';
import UserContextProvider  from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from "./contexts/ErrorBoundary";
import {BatchSearchProvider} from "./contexts/SearchContext";
import AutoProcessProvider from "./contexts/AutoProcessProvider";
import { LoadingProvider } from './contexts/LoadingContext';

const App: React.FC = () => {

    return (
        <ErrorBoundary>
            <LoadingProvider>
            <UserContextProvider>
                <ThemeProvider >
                    <FileProvider>
                        <PDFViewerProvider>
                            <HighlightStoreProvider>
                                <EditProvider>
                                    <BatchSearchProvider>
                                        <AutoProcessProvider>
                                            <AppRouter/>
                                        </AutoProcessProvider>
                                    </BatchSearchProvider>
                                </EditProvider>
                            </HighlightStoreProvider>
                        </PDFViewerProvider>
                    </FileProvider>
                </ThemeProvider>
            </UserContextProvider>
            </LoadingProvider>
        </ErrorBoundary>

    );
};

export default App;
