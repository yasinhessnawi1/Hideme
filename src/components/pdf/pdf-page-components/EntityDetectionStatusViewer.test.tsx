import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, test, afterEach, expect, beforeEach } from 'vitest';
import EntityDetectionStatusViewer from './EntityDetectionStatusViewer';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  XCircle: (props: { onClick: React.MouseEventHandler<HTMLDivElement> | undefined; }) => <div data-testid="mock-xcircle-icon" onClick={props.onClick}>XCircle</div>,
  Loader: () => <div data-testid="mock-loader-icon">Loader</div>,
  CheckCircle: () => <div data-testid="mock-check-icon">CheckCircle</div>,
  AlertTriangle: () => <div data-testid="mock-alert-icon">AlertTriangle</div>,
  Icon: () => <div data-testid="mock-icon">Icon</div>,
}));

// Mock file context
const mockFiles = [
  { id: 'file-1', name: 'document1.pdf' },
  { id: 'file-2', name: 'document2.pdf' }
];

vi.mock('../../../contexts/FileContext', () => ({
  useFileContext: () => ({
    files: mockFiles
  })
}));

// Mock PDF viewer context
vi.mock('../../../contexts/PDFViewerContext', () => ({
  getFileKey: (file: { id: any; }) => file.id
}));

// Mock processing state service
const mockSubscribe = vi.fn();
let subscriberCallback: (arg0: string, arg1: unknown) => void;
const mockUnsubscribe = { unsubscribe: vi.fn() };

// Keep track of processing state
interface ProcessingInfo {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: number;
  fileName: string;
  error?: string;
}

type ProcessingState = Record<string, ProcessingInfo>;

let processingState: ProcessingState = {};

vi.mock('../../../services/client-services/ProcessingStateService', () => {
  return {
    default: {
      subscribe: (callback: (arg0: string, arg1: unknown) => void) => {
        subscriberCallback = callback;
        mockSubscribe(callback);
        // Immediately call the callback with the current state
        if (Object.keys(processingState).length > 0) {
          Object.entries(processingState).forEach(([fileId, state]) => {
            callback(fileId, state);
          });
        }
        return mockUnsubscribe;
      }
    }
  };
});

// Mock language context
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (category: any, key: any) => `${category}.${key}`,
  })
}));

// Simplified version of the test suite
describe('EntityDetectionStatusViewer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset processing state for each test
    processingState = {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders nothing when no processing files', () => {
    const { container } = render(<EntityDetectionStatusViewer />);
    expect(container.firstChild).toBeNull();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  // Basic test to verify component renders with processing status
  test('displays processing file when notified', () => {
    processingState = {
      'file-1': {
        status: 'processing',
        progress: 45,
        startTime: Date.now(),
        fileName: 'document1.pdf'
      }
    };
    
    render(<EntityDetectionStatusViewer />);
    
    // Check that the processing status is displayed
    expect(screen.getByText('document1.pdf')).toBeInTheDocument();
    expect(screen.getByText(/pdf.processing/)).toBeInTheDocument();
    expect(screen.getByTestId('mock-loader-icon')).toBeInTheDocument();
    
    // Check for progress bar
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBe(2); // Two progress bars are rendered in the component
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '45');
  });

  test('handles multiple files being processed simultaneously', () => {
    processingState = {
      'file-1': {
        status: 'processing',
        progress: 30,
        startTime: Date.now(),
        fileName: 'document1.pdf'
      },
      'file-2': {
        status: 'processing',
        progress: 60,
        startTime: Date.now(),
        fileName: 'document2.pdf'
      }
    };
    
    render(<EntityDetectionStatusViewer />);
    
    // Check that both files' statuses are displayed
    expect(screen.getByText('document1.pdf')).toBeInTheDocument();
    expect(screen.getByText('document2.pdf')).toBeInTheDocument();
  });

  test('removes a file from processing list when null info is received', () => {
    processingState = {
      'file-1': {
        status: 'processing',
        progress: 30,
        startTime: Date.now(),
        fileName: 'document1.pdf'
      }
    };
    
    const { rerender } = render(<EntityDetectionStatusViewer />);
    
    // Check that the file status is displayed
    expect(screen.getByText('document1.pdf')).toBeInTheDocument();
    
    // Remove the file from processing
    delete processingState['file-1'];
    
    // Call subscriber manually and rerender
    act(() => {
      subscriberCallback('file-1', null);
      rerender(<EntityDetectionStatusViewer />);
    });
    
    // The file status should be removed
    expect(screen.queryByText('document1.pdf')).not.toBeInTheDocument();
  });

  test('clears all processing statuses when close button is clicked', () => {
    processingState = {
      'file-1': {
        status: 'processing',
        progress: 30,
        startTime: Date.now(),
        fileName: 'document1.pdf'
      },
      'file-2': {
        status: 'processing',
        progress: 60,
        startTime: Date.now(),
        fileName: 'document2.pdf'
      }
    };
    
    const { rerender } = render(<EntityDetectionStatusViewer />);
    
    // Check that both files' statuses are displayed
    expect(screen.getByText('document1.pdf')).toBeInTheDocument();
    expect(screen.getByText('document2.pdf')).toBeInTheDocument();
    
    // Find the main close button (the first one in the header)
    const closeButtons = screen.getAllByTestId('mock-xcircle-icon');
    fireEvent.click(closeButtons[0]);
    
    // Reset processing state
    processingState = {};
    
    // Force rerender
    rerender(<EntityDetectionStatusViewer />);
    
    // All statuses should be cleared
    expect(screen.queryByText('document1.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('document2.pdf')).not.toBeInTheDocument();
  });

  test('dismisses individual status when its dismiss button is clicked', () => {
    processingState = {
      'file-1': {
        status: 'processing',
        progress: 30,
        startTime: Date.now(),
        fileName: 'document1.pdf'
      },
      'file-2': {
        status: 'processing',
        progress: 60,
        startTime: Date.now(),
        fileName: 'document2.pdf'
      }
    };
    
    const { rerender } = render(<EntityDetectionStatusViewer />);
    
    // Check that both files' statuses are displayed
    expect(screen.getByText('document1.pdf')).toBeInTheDocument();
    expect(screen.getByText('document2.pdf')).toBeInTheDocument();
    
    // Find the dismiss buttons for individual files (not the main close button)
    const dismissButtons = screen.getAllByTestId('mock-xcircle-icon');
    // The index depends on the DOM structure, typically buttons after the main one
    fireEvent.click(dismissButtons[1]); // Click the one for file-1
    
    // Update processing state
    delete processingState['file-1'];
    
    // Force rerender to update UI
    rerender(<EntityDetectionStatusViewer />);
    
    // First file status should be dismissed, second should remain
    expect(screen.queryByText('document1.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('document2.pdf')).toBeInTheDocument();
  });

  test('unsubscribes from processing service on unmount', () => {
    const { unmount } = render(<EntityDetectionStatusViewer />);
    
    // Unmount the component
    unmount();
    
    // Should have unsubscribed
    expect(mockUnsubscribe.unsubscribe).toHaveBeenCalled();
  });
}); 