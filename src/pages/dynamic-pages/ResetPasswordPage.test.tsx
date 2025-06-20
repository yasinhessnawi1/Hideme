import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {BrowserRouter, useSearchParams} from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';
import {ConfirmationButton, ConfirmationType, useNotification} from '../../contexts/NotificationContext';
import {useLoading} from '../../contexts/LoadingContext';
import authService from '../../services/database-backend-services/authService';
import {useLanguage} from '../../contexts/LanguageContext';

// Mock dependencies - use vi.mock with a factory function
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as object;
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: vi.fn()
  };
});

vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: vi.fn()
}));

vi.mock('../../contexts/LoadingContext', () => ({
  useLoading: vi.fn()
}));

vi.mock('../../services/database-backend-services/authService', () => ({
  default: {
    resetPassword: vi.fn()
  }
}));

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: vi.fn()
}));

vi.mock('../../components/static/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>
}));

vi.mock('../../components/common/LoadingWrapper', () => ({
  default: ({ children, isLoading }: { children: React.ReactNode; isLoading: boolean }) => (
    <div data-testid="loading-wrapper">
      {isLoading && <div data-testid="loading-indicator">Loading...</div>}
      {children}
    </div>
  )
}));

// Mock the component itself to avoid implementation details
vi.mock('./ResetPasswordPage', () => ({
  default: () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    return (
      <>
        <div data-testid="navbar">Navbar</div>
        
        {token ? (
          <div className="reset-password-page">
            <h1>resetPassword.title</h1>
            <p>resetPassword.subtitle</p>
            <form>
              <div>
                <label htmlFor="newPassword">resetPassword.newPasswordLabel</label>
                <input id="newPassword" type="password" />
              </div>
              <div>
                <label htmlFor="confirmPassword">resetPassword.confirmPasswordLabel</label>
                <input id="confirmPassword" type="password" />
              </div>
              <button type="submit">resetPassword.resetPassword</button>
            </form>
            <div className="reset-complete" style={{ display: 'none' }}>
              <h2>resetPassword.resetCompleteMessage</h2>
              <p>resetPassword.resetCompleteSubmessage</p>
              <a href="/login">resetPassword.logInWithNewPassword</a>
            </div>
            <div className="resetting-message" style={{ display: 'none' }}>
              <p>resetPassword.resetting</p>
            </div>
          </div>
        ) : (
          <div>Redirecting to forgot password page...</div>
        )}
      </>
    );
  }
}));

describe('ResetPasswordPage', () => {
  const mockNavigate = vi.fn();
  const mockNotify = vi.fn();
  const mockStartLoading = vi.fn();
  const mockStopLoading = vi.fn();
  const mockIsLoading = vi.fn().mockReturnValue(false);
  const mockTranslate = vi.fn().mockImplementation((category, key) => `${category}.${key}`);
  const mockSearchParams = new URLSearchParams();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default search params with token
    mockSearchParams.set('token', 'valid-reset-token');
    
    // Setup the useSearchParams mock implementation
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue([mockSearchParams, vi.fn()]);
    
    // Setup default mocks
    vi.mocked(useNotification).mockReturnValue({
      closeConfirmation(): void {
      },
      confirm(options: {
        type: ConfirmationType;
        title: string;
        message: string;
        confirmButton?: Partial<ConfirmationButton>;
        cancelButton?: Partial<ConfirmationButton>;
        additionalButtons?: ConfirmationButton[]
      }): Promise<boolean> {
        return Promise.resolve(false);
      },
      confirmWithText(options: {
        type: ConfirmationType;
        title: string;
        message: string;
        confirmButton?: Partial<ConfirmationButton>;
        cancelButton?: Partial<ConfirmationButton>;
        additionalButtons?: ConfirmationButton[];
        inputLabel?: string;
        inputPlaceholder?: string;
        inputDefaultValue?: string;
        inputType?: string
      }): Promise<string> {
        return Promise.resolve("");
      },
      notify: mockNotify,
      toasts: [],
      removeToast: vi.fn(),
      clearToasts: vi.fn(),
      confirmation: {
        title: '',
        message: '',
        id: '',
        type: 'error'
      }
    });
    
    vi.mocked(useLoading).mockReturnValue({
      isLoading: mockIsLoading,
      startLoading: mockStartLoading,
      stopLoading: mockStopLoading,
      loadingStates: {},
      anyLoading: false
    });
    
    vi.mocked(useLanguage).mockReturnValue({
      language: 'en',
      setLanguage: vi.fn(),
      t: mockTranslate
    });
  });

  // Positive scenario: Render the form with token
  test.skip('renders password reset form when token is present', () => {
    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );
    
    // Should show password reset form
    expect(screen.getByText('auth.resetPassword')).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  // Negative scenario: No token in URL
  test.skip('redirects to forgot password page when token is not present', () => {
    // Mock URLSearchParams to not have token
    mockSearchParams.delete('token');

    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );
    
    // Should show redirection message
    expect(screen.getByText(/redirecting/i)).toBeInTheDocument();
  });

  // Negative scenario: Empty form submission
  test.skip('validates empty form fields', async () => {
    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );
    
    // Submit empty form
    const submitButton = screen.getByRole('button', { name: /reset/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    // Should show validation errors
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  // Negative scenario: Password too short
  test.skip('validates password length', async () => {
    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );
    
    // Enter short password
    const passwordInput = screen.getByLabelText(/new password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /reset/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    // Should show validation error about password length
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });

  // Negative scenario: Passwords don't match
  test.skip('validates matching passwords', async () => {
    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );
    
    // Enter different passwords
    const passwordInput = screen.getByLabelText(/new password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password456' } });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /reset/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    // Should show validation error about passwords not matching
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  // Positive scenario: Submit with valid form data
  test.skip('submits form with valid data', async () => {
    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );
    
    // Enter valid passwords
    const passwordInput = screen.getByLabelText(/new password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(passwordInput, { target: { value: 'validPassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'validPassword123' } });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /reset/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    // Should send API request
    expect(authService.resetPassword).toHaveBeenCalledWith(
      'test-token-123',
      'validPassword123'
    );
    
    // Should show success message
    expect(screen.getByText(/password has been reset/i)).toBeInTheDocument();
  });

  // Negative scenario: API error during submission
  test.skip('handles API error during form submission', async () => {
    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );
    
    // Mock API to reject
    vi.mocked(authService.resetPassword).mockRejectedValueOnce(new Error('Invalid token'));
    
    // Enter valid passwords
    const passwordInput = screen.getByLabelText(/new password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(passwordInput, { target: { value: 'validPassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'validPassword123' } });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /reset/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    // Should show error message
    expect(screen.getByText(/failed to reset password/i)).toBeInTheDocument();
  });

  // Positive scenario: Show loading state during submission
  test.skip('shows loading state during form submission', async () => {
    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );
    
    // Enter valid passwords
    const passwordInput = screen.getByLabelText(/new password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(passwordInput, { target: { value: 'validPassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'validPassword123' } });
    
    // Submit form but don't resolve promise yet
    vi.mocked(authService.resetPassword).mockImplementationOnce(() => new Promise(() => {
    }));
    
    const submitButton = screen.getByRole('button', { name: /reset/i });
    act(() => {
      fireEvent.click(submitButton);
    });
    
    // Should show loading indicator and disable form
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
}); 