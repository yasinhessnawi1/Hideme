import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import FileUploader from './FileUploader';

// Mock dependencies
const mockAddFiles = vi.fn();
const mockNotify = vi.fn();

// Mock contexts
vi.mock('../../../contexts/FileContext', () => ({
  useFileContext: () => ({
    addFiles: mockAddFiles,
    files: [{ id: 'test-file-1' }]
  })
}));

vi.mock('../../../contexts/NotificationContext', () => ({
  useNotification: () => ({
    notify: mockNotify
  })
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (category: string, key: string) => `${category}.${key}`
  })
}));

describe('FileUploader Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders in full mode correctly', () => {
    render(<FileUploader />);
    
    // Check for title and text
    expect(screen.getByText('pdf.uploadFiles')).toBeInTheDocument();
    expect(screen.getByText(/pdf.dragDropOrSelect/)).toBeInTheDocument();
    expect(screen.getByText('pdf.multipleFilesSupported')).toBeInTheDocument();
    
    // Check for file input (should be hidden)
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', 'application/pdf');
    expect(fileInput).toHaveAttribute('multiple');
    expect(fileInput).toHaveStyle('display: none');
  });

  test('renders in icon mode correctly', () => {
    render(<FileUploader buttonType="icon" />);
    
    // Icon mode should have a button with Plus icon
    const addButton = screen.getByTitle('pdf.addMoreFiles');
    expect(addButton).toBeInTheDocument();
    
    // Check for file input (should be hidden)
    const fileInput = document.getElementById('pdf-upload-add') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveStyle('display: none');
  });

  test('handles file selection in replace mode', () => {
    render(<FileUploader mode="replace" />);
    
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    
    // Create a mock file and trigger change event
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Verify addFiles was called with replace=true
    expect(mockAddFiles).toHaveBeenCalledWith([file], true);
    // Verify notification was shown
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ 
      message: expect.stringContaining('pdf.filesAddedSuccessfully'),
      type: 'success' 
    }));
  });

  test('handles file selection in add mode', () => {
    render(<FileUploader mode="add" />);
    
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    
    // Create mock files and trigger change event
    const file1 = new File(['test content 1'], 'test1.pdf', { type: 'application/pdf' });
    const file2 = new File(['test content 2'], 'test2.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });
    
    // Verify addFiles was called with replace=false for add mode
    expect(mockAddFiles).toHaveBeenCalledWith([file1, file2], false);
    expect(mockNotify).toHaveBeenCalled();
  });

  test('handles file drag over', () => {
    render(<FileUploader />);
    
    const dropZone = screen.getByText(/pdf.dragDropOrSelect/);
    fireEvent.dragEnter(dropZone);
    
    // Expect the container to have drag-active class
    expect(dropZone.parentElement).toHaveClass('drag-active');
  });

  test('handles file drag leave', () => {
    render(<FileUploader />);
    
    const dropZone = screen.getByText(/pdf.dragDropOrSelect/);
    
    // First dragEnter to activate, then dragLeave
    fireEvent.dragEnter(dropZone);
    expect(dropZone.parentElement).toHaveClass('drag-active');
    
    fireEvent.dragLeave(dropZone);
    expect(dropZone.parentElement).not.toHaveClass('drag-active');
  });

  test('handles file drop correctly', () => {
    render(<FileUploader />);
    
    const dropZone = screen.getByText(/pdf.dragDropOrSelect/);
    
    // Create mock files for drop event
    const file1 = new File(['content'], 'dropped.pdf', { type: 'application/pdf' });
    const file2 = new File(['content2'], 'dropped2.pdf', { type: 'application/pdf' });
    
    // Create a mock drag event with files
    const mockDataTransfer = {
      files: [file1, file2],
    };
    
    // Simulate drop event
    fireEvent.drop(dropZone, { dataTransfer: mockDataTransfer });
    
    // Verify addFiles was called with the dropped files
    expect(mockAddFiles).toHaveBeenCalledWith([file1, file2], true);
    // Verify notification was shown
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('pdf.filesAddedByDropSuccessfully'),
      type: 'success'
    }));
    // Drop should remove drag-active class
    expect(dropZone.parentElement).not.toHaveClass('drag-active');
  });

  test('clicking the upload area triggers file selection', () => {
    render(<FileUploader />);
    
    // Mock click handler for file input
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');
    
    // Click on the upload area
    const uploadArea = screen.getByText(/pdf.dragDropOrSelect/).parentElement!;
    fireEvent.click(uploadArea);
    
    // Check if click was triggered on the file input
    expect(clickSpy).toHaveBeenCalled();
  });

  test('handles empty file selection', () => {
    render(<FileUploader />);
    
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    
    // Trigger change event with empty files array
    fireEvent.change(fileInput, { target: { files: [] } });
    
    // addFiles should not be called
    expect(mockAddFiles).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  test('handles empty file drop', () => {
    render(<FileUploader />);
    
    const dropZone = screen.getByText(/pdf.dragDropOrSelect/);
    
    // Simulate drop event with no files
    fireEvent.drop(dropZone, { 
      dataTransfer: { files: [] } 
    });
    
    // addFiles should not be called
    expect(mockAddFiles).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });
}); 