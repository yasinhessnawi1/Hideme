// src/pages/PlaygroundPage.tsx
import React from 'react';
import { PdfProvider } from '../contexts/PdfContext';
import PlaygroundToolbar from '../components/playground/PlaygroundToolbar';
import PagePreviews from '../components/playground/PagePreviews';
import PdfViewer from '../components/playground/PdfViewer';
import SettingsSidebar from '../components/playground/SettingsSidebar';
import '../styles/playground/PlaygroundPage.css';
import Navbar from "../components/static/Navbar";

interface PlaygroundPageProps {
    theme: string;
    toggleTheme: () => void;
}

const PlaygroundPage: React.FC<PlaygroundPageProps> = ({ theme, toggleTheme }) => {
    return (
        <PdfProvider>
            <div className="playground-page">
                <Navbar theme={theme} toggleTheme={toggleTheme} />
                <PlaygroundToolbar />

                <div className="playground-content">
                    <aside className="page-previews">
                        <PagePreviews />
                    </aside>

                    <main className="pdf-viewer">
                        <PdfViewer />
                    </main>

                    <aside className="settings-sidebar">
                        <SettingsSidebar />
                    </aside>
                </div>
            </div>
        </PdfProvider>
    );
};

export default PlaygroundPage;
