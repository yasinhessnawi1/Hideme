import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import MinimalToolbar from './MinimalToolbar';
import { HighlightCreationMode } from '../../types';

// Create mock functions
const mockSetIsEditingMode = vi.fn();
const mockSetHighlightingMode = vi.fn();
const mockNotify = vi.fn();

// Mock state for different test cases
let mockIsEditingMode = false;
let mockHighlightingMode = HighlightCreationMode.TEXT_SELECTION;
let mockShowManualHighlights = true;
let mockShowSearchHighlights = true; 
let mockShowEntityHighlights = true;

// Mock dependencies
vi.mock('../../contexts/EditContext', () => ({
  useEditContext: () => ({
    setIsEditingMode: mockSetIsEditingMode,
    setHighlightingMode: mockSetHighlightingMode,
    isEditingMode: mockIsEditingMode,
    highlightingMode: mockHighlightingMode,
    showManualHighlights: mockShowManualHighlights,
    showSearchHighlights: mockShowSearchHighlights,
    showEntityHighlights: mockShowEntityHighlights
  })
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({
    notify: mockNotify
  })
}));

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (category: string, key: string) => `${category}.${key}`
  })
}));

// Mock sub-components
vi.mock('./ToolbarVisibilityMenu', () => ({
  default: () => <div data-testid="toolbar-visibility-menu">ToolbarVisibilityMenu</div>
}));

vi.mock('./ToolbarSettingsMenu', () => ({
  default: () => <div data-testid="toolbar-settings-menu">ToolbarSettingsMenu</div>
}));

// Mock Toolbar components
vi.mock('./Toolbar', () => ({
  ...vi.importActual('./Toolbar'),
  ZoomControls: ({ zoomLevel, setZoomLevel }: { zoomLevel: number, setZoomLevel: (zoom: number) => void }) => (
    <div data-testid="zoom-controls">
      <span data-testid="zoom-level">{zoomLevel}%</span>
      <button data-testid="zoom-in" onClick={() => setZoomLevel(zoomLevel + 0.2)}>+</button>
      <button data-testid="zoom-out" onClick={() => setZoomLevel(zoomLevel - 0.2)}>-</button>
    </div>
  )
}));

// Mock react-icons
vi.mock('react-icons/fa', () => ({
  FaCog: () => <div data-testid="icon-settings">Settings Icon</div>,
  FaDrawPolygon: () => <div data-testid="icon-draw-polygon">Draw Polygon Icon</div>,
  FaFont: () => <div data-testid="icon-font">Font Icon</div>,
  FaHighlighter: () => <div data-testid="icon-highlighter">Highlighter Icon</div>,
  FaRegEye: () => <div data-testid="icon-eye">Eye Icon</div>,
  FaRegEyeSlash: () => <div data-testid="icon-eye-slash">Eye Slash Icon</div>
}));

vi.mock('react-icons/ci', () => ({
  CiEdit: () => <div data-testid="icon-edit">Edit Icon</div>
}));

describe('MinimalToolbar', () => {
  const mockSetZoomLevel = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock states to default values
    mockIsEditingMode = false;
    mockHighlightingMode = HighlightCreationMode.TEXT_SELECTION;
    mockShowManualHighlights = true;
    mockShowSearchHighlights = true;
    mockShowEntityHighlights = true;
  });

  // Test basic rendering
  test.skip('renders toolbar sections and zoom controls', () => {
    render(<MinimalToolbar zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} />);
    
    // Check for main sections
    expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('1%');
    
    // Check for buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  // Test edit mode button rendering
  test.skip('renders edit mode button with proper icon when not in edit mode', () => {
    render(<MinimalToolbar zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} />);
    
    expect(screen.getByTestId('icon-edit')).toBeInTheDocument();
    expect(screen.getByText('minimalToolbar.edit')).toBeInTheDocument();
  });

  // Test edit mode button with active edit mode
  test.skip('renders edit mode button with proper icon when in edit mode', () => {
    // Set mock state for this test
    mockIsEditingMode = true;
    mockHighlightingMode = HighlightCreationMode.TEXT_SELECTION;
    
    render(<MinimalToolbar zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} />);
    
    // Should show text selection icon
    expect(screen.getByTestId('icon-font')).toBeInTheDocument();
    expect(screen.getByText('minimalToolbar.text')).toBeInTheDocument();
  });

  // Test rectangular highlight mode
  test.skip('renders edit mode button with rectangular icon when in rectangular mode', () => {
    // Set mock state for this test
    mockIsEditingMode = true;
    mockHighlightingMode = HighlightCreationMode.RECTANGULAR;
    
    render(<MinimalToolbar zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} />);
    
    // Should show rectangular selection icon
    expect(screen.getByTestId('icon-draw-polygon')).toBeInTheDocument();
    expect(screen.getByText('minimalToolbar.area')).toBeInTheDocument();
  });

  // Test visibility toggle button (with eye icon)
  test.skip('renders visibility toggle with eye icon when all highlights are visible', () => {
    render(<MinimalToolbar zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} />);
    
    expect(screen.getByTestId('icon-eye')).toBeInTheDocument();
    expect(screen.getByText('minimalToolbar.show')).toBeInTheDocument();
  });

  // Test visibility toggle button (with eye-slash icon)
  test.skip('renders visibility toggle with eye-slash icon when some highlights are hidden', () => {
    // Set mock state for this test
    mockShowManualHighlights = false;
    
    render(<MinimalToolbar zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} />);
    
    expect(screen.getByTestId('icon-eye-slash')).toBeInTheDocument();
  });

  // Test settings button
  test.skip('renders settings button with cog icon', () => {
    render(<MinimalToolbar zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} />);
    
    expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
    expect(screen.getByText('minimalToolbar.settings')).toBeInTheDocument();
  });

  // Test edit menu toggle
  test.skip('shows edit menu when edit button is clicked', () => {
    render(<MinimalToolbar zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} />);
    
    // Get edit button and click it
    const editButton = screen.getByText('minimalToolbar.edit').closest('button');
    fireEvent.click(editButton!);
    
    // Check that menu options are shown
    expect(screen.getByText('minimalToolbar.highlightMode')).toBeInTheDocument();
    expect(screen.getByText('minimalToolbar.rectangular')).toBeInTheDocument();
    expect(screen.getByText('minimalToolbar.textSelection')).toBeInTheDocument();
  });

  // Test visibility menu toggle
  test.skip('shows visibility menu when visibility button is clicked', () => {
    render(<MinimalToolbar zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} />);
    
    // Get visibility button and click it
    const visibilityButton = screen.getByText('minimalToolbar.show').closest('button');
    fireEvent.click(visibilityButton!);
    
    // Check that visibility menu is shown
    expect(screen.getByTestId('toolbar-visibility-menu')).toBeInTheDocument();
  });

  // Test settings menu toggle
  test.skip('shows settings menu when settings button is clicked', () => {
    render(<MinimalToolbar zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} />);
    
    // Get settings button and click it
    const settingsButton = screen.getByText('minimalToolbar.settings').closest('button');
    fireEvent.click(settingsButton!);
    
    // Check that settings menu is shown
    expect(screen.getByTestId('toolbar-settings-menu')).toBeInTheDocument();
  });

  // Test rectangular highlight mode selection
  test.skip('sets rectangular highlighting mode when selected', () => {
    render(<MinimalToolbar zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} />);
    
    // Open edit menu
    const editButton = screen.getByText('minimalToolbar.edit').closest('button');
    fireEvent.click(editButton!);
    
    // Click rectangular option
    const rectangularOption = screen.getByText('minimalToolbar.rectangular');
    fireEvent.click(rectangularOption);
    
    // Check that highlighting mode was set
    expect(mockSetHighlightingMode).toHaveBeenCalledWith(HighlightCreationMode.RECTANGULAR);
    expect(mockSetIsEditingMode).toHaveBeenCalledWith(true);
    expect(mockNotify).toHaveBeenCalled();
  });
}); 