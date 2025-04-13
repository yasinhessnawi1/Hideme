import React, { useState, useCallback, useEffect } from 'react';
import { Search, FileType, Settings } from 'lucide-react';
import { Sidebar, SidebarTab, SidebarState } from '../../common/index';
import SearchSidebar from './SearchSidebar';
import EntityDetectionSidebar from './EntityDetectionSidebar';
import RadactionSidebar from './RadactionSidebar';

interface RightSidebarProps {
  isCollapsed?: boolean;
  onStateChange?: (state: SidebarState) => void;
  defaultActiveTab?: string;
  className?: string;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  isCollapsed = false,
  onStateChange,
  defaultActiveTab = 'search',
  className = ''
}) => {
  const currentState: SidebarState = isCollapsed ? 'collapsed' : 'expanded';
  const [activeTab, setActiveTab] = useState<string>(defaultActiveTab);

  // Create sidebar tabs configuration
  const sidebarTabs: SidebarTab[] = [
    {
      id: 'search',
      title: 'Search',
      icon: <Search size={18} />,
      content: <SearchSidebar />
    },
    {
      id: 'entity-detection',
      title: 'Entity Detection',
      icon: <FileType size={18} />,
      content: <EntityDetectionSidebar />
    },
    {
      id: 'redaction',
      title: 'Redaction',
      icon: <Settings size={18} />,
      content: <RadactionSidebar />
    }
  ];

  // Handle tab change
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);
  
  // Listen for direct tab activation requests
  useEffect(() => {
    const handleActivateTab = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { tabId, source } = customEvent.detail || {};
      
      if (tabId) {
        console.log(`[RightSidebar] Received tab activation request for '${tabId}' from ${source}`);
        setActiveTab(tabId);
        
        // Ensure sidebar is expanded
        if (isCollapsed && onStateChange) {
          onStateChange('expanded');
        }
      }
    };
    
    window.addEventListener('activate-sidebar-tab', handleActivateTab);
    
    return () => {
      window.removeEventListener('activate-sidebar-tab', handleActivateTab);
    };
  }, [isCollapsed, onStateChange]);
  
  // Listen for events to activate specific tabs
  React.useEffect(() => {
    // Listen for search panel activation
    const handleSearchActivation = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { active, source, navigateToTab, autoFocus } = customEvent.detail || {};
      
      console.log(`[RightSidebar] Received search activation event from ${source}, navigateToTab: ${navigateToTab}`);
      
      // Always set active tab to search
      setActiveTab('search');
      console.log(`[RightSidebar] Navigating to search tab`);
      
      // Ensure sidebar is expanded
      if (isCollapsed && onStateChange) {
        onStateChange('expanded');
      }
      
      // Pass autoFocus setting to search sidebar if provided
      if (autoFocus) {
        // Add slight delay to ensure the tab is active before focusing
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('focus-search-input', {
            detail: { source: 'right-sidebar' }
          }));
        }, 100);
      }
    };
    
    // Listen for entity detection panel activation
    const handleEntityDetection = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { source, navigateToTab, settings, filesToProcess, triggerDetection } = customEvent.detail || {};
      
      console.log(`[RightSidebar] Received entity detection event from ${source}, navigateToTab: ${navigateToTab}`);
      
      // Use navigateToTab if provided, otherwise default to entity-detection
      if (navigateToTab) {
        setActiveTab(navigateToTab);
        console.log(`[RightSidebar] Navigating to ${navigateToTab} tab`);
      } else {
        setActiveTab('entity-detection');
        console.log(`[RightSidebar] Navigating to entity-detection tab (default)`);
      }
      
      // Ensure sidebar is expanded
      if (isCollapsed && onStateChange) {
        onStateChange('expanded');
      }
      
      // If settings were provided, pass them to the entity detection sidebar
      if (settings) {
        // Dispatch an event to the entity detection sidebar with the settings
        window.dispatchEvent(new CustomEvent('apply-detection-settings', {
          detail: {
            settings,
            filesToProcess,
            triggerDetection, // Pass through the trigger flag
            source: 'right-sidebar'
          }
        }));
      }
      
      // If triggerDetection is true, directly trigger the detection process
      if (triggerDetection) {
        // Add slight delay to ensure sidebar is loaded and ready
        setTimeout(() => {
          console.log(`[RightSidebar] Auto-triggering entity detection process`);
          window.dispatchEvent(new CustomEvent('trigger-entity-detection-process', {
            detail: {
              source: 'right-sidebar',
              filesToProcess
            }
          }));
        }, 200);
      }
    };
    
    // Listen for redaction panel activation
    const handleRedaction = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { source, navigateToTab, applyToAllFiles, filesToProcess, triggerRedaction } = customEvent.detail || {};
      
      console.log(`[RightSidebar] Received redaction event from ${source}, navigateToTab: ${navigateToTab}`);
      
      // Use navigateToTab if provided, otherwise default to redaction
      if (navigateToTab) {
        setActiveTab(navigateToTab);
        console.log(`[RightSidebar] Navigating to ${navigateToTab} tab`);
      } else {
        setActiveTab('redaction');
        console.log(`[RightSidebar] Navigating to redaction tab (default)`);
      }
      
      // Ensure sidebar is expanded
      if (isCollapsed && onStateChange) {
        onStateChange('expanded');
      }
      
      // If applyToAllFiles flag is set or files are specified, notify redaction component
      if (applyToAllFiles || filesToProcess) {
        window.dispatchEvent(new CustomEvent('apply-redaction-settings', {
          detail: {
            applyToAllFiles,
            filesToProcess,
            triggerRedaction, // Pass through the trigger flag
            source: 'right-sidebar'
          }
        }));
      }
      
      // If triggerRedaction is true, directly trigger the redaction process
      if (triggerRedaction) {
        // Add slight delay to ensure sidebar is loaded and ready
        setTimeout(() => {
          console.log(`[RightSidebar] Auto-triggering redaction process`);
          window.dispatchEvent(new CustomEvent('trigger-redaction-process', {
            detail: {
              source: 'right-sidebar',
              filesToProcess
            }
          }));
        }, 200);
      }
    };
    
    // Add event listeners
    window.addEventListener('activate-search-panel', handleSearchActivation);
    window.addEventListener('trigger-entity-detection', handleEntityDetection);
    window.addEventListener('activate-detection-panel', handleEntityDetection); // Add new event listener for detection panel
    window.addEventListener('activate-redaction-panel', handleRedaction);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('activate-search-panel', handleSearchActivation);
      window.removeEventListener('trigger-entity-detection', handleEntityDetection);
      window.removeEventListener('activate-detection-panel', handleEntityDetection); // Clean up new event listener
      window.removeEventListener('activate-redaction-panel', handleRedaction);
    };
  }, [isCollapsed, onStateChange]);

  // Handle sidebar state change
  const handleStateChange = useCallback((state: SidebarState) => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [onStateChange]);

  return (
    <Sidebar
      position="right"
      sidebarState={currentState}
      tabs={sidebarTabs}
      activeTabId={activeTab}
      onStateChange={handleStateChange}
      onTabChange={handleTabChange}
      className={className}
      showToggleButton={false}
    />
  );
};

export default RightSidebar;