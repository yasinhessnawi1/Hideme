import SettingsLayout from "../components/settings/SettingsLayout";
import React from "react";
import Navbar from "../components/static/Navbar";
import {FileProvider} from "../contexts/FileContext";
import {PDFViewerProvider} from "../contexts/PDFViewerContext";
import {HighlightProvider} from "../contexts/HighlightContext";
import {EditProvider} from "../contexts/EditContext";
import {BatchSearchProvider} from "../contexts/SearchContext";
import AutoProcessProvider from "../contexts/AutoProcessProvider";
import {ThemeProvider} from "../contexts/ThemeContext";
import ErrorBoundary from "../contexts/ErrorBoundary";
import {UserContextProvider} from "../contexts/UserContext";

const SettingsPage =  () => {
    return (
        <ErrorBoundary>
            <UserContextProvider>

            <ThemeProvider>
                    <FileProvider>
                        <PDFViewerProvider>
                            <HighlightProvider>
                                <EditProvider>
                                    <BatchSearchProvider>
                                        <AutoProcessProvider>
                                            <SettingsLayout/>
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

export default SettingsPage;
