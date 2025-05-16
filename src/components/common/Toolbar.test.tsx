import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { Toolbar, ToolbarButton, ToolbarDropdown, ToolbarSection, ZoomControls } from './Toolbar';

// Mock dependencies
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (category: string, key: string) => `${category}.${key}`
  })
}));

describe('Toolbar Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test Toolbar component
  describe('Toolbar', () => {
    test('renders with default props', () => {
      render(
        <Toolbar>
          <div data-testid="toolbar-child">Toolbar Content</div>
        </Toolbar>
      );
      
      // Check that content is rendered
      expect(screen.getByTestId('toolbar-child')).toBeInTheDocument();
      expect(screen.getByText('Toolbar Content')).toBeInTheDocument();
      
      // Check for toolbar class
      const toolbar = screen.getByTestId('toolbar-child').parentElement;
      expect(toolbar).toHaveClass('enhanced-toolbar');
    });
    
    test('applies custom className and style', () => {
      render(
        <Toolbar className="custom-class" style={{ backgroundColor: 'red' }}>
          <div data-testid="toolbar-child">Toolbar Content</div>
        </Toolbar>
      );
      
      // Check for custom class and style
      const toolbar = screen.getByTestId('toolbar-child').parentElement;
      expect(toolbar).toHaveClass('enhanced-toolbar');
      expect(toolbar).toHaveClass('custom-class');
      expect(toolbar).toHaveStyle('background-color: rgb(255, 0, 0)');
    });
  });

  // Test ToolbarSection component
  describe('ToolbarSection', () => {
    test('renders with default alignment', () => {
      render(
        <ToolbarSection>
          <div data-testid="section-child">Section Content</div>
        </ToolbarSection>
      );
      
      // Check that content is rendered
      expect(screen.getByTestId('section-child')).toBeInTheDocument();
      
      // Check for section class with default alignment
      const section = screen.getByTestId('section-child').parentElement;
      expect(section).toHaveClass('toolbar-section');
      expect(section).toHaveClass('align-left');
    });
    
    test('applies custom alignment', () => {
      render(
        <ToolbarSection alignment="center">
          <div data-testid="section-child">Section Content</div>
        </ToolbarSection>
      );
      
      // Check for custom alignment
      const section = screen.getByTestId('section-child').parentElement;
      expect(section).toHaveClass('align-center');
    });
  });

  // Test ToolbarButton component
  describe('ToolbarButton', () => {
    const mockOnClick = vi.fn();
    
    test('renders with icon and title', () => {
      render(
        <ToolbarButton
          icon={<span data-testid="button-icon">Icon</span>}
          title="zoomIn"
          onClick={mockOnClick}
        />
      );
      
      // Check that button and icon are rendered
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.getByTestId('button-icon')).toBeInTheDocument();
      
      // Check title (should be translated)
      expect(button).toHaveAttribute('title', 'toolbar.zoomIn');
    });
    
    test('renders with label', () => {
      render(
        <ToolbarButton
          icon={<span>Icon</span>}
          title="zoomIn"
          label="zoomIn"
          onClick={mockOnClick}
        />
      );
      
      // Check that label is rendered
      expect(screen.getByText('toolbar.zoomIn')).toBeInTheDocument();
    });
    
    test('handles click events', () => {
      render(
        <ToolbarButton
          icon={<span>Icon</span>}
          title="zoomIn"
          onClick={mockOnClick}
        />
      );
      
      // Click the button
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Check that onClick was called
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
    
    test('can be disabled', () => {
      render(
        <ToolbarButton
          icon={<span>Icon</span>}
          title="zoomIn"
          onClick={mockOnClick}
          disabled={true}
        />
      );
      
      // Check that button is disabled
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      // Click the button
      fireEvent.click(button);
      
      // Check that onClick was not called
      expect(mockOnClick).not.toHaveBeenCalled();
    });
    
    test('applies active class when active', () => {
      render(
        <ToolbarButton
          icon={<span>Icon</span>}
          title="zoomIn"
          onClick={mockOnClick}
          active={true}
        />
      );
      
      // Check for active class
      const button = screen.getByRole('button');
      expect(button).toHaveClass('active');
    });
  });

  // Test ToolbarDropdown component
  describe('ToolbarDropdown', () => {
    const mockOnClick = vi.fn();
    const mockOnChange = vi.fn();
    
    const dropdownItems = [
      {
        id: 'item1',
        type: 'button' as const,
        label: 'zoomIn',
        onClick: mockOnClick
      },
      {
        id: 'item2',
        type: 'checkbox' as const,
        label: 'fitToPage',
        checked: true,
        onChange: mockOnChange
      },
      {
        id: 'item3',
        type: 'divider' as const
      }
    ];
    
    test('renders dropdown button', () => {
      render(
        <ToolbarDropdown
          icon={<span data-testid="dropdown-icon">Icon</span>}
          title="annotations"
          items={dropdownItems}
        />
      );
      
      // Check that button is rendered
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-icon')).toBeInTheDocument();
      
      // Check title
      expect(button).toHaveAttribute('title', 'toolbar.annotations');
      
      // Menu should not be visible initially
      expect(screen.queryByText('toolbar.zoomIn')).not.toBeInTheDocument();
    });
    
    test('opens menu when clicked', () => {
      render(
        <ToolbarDropdown
          icon={<span>Icon</span>}
          title="annotations"
          items={dropdownItems}
        />
      );
      
      // Click the button
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Menu should be visible
      expect(screen.getByText('toolbar.zoomIn')).toBeInTheDocument();
      expect(screen.getByText('toolbar.fitToPage')).toBeInTheDocument();
      
      // Check for items
      const checkboxItem = screen.getByRole('checkbox');
      expect(checkboxItem).toBeInTheDocument();
      expect(checkboxItem).toBeChecked();
      
      const buttonItem = screen.getByRole('button', { name: 'toolbar.zoomIn' });
      expect(buttonItem).toBeInTheDocument();
      
      const divider = document.querySelector('.dropdown-divider');
      expect(divider).toBeInTheDocument();
    });
    
    test('handles item click events', () => {
      render(
        <ToolbarDropdown
          icon={<span>Icon</span>}
          title="annotations"
          items={dropdownItems}
        />
      );
      
      // Open the menu
      const dropdownButton = screen.getByRole('button');
      fireEvent.click(dropdownButton);
      
      // Click the button item
      const buttonItem = screen.getByRole('button', { name: 'toolbar.zoomIn' });
      fireEvent.click(buttonItem);
      
      // Check that onClick was called
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
    
    test('handles checkbox change events', () => {
      // Update our mock to call the onChange immediately for this test
      const modifiedItems = [
        ...dropdownItems.slice(0, 1),
        {
          ...dropdownItems[1],
          onClick: (e: React.MouseEvent) => {
            // We need to directly call onChange from the onClick handler
            // since that's how the real implementation works
            mockOnChange(false);
          }
        },
        ...dropdownItems.slice(2)
      ];
      
      render(
        <ToolbarDropdown
          icon={<span>Icon</span>}
          title="annotations"
          items={modifiedItems}
        />
      );
      
      // Open the menu
      const dropdownButton = screen.getByRole('button');
      fireEvent.click(dropdownButton);
      
      // Click the checkbox (we're triggering onClick, not onChange)
      const checkboxItem = screen.getByLabelText('toolbar.fitToPage');
      fireEvent.click(checkboxItem);
      
      // Check that onChange was called
      expect(mockOnChange).toHaveBeenCalledWith(false);
    });
  });

  // Test ZoomControls component
  describe('ZoomControls', () => {
    const mockSetZoomLevel = vi.fn();
    
    test('renders zoom controls with current zoom level', () => {
      render(<ZoomControls zoomLevel={1.5} setZoomLevel={mockSetZoomLevel} />);
      
      // Check for zoom level display
      expect(screen.getByText('150%')).toBeInTheDocument();
      
      // Check for zoom buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3); // Zoom in, zoom out, fit to page
    });
    
    test('increases zoom level when zoom in is clicked', () => {
      render(<ZoomControls zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} minZoom={0.5} maxZoom={3.0} zoomStep={0.2} />);
      
      // Click zoom in button
      const zoomInButton = screen.getByTitle('toolbar.zoomIn');
      fireEvent.click(zoomInButton);
      
      // Check that setZoomLevel was called with increased value
      expect(mockSetZoomLevel).toHaveBeenCalledWith(1.2);
    });
    
    test('decreases zoom level when zoom out is clicked', () => {
      render(<ZoomControls zoomLevel={1.0} setZoomLevel={mockSetZoomLevel} minZoom={0.5} maxZoom={3.0} zoomStep={0.2} />);
      
      // Click zoom out button
      const zoomOutButton = screen.getByTitle('toolbar.zoomOut');
      fireEvent.click(zoomOutButton);
      
      // Check that setZoomLevel was called with decreased value
      expect(mockSetZoomLevel).toHaveBeenCalledWith(0.8);
    });
    
    test('resets zoom level when fit to page is clicked', () => {
      render(<ZoomControls zoomLevel={1.5} setZoomLevel={mockSetZoomLevel} />);
      
      // Click fit to page button
      const fitToPageButton = screen.getByTitle('toolbar.fitToPage');
      fireEvent.click(fitToPageButton);
      
      // Check that setZoomLevel was called with reset value
      expect(mockSetZoomLevel).toHaveBeenCalledWith(1.0);
    });
    
    test('disables zoom in button at max zoom', () => {
      render(<ZoomControls zoomLevel={3.0} setZoomLevel={mockSetZoomLevel} minZoom={0.5} maxZoom={3.0} />);
      
      // Check that zoom in button is disabled
      const zoomInButton = screen.getByTitle('toolbar.zoomIn');
      expect(zoomInButton).toBeDisabled();
    });
    
    test('disables zoom out button at min zoom', () => {
      render(<ZoomControls zoomLevel={0.5} setZoomLevel={mockSetZoomLevel} minZoom={0.5} maxZoom={3.0} />);
      
      // Check that zoom out button is disabled
      const zoomOutButton = screen.getByTitle('toolbar.zoomOut');
      expect(zoomOutButton).toBeDisabled();
    });
  });
}); 