import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    nav: ({ children, className, ...props }: any) => (
      <nav className={className} data-testid="motion-nav">{children}</nav>
    ),
  },
}));

// Mock TrueFocus component
vi.mock('./TrueFocus', () => ({
  default: ({ sentence }: any) => <div data-testid="true-focus">{sentence}</div>,
}));

// Mock Button component
vi.mock("../common", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="custom-button">{children}</button>
  ),
}));

// Mock LanguageSwitcher component
vi.mock('../common/LanguageSwitcher', () => ({
  default: ({ className }: any) => <div data-testid="language-switcher" className={className}>Language Switcher</div>,
}));

// Mock language context
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (namespace: string, key: string) => `${key}_translated`,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock states that will be changed for different test cases
let mockIsAuthenticated = false;
let mockUser: { username: string; email: string } | null = null;

// Mock user context
const mockLogout = vi.fn().mockResolvedValue({});
vi.mock('../../contexts/UserContext', () => ({
  useUserContext: () => ({
    isAuthenticated: mockIsAuthenticated,
    logout: mockLogout,
    user: mockUser,
    isLoading: false,
  }),
}));

// Mock notification context
const mockNotify = vi.fn();
vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({
    notify: mockNotify,
  }),
}));

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
    mockUser = null;
  });
  
  it.skip('renders the navbar with logo', () => {
    render(<Navbar />, { wrapper: BrowserRouter });
    
    expect(screen.getByTestId('motion-nav')).toBeInTheDocument();
    expect(screen.getByTestId('true-focus')).toBeInTheDocument();
    expect(screen.getByTestId('true-focus').textContent).toBe('hideMe_translated');
  });
  
  it.skip('renders navigation links', () => {
    render(<Navbar />, { wrapper: BrowserRouter });
    
    expect(screen.getByText('features_translated')).toBeInTheDocument();
    expect(screen.getByText('howItWorks_translated')).toBeInTheDocument();
    expect(screen.getByText('about_translated')).toBeInTheDocument();
  });
  
  it.skip('renders login button when user is not authenticated', () => {
    render(<Navbar />, { wrapper: BrowserRouter });
    
    expect(screen.getByTestId('custom-button')).toBeInTheDocument();
    expect(screen.getByText('getStarted_translated')).toBeInTheDocument();
  });
  
  it.skip('navigates to login page when login button is clicked', () => {
    render(<Navbar />, { wrapper: BrowserRouter });
    
    fireEvent.click(screen.getByTestId('custom-button'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
  
  it.skip('renders user menu when user is authenticated', () => {
    mockIsAuthenticated = true;
    mockUser = { username: 'testuser', email: 'test@example.com' };
    
    render(<Navbar />, { wrapper: BrowserRouter });
    
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('playground_translated')).toBeInTheDocument(); // Playground link should be visible
  });
  
  it.skip('opens dropdown menu when user button is clicked', () => {
    mockIsAuthenticated = true;
    mockUser = { username: 'testuser', email: 'test@example.com' };
    
    render(<Navbar />, { wrapper: BrowserRouter });
    
    // Dropdown should not be visible initially
    expect(screen.queryByText('settings_translated')).not.toBeInTheDocument();
    
    // Click on the user menu button
    fireEvent.click(screen.getByText('testuser'));
    
    // Dropdown should now be visible
    expect(screen.getByText('settings_translated')).toBeInTheDocument();
    expect(screen.getByText('logout_translated')).toBeInTheDocument();
  });
  
  it.skip('navigates to settings page when settings option is clicked', async () => {
    mockIsAuthenticated = true;
    mockUser = { username: 'testuser', email: 'test@example.com' };
    
    render(<Navbar />, { wrapper: BrowserRouter });
    
    // Open dropdown
    fireEvent.click(screen.getByText('testuser'));
    
    // Click settings option
    fireEvent.click(screen.getByText('settings_translated'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/user/settings');
  });
  
  it.skip('logs out user when logout option is clicked', async () => {
    mockIsAuthenticated = true;
    mockUser = { username: 'testuser', email: 'test@example.com' };
    
    render(<Navbar />, { wrapper: BrowserRouter });
    
    // Open dropdown
    fireEvent.click(screen.getByText('testuser'));
    
    // Click logout option
    fireEvent.click(screen.getByText('logout_translated'));
    
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(mockNotify).toHaveBeenCalledWith({
        message: 'loggedOut_translated',
        type: 'success',
        duration: 3000
      });
    });
  });
  
  it.skip('renders the language switcher', () => {
    render(<Navbar />, { wrapper: BrowserRouter });
    
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('language-switcher')).toHaveClass('nav-language-switcher');
  });
}); 