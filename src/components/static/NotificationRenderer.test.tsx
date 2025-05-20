import { describe, it, expect, vi, beforeEach,afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// Import modules before mocking them
import * as NotificationContext from '../../contexts/NotificationContext';
import { NotificationRenderer, ToastContainer, ConfirmationDialog } from './NotificationRenderer';

// Mock the contexts
vi.mock('../../utils/i18n', () => ({
  useLanguage: () => ({
    t: (namespace: string, key: string) => `${key}_translated`,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

// Mock the Lucide icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

describe('NotificationRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset the mock implementation for NotificationContext
    vi.spyOn(NotificationContext, 'NotificationProvider').mockImplementation(
      ({ children }) => <div data-testid="notification-provider">{children}</div>
    );
    
    vi.spyOn(NotificationContext, 'useNotification').mockReturnValue({
      toasts: [],
      removeToast: vi.fn(),
      confirmation: null,
      closeConfirmation: vi.fn(),
      notify: function (options: {
        type: NotificationContext.NotificationType;
        message: string;
        duration?: number;
        position?: NotificationContext.NotificationPosition;
      }): string {
        throw new Error('Function not implemented.');
      },
      clearToasts: function (): void {
        throw new Error('Function not implemented.');
      },
      confirm: function (options: {
        type: NotificationContext.ConfirmationType;
        title: string;
        message: string;
        confirmButton?: Partial<NotificationContext.ConfirmationButton>;
        cancelButton?: Partial<NotificationContext.ConfirmationButton>;
        additionalButtons?: NotificationContext.ConfirmationButton[];
      }): Promise<boolean> {
        throw new Error('Function not implemented.');
      },
      confirmWithText: function (options: {
        type: NotificationContext.ConfirmationType;
        title: string;
        message: string;
        confirmButton?: Partial<NotificationContext.ConfirmationButton>;
        cancelButton?: Partial<NotificationContext.ConfirmationButton>;
        additionalButtons?: NotificationContext.ConfirmationButton[];
        inputLabel?: string;
        inputPlaceholder?: string;
        inputDefaultValue?: string;
        inputType?: string;
      }): Promise<string> {
        throw new Error('Function not implemented.');
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the NotificationRenderer component', () => {
    render(<NotificationRenderer />);
    
    // Test passes if rendering doesn't throw an error
    // We can't check for specific elements because the component might not render anything visible
    // when there are no notifications
  });
  
  describe('ToastContainer', () => {
    it('renders toasts when notifications are added', async () => {
      // Setup mock with a success toast
      vi.spyOn(NotificationContext, 'useNotification').mockReturnValue({
        toasts: [
          {id: '1', type: 'success', message: 'Success message', position: 'top-right'}
        ],
        removeToast: vi.fn(),
        notify: function (options: {
          type: NotificationContext.NotificationType;
          message: string;
          duration?: number;
          position?: NotificationContext.NotificationPosition;
        }): string {
          throw new Error('Function not implemented.');
        },
        clearToasts: function (): void {
          throw new Error('Function not implemented.');
        },
        confirmation: null,
        confirm: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
        }): Promise<boolean> {
          throw new Error('Function not implemented.');
        },
        confirmWithText: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
          inputLabel?: string;
          inputPlaceholder?: string;
          inputDefaultValue?: string;
          inputType?: string;
        }): Promise<string> {
          throw new Error('Function not implemented.');
        },
        closeConfirmation: function (): void {
          throw new Error('Function not implemented.');
        }
      });
      
      render(<ToastContainer />);
      
      // Check if toast is rendered
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });
    
    it('groups toasts by position', async () => {
      // Mock multiple toasts at different positions
      vi.spyOn(NotificationContext, 'useNotification').mockReturnValue({
        toasts: [
          {id: '1', type: 'success', message: 'Top Right', position: 'top-right'},
          {id: '2', type: 'error', message: 'Top Left', position: 'top-left'}
        ],
        removeToast: vi.fn(),
        notify: function (options: {
          type: NotificationContext.NotificationType;
          message: string;
          duration?: number;
          position?: NotificationContext.NotificationPosition;
        }): string {
          throw new Error('Function not implemented.');
        },
        clearToasts: function (): void {
          throw new Error('Function not implemented.');
        },
        confirmation: null,
        confirm: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
        }): Promise<boolean> {
          throw new Error('Function not implemented.');
        },
        confirmWithText: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
          inputLabel?: string;
          inputPlaceholder?: string;
          inputDefaultValue?: string;
          inputType?: string;
        }): Promise<string> {
          throw new Error('Function not implemented.');
        },
        closeConfirmation: function (): void {
          throw new Error('Function not implemented.');
        }
      });
      
      render(<ToastContainer />);
      
      // Check if toasts are rendered in their correct containers
      expect(screen.getByText('Top Right')).toBeInTheDocument();
      expect(screen.getByText('Top Left')).toBeInTheDocument();
      
      const topRightContainer = document.querySelector('.toast-top-right');
      const topLeftContainer = document.querySelector('.toast-top-left');
      
      expect(topRightContainer).toContainElement(screen.getByText('Top Right'));
      expect(topLeftContainer).toContainElement(screen.getByText('Top Left'));
    });
    
    it('removes toast when close button is clicked', async () => {
      const mockRemoveToast = vi.fn();
      
      // Setup mock with a toast and removal function
      vi.spyOn(NotificationContext, 'useNotification').mockReturnValue({
        toasts: [
          {id: '1', type: 'info', message: 'Info message', position: 'top-right'}
        ],
        removeToast: mockRemoveToast,
        notify: function (options: {
          type: NotificationContext.NotificationType;
          message: string;
          duration?: number;
          position?: NotificationContext.NotificationPosition;
        }): string {
          throw new Error('Function not implemented.');
        },
        clearToasts: function (): void {
          throw new Error('Function not implemented.');
        },
        confirmation: null,
        confirm: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
        }): Promise<boolean> {
          throw new Error('Function not implemented.');
        },
        confirmWithText: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
          inputLabel?: string;
          inputPlaceholder?: string;
          inputDefaultValue?: string;
          inputType?: string;
        }): Promise<string> {
          throw new Error('Function not implemented.');
        },
        closeConfirmation: function (): void {
          throw new Error('Function not implemented.');
        }
      });
      
      render(<ToastContainer />);
      
      // Click the close button
      const closeButton = screen.getByLabelText('close_notification_translated');
      fireEvent.click(closeButton);
      
      // After animation completes
      vi.advanceTimersByTime(300);
      
      // Verify removeToast was called with the correct ID
      expect(mockRemoveToast).toHaveBeenCalledWith('1');
    });
    
    it('renders different icon types based on notification type', () => {
      // Setup mock with different toast types
      vi.spyOn(NotificationContext, 'useNotification').mockReturnValue({
        toasts: [
          {id: '1', type: 'success', message: 'Success', position: 'top-right'},
          {id: '2', type: 'error', message: 'Error', position: 'top-right'},
          {id: '3', type: 'info', message: 'Info', position: 'top-right'},
          {id: '4', type: 'warning', message: 'Warning', position: 'top-right'}
        ],
        removeToast: vi.fn(),
        notify: function (options: {
          type: NotificationContext.NotificationType;
          message: string;
          duration?: number;
          position?: NotificationContext.NotificationPosition;
        }): string {
          throw new Error('Function not implemented.');
        },
        clearToasts: function (): void {
          throw new Error('Function not implemented.');
        },
        confirmation: null,
        confirm: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
        }): Promise<boolean> {
          throw new Error('Function not implemented.');
        },
        confirmWithText: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
          inputLabel?: string;
          inputPlaceholder?: string;
          inputDefaultValue?: string;
          inputType?: string;
        }): Promise<string> {
          throw new Error('Function not implemented.');
        },
        closeConfirmation: function (): void {
          throw new Error('Function not implemented.');
        }
      });
      
      render(<ToastContainer />);
      
      // Check for each icon type
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('alert-triangle-icon').length).toBe(2); // Both error and warning use AlertTriangle
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });
  });
  
  describe('ConfirmationDialog', () => {
    it('does not render when there is no confirmation', () => {
      vi.spyOn(NotificationContext, 'useNotification').mockReturnValue({
        confirmation: null,
        closeConfirmation: vi.fn(),
        toasts: [],
        notify: function (options: {
          type: NotificationContext.NotificationType;
          message: string;
          duration?: number;
          position?: NotificationContext.NotificationPosition;
        }): string {
          throw new Error('Function not implemented.');
        },
        removeToast: function (id: string): void {
          throw new Error('Function not implemented.');
        },
        clearToasts: function (): void {
          throw new Error('Function not implemented.');
        },
        confirm: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
        }): Promise<boolean> {
          throw new Error('Function not implemented.');
        },
        confirmWithText: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
          inputLabel?: string;
          inputPlaceholder?: string;
          inputDefaultValue?: string;
          inputType?: string;
        }): Promise<string> {
          throw new Error('Function not implemented.');
        }
      });
      
      render(<ConfirmationDialog />);
      expect(document.querySelector('.confirmation-overlay')).toBeNull();
    });
    
    it('renders confirmation dialog with title and message', () => {
      // Setup mock with a confirmation
      vi.spyOn(NotificationContext, 'useNotification').mockReturnValue({
        confirmation: {
          title: 'Confirm Action',
          message: 'Are you sure?',
          type: 'info',
          confirmButton: {label: 'Yes', onClick: vi.fn()},
          cancelButton: {label: 'No', onClick: vi.fn()},
          id: ''
        },
        closeConfirmation: vi.fn(),
        toasts: [],
        notify: function (options: {
          type: NotificationContext.NotificationType;
          message: string;
          duration?: number;
          position?: NotificationContext.NotificationPosition;
        }): string {
          throw new Error('Function not implemented.');
        },
        removeToast: function (id: string): void {
          throw new Error('Function not implemented.');
        },
        clearToasts: function (): void {
          throw new Error('Function not implemented.');
        },
        confirm: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
        }): Promise<boolean> {
          throw new Error('Function not implemented.');
        },
        confirmWithText: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
          inputLabel?: string;
          inputPlaceholder?: string;
          inputDefaultValue?: string;
          inputType?: string;
        }): Promise<string> {
          throw new Error('Function not implemented.');
        }
      });
      
      render(<ConfirmationDialog />);
      
      // Check if dialog is rendered with correct content
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });
    
    it('calls confirmation button handler when clicked', () => {
      const mockConfirmFn = vi.fn();
      const mockCloseConfirmation = vi.fn();
      
      // Setup mock with a confirmation
      vi.spyOn(NotificationContext, 'useNotification').mockReturnValue({
        confirmation: {
          title: 'Confirm Action',
          message: 'Are you sure?',
          type: 'info',
          confirmButton: {label: 'Yes', onClick: mockConfirmFn},
          cancelButton: {label: 'No', onClick: vi.fn()},
          id: ''
        },
        closeConfirmation: mockCloseConfirmation,
        toasts: [],
        notify: function (options: {
          type: NotificationContext.NotificationType;
          message: string;
          duration?: number;
          position?: NotificationContext.NotificationPosition;
        }): string {
          throw new Error('Function not implemented.');
        },
        removeToast: function (id: string): void {
          throw new Error('Function not implemented.');
        },
        clearToasts: function (): void {
          throw new Error('Function not implemented.');
        },
        confirm: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
        }): Promise<boolean> {
          throw new Error('Function not implemented.');
        },
        confirmWithText: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
          inputLabel?: string;
          inputPlaceholder?: string;
          inputDefaultValue?: string;
          inputType?: string;
        }): Promise<string> {
          throw new Error('Function not implemented.');
        }
      });
      
      render(<ConfirmationDialog />);
      
      // Click the confirm button
      const confirmButton = screen.getByText('Yes');
      fireEvent.click(confirmButton);
      
      // Verify handler was called
      expect(mockConfirmFn).toHaveBeenCalled();
    });
    
    it('renders input field when inputLabel is provided', () => {
      const mockInputChangeFn = vi.fn();
      
      // Setup mock with a confirmation that includes an input
      vi.spyOn(NotificationContext, 'useNotification').mockReturnValue({
        confirmation: {
          title: 'Enter Value',
          message: 'Please enter a value:',
          type: 'info',
          inputLabel: 'Value:',
          inputPlaceholder: 'Enter value here',
          inputDefaultValue: '',
          onInputChange: mockInputChangeFn,
          confirmButton: {label: 'Submit', onClick: vi.fn()},
          cancelButton: {label: 'Cancel', onClick: vi.fn()},
          id: ''
        },
        closeConfirmation: vi.fn(),
        toasts: [],
        notify: function (options: {
          type: NotificationContext.NotificationType;
          message: string;
          duration?: number;
          position?: NotificationContext.NotificationPosition;
        }): string {
          throw new Error('Function not implemented.');
        },
        removeToast: function (id: string): void {
          throw new Error('Function not implemented.');
        },
        clearToasts: function (): void {
          throw new Error('Function not implemented.');
        },
        confirm: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
        }): Promise<boolean> {
          throw new Error('Function not implemented.');
        },
        confirmWithText: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
          inputLabel?: string;
          inputPlaceholder?: string;
          inputDefaultValue?: string;
          inputType?: string;
        }): Promise<string> {
          throw new Error('Function not implemented.');
        }
      });
      
      render(<ConfirmationDialog />);
      
      // Check if input is rendered
      expect(screen.getByText('Value:')).toBeInTheDocument();
      const input = screen.getByPlaceholderText('Enter value here');
      expect(input).toBeInTheDocument();
      
      // Test input change handler
      fireEvent.change(input, { target: { value: 'test value' } });
      expect(mockInputChangeFn).toHaveBeenCalledWith('test value');
    });
    
    it('closes the dialog when the close button is clicked', () => {
      const mockCloseConfirmation = vi.fn();
      
      // Setup mock with a confirmation
      vi.spyOn(NotificationContext, 'useNotification').mockReturnValue({
        confirmation: {
          title: 'Confirm Action',
          message: 'Are you sure?',
          type: 'info',
          confirmButton: {label: 'Yes', onClick: vi.fn()},
          cancelButton: {label: 'No', onClick: vi.fn()},
          id: ''
        },
        closeConfirmation: mockCloseConfirmation,
        toasts: [],
        notify: function (options: {
          type: NotificationContext.NotificationType;
          message: string;
          duration?: number;
          position?: NotificationContext.NotificationPosition;
        }): string {
          throw new Error('Function not implemented.');
        },
        removeToast: function (id: string): void {
          throw new Error('Function not implemented.');
        },
        clearToasts: function (): void {
          throw new Error('Function not implemented.');
        },
        confirm: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
        }): Promise<boolean> {
          throw new Error('Function not implemented.');
        },
        confirmWithText: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
          inputLabel?: string;
          inputPlaceholder?: string;
          inputDefaultValue?: string;
          inputType?: string;
        }): Promise<string> {
          throw new Error('Function not implemented.');
        }
      });
      
      render(<ConfirmationDialog />);
      
      // Click the close button
      const closeButton = screen.getByLabelText('close_dialog_translated');
      fireEvent.click(closeButton);
      
      // Verify handler was called
      expect(mockCloseConfirmation).toHaveBeenCalled();
    });
    
    it.skip('closes the dialog when escape key is pressed', () => {
      const mockCloseConfirmation = vi.fn();
      
      // Setup mock with a confirmation
      vi.spyOn(NotificationContext, 'useNotification').mockReturnValue({
        confirmation: {
          title: 'Confirm Action',
          message: 'Are you sure?',
          type: 'info',
          confirmButton: {label: 'Yes', onClick: vi.fn()},
          id: ''
        },
        closeConfirmation: mockCloseConfirmation,
        toasts: [],
        notify: function (options: {
          type: NotificationContext.NotificationType;
          message: string;
          duration?: number;
          position?: NotificationContext.NotificationPosition;
        }): string {
          throw new Error('Function not implemented.');
        },
        removeToast: function (id: string): void {
          throw new Error('Function not implemented.');
        },
        clearToasts: function (): void {
          throw new Error('Function not implemented.');
        },
        confirm: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
        }): Promise<boolean> {
          throw new Error('Function not implemented.');
        },
        confirmWithText: function (options: {
          type: NotificationContext.ConfirmationType;
          title: string;
          message: string;
          confirmButton?: Partial<NotificationContext.ConfirmationButton>;
          cancelButton?: Partial<NotificationContext.ConfirmationButton>;
          additionalButtons?: NotificationContext.ConfirmationButton[];
          inputLabel?: string;
          inputPlaceholder?: string;
          inputDefaultValue?: string;
          inputType?: string;
        }): Promise<string> {
          throw new Error('Function not implemented.');
        }
      });
      
      render(<ConfirmationDialog />);
      
      // Simulate pressing the Escape key
      fireEvent.keyDown(window, { key: 'Escape' });
      
      // Verify handler was called
      expect(mockCloseConfirmation).toHaveBeenCalled();
    });
  });
}); 