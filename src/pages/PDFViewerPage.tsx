"use client"

import React, { useRef, useState } from "react"
import { PDFProvider, usePDFContext } from "../contexts/PDFContext"
import { HighlightProvider } from "../contexts/HighlightContext"
import PDFViewer from "../components/pdf/PDFViewer"
import PageThumbnails from "../components/pdf/PageThumbnails"
import Toolbar from "../components/pdf/Toolbar"
import SearchSidebar from "../components/pdf/SearchSidebar"
import EntityDetectionSidebar from "../components/pdf/EntityDetectionSidebar"
import RedactionSidebar from "../components/pdf/RadactionSidebar"
import Navbar from "../components/static/Navbar"
import { Upload } from 'lucide-react'
import '../styles/pages/pdf/PDFViewerPage.css'

interface PDFViewerPageProps {
    theme: string
    toggleTheme: () => void
}

const PDFViewerPageContent: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'entities' | 'search' | 'redaction'>('entities')
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const { file, setFile } = usePDFContext()
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Handle file selection
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };


    // Toggle sidebar visibility
    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <>
            {/* Header with Navbar and Toolbar */}
            <header className="viewer-header">
                <Toolbar toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            </header>

            {/* Main content area */}
            <div className="viewer-content">
                {/* Left sidebar - Collapsible */}
                <aside className={`left-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                    <div className="sidebar-content thumbnails-container">
                        <PageThumbnails isSidebarCollapsed={isSidebarCollapsed} />
                    </div>
                </aside>

                {/* Main PDF viewer */}
                <main className="main-content">
                    {/* Always render a hidden file input */}
                    <input
                        id="pdf-upload"
                        type="file"
                        accept="application/pdf"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        style={{display: 'none'}}
                    />
                    {file ? (
                        <PDFViewer/>
                    ) : (
                        <div className="file-upload-container">
                            <h2 className="file-upload-title">File</h2>
                            <label className="file-upload-area" htmlFor="pdf-upload" >
                                <Upload className="file-upload-icon" size={32}/>
                                <span className="file-upload-text">Select a File to Redact</span>
                            </label>
                        </div>
                    )}
                </main>

                {/* Right sidebar - Static */}
                <aside className="right-sidebar">
                    <div className="sidebar-tabs">
                        <div className="tabs-header">
                            <button
                                className={`tab-button ${activeTab === 'entities' ? 'active' : ''}`}
                                onClick={() => setActiveTab('entities')}
                            >
                                Entities
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
                                onClick={() => setActiveTab('search')}
                            >
                                Search
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'redaction' ? 'active' : ''}`}
                                onClick={() => setActiveTab('redaction')}
                            >
                                Redact
                            </button>
                        </div>

                        <div className="tabs-content">
                            <div className={`tab-panel ${activeTab === 'entities' ? 'active' : ''}`}>
                                <EntityDetectionSidebar/>
                            </div>
                            <div className={`tab-panel ${activeTab === 'search' ? 'active' : ''}`}>
                                <SearchSidebar/>
                            </div>
                            <div className={`tab-panel ${activeTab === 'redaction' ? 'active' : ''}`}>
                                <RedactionSidebar/>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </>
    );
};

const PDFViewerPage: React.FC<PDFViewerPageProps> = ({ theme, toggleTheme }) => {
    return (
        <HighlightProvider>
            <PDFProvider>
                <div className={`pdf-viewer-page ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
                    <Navbar theme={theme} toggleTheme={toggleTheme} />
                    <PDFViewerPageContent />
                </div>
            </PDFProvider>
        </HighlightProvider>
    );
};

export default PDFViewerPage;
