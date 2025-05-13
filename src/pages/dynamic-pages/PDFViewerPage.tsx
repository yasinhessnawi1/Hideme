import React, {useEffect, useRef, useState} from "react"
import PDFViewer from "../../components/pdf/pdf-viewer-components/PDFViewer"
import LeftSidebar from "../../components/pdf/pdf-page-components/LeftSidebar"
import Toolbar from "../../components/pdf/pdf-page-components/Toolbar"
import SearchSidebar from "../../components/pdf/pdf-page-components/SearchSidebar"
import EntityDetectionSidebar from "../../components/pdf/pdf-page-components/EntityDetectionSidebar"
import RedactionSidebar from "../../components/pdf/pdf-page-components/RadactionSidebar"
import Navbar from "../../components/static/Navbar"
import '../../styles/modules/pdf/PDFViewerPage.css'
import AutoProcessProvider from "../../contexts/AutoProcessProvider";
import { useLanguage } from '../../contexts/LanguageContext';

const PDFViewerPageContent: React.FC = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'detection' | 'search' | 'redact'>('detection')
    // Left sidebar state with hover functionality
    const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(true)
    const [isHoveringOnLeftSidebar, setIsHoveringOnLeftSidebar] = useState(false)
    const leftHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const leftSidebarRef = useRef<HTMLDivElement>(null)
    const leftHoverSensorRef = useRef<HTMLDivElement>(null)

    // Right sidebar state - static, no hover functionality
    const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(true) // Default closed

    // Toggle left sidebar visibility through button click
    const toggleLeftSidebar = () => {
        // Clear any hover-related timeouts
        if (leftHoverTimeoutRef.current) {
            clearTimeout(leftHoverTimeoutRef.current);
        }
        // Toggle state and reset hover state
        setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed);
        setIsHoveringOnLeftSidebar(false);
    };

    // Toggle right sidebar visibility - simple toggle, no hover logic
    const toggleRightSidebar = () => {
        setIsRightSidebarCollapsed(!isRightSidebarCollapsed);
    };

    // Handle mouse enter on the left hover sensor area
    const handleLeftHoverSensorEnter = () => {
        if (isLeftSidebarCollapsed) {
            // Clear any existing timeout
            if (leftHoverTimeoutRef.current) {
                clearTimeout(leftHoverTimeoutRef.current);
            }

            // Set timeout to prevent accidental triggers
            leftHoverTimeoutRef.current = setTimeout(() => {
                setIsHoveringOnLeftSidebar(true);
                setIsLeftSidebarCollapsed(false);
            }, 300); // 300ms delay before opening
        }
    };

    // Handle mouse leave from the left sidebar
    const handleLeftSidebarLeave = () => {
        // Only auto-close if it was opened by hover
        if (isHoveringOnLeftSidebar) {
            // Add delay before closing to give user time to interact
            leftHoverTimeoutRef.current = setTimeout(() => {
                setIsHoveringOnLeftSidebar(false);
                setIsLeftSidebarCollapsed(true);
            }, 500); // 500ms delay before closing
        }
    };

    // Listen for right panel tab navigation events
    useEffect(() => {
        const handleActivateRightPanel = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { navigateToTab } = customEvent.detail || {};

            if (navigateToTab === 'detection' || navigateToTab === 'search' || navigateToTab === 'redact') {
                setActiveTab(navigateToTab);

                // Also ensure the right sidebar is open
                setIsRightSidebarCollapsed(false);
            }
        };

        window.addEventListener('activate-right-panel', handleActivateRightPanel);

        return () => {
            window.removeEventListener('activate-right-panel', handleActivateRightPanel);
        };
    }, []);

    // Clear timeouts on component unmount
    useEffect(() => {
        return () => {
            if (leftHoverTimeoutRef.current) {
                clearTimeout(leftHoverTimeoutRef.current);
            }
        };
    }, []);

    // Cancel timeout if user manually toggles left sidebar
    useEffect(() => {
        if (!isLeftSidebarCollapsed) {
            if (leftHoverTimeoutRef.current) {
                clearTimeout(leftHoverTimeoutRef.current);
            }
        }
    }, [isLeftSidebarCollapsed]);


    return (
        <>
            {/* Header with Navbar and Toolbar */}
            <header className="viewer-header">
                <Toolbar
                    toggleLeftSidebar={toggleLeftSidebar}
                    isLeftSidebarCollapsed={isLeftSidebarCollapsed}
                    toggleRightSidebar={toggleRightSidebar}
                    isRightSidebarCollapsed={isRightSidebarCollapsed}
                />
            </header>

            {/* Main content area */}
            <div className="viewer-content">
                {/* Left hover sensor - small area that detects mouse enter */}
                <div
                    className="sidebar-hover-sensor left"
                    ref={leftHoverSensorRef}
                    onMouseEnter={handleLeftHoverSensorEnter}
                ></div>

                {/* Left sidebar - Tabbed with File Selector and Page Thumbnails */}
                <aside
                    className={`left-sidebar ${isLeftSidebarCollapsed ? 'collapsed' : ''}`}
                    ref={leftSidebarRef}
                    onMouseLeave={handleLeftSidebarLeave}
                >
                    <LeftSidebar isSidebarCollapsed={isLeftSidebarCollapsed}/>
                </aside>

                {/* Main PDF viewer */}
                <main className="main-content">

                    <PDFViewer/>
                    {/* File upload button - only shown when there's at least one file */}

                </main>

                {/* Right sidebar - Static, no hover sensor */}
                <aside
                    className={`right-sidebar ${isRightSidebarCollapsed ? 'collapsed' : ''}`}
                >
                    <div className="sidebar-tabs">
                        <div className="tabs-header">
                            <button
                                className={`tab-button ${activeTab === 'detection' ? 'active' : ''}`}
                                onClick={() => setActiveTab('detection')}
                            >
                                {t('pdf', 'detection')}
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
                                onClick={() => setActiveTab('search')}
                            >
                                {t('pdf', 'search')}
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'redact' ? 'active' : ''}`}
                                onClick={() => setActiveTab('redact')}
                            >
                                {t('redaction', 'redactTab')}
                            </button>
                        </div>

                        <div className="tabs-content">
                            <div className={`tab-panel ${activeTab === 'detection' ? 'active' : ''}`}>
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
