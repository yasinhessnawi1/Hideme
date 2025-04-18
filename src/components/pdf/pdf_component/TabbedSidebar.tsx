import React, { useState, useEffect } from 'react';
import { File, Layers } from 'lucide-react';
import PageThumbnails from './PageThumbnails';
import FileSelector from './FileSelector';
import '../../../styles/modules/pdf/TabbedSidebar.css';

interface TabbedSidebarProps {
    isSidebarCollapsed?: boolean;
}

type TabType = 'thumbnails' | 'files';

const TabbedSidebar: React.FC<TabbedSidebarProps> = ({ isSidebarCollapsed }) => {
    const [activeTab, setActiveTab] = useState<TabType>('thumbnails');

    // Listen for tab navigation events from toolbar or other components
    useEffect(() => {
        const handleActivatePanel = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { navigateToTab } = customEvent.detail || {};
            
            if (navigateToTab === 'files') {
                setActiveTab('files');
            } else if (navigateToTab === 'thumbnails' || navigateToTab === 'pages') {
                setActiveTab('thumbnails');
            }
        };
        
        // Listen for navigation events
        window.addEventListener('activate-left-panel', handleActivatePanel);
        
        return () => {
            window.removeEventListener('activate-left-panel', handleActivatePanel);
        };
    }, []);

    if (isSidebarCollapsed) {
        return null;
    }

    return (
        <div className="tabbed-sidebar">
            <div className="left-sidebar-tabs">
                <button
                    className={`sidebar-tab ${activeTab === 'thumbnails' ? 'active' : ''}`}
                    onClick={() => setActiveTab('thumbnails')}
                    title="Page Thumbnails"
                >
                    <Layers size={18} />
                    <span className="tab-label">Pages</span>
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'files' ? 'active' : ''}`}
                    onClick={() => setActiveTab('files')}
                    title="PDF Files"
                >
                    <File size={18} />
                    <span className="tab-label">Files</span>
                </button>
            </div>

            <div className="sidebar-content">
                <div className={`tab-panel ${activeTab === 'thumbnails' ? 'active' : ''}`}>
                    <PageThumbnails isSidebarCollapsed={false} />
                </div>
                <div className={`tab-panel ${activeTab === 'files' ? 'active' : ''}`}>
                    <FileSelector />
                </div>
            </div>
        </div>
    );
};

export default TabbedSidebar;
