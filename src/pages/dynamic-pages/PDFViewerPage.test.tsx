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
  test('renders the PDF viewer page with all components', () => {
    render(<PDFViewerPage />);
    
    // Check for main components
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
    
    // Check for right sidebar tabs
    expect(screen.getByText('pdf.detection')).toBeInTheDocument();
    expect(screen.getByText('pdf.search')).toBeInTheDocument();
    expect(screen.getByText('redaction.redactTab')).toBeInTheDocument();
    
    // Check right sidebar content - entity detection should be visible by default
    expect(screen.getByTestId('entity-detection-sidebar')).toBeInTheDocument();
  });

  // Positive scenario: Toggle left sidebar
  test('toggles left sidebar on button click', () => {
    render(<PDFViewerPage />);
    
    const toggleLeftButton = screen.getByTestId('toggle-left-sidebar');
    
    // Initial state should be collapsed
    expect(screen.getByTestId('left-sidebar-state').textContent).toBe('collapsed');
    
    // Click to expand
    fireEvent.click(toggleLeftButton);
    expect(screen.getByTestId('left-sidebar-state').textContent).toBe('expanded');
    
    // Click to collapse
    fireEvent.click(toggleLeftButton);
    expect(screen.getByTestId('left-sidebar-state').textContent).toBe('collapsed');
  });
  
  // Positive scenario: Toggle right sidebar
  test('toggles right sidebar on button click', () => {
    render(<PDFViewerPage />);
    
    const toggleRightButton = screen.getByTestId('toggle-right-sidebar');
    
    // Initial state should be collapsed
    expect(screen.getByTestId('right-sidebar-state').textContent).toBe('collapsed');
    
    // Click to expand
    fireEvent.click(toggleRightButton);
    expect(screen.getByTestId('right-sidebar-state').textContent).toBe('expanded');
    
    // Click to collapse
    fireEvent.click(toggleRightButton);
    expect(screen.getByTestId('right-sidebar-state').textContent).toBe('collapsed');
  });

  // Positive scenario: Switch tabs in right sidebar
  test('switches tabs in the right sidebar', () => {
    render(<PDFViewerPage />);
    
    // Expand the right sidebar first
    fireEvent.click(screen.getByTestId('toggle-right-sidebar'));
    
    // Default tab should be detection
    expect(screen.getByTestId('entity-detection-sidebar')).toBeInTheDocument();
    
    // Switch to search tab
    fireEvent.click(screen.getByText('pdf.search'));
    expect(screen.getByTestId('search-sidebar')).toBeInTheDocument();
    
    // Switch to redact tab
    fireEvent.click(screen.getByText('redaction.redactTab'));
    expect(screen.getByTestId('redaction-sidebar')).toBeInTheDocument();
    
    // Switch back to detection tab
    fireEvent.click(screen.getByText('pdf.detection'));
    expect(screen.getByTestId('entity-detection-sidebar')).toBeInTheDocument();
  });

  // Positive scenario: Test hover behavior on left sidebar
  test('left sidebar expands on hover sensor enter with delay', async () => {
    render(<PDFViewerPage />);

    // Initial state should be collapsed
    expect(screen.getByTestId('left-sidebar-state').textContent).toBe('collapsed');
    
    // Get the hover sensor element and trigger mouse enter
    const hoverSensor = document.querySelector('.sidebar-hover-sensor.left') as HTMLElement;
    expect(hoverSensor).toBeInTheDocument();
    
    // Trigger hover
    fireEvent.mouseEnter(hoverSensor);
    
    // Should not immediately change
    expect(screen.getByTestId('left-sidebar-state').textContent).toBe('collapsed');
    
    // Advance timer to trigger hover effect
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Now sidebar should be expanded
    expect(screen.getByTestId('left-sidebar-state').textContent).toBe('expanded');
  });

  // Positive scenario: Test auto-closing on mouse leave
  test('left sidebar collapses on mouse leave after hover expand', async () => {
    render(<PDFViewerPage />);
    
    // Get the hover sensor and sidebar elements
    const hoverSensor = document.querySelector('.sidebar-hover-sensor.left') as HTMLElement;
    const sidebar = document.querySelector('.left-sidebar') as HTMLElement;
    
    // Trigger hover and advance timer
    fireEvent.mouseEnter(hoverSensor);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Sidebar should now be expanded
    expect(screen.getByTestId('left-sidebar-state').textContent).toBe('expanded');
    
    // Now trigger mouse leave
    fireEvent.mouseLeave(sidebar);
    
    // Should not immediately change
    expect(screen.getByTestId('left-sidebar-state').textContent).toBe('expanded');
    
    // Advance timer to trigger auto-close
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    // Sidebar should be collapsed again
    expect(screen.getByTestId('left-sidebar-state').textContent).toBe('collapsed');
  });

  // Positive scenario: Test right panel custom event activation
  test('activates right panel tabs via custom event', () => {
    render(<PDFViewerPage />);
    
    // Initial state - right sidebar collapsed, detection tab active
    expect(screen.getByTestId('right-sidebar-state').textContent).toBe('collapsed');
    
    // Dispatch custom event to activate search tab
    act(() => {
      window.dispatchEvent(
        new CustomEvent('activate-right-panel', { 
          detail: { navigateToTab: 'search' } 
        })
      );
    });
    
    // Right sidebar should be expanded now and search tab active
    expect(screen.getByTestId('right-sidebar-state').textContent).toBe('expanded');
    expect(screen.getByTestId('search-sidebar')).toBeInTheDocument();
    
    // Dispatch another event for redact tab
    act(() => {
      window.dispatchEvent(
        new CustomEvent('activate-right-panel', { 
          detail: { navigateToTab: 'redact' } 
        })
      );
    });
    
    // Redact tab should be active now
    expect(screen.getByTestId('redaction-sidebar')).toBeInTheDocument();
  });

  // Negative scenario: No effect when invalid tab name is triggered
  test('ignores custom events with invalid tab names', () => {
    render(<PDFViewerPage />);
    
    // Get initial state
    const initialRightSidebarState = screen.getByTestId('right-sidebar-state').textContent;
    
    // Dispatch custom event with invalid tab name
    act(() => {
      window.dispatchEvent(
        new CustomEvent('activate-right-panel', { 
          detail: { navigateToTab: 'invalid-tab-name' } 
        })
      );
    });
    
    // Right sidebar state should remain unchanged
    expect(screen.getByTestId('right-sidebar-state').textContent).toBe(initialRightSidebarState);
  });

  // Negative scenario: No auto-collapse when sidebar was manually opened
  test('does not auto-collapse when sidebar was manually opened', () => {
    render(<PDFViewerPage />);
    
    // First manually open sidebar with button
    fireEvent.click(screen.getByTestId('toggle-left-sidebar'));
    expect(screen.getByTestId('left-sidebar-state').textContent).toBe('expanded');
    
    // Get sidebar element and trigger mouse leave
    const sidebar = document.querySelector('.left-sidebar') as HTMLElement;
    fireEvent.mouseLeave(sidebar);
    
    // Advance timer past close delay
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    // Sidebar should still be expanded because it was manually opened
    expect(screen.getByTestId('left-sidebar-state').textContent).toBe('expanded');
  });
}); 