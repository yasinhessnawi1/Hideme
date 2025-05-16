import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  test('renders with storage enabled', () => {
    render(<FileStorageSettings />);
    
    // Check for main elements
    expect(screen.getByTestId('mock-database-icon')).toBeInTheDocument();
    expect(screen.getByText('pdf.pdfStorage')).toBeInTheDocument();
    
    // Check that toggle is checked
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    
    // Check for storage stats
    expect(screen.getByText('pdf.storageUsage')).toBeInTheDocument();
    expect(screen.getByText(/pdf.used/)).toBeInTheDocument();
    
    // Check for clear button
    expect(screen.getByText('pdf.clearAllPdfs')).toBeInTheDocument();
    
    // Check for privacy notice
    expect(screen.getByTestId('mock-alert-icon')).toBeInTheDocument();
    expect(screen.getByText('settings.pdfsStoredOnlyInBrowser')).toBeInTheDocument();
  });

  test('clears stored files when clear button is clicked', async () => {
    render(<FileStorageSettings />);
    
    // Find and click the clear button
    const clearButton = screen.getByText('pdf.clearAllPdfs');
    fireEvent.click(clearButton);
    
    // Check that the loading state was managed correctly
    expect(mockStartLoading).toHaveBeenCalledWith('file_storage.clean');
    
    // Wait for the async operation to complete
    await waitFor(() => {
      expect(mockClearStoredFiles).toHaveBeenCalled();
      expect(mockStopLoading).toHaveBeenCalledWith('file_storage.clean');
      expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({
        message: 'pdf.allPdfsCleared'
      }));
    });
  });

  test('handles error when clearing files fails', async () => {
    // Mock console.error to prevent test output pollution
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    // Mock clearStoredFiles to reject
    mockClearStoredFiles.mockRejectedValueOnce(new Error('Failed to clear files'));
    
    render(<FileStorageSettings />);
    
    // Find and click the clear button
    const clearButton = screen.getByText('pdf.clearAllPdfs');
    fireEvent.click(clearButton);
    
    // Wait for the async operation to complete
    await waitFor(() => {
      expect(mockStartLoading).toHaveBeenCalledWith('file_storage.clean');
      expect(mockClearStoredFiles).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
      expect(mockStopLoading).toHaveBeenCalledWith('file_storage.clean');
    });
    
    // Restore console.error
    console.error = originalConsoleError;
  });
}); 