// src/components/pdf/PDFViewerPage.tsx (Updated)
import React, { useState, useEffect, useRef } from "react"
import { FileProvider } from "../contexts/FileContext"
import { PDFViewerProvider } from "../contexts/PDFViewerContext"
import { EditProvider } from "../contexts/EditContext"
import { HighlightProvider } from "../contexts/HighlightContext"
import { BatchSearchProvider } from "../contexts/SearchContext" // Add BatchSearchProvider
import PDFViewer from "../components/pdf/PDFViewer"
import TabbedSidebar from "../components/pdf/pdf_component/TabbedSidebar"
import Toolbar from "../components/pdf/pdf_component/Toolbar"
import SearchSidebar from "../components/pdf/pdf_component/SearchSidebar" // Use new component
import EntityDetectionSidebar from "../components/pdf/pdf_component/EntityDetectionSidebar"
import RedactionSidebar from "../components/pdf/pdf_component/RadactionSidebar"
import Navbar from "../components/static/Navbar"
import '../styles/modules/pdf/PDFViewerPage.css'

interface PDFViewerPageProps {
    theme: string
    toggleTheme: () => void
}

const PDFViewerPageContent: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'entities' | 'search' | 'redact'>('entities')
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true) // Set to true by default
    const [isHoveringOnSidebar, setIsHoveringOnSidebar] = useState(false)
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const sidebarRef = useRef<HTMLDivElement>(null)
    const hoverSensorRef = useRef<HTMLDivElement>(null)

    // Toggle sidebar visibility through button click
    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    // Handle mouse enter on the hover sensor area
    const handleHoverSensorEnter = () => {
        if (isSidebarCollapsed) {
            // Clear any existing timeout
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }

            // Set timeout to prevent accidental triggers
            hoverTimeoutRef.current = setTimeout(() => {
                setIsHoveringOnSidebar(true);
                setIsSidebarCollapsed(false);
            }, 300); // 300ms delay before opening
        }
    };

    // Handle mouse leave from the sidebar
    const handleSidebarLeave = () => {
        // Only auto-close if it was opened by hover
        if (isHoveringOnSidebar) {
            // Add delay before closing to give user time to interact
            hoverTimeoutRef.current = setTimeout(() => {
                setIsHoveringOnSidebar(false);
                setIsSidebarCollapsed(true);
            }, 500); // 500ms delay before closing
        }
    };

    // Clear timeout on component unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    // Cancel timeout if user manually toggles sidebar
    useEffect(() => {
        if (!isSidebarCollapsed) {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        }
    }, [isSidebarCollapsed]);

    return (
        <>
            {/* Header with Navbar and Toolbar */}
            <header className="viewer-header">
                <Toolbar toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            </header>

            {/* Main content area */}
            <div className="viewer-content">
                {/* Hover sensor - small area that detects mouse enter */}
                <div
                    className="sidebar-hover-sensor"
                    ref={hoverSensorRef}
                    onMouseEnter={handleHoverSensorEnter}
                ></div>

                {/* Left sidebar - Tabbed with File Selector and Page Thumbnails */}
                <aside
                    className={`left-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
                    ref={sidebarRef}
                    onMouseLeave={handleSidebarLeave}
                >
                    <TabbedSidebar isSidebarCollapsed={isSidebarCollapsed} />
                </aside>

                {/* Main PDF viewer */}
                <main className="main-content">
                    <PDFViewer />
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
                                className={`tab-button ${activeTab === 'redact' ? 'active' : ''}`}
                                onClick={() => setActiveTab('redact')}
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
                            <div className={`tab-panel ${activeTab === 'redact' ? 'active' : ''}`}>
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
        <div className={`pdf-viewer-page ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
            <Navbar theme={theme} toggleTheme={toggleTheme} />
            <FileProvider>
                <PDFViewerProvider>
                    <HighlightProvider>
                        <EditProvider>
                            <BatchSearchProvider> {/* Add the BatchSearchProvider */}
                                <PDFViewerPageContent />
                            </BatchSearchProvider>
                        </EditProvider>
                    </HighlightProvider>
                </PDFViewerProvider>
            </FileProvider>
        </div>
    );
};

export default PDFViewerPage;
