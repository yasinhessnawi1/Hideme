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
  test('renders login page in login mode by default', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByTestId('mode').textContent).toBe('login');
    expect(screen.getByText('auth.loginPage_title')).toBeInTheDocument();
    expect(screen.getByText('auth.loginPage_loginSubtitle')).toBeInTheDocument();
  });

  // Positive scenario: Sign up mode from props
  test('renders in signup mode when initialSignUp prop is true', () => {
    render(
      <BrowserRouter>
        <LoginPage initialSignUp={true} />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('mode').textContent).toBe('signup');
    expect(screen.getByText('auth.loginPage_signUpSubtitle')).toBeInTheDocument();
  });

  // Positive scenario: Sign up mode from URL param
  test('renders in signup mode when URL has signup=true', () => {
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('signup', 'true');
    
    vi.mocked(useSearchParams).mockReturnValue([
      mockSearchParams,
      vi.fn()
    ]);
    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('mode').textContent).toBe('signup');
  });

  // Positive scenario: Sign up mode from location state
  test('renders in signup mode when location state has isSignUp=true', () => {
    vi.mocked(useLocation).mockReturnValue({
      pathname: '/login',
      search: '',
      hash: '',
      state: { isSignUp: true },
      key: 'default'
    });
    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('mode').textContent).toBe('signup');
  });

  // Positive scenario: Toggle between modes
  test('toggles between login and signup modes', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('mode').textContent).toBe('login');
    
    fireEvent.click(screen.getByTestId('toggle-mode'));
    
    expect(screen.getByTestId('mode').textContent).toBe('signup');
    
    fireEvent.click(screen.getByTestId('toggle-mode'));
    
    expect(screen.getByTestId('mode').textContent).toBe('login');
  });

  // Negative scenario: Form state management with empty values
  test('handles form input properly', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    const usernameInput = screen.getByTestId('username-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');
    
    expect(usernameInput).toHaveValue('');
    expect(emailInput).toHaveValue('');
    expect(passwordInput).toHaveValue('');
    expect(confirmPasswordInput).toHaveValue('');
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    
    expect(usernameInput).toHaveValue('testuser');
    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
    expect(confirmPasswordInput).toHaveValue('password123');
  });
}); 