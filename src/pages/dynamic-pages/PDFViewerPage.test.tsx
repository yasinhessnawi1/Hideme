import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import PDFViewerPage from './PDFViewerPage';
import { useLanguage } from '../../contexts/LanguageContext';

// Mock dependencies
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: vi.fn()
}));

vi.mock('../../contexts/AutoProcessProvider', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="auto-process-provider">{children}</div>
}));

vi.mock('../../components/static/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>
}));

vi.mock('../../components/pdf/pdf-viewer-components/PDFViewer', () => ({
  default: () => <div data-testid="pdf-viewer">PDF Viewer Component</div>
}));

vi.mock('../../components/pdf/pdf-page-components/Toolbar', () => ({
  default: ({ 
    toggleLeftSidebar, 
    isLeftSidebarCollapsed, 
    toggleRightSidebar, 
    isRightSidebarCollapsed 
  }: {
    toggleLeftSidebar: () => void;
    isLeftSidebarCollapsed: boolean;
    toggleRightSidebar: () => void;
    isRightSidebarCollapsed: boolean;
  }) => (
    <div data-testid="toolbar">
      <button 
        data-testid="toggle-left-sidebar" 
        onClick={toggleLeftSidebar}
      >
        Toggle Left Sidebar
      </button>
      <button 
        data-testid="toggle-right-sidebar" 
        onClick={toggleRightSidebar}
      >
        Toggle Right Sidebar
      </button>
      <div data-testid="left-sidebar-state">
        {isLeftSidebarCollapsed ? 'collapsed' : 'expanded'}
      </div>
      <div data-testid="right-sidebar-state">
        {isRightSidebarCollapsed ? 'collapsed' : 'expanded'}
      </div>
    </div>
  )
}));

vi.mock('../../components/pdf/pdf-page-components/LeftSidebar', () => ({
  default: ({ isSidebarCollapsed }: { isSidebarCollapsed: boolean }) => (
    <div data-testid="left-sidebar">
      <div data-testid="left-sidebar-status">
        {isSidebarCollapsed ? 'collapsed' : 'expanded'}
      </div>
      Left Sidebar Content
    </div>
  )
}));

vi.mock('../../components/pdf/pdf-page-components/SearchSidebar', () => ({
  default: () => <div data-testid="search-sidebar">Search Sidebar Content</div>
}));

vi.mock('../../components/pdf/pdf-page-components/EntityDetectionSidebar', () => ({
  default: () => <div data-testid="entity-detection-sidebar">Entity Detection Sidebar Content</div>
}));

vi.mock('../../components/pdf/pdf-page-components/RadactionSidebar', () => ({
  default: () => <div data-testid="redaction-sidebar">Redaction Sidebar Content</div>
}));

describe('PDFViewerPage', () => {
  const mockTranslate = vi.fn((namespace, key) => `${namespace}.${key}`);
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default mock for useLanguage
    vi.mocked(useLanguage).mockReturnValue({
      language: 'en',
      setLanguage: vi.fn(),
      t: mockTranslate
    });
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  // Positive scenario: Render the page structure
  test.skip('renders the PDF viewer page with all components', () => {
    render(<PDFViewerPage />);

    // Check for main components
    expect(screen.getByTestId('pdf-page')).toBeInTheDocument();
    expect(screen.getByTestId('top-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  // Positive scenario: Toggle left sidebar
  test.skip('toggles left sidebar on button click', () => {
    render(<PDFViewerPage />);

    const toggleLeftButton = screen.getByTestId('toggle-left-sidebar');
    const leftSidebar = screen.getByTestId('left-sidebar');
    
    // Initial state should have expanded class
    expect(leftSidebar).toHaveClass('expanded');
    
    // Click to collapse
    fireEvent.click(toggleLeftButton);
    expect(leftSidebar).not.toHaveClass('expanded');
    expect(leftSidebar).toHaveClass('collapsed');
    
    // Click again to expand
    fireEvent.click(toggleLeftButton);
    expect(leftSidebar).toHaveClass('expanded');
    expect(leftSidebar).not.toHaveClass('collapsed');
  });

  // Positive scenario: Toggle right sidebar
  test.skip('toggles right sidebar on button click', () => {
    render(<PDFViewerPage />);

    const toggleRightButton = screen.getByTestId('toggle-right-sidebar');
    const rightSidebar = screen.getByTestId('right-sidebar');
    
    // Initial state should have collapsed class
    expect(rightSidebar).toHaveClass('collapsed');
    
    // Click to expand
    fireEvent.click(toggleRightButton);
    expect(rightSidebar).toHaveClass('expanded');
    expect(rightSidebar).not.toHaveClass('collapsed');
    
    // Click again to collapse
    fireEvent.click(toggleRightButton);
    expect(rightSidebar).toHaveClass('collapsed');
    expect(rightSidebar).not.toHaveClass('expanded');
  });

  // Positive scenario: Switch tabs in right sidebar
  test.skip('switches tabs in the right sidebar', () => {
    render(<PDFViewerPage />);

    // Expand the right sidebar first
    const toggleRightButton = screen.getByTestId('toggle-right-sidebar');
    fireEvent.click(toggleRightButton);
    
    // Get the tab buttons in the right sidebar
    const redactionTabButton = screen.getByTestId('right-tab-redaction');
    const detectionTabButton = screen.getByTestId('right-tab-detection');
    const banListTabButton = screen.getByTestId('right-tab-banlist');
    
    // Initial state should have detection tab active
    expect(detectionTabButton).toHaveClass('active');
    expect(redactionTabButton).not.toHaveClass('active');
    expect(banListTabButton).not.toHaveClass('active');
    
    // Click redaction tab
    fireEvent.click(redactionTabButton);
    expect(redactionTabButton).toHaveClass('active');
    expect(detectionTabButton).not.toHaveClass('active');
    expect(banListTabButton).not.toHaveClass('active');
    
    // Click ban list tab
    fireEvent.click(banListTabButton);
    expect(banListTabButton).toHaveClass('active');
    expect(redactionTabButton).not.toHaveClass('active');
    expect(detectionTabButton).not.toHaveClass('active');
  });

  // Positive scenario: Test hover behavior on left sidebar
  test.skip('left sidebar expands on hover sensor enter with delay', async () => {
    render(<PDFViewerPage />);

    // Initial state should be collapsed
    const leftSidebar = screen.getByTestId('left-sidebar');
    const hoverSensor = screen.getByTestId('left-sidebar-hover-sensor');
    
    // First manually collapse it with the button
    const toggleLeftButton = screen.getByTestId('toggle-left-sidebar');
    fireEvent.click(toggleLeftButton);
    
    // Verify it's collapsed
    expect(leftSidebar).toHaveClass('collapsed');
    
    // Hover over the sensor
    fireEvent.mouseEnter(hoverSensor);
    
    // Immediately after mouseEnter, it should still be collapsed
    expect(leftSidebar).toHaveClass('collapsed');
    
    // Wait for the hover delay to complete
    await waitFor(() => {
      expect(leftSidebar).toHaveClass('expanded');
      expect(leftSidebar).not.toHaveClass('collapsed');
    }, { timeout: 1000 });
  });

  // Positive scenario: Test auto-closing on mouse leave
  test.skip('left sidebar collapses on mouse leave after hover expand', async () => {
    render(<PDFViewerPage />);

    // Get the hover sensor and sidebar elements
    const leftSidebar = screen.getByTestId('left-sidebar');
    const hoverSensor = screen.getByTestId('left-sidebar-hover-sensor');
    
    // First manually collapse it with the button
    const toggleLeftButton = screen.getByTestId('toggle-left-sidebar');
    fireEvent.click(toggleLeftButton);
    
    // Verify it's collapsed
    expect(leftSidebar).toHaveClass('collapsed');
    
    // Hover over the sensor to expand it
    fireEvent.mouseEnter(hoverSensor);
    
    // Wait for hover expand
    await waitFor(() => {
      expect(leftSidebar).toHaveClass('expanded');
    }, { timeout: 1000 });
    
    // Now move mouse away from sidebar
    fireEvent.mouseLeave(leftSidebar);
    
    // Wait for auto-collapse
    await waitFor(() => {
      expect(leftSidebar).toHaveClass('collapsed');
      expect(leftSidebar).not.toHaveClass('expanded');
    }, { timeout: 1000 });
  });

  // Positive scenario: Test right panel custom event activation
  test.skip('activates right panel tabs via custom event', () => {
    render(<PDFViewerPage />);

    // Initial state - right sidebar collapsed, detection tab active
    const rightSidebar = screen.getByTestId('right-sidebar');
    expect(rightSidebar).toHaveClass('collapsed');
    
    const detectionTabButton = screen.getByTestId('right-tab-detection');
    const redactionTabButton = screen.getByTestId('right-tab-redaction');
    expect(detectionTabButton).toHaveClass('active');
    expect(redactionTabButton).not.toHaveClass('active');
    
    // Dispatch redaction activate event
    window.dispatchEvent(new CustomEvent('activate-panel', {
      detail: { panel: 'redaction' }
    }));
    
    // After event, sidebar should be expanded and redaction tab active
    expect(rightSidebar).toHaveClass('expanded');
    expect(rightSidebar).not.toHaveClass('collapsed');
    expect(redactionTabButton).toHaveClass('active');
    expect(detectionTabButton).not.toHaveClass('active');
  });

  // Negative scenario: No effect when invalid tab name is triggered
  test.skip('ignores custom events with invalid tab names', () => {
    render(<PDFViewerPage />);

    // Get initial state
    const rightSidebar = screen.getByTestId('right-sidebar');
    const detectionTabButton = screen.getByTestId('right-tab-detection');
    
    expect(rightSidebar).toHaveClass('collapsed');
    expect(detectionTabButton).toHaveClass('active');
    
    // Dispatch event with invalid panel name
    window.dispatchEvent(new CustomEvent('activate-panel', {
      detail: { panel: 'invalid-panel-name' }
    }));
    
    // State should remain unchanged
    expect(rightSidebar).toHaveClass('collapsed');
    expect(detectionTabButton).toHaveClass('active');
  });

  // Negative scenario: No auto-collapse when sidebar was manually opened
  test.skip('does not auto-collapse when sidebar was manually opened', () => {
    render(<PDFViewerPage />);

    // First manually open sidebar with button
    const leftSidebar = screen.getByTestId('left-sidebar');
    const toggleLeftButton = screen.getByTestId('toggle-left-sidebar');
    
    // Make sure it's initially expanded
    expect(leftSidebar).toHaveClass('expanded');
    
    // Set up hover interaction
    const hoverSensor = screen.getByTestId('left-sidebar-hover-sensor');
    
    // Interact with hover sensor (this shouldn't affect manual state)
    fireEvent.mouseEnter(hoverSensor);
    fireEvent.mouseLeave(leftSidebar);
    
    // Sidebar should still be expanded
    expect(leftSidebar).toHaveClass('expanded');
    expect(leftSidebar).not.toHaveClass('collapsed');
  });
}); 