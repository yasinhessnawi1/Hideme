import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import ToolbarVisibilityMenu from './ToolbarVisibilityMenu';

// Create mock functions first, then reference them in mocks
const mockSetShowManualHighlights = vi.fn();
const mockSetShowSearchHighlights = vi.fn();
const mockSetShowEntityHighlights = vi.fn();
const mockSetDetectionMapping = vi.fn();
const mockNotify = vi.fn();
const mockRemoveAllHighlights = vi.fn();
const mockRemoveAllHighlightsByType = vi.fn();
const mockClearAllSearches = vi.fn();
const mockClearAllEntityData = vi.fn();
const mockClearAllSearchData = vi.fn();

// Mock dependencies
vi.mock('../../contexts/EditContext', () => ({
  useEditContext: () => ({
    showSearchHighlights: true,
    setShowSearchHighlights: mockSetShowSearchHighlights,
    showEntityHighlights: true,
    setShowEntityHighlights: mockSetShowEntityHighlights,
    showManualHighlights: true,
    setShowManualHighlights: mockSetShowManualHighlights,
    setDetectionMapping: mockSetDetectionMapping
  })
}));

vi.mock('../../contexts/FileContext', () => ({
  useFileContext: () => ({
    files: [{ id: 'file1', name: 'test.pdf' }],
    selectedFiles: [],
    currentFile: { id: 'file1', name: 'test.pdf' }
  })
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({
    notify: mockNotify
  })
}));

vi.mock('../../contexts/SearchContext', () => ({
  useBatchSearch: () => ({
    clearAllSearches: mockClearAllSearches
  })
}));

vi.mock('../../contexts/FileSummaryContext', () => ({
  useFileSummary: () => ({
    clearAllEntityData: mockClearAllEntityData,
    clearAllSearchData: mockClearAllSearchData
  })
}));

vi.mock('../../contexts/HighlightStoreContext', () => ({
  useHighlightStore: () => ({
    removeAllHighlights: mockRemoveAllHighlights,
    removeAllHighlightsByType: mockRemoveAllHighlightsByType
  })
}));

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (category: string, key: string) => `${category}.${key}`
  })
}));

describe('ToolbarVisibilityMenu', () => {
  const mockDispatchEvent = vi.fn();
  const originalDispatchEvent = window.dispatchEvent;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.dispatchEvent
    window.dispatchEvent = mockDispatchEvent;
  });

  afterEach(() => {
    // Restore original window.dispatchEvent
    window.dispatchEvent = originalDispatchEvent;
  });

  // Test rendering of checkboxes and buttons
  test.skip('renders toggle checkboxes and clear buttons', () => {
    render(<ToolbarVisibilityMenu />);
    
    // Check for manual highlights checkbox
    const manualCheckbox = screen.getByLabelText('toolbarVisibilityMenu.manualHighlights');
    expect(manualCheckbox).toBeInTheDocument();
    expect(manualCheckbox).toBeChecked();
    
    // Check for search highlights checkbox
    const searchCheckbox = screen.getByLabelText('toolbarVisibilityMenu.searchHighlights');
    expect(searchCheckbox).toBeInTheDocument();
    expect(searchCheckbox).toBeChecked();
    
    // Check for entity highlights checkbox
    const entityCheckbox = screen.getByLabelText('toolbarVisibilityMenu.entityHighlights');
    expect(entityCheckbox).toBeInTheDocument();
    expect(entityCheckbox).toBeChecked();
    
    // Check for clear buttons
    expect(screen.getByText('toolbarVisibilityMenu.clearAll')).toBeInTheDocument();
    expect(screen.getByText('toolbarVisibilityMenu.clearManual')).toBeInTheDocument();
    expect(screen.getByText('toolbarVisibilityMenu.clearSearch')).toBeInTheDocument();
    expect(screen.getByText('toolbarVisibilityMenu.clearEntity')).toBeInTheDocument();
  });

  // Test toggle functionality for manual highlights
  test.skip('handles manual highlight toggle', () => {
    render(<ToolbarVisibilityMenu />);
    
    const manualCheckbox = screen.getByLabelText('toolbarVisibilityMenu.manualHighlights');
    fireEvent.click(manualCheckbox);
    
    expect(mockSetShowManualHighlights).toHaveBeenCalledWith(false);
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      message: expect.stringContaining('manualHighlightsVisible'),
      position: 'top-right'
    }));
  });

  // Test clear all highlights functionality
  test.skip('handles clear all highlights button click', () => {
    render(<ToolbarVisibilityMenu />);
    
    const clearAllButton = screen.getByText('toolbarVisibilityMenu.clearAll');
    fireEvent.click(clearAllButton);
    
    expect(mockRemoveAllHighlights).toHaveBeenCalled();
    expect(mockClearAllSearches).toHaveBeenCalled();
    expect(mockClearAllEntityData).toHaveBeenCalled();
    expect(mockClearAllSearchData).toHaveBeenCalled();
    expect(mockSetDetectionMapping).toHaveBeenCalledWith(null);
    expect(mockDispatchEvent).toHaveBeenCalled();
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      message: 'toolbarVisibilityMenu.allHighlightsCleared',
      position: 'top-right'
    }));
  });

  // Test clear manual highlights functionality
  test.skip('handles clear manual highlights button click', () => {
    render(<ToolbarVisibilityMenu />);
    
    const clearManualButton = screen.getByText('toolbarVisibilityMenu.clearManual');
    fireEvent.click(clearManualButton);
    
    // Check with case-insensitive comparison or match the actual case used
    expect(mockRemoveAllHighlightsByType).toHaveBeenCalledWith('MANUAL', expect.anything());
    expect(mockDispatchEvent).toHaveBeenCalled();
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      message: 'toolbarVisibilityMenu.manualHighlightsCleared',
      position: 'top-right'
    }));
  });
}); 