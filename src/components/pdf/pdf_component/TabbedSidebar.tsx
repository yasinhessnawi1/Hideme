import React, { useState, useEffect } from 'react';
import { File, Layers, History } from 'lucide-react';
import PageThumbnails from './PageThumbnails';
import FileSelector from './FileSelector';
import HistoryViewer from './HistoryViewer';
import '../../../styles/modules/pdf/TabbedSidebar.css';
import { useLanguage } from '../../../contexts/LanguageContext';

interface TabbedSidebarProps {
    isSidebarCollapsed?: boolean;
}

type TabType = 'thumbnails' | 'files' | 'history';

const TabbedSidebar: React.FC<TabbedSidebarProps> = ({ isSidebarCollapsed }) => {
    const [activeTab, setActiveTab] = useState<TabType>('thumbnails');
    const { t } = useLanguage();

    // Listen for tab navigation events from toolbar or other components
    useEffect(() => {
        const handleActivatePanel = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { navigateToTab } = customEvent.detail || {};
            
            if (navigateToTab === 'files') {
                setActiveTab('files');
            } else if (navigateToTab === 'thumbnails' || navigateToTab === 'pages') {
                setActiveTab('thumbnails');
            } else if (navigateToTab === 'history') {
                setActiveTab('history');
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
                    title={t('pdf', 'pageThumbnails')}
                >
                    <Layers size={18} />
                    <span className="tab-label">{t('pdf', 'pages')}</span>
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'files' ? 'active' : ''}`}
                    onClick={() => setActiveTab('files')}
                    title={t('pdf', 'pdfFiles')}
                >
                    <File size={18} />
                    <span className="tab-label">{t('pdf', 'files')}</span>
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                    title={t('pdf', 'documentHistory')}
                >
                    <History size={18} />
                    <span className="tab-label">{t('pdf', 'documentHistory')}</span>
                </button>
            </div>

            <div className="sidebar-content">
                <div className={`tab-panel ${activeTab === 'thumbnails' ? 'active' : ''}`}>
                    <PageThumbnails isSidebarCollapsed={false} />
                </div>
                <div className={`tab-panel ${activeTab === 'files' ? 'active' : ''}`}>
                    <FileSelector />
                </div>
                <div className={`tab-panel ${activeTab === 'history' ? 'active' : ''}`}>
                    <HistoryViewer />
                </div>
            </div>
        </div>
    );
};

export default TabbedSidebar;