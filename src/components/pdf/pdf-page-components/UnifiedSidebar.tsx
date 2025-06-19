import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, FileText, FolderOpen, History, Search, Settings} from 'lucide-react';
import {useFileContext} from '../../../contexts/FileContext';
import {useLanguage} from '../../../contexts/LanguageContext';
import {FaEraser, FaMagic,} from 'react-icons/fa';

// Import existing sidebar components
import PageThumbnailsViewer from './PageThumbnailsViewer';
import FileViewer from './FileViewer';
import EntityDetectionSidebar from './EntityDetectionSidebar';
import SearchSidebar from './SearchSidebar';
import RadactionSidebar from './RadactionSidebar';
import HistoryViewer from './HistoryViewer';
import FileStorageSettings from './FileStorageSettings';
import SettingsSidebar from './SettingsSidebar';

interface SidebarTab {
    id: string;
    name: string;
    icon: React.ReactNode;
    component: React.ComponentType<any>;
}

interface UnifiedSidebarProps {
    isCollapsed?: boolean;
    onToggleCollapse?: (collapsed: boolean) => void;
    defaultActiveTab?: string;
    onWidthChange?: (width: number) => void;
}

// Note: We'll need to define this inside the component to access the t function

const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 600;
const SIDEBAR_DEFAULT_WIDTH = 400;
const SIDEBAR_COLLAPSED_WIDTH = 50;

const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
                                                           isCollapsed: externalCollapsed,
                                                           onToggleCollapse,
                                                           defaultActiveTab = "thumbnails",
                                                           onWidthChange
                                                       }) => {
    const [internalCollapsed, setInternalCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<string>(defaultActiveTab);
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);
    const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const [startResizeX, setStartResizeX] = useState(0);
    const [startWidth, setStartWidth] = useState(SIDEBAR_DEFAULT_WIDTH);

    const sidebarRef = useRef<HTMLDivElement>(null);
    const resizeHandleRef = useRef<HTMLDivElement>(null);

    // Use external collapsed state if provided, otherwise use internal state
    const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

    const {currentFile} = useFileContext();
    const {t} = useLanguage();

    // Define sidebar tabs with translations
    const sidebarTabs: SidebarTab[] = [
        {
            id: "thumbnails",
            name: t('sidebar', 'thumbnails'),
            icon: <FileText size={16}/>,
            component: PageThumbnailsViewer,
        },
        {
            id: "files",
            name: t('sidebar', 'files'),
            icon: <FolderOpen size={16}/>,
            component: FileViewer,
        },
        {
            id: "detection",
            name: t('sidebar', 'detection'),
            icon: <FaMagic size={16}/>,
            component: EntityDetectionSidebar,
        },
        {
            id: "search",
            name: t('sidebar', 'search'),
            icon: <Search size={16}/>,
            component: SearchSidebar,
        },
        {
            id: "redaction",
            name: t('sidebar', 'redaction'),
            icon: <FaEraser size={16}/>,
            component: RadactionSidebar,
        },
        {
            id: "settings",
            name: t('sidebar', 'settings'),
            icon: <Settings size={16}/>,
            component: SettingsSidebar,
        },
        {
            id: "history",
            name: t('sidebar', 'history'),
            icon: <History size={16}/>,
            component: HistoryViewer,
        },
    ];

    // Update CSS custom property when width changes
    useEffect(() => {
        if (sidebarRef.current) {
            const width = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;
            sidebarRef.current.style.setProperty('--sidebar-width', `${width}px`);

            // Notify parent component of width change
            if (onWidthChange) {
                onWidthChange(width);
            }
        }
    }, [sidebarWidth, isCollapsed, onWidthChange]);

    // Get responsive constraints based on screen size
    const getResponsiveConstraints = useCallback(() => {
        const width = window.innerWidth;
        if (width <= 480) {
            return {min: 260, max: 300};
        } else if (width <= 768) {
            return {min: 280, max: 350};
        } else if (width <= 1024) {
            return {min: 280, max: 400};
        } else {
            return {min: SIDEBAR_MIN_WIDTH, max: SIDEBAR_MAX_WIDTH};
        }
    }, []);

    // Handle mouse move during resize
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        const deltaX = e.clientX - startResizeX;
        const constraints = getResponsiveConstraints();
        const newWidth = Math.max(
            constraints.min,
            Math.min(constraints.max, startWidth + deltaX)
        );

        setSidebarWidth(newWidth);
    }, [isResizing, startResizeX, startWidth, getResponsiveConstraints]);

    // Handle mouse up (end resize)
    const handleMouseUp = useCallback(() => {
        if (!isResizing) return;

        setIsResizing(false);
        document.body.classList.remove('resizing-sidebar');

        if (sidebarRef.current) {
            sidebarRef.current.classList.remove('resizing');
        }
        if (resizeHandleRef.current) {
            resizeHandleRef.current.classList.remove('resizing');
        }
    }, [isResizing]);

    // Set up global mouse event listeners
    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizing, handleMouseMove, handleMouseUp]);

    // Handle window resize to adapt sidebar width to new constraints
    useEffect(() => {
        const handleWindowResize = () => {
            if (isCollapsed) return;

            const constraints = getResponsiveConstraints();
            const currentWidth = sidebarWidth;

            // Adjust width if it exceeds new constraints
            if (currentWidth > constraints.max) {
                setSidebarWidth(constraints.max);
            } else if (currentWidth < constraints.min) {
                setSidebarWidth(constraints.min);
            }
        };

        window.addEventListener('resize', handleWindowResize);

        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, [isCollapsed, sidebarWidth, getResponsiveConstraints]);

    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();

        if (isCollapsed) return; // Don't allow resizing when collapsed

        setIsResizing(true);
        setStartResizeX(e.clientX);
        setStartWidth(sidebarWidth);

        document.body.classList.add('resizing-sidebar');

        if (sidebarRef.current) {
            sidebarRef.current.classList.add('resizing');
        }
        if (resizeHandleRef.current) {
            resizeHandleRef.current.classList.add('resizing');
        }
    };

    // Listen for external tab activation requests
    useEffect(() => {
        const handleActivateTab = (event: Event) => {
            const customEvent = event as CustomEvent;
            const {tabId} = customEvent.detail || {};

            if (tabId && sidebarTabs.some(tab => tab.id === tabId)) {
                setActiveTab(tabId);

                // If sidebar is collapsed, expand it when activating a tab
                if (isCollapsed) {
                    if (onToggleCollapse) {
                        onToggleCollapse(false);
                    } else {
                        setInternalCollapsed(false);
                    }
                }
            }
        };

        const handleTabStatusRequest = (event: Event) => {
            const customEvent = event as CustomEvent;
            const {requestedTab} = customEvent.detail || {};

            // Respond with current active tab status
            window.dispatchEvent(new CustomEvent('sidebar-tab-status-response', {
                detail: {
                    activeTab: activeTab,
                    isRequested: requestedTab === activeTab,
                    isCollapsed: isCollapsed
                }
            }));
        };

        window.addEventListener('activate-sidebar-tab', handleActivateTab);
        window.addEventListener('get-sidebar-tab-status', handleTabStatusRequest);

        return () => {
            window.removeEventListener('activate-sidebar-tab', handleActivateTab);
            window.removeEventListener('get-sidebar-tab-status', handleTabStatusRequest);
        };
    }, [isCollapsed, onToggleCollapse, activeTab]);

    const toggleSidebar = () => {
        const newCollapsed = !isCollapsed;

        if (onToggleCollapse) {
            onToggleCollapse(newCollapsed);
        } else {
            setInternalCollapsed(newCollapsed);
        }
    };

    const handleTabClick = (tabId: string) => {
        setActiveTab(tabId);

        // If sidebar is collapsed, expand it when clicking a tab
        if (isCollapsed) {
            if (onToggleCollapse) {
                onToggleCollapse(false);
            } else {
                setInternalCollapsed(false);
            }
        }
    };

    const activeTabData = sidebarTabs.find((tab) => tab.id === activeTab);
    const ActiveComponent = activeTabData?.component;

    return (
        <div
            ref={sidebarRef}
            className={`pdf-sidebar unified-sidebar ${isCollapsed ? "collapsed" : "expanded"} ${isResizing ? "resizing" : ""}`}
            style={{
                '--sidebar-width': `${isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth}px`
            } as React.CSSProperties}
        >
            {/* Collapse Button */}
            <button
                className="collapse-button"
                onClick={toggleSidebar}
                aria-label={isCollapsed ? t('sidebar', 'expandSidebar') : t('sidebar', 'collapseSidebar')}
            >
                {isCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
            </button>

            {/* Resize Handle */}
            {!isCollapsed && (
                <div
                    ref={resizeHandleRef}
                    className={`resize-handle ${isResizing ? "resizing" : ""}`}
                    onMouseDown={handleResizeStart}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={t('sidebar', 'resizeSidebar')}
                    tabIndex={0}
                    onKeyDown={(e) => {
                        // Allow keyboard resize with arrow keys
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                            e.preventDefault();
                            const step = e.shiftKey ? 20 : 5; // Bigger steps with Shift
                            const direction = e.key === 'ArrowLeft' ? -1 : 1;
                            const constraints = getResponsiveConstraints();
                            const newWidth = Math.max(
                                constraints.min,
                                Math.min(constraints.max, sidebarWidth + (direction * step))
                            );
                            setSidebarWidth(newWidth);
                        }
                    }}
                />
            )}

            {/* Floating Tab Indicators */}
            <div className="tab-indicators">
                {sidebarTabs.map((tab, index) => (
                    <div
                        key={tab.id}
                        className={`tab-indicator ${activeTab === tab.id ? "active" : ""}`}
                        style={{top: `${20 + index * 50}px`}}
                        onClick={() => handleTabClick(tab.id)}
                        onMouseEnter={() => setHoveredTab(tab.id)}
                        onMouseLeave={() => setHoveredTab(null)}
                        role="button"
                        tabIndex={0}
                        aria-label={t('sidebar', 'switchToTab', {name: tab.name})}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleTabClick(tab.id);
                            }
                        }}
                    >
                        <div className="indicator-icon">
                            {tab.icon}
                        </div>

                        {/* Tooltip */}
                        {hoveredTab === tab.id && (
                            <div className="indicator-tooltip">
                                {tab.name}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="content-area" style={{display: isCollapsed ? 'none' : 'block'}}>
                {/* File Indicator */}
                {!isCollapsed && currentFile?.name && (
                    <div className="file-indicator">
                        {t('sidebar', 'viewing')}: {currentFile.name}
                    </div>
                )}

                {/* Always render all sidebar components but show only the active one */}
                {sidebarTabs.map((tab) => {
                    const TabComponent = tab.component;
                    return (
                        <div
                            key={tab.id}
                            className={`sidebar-tab-content ${activeTab === tab.id ? 'active' : 'hidden'}`}
                            style={{
                                display: activeTab === tab.id && !isCollapsed ? 'block' : 'none'
                            }}
                        >
                            <TabComponent/>
                        </div>
                    );
                })}

                {/* Add file storage settings to files tab */}
                {!isCollapsed && activeTab === 'files' && (
                    <div className="additional-settings">
                        <FileStorageSettings/>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnifiedSidebar; 