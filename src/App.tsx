import React from 'react';
import AppRouter from './routes/AppRouter';
import {FileProvider} from './contexts/FileContext';
import {PDFViewerProvider} from './contexts/PDFViewerContext';
import {EditProvider} from './contexts/EditContext';
import {HighlightStoreProvider} from './contexts/HighlightStoreContext';
import UserContextProvider from './contexts/UserContext';
import {ThemeProvider} from './contexts/ThemeContext';
import ErrorBoundary from "./contexts/ErrorBoundary";
import {BatchSearchProvider} from "./contexts/SearchContext";
import {LoadingProvider} from './contexts/LoadingContext';
import {NotificationProvider} from "./contexts/NotificationContext";
import {NotificationRenderer} from "./components/static/NotificationRenderer";
import {FileSummaryProvider} from './contexts/FileSummaryContext';
import {LanguageProvider} from './contexts/LanguageContext';
import {PWAUpdateNotification} from './components/common/PWAUpdateNotification';
import {OfflineIndicator} from './components/common/OfflineIndicator';

const App: React.FC = () => {

    return (
        <ErrorBoundary>
            <LoadingProvider>
                <LanguageProvider>
                    <NotificationProvider>
                        <UserContextProvider>
                            <ThemeProvider >
                                <FileProvider>
                                    <PDFViewerProvider>
                                        <HighlightStoreProvider>
                                            <EditProvider>
                                                <BatchSearchProvider>
                                                    <FileSummaryProvider>
                                                        <AppRouter/>
                                                        <NotificationRenderer />
                                                        <PWAUpdateNotification/>
                                                        <OfflineIndicator/>
                                                    </FileSummaryProvider>
                                                </BatchSearchProvider>
                                            </EditProvider>
                                        </HighlightStoreProvider>
                                    </PDFViewerProvider>
                                </FileProvider>
                            </ThemeProvider>
                        </UserContextProvider>
                    </NotificationProvider>
                </LanguageProvider>
            </LoadingProvider>
        </ErrorBoundary>

    );
};

export default App;
