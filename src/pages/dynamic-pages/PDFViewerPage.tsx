import React, {useEffect, useState} from "react"
import PDFViewer from "../../components/pdf/pdf-viewer-components/PDFViewer"
import UnifiedSidebar from "../../components/pdf/pdf-page-components/UnifiedSidebar"
import Toolbar from "../../components/pdf/pdf-page-components/Toolbar"
import SearchSidebar from "../../components/pdf/pdf-page-components/SearchSidebar"
import EntityDetectionSidebar from "../../components/pdf/pdf-page-components/EntityDetectionSidebar"
import RedactionSidebar from "../../components/pdf/pdf-page-components/RadactionSidebar"
import Navbar from "../../components/static/Navbar"

import AutoProcessProvider from "../../contexts/AutoProcessProvider";
import { useLanguage } from '../../contexts/LanguageContext';

const PDFViewerPageContent: React.FC = () => {
    const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false) // Default expanded
    const [sidebarWidth, setSidebarWidth] = useState(400); // Track sidebar width

    // Handle sidebar width changes
    const handleSidebarWidthChange = (width: number) => {
        setSidebarWidth(width);
    };

    return (
        <>
            {/* Header with Navbar and Toolbar */}
            <header className="viewer-header">
                <Toolbar/>
            </header>

            {/* Main content area */}
            <div className="viewer-content">
                {/* Unified Left Sidebar */}
                <UnifiedSidebar
                    isCollapsed={isLeftSidebarCollapsed}
                    onToggleCollapse={setIsLeftSidebarCollapsed}
                    onWidthChange={handleSidebarWidthChange}
                    defaultActiveTab="thumbnails"
                />

                {/* Main PDF viewer - margin will be handled by CSS custom properties */}
                <main
                    className="main-content"
                    style={{
                        marginLeft: `${sidebarWidth}px`,
                        transition: isLeftSidebarCollapsed ? 'margin 0.3s ease' : 'none' // Only animate when collapsing/expanding
                    }}
                >
                    <PDFViewer/>
                </main>

            </div>
        </>
    );
};

const PDFViewerPage = () => {
    const { t } = useLanguage();
    return (

        <AutoProcessProvider>
            <div className={`pdf-viewer-page `}>
                <Navbar/>
                <PDFViewerPageContent/>
            </div>
        </AutoProcessProvider>
    );
};

export default PDFViewerPage;
