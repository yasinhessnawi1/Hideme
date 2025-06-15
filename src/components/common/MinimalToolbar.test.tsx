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

// Mock dependencies
vi.mock('../../contexts/EditContext', () => ({
  useEditContext: () => ({
    setIsEditingMode: mockSetIsEditingMode,
    setHighlightingMode: mockSetHighlightingMode,
    isEditingMode: mockIsEditingMode,
      highlightingMode: mockHighlightingMode
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

// Sub-components have been moved to the unified sidebar

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
  FaDrawPolygon: () => <div data-testid="icon-draw-polygon">Draw Polygon Icon</div>,
  FaFont: () => <div data-testid="icon-font">Font Icon</div>,
    FaHighlighter: () => <div data-testid="icon-highlighter">Highlighter Icon</div>
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

    // Settings and visibility controls have been moved to the unified sidebar

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

    // Visibility and settings menus have been moved to the unified sidebar

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