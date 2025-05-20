import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, useLocation, useSearchParams } from 'react-router-dom';
import LoginPage from './LoginPage';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { useLanguage } from '../../contexts/LanguageContext';
import {NestedTranslationKey, TranslationKey} from "../../utils/i18n/translations";

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: vi.fn(),
    useSearchParams: vi.fn()
  };
});

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: vi.fn()
}));

vi.mock('../../components/forms/LoginForm', () => ({
  default: ({ 
    isSignUp, 
    setIsSignUp, 
    username, 
    setUsername, 
    email, 
    setEmail, 
    password, 
    setPassword, 
    confirmPassword, 
    setConfirmPassword 
  }: {
    isSignUp: boolean;
    setIsSignUp: (value: boolean) => void;
    username: string;
    setUsername: (value: string) => void;
    email: string;
    setEmail: (value: string) => void;
    password: string;
    setPassword: (value: string) => void;
    confirmPassword: string;
    setConfirmPassword: (value: string) => void;
  }) => (
    <div data-testid="login-form">
      <div data-testid="mode">{isSignUp ? 'signup' : 'login'}</div>
      <button 
        data-testid="toggle-mode" 
        onClick={() => setIsSignUp(!isSignUp)}
      >
        Toggle Mode
      </button>
      <input 
        data-testid="username-input" 
        value={username} 
        onChange={(e) => setUsername(e.target.value)}
      />
      <input 
        data-testid="email-input" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
      />
      <input 
        data-testid="password-input" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)}
      />
      <input 
        data-testid="confirm-password-input" 
        value={confirmPassword} 
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
    </div>
  )
}));

vi.mock('../../components/static/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Default mocks
    vi.mocked(useLocation).mockReturnValue({
      pathname: '/login',
      search: '',
      hash: '',
      state: null,
      key: 'default'
    });
    
    vi.mocked(useSearchParams).mockReturnValue([
      new URLSearchParams(),
      vi.fn()
    ]);
    
    vi.mocked(useLanguage).mockReturnValue({
      language: 'en',
      setLanguage: vi.fn(),
      t: <T extends TranslationKey, K extends NestedTranslationKey<T>>(
        category: T,
        key: K,
        params?: Record<string, string | number>
      ) => `${category}.${String(key)}`
    });
  });

  // Positive scenario: Default login mode
  test.skip('renders login page in login mode by default', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Should show login form
    expect(screen.getByText('auth.login')).toBeInTheDocument();
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    
    // Should not show signup form
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument();
  });

  // Positive scenario: Sign up mode from props
  test.skip('renders in signup mode when initialSignUp prop is true', () => {
    render(
      <BrowserRouter>
        <LoginPage initialSignUp={true} />
      </BrowserRouter>
    );
    
    // Should show signup form
    expect(screen.getByText('auth.createAccount')).toBeInTheDocument();
    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
    
    // Should not show login form
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
  });

  // Positive scenario: Sign up mode from URL query parameter
  test.skip('renders in signup mode when URL has signup=true', () => {
    // Mock URL with signup=true query parameter
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((param) => {
      if (param === 'signup') return 'true';
      return null;
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Should show signup form
    expect(screen.getByText('auth.createAccount')).toBeInTheDocument();
    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
  });

  // Positive scenario: Sign up mode from location state
  test.skip('renders in signup mode when location state has isSignUp=true', () => {
    // Mock useLocation to return location with isSignUp in state
    vi.mock('react-router-dom', async () => {
      const original = await vi.importActual('react-router-dom');
      return {
        ...original,
        useLocation: () => ({
          pathname: '/login',
          search: '',
          hash: '',
          state: { isSignUp: true }
        })
      };
    });
    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Should show signup form
    expect(screen.getByText('auth.createAccount')).toBeInTheDocument();
    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
  });

  // Positive scenario: Toggle between modes
  test.skip('toggles between login and signup modes', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Initially in login mode
    expect(screen.getByText('auth.login')).toBeInTheDocument();
    
    // Click on switch to signup button
    const switchToSignupButton = screen.getByText('auth.signUp');
    fireEvent.click(switchToSignupButton);
    
    // Should now be in signup mode
    expect(screen.getByText('auth.createAccount')).toBeInTheDocument();
    
    // Click on switch to login button
    const switchToLoginButton = screen.getByText('auth.alreadyHaveAccount');
    fireEvent.click(switchToLoginButton);
    
    // Should be back in login mode
    expect(screen.getByText('auth.login')).toBeInTheDocument();
  });

  // Negative scenario: Form state management with empty values
  test.skip('handles form input properly', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Get email input and check its initial state
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveValue('');
    
    // Change the value and check that it updates
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput).toHaveValue('test@example.com');
  });
}); 