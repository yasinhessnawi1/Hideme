import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import FileStorageSettings from './FileStorageSettings';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Database: () => <div data-testid="mock-database-icon">Database</div>,
  Trash2: () => <div data-testid="mock-trash-icon">Trash</div>,
  HardDrive: () => <div data-testid="mock-harddrive-icon">HardDrive</div>,
  AlertTriangle: () => <div data-testid="mock-alert-icon">Alert</div>,
}));

// Mock file context
const mockSetStoragePersistenceEnabled = vi.fn();
const mockClearStoredFiles = vi.fn().mockResolvedValue(undefined);
const mockFiles = [{ id: 'test-file-1', name: 'test1.pdf' }];
const mockStorageStats = {
  totalSize: 1024 * 1024, // 1MB
  totalSizeFormatted: '1 MB',
  fileCount: 1
};

vi.mock('../../../contexts/FileContext', () => ({
  useFileContext: () => ({
    isStoragePersistenceEnabled: true,
    setStoragePersistenceEnabled: mockSetStoragePersistenceEnabled,
    storageStats: mockStorageStats,
    clearStoredFiles: mockClearStoredFiles,
    files: mockFiles
  })
}));

// Mock loading context
const mockStartLoading = vi.fn();
const mockStopLoading = vi.fn();
vi.mock('../../../contexts/LoadingContext', () => ({
  useLoading: () => ({
    isLoading: (id: string) => id === 'file_storage.clean' ? false : false,
    startLoading: mockStartLoading,
    stopLoading: mockStopLoading,
  })
}));

// Mock notification context
const mockNotify = vi.fn();
// Create a mock that we can spy on and control the resolution
const mockConfirm = vi.fn();

vi.mock('../../../contexts/NotificationContext', () => ({
  useNotification: () => ({
    notify: mockNotify,
    confirm: mockConfirm,
  })
}));

// Mock language context
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (category: any, key: any) => `${category}.${key}`,
  })
}));

// Mock LoadingWrapper component
vi.mock('../../common/LoadingWrapper', () => ({
  default: ({ children, isLoading, fallback }: { children: React.ReactNode; isLoading: boolean; fallback: React.ReactNode }) => (
    <div data-testid="mock-loading-wrapper">
      {isLoading ? fallback : children}
    </div>
  ),
}));

describe('FileStorageSettings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Make sure mockConfirm resolves to true in each test
    mockConfirm.mockImplementation(() => Promise.resolve(true));
  });

  test.skip('renders with storage enabled', () => {
    render(<FileStorageSettings />);
    
    // Check for main elements
    expect(screen.getByText('pdf.fileStorageSettings')).toBeInTheDocument();
    expect(screen.getByText('pdf.currentlyStored')).toBeInTheDocument();
    expect(screen.getByText('2 PDF files')).toBeInTheDocument();
    expect(screen.getByText('pdf.clearStorage')).toBeInTheDocument();
  });

  test.skip('clears stored files when clear button is clicked', async () => {
    render(<FileStorageSettings />);
    
    // Find and click the clear button
    const clearButton = screen.getByText('pdf.clearStorage');
    await act(async () => {
      fireEvent.click(clearButton);
    });
    
    // Check that confirmation dialog was shown
    expect(mockConfirm).toHaveBeenCalledWith(expect.anything());
    
    // And that clearStoredFiles was called on confirmation
    expect(mockClearStoredFiles).toHaveBeenCalled();
    
    // Notification should be shown
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({
      message: 'pdf.storageCleared',
      type: 'success'
    }));
  });

  test.skip('handles error when clearing files fails', async () => {
    // Setup mock to reject with error
    mockClearStoredFiles.mockRejectedValueOnce(new Error('Failed to clear files'));
    
    render(<FileStorageSettings />);
    
    // Find and click the clear button
    const clearButton = screen.getByText('pdf.clearStorage');
    await act(async () => {
      fireEvent.click(clearButton);
    });
    
    // Check that error notification was shown
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({
      message: 'pdf.errorClearingStorage',
      type: 'error'
    }));
  });
}); 