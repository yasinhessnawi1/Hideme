import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
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
    let mockProcessingInfo: any;
    let mockClearProcessing: any;
    let mockStopProcessing: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset processing state for each test
    processingState = {};
      mockProcessingInfo = {};
      mockClearProcessing = vi.fn();
      mockStopProcessing = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test.skip('renders nothing when no processing files', () => {
    const { container } = render(<EntityDetectionStatusViewer />);
    expect(container.firstChild).toBeNull();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  test.skip('displays processing file when notified', () => {
    // Mock the processing info observable
    mockProcessingInfo = {
      'file1.pdf': {
        fileName: 'file1.pdf',
        stage: 'detecting',
        progress: 50,
        status: 'Processing...'
      }
    };

    render(<EntityDetectionStatusViewer />);

    // Check that the processing status is displayed
    expect(screen.getByText('file1.pdf')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  test.skip('handles multiple files being processed simultaneously', () => {
    // Mock multiple files being processed
    mockProcessingInfo = {
      'file1.pdf': {
        fileName: 'file1.pdf',
        stage: 'detecting',
        progress: 50,
        status: 'Processing...'
      },
      'file2.pdf': {
        fileName: 'file2.pdf',
        stage: 'loading',
        progress: 20,
        status: 'Loading file...'
      }
    };

    render(<EntityDetectionStatusViewer />);

    // Check that both files' statuses are displayed
    expect(screen.getByText('file1.pdf')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Processing...')).toBeInTheDocument();

    expect(screen.getByText('file2.pdf')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('Loading file...')).toBeInTheDocument();
  });

  test.skip('removes a file from processing list when null info is received', () => {
    // Start with one file processing
    mockProcessingInfo = {
      'file1.pdf': {
        fileName: 'file1.pdf',
        stage: 'detecting',
        progress: 50,
        status: 'Processing...'
      }
    };

    const { rerender } = render(<EntityDetectionStatusViewer />);

    // Check that the file status is displayed
    expect(screen.getByText('file1.pdf')).toBeInTheDocument();

    // Now simulate that the file is done processing
    mockProcessingInfo = {};
    
    // Simulate the update notification
    mockSubscribe.mock.calls[0][0](mockProcessingInfo);
    
    // Re-render the component to reflect changes
    rerender(<EntityDetectionStatusViewer />);
    
    // File should no longer be displayed
    expect(screen.queryByText('file1.pdf')).toBeNull();
  });

  test.skip('clears all processing statuses when close button is clicked', () => {
    // Mock multiple files being processed
    mockProcessingInfo = {
      'file1.pdf': {
        fileName: 'file1.pdf',
        stage: 'detecting',
        progress: 50,
        status: 'Processing...'
      },
      'file2.pdf': {
        fileName: 'file2.pdf',
        stage: 'loading',
        progress: 20,
        status: 'Loading file...'
      }
    };

    const { rerender } = render(<EntityDetectionStatusViewer />);

    // Check that both files' statuses are displayed
    expect(screen.getByText('file1.pdf')).toBeInTheDocument();
    expect(screen.getByText('file2.pdf')).toBeInTheDocument();

    // Find and click the close button
    const closeButton = screen.getByTitle('pdf.closeAllStatus');
    fireEvent.click(closeButton);

    // The processing info should be cleared
    expect(mockClearProcessing).toHaveBeenCalled();
    
    // Simulate the update after clearing
    mockProcessingInfo = {};
    mockSubscribe.mock.calls[0][0](mockProcessingInfo);
    
    // Re-render to reflect changes
    rerender(<EntityDetectionStatusViewer />);
    
    // No files should be displayed
    expect(screen.queryByText('file1.pdf')).toBeNull();
    expect(screen.queryByText('file2.pdf')).toBeNull();
  });

  test.skip('dismisses individual status when its dismiss button is clicked', () => {
    // Mock multiple files being processed
    mockProcessingInfo = {
      'file1.pdf': {
        fileName: 'file1.pdf',
        stage: 'detecting',
        progress: 50,
        status: 'Processing...'
      },
      'file2.pdf': {
        fileName: 'file2.pdf',
        stage: 'loading',
        progress: 20,
        status: 'Loading file...'
      }
    };

    const { rerender } = render(<EntityDetectionStatusViewer />);

    // Check that both files' statuses are displayed
    expect(screen.getByText('file1.pdf')).toBeInTheDocument();
    expect(screen.getByText('file2.pdf')).toBeInTheDocument();

    // Find the dismiss button for file1 and click it
    const dismissButtons = screen.getAllByTitle('pdf.dismissStatus');
    fireEvent.click(dismissButtons[0]); // First dismiss button
    
    // The file1 should be stopped
    expect(mockStopProcessing).toHaveBeenCalledWith('file1.pdf');
    
    // Simulate the update after dismissing
    mockProcessingInfo = {
      'file2.pdf': {
        fileName: 'file2.pdf',
        stage: 'loading',
        progress: 20,
        status: 'Loading file...'
      }
    };
    mockSubscribe.mock.calls[0][0](mockProcessingInfo);
    
    // Re-render to reflect changes
    rerender(<EntityDetectionStatusViewer />);
    
    // file1 should be gone, file2 should remain
    expect(screen.queryByText('file1.pdf')).toBeNull();
    expect(screen.getByText('file2.pdf')).toBeInTheDocument();
  });

  test.skip('unsubscribes from processing service on unmount', () => {
    const { unmount } = render(<EntityDetectionStatusViewer />);

    // Unmount the component
    unmount();

    // Check that unsubscribe was called
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
}); 