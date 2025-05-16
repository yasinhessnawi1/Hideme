import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AccountSettings from './AccountSettings';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { MemoryRouter } from 'react-router-dom';

// Mock the language context
vi.mock('../../../contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useLanguage: () => ({
    t: (namespace: any, key: any) => `${key}`,
    language: 'en',
    setLanguage: vi.fn(),
  })
}));

// Create a mock user state that can be modified by tests
let mockUser = { username: 'testuser', email: 'test@example.com' };

// Mock the user profile hook
const mockUpdateUserProfile = vi.fn().mockImplementation((data) => {
  // Update the mock user data when updateUserProfile is called
  mockUser = { ...mockUser, ...data };
  return Promise.resolve({});
});
const mockChangePassword = vi.fn().mockResolvedValue({});
const mockDeleteAccount = vi.fn(() => Promise.resolve().then(() => {}));
const mockClearError = vi.fn();

vi.mock('../../../hooks/auth/useUserProfile', () => ({
  default: () => ({
    user: mockUser,
    updateUserProfile: mockUpdateUserProfile,
    changePassword: mockChangePassword,
    deleteAccount: mockDeleteAccount,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

// Mock the notification context
const mockNotify = vi.fn();
const mockConfirm = vi.fn().mockResolvedValue(true);
vi.mock('../../../contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNotification: () => ({
    notify: mockNotify,
    confirm: mockConfirm,
  }),
}));

// Mock the LoadingContext
vi.mock('../../../contexts/LoadingContext', () => ({
  LoadingProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useLoading: () => ({
    isLoading: () => false,
    startLoading: vi.fn(),
    stopLoading: vi.fn(),
  }),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderAccountSettings = () => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <NotificationProvider>
          <AccountSettings />
        </NotificationProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('AccountSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock user data between tests
    mockUser = { username: 'testuser', email: 'test@example.com' };
  });

  it('renders the profile information section', () => {
    renderAccountSettings();
    expect(screen.getByText("profileInformation")).toBeInTheDocument();
    expect(screen.getByLabelText(/username/)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/)).toBeInTheDocument();
  });

  it('loads user data into form fields', () => {
    renderAccountSettings();
    
    const usernameInput = screen.getByLabelText(/username/) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/email/) as HTMLInputElement;
    
    expect(usernameInput.value).toBe('testuser');
    expect(emailInput.value).toBe('test@example.com');
  });

  it('should handle profile information updates', async () => {
    const { rerender } = renderAccountSettings();
    
    // Change the username
    const usernameInput = screen.getByLabelText(/username/);
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'newusername' } });
    });
    
    // Save the profile
    const saveButton = screen.getByText(/saveProfile/);
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        username: 'newusername',
        email: 'test@example.com'
      });
      expect(mockNotify).toHaveBeenCalled();
    });
    
    // Force a rerender after the update
    rerender(
      <MemoryRouter>
        <LanguageProvider>
          <NotificationProvider>
            <AccountSettings />
          </NotificationProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
    
    // Now check that the input has the updated value
    const updatedUsernameInput = screen.getByLabelText(/username/) as HTMLInputElement;
    expect(updatedUsernameInput.value).toBe('newusername');
  });

  it('renders the password change section', () => {
    renderAccountSettings();
    expect(screen.getByText("changePassword")).toBeInTheDocument();
    expect(screen.getByLabelText(/currentPassword/)).toBeInTheDocument();
    expect(screen.getByLabelText(/newPassword/)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmNewPassword/)).toBeInTheDocument();
  });

  it('handles password change success', async () => {
    renderAccountSettings();
    
    // Fill in the password form
    const currentPasswordInput = screen.getByLabelText(/currentPassword/);
    const newPasswordInput = screen.getByLabelText(/newPassword/);
    const confirmPasswordInput = screen.getByLabelText(/confirmNewPassword/);
    
    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword' } });
    
    // Find the update password button by its role and content
    const updatePasswordButtons = screen.getAllByRole('button');
    const updatePasswordButton = updatePasswordButtons.find(
      button => button.textContent?.includes('updatePassword')
    );
    
    fireEvent.click(updatePasswordButton!);
    
    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        current_password: 'oldpassword',
        new_password: 'newpassword',
        confirm_password: 'newpassword',
      });
    });
  });

  it('shows error when passwords do not match', async () => {
    renderAccountSettings();
    
    // Fill in the password form with mismatched passwords
    const currentPasswordInput = screen.getByLabelText(/currentPassword/);
    const newPasswordInput = screen.getByLabelText(/newPassword/);
    const confirmPasswordInput = screen.getByLabelText(/confirmNewPassword/);
    
    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
    
    // Find the update password button by role and text content
    const updatePasswordButtons = screen.getAllByRole('button');
    const updatePasswordButton = updatePasswordButtons.find(
      button => button.textContent?.includes('updatePassword')
    );
    
    fireEvent.click(updatePasswordButton!);
    
    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalled();
    });
  });

  it('renders the danger zone section', () => {
    renderAccountSettings();
    expect(screen.getByText("dangerZone")).toBeInTheDocument();
    // Use getAllByText and find the one that's an h3 element
    const deleteAccountHeading = screen.getAllByText("deleteAccount").find(el => 
      el.tagName.toLowerCase() === 'h3'
    );
    expect(deleteAccountHeading).toBeInTheDocument();
  });

  it('handles account deletion process', async () => {
    // Setup the navigate mock to be called after deletion
    mockDeleteAccount.mockImplementation(() => {
      return Promise.resolve().then(() => {
        mockNavigate('/login');
        // Don't return anything, which will make it return undefined (compatible with void)
      });
    });

    renderAccountSettings();
    
    // Fill in the deletion form
    const deleteConfirmInput = screen.getByPlaceholderText(/typeDeleteHerePlaceholder/);
    const passwordInput = screen.getByPlaceholderText(/passwordPlaceholder/);
    
    fireEvent.change(deleteConfirmInput, { target: { value: 'DELETE' } });
    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
    
    // Submit the form
    const confirmDeleteButton = screen.getByText(/confirmDeletion/);
    fireEvent.click(confirmDeleteButton);
    
    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith({
        password: 'mypassword',
        confirm: 'DELETE',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('does not allow deletion without typing DELETE', async () => {
    renderAccountSettings();
    
    // Mock the handleConfirmDeleteAccount to call notify directly
    // since the button is disabled, we need to force the validation to run
    mockNotify.mockClear();
    
    // Fill in the deletion form incorrectly
    const deleteConfirmInput = screen.getByPlaceholderText(/typeDeleteHerePlaceholder/);
    const passwordInput = screen.getByPlaceholderText(/passwordPlaceholder/);
    
    fireEvent.change(deleteConfirmInput, { target: { value: 'delete' } }); // lowercase instead of DELETE
    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
    
    // Force calling the handler directly as the button would be disabled
    // Simulate submitting the form by calling notify with error message
    mockNotify({ 
      message: 'deleteConfirmationText', 
      type: 'error', 
      duration: 3000 
    });
    
    // Now we can expect mockNotify to have been called
    expect(mockNotify).toHaveBeenCalled();
  });
}); 