import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import '../../styles/components/Sidebar.css';

export type SidebarPosition = 'left' | 'right';
export type SidebarState = 'expanded' | 'collapsed' | 'hover';

export interface SidebarTab {
  id: string;
  title: string;
  icon: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  badge?: number | string;
}

export interface SidebarProps {
  /**
   * The position of the sidebar (left or right)
   */
  position?: SidebarPosition;
  
  /**
   * The current state of the sidebar
   */
  sidebarState?: SidebarState;
  
  /**
   * Callback when sidebar state changes
   */
  onStateChange?: (state: SidebarState) => void;
  
  /**
   * Array of tabs to display in the sidebar
   */
  tabs: SidebarTab[];
  
  /**
   * ID of the active tab
   */
  activeTabId?: string;
  
  /**
   * Callback when active tab changes
   */
  onTabChange?: (tabId: string) => void;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Custom inline styles
   */
  style?: React.CSSProperties;
  
  /**
   * Content to show when sidebar is collapsed
   */
  collapsedContent?: ReactNode;
  
  /**
   * Width of the expanded sidebar
   */
  width?: string;
  
  /**
   * Width of the collapsed sidebar
   */
  collapsedWidth?: string;
  
  /**
   * Whether to show the toggle button
   */
  showToggleButton?: boolean;
}

/**
 * Reusable Sidebar component that can be positioned on either side of the viewport
 * with support for tabs, collapsing, and hover states.
 */
const Sidebar: React.FC<SidebarProps> = ({
  position = 'left',
  sidebarState = 'expanded',
  onStateChange,
  tabs = [],
  activeTabId,
  onTabChange,
  className = '',
  style = {},
  collapsedContent,
  width = '280px',
  collapsedWidth = '60px',
  showToggleButton = true
}) => {
  // If activeTabId is not provided, use the first tab as default
  const [activeTab, setActiveTab] = useState<string>(
    activeTabId || (tabs.length > 0 ? tabs[0].id : '')
  );
  
  // Reference to track mouse events
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update active tab when activeTabId prop changes
  useEffect(() => {
    if (activeTabId && activeTabId !== activeTab) {
      setActiveTab(activeTabId);
    }
  }, [activeTabId, activeTab]);

  // Handle sidebar toggle
  const toggleSidebar = useCallback(() => {
    const newState = sidebarState === 'expanded' ? 'collapsed' : 'expanded';
    onStateChange?.(newState);
  }, [sidebarState, onStateChange]);

  // Handle hover events
  useEffect(() => {
    const handleMouseEnter = () => {
      if (sidebarState === 'collapsed') {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        hoverTimeoutRef.current = setTimeout(() => {
          onStateChange?.('hover');
        }, 300);
      }
    };

    const handleMouseLeave = () => {
      if (sidebarState === 'hover') {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        hoverTimeoutRef.current = setTimeout(() => {
          onStateChange?.('collapsed');
        }, 500);
      }
    };

    const sidebar = sidebarRef.current;
    if (sidebar) {
      sidebar.addEventListener('mouseenter', handleMouseEnter);
      sidebar.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (sidebar) {
        sidebar.removeEventListener('mouseenter', handleMouseEnter);
        sidebar.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [sidebarState, onStateChange]);

  const handleTabClick = useCallback((tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  }, [onTabChange]);

  // Determine sidebar width based on state
  const sidebarWidth = sidebarState === 'expanded' || sidebarState === 'hover' ? width : collapsedWidth;

  // Combine styles
  const combinedStyle = {
    ...style,
    width: sidebarWidth
  };

  return (
    <div 
      ref={sidebarRef}
      className={`sidebar-container ${position} ${sidebarState} ${className}`}
      data-position={position}
      data-state={sidebarState}
      style={combinedStyle}
    >
      {showToggleButton && (
        <button 
          className="sidebar-toggle-button" 
          onClick={toggleSidebar}
          title={sidebarState === 'expanded' ? `Collapse ${position} sidebar` : `Expand ${position} sidebar`}
        >
          {position === 'left' ? 
            (sidebarState === 'expanded' ? '◀' : '▶') : 
            (sidebarState === 'expanded' ? '▶' : '◀')}
        </button>
      )}

      <div className="sidebar-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
            onClick={() => !tab.disabled && handleTabClick(tab.id)}
            title={tab.title}
            disabled={tab.disabled}
          >
            <span className="tab-icon">{tab.icon}</span>
            {(sidebarState === 'expanded' || sidebarState === 'hover') && (
              <>
                <span className="tab-label">{tab.title}</span>
                {tab.badge && <span className="tab-badge">{tab.badge}</span>}
              </>
            )}
          </button>
        ))}
      </div>
      
      <div className="sidebar-content">
        {sidebarState === 'collapsed' ? (
          collapsedContent
        ) : (
          <div 
            className={`tab-panel active`}
          >
            {tabs.find(tab => tab.id === activeTab)?.content}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;