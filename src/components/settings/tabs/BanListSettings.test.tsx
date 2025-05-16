import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BanListSettings from './BanListSettings';
import { LoadingProvider } from '../../../contexts/LoadingContext';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import { MemoryRouter } from 'react-router-dom';

// Mock language context
vi.mock('../../../contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useLanguage: () => ({
    t: (namespace: any, key: any) => key,
    language: 'en',
    setLanguage: vi.fn(),
  })
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Define mock functions
const mockGetBanList = vi.fn().mockResolvedValue({ words: ['test1', 'test2', 'offensive'] });
const mockAddBanListWords = vi.fn().mockResolvedValue({ words: ['test1', 'test2', 'offensive', 'newword'] });
const mockRemoveBanListWords = vi.fn().mockResolvedValue({ words: ['test1', 'offensive'] });
const mockClearError = vi.fn();

// Mock the ban list hook
vi.mock('../../../hooks/settings/useBanList', () => ({
  default: () => ({
    banList: { words: ['test1', 'test2', 'offensive'] },
    getBanList: mockGetBanList,
    addBanListWords: mockAddBanListWords,
    removeBanListWords: mockRemoveBanListWords,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

// Mock auth hook
vi.mock('../../../hooks/auth/useAuth', () => ({
  default: () => ({
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    user: { id: '1', name: 'Test User' },
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

const renderBanListSettings = () => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <NotificationProvider>
          <LoadingProvider>
            <BanListSettings />
          </LoadingProvider>
        </NotificationProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('BanListSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the ban list settings component', () => {
    renderBanListSettings();
    expect(screen.getByText(/ignoredWordsList/)).toBeInTheDocument();
  });

  it('displays the list of banned words', () => {
    renderBanListSettings();
    expect(screen.getByText('test1')).toBeInTheDocument();
    expect(screen.getByText('test2')).toBeInTheDocument();
    expect(screen.getByText('offensive')).toBeInTheDocument();
  });

  it('allows adding a new banned word', async () => {
    mockAddBanListWords.mockResolvedValueOnce({ words: ['test1', 'test2', 'offensive', 'newbadword'] });

    renderBanListSettings();
    
    // Type a new banned word
    const inputField = screen.getByPlaceholderText(/enterWordToIgnore/);
    fireEvent.change(inputField, { target: { value: 'newbadword' } });
    
    // Click the add button
    const addButton = screen.getByRole('button', { name: /add/ });
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockAddBanListWords).toHaveBeenCalledWith(['newbadword']);
    });
  });

  it('shows error when trying to add an empty word', async () => {
    renderBanListSettings();
    
    // Try to add an empty word
    const addButton = screen.getByRole('button', { name: /add/ });
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalled();
    });
  });

  it('shows error when trying to add a duplicate word', async () => {
    renderBanListSettings();
    
    // Try to add a word that already exists
    const inputField = screen.getByPlaceholderText(/enterWordToIgnore/);
    fireEvent.change(inputField, { target: { value: 'test1' } });
    
    const addButton = screen.getByRole('button', { name: /add/ });
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalled();
    });
  });

  it('allows removing a banned word', async () => {
    mockRemoveBanListWords.mockResolvedValueOnce({ words: ['test1', 'offensive'] });
    
    renderBanListSettings();
    
    // Find the remove button for test2
    const removeButtons = screen.getAllByTitle(/remove/);
    // Assuming the second button is for test2
    fireEvent.click(removeButtons[1]);
    
    await waitFor(() => {
      expect(mockRemoveBanListWords).toHaveBeenCalled();
    });
  });

  it('handles clearing all banned words', async () => {
    mockRemoveBanListWords.mockResolvedValueOnce({ words: [] });
    
    renderBanListSettings();
    
    // Click the clear all button
    const clearAllButton = screen.getByRole('button', { name: /clearAll/ });
    fireEvent.click(clearAllButton);
    
    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(mockRemoveBanListWords).toHaveBeenCalledWith(['test1', 'test2', 'offensive']);
    });
  });

  it('shows loading state when fetching ban list', () => {
    // Create a temporary mock for this specific test
    const useBanListMock = vi.fn().mockReturnValue({
      banList: null,
      getBanList: vi.fn(),
      addBanListWords: vi.fn(),
      removeBanListWords: vi.fn(),
      isLoading: true,
      error: null,
      clearError: vi.fn(),
    });
    
    // Override the mock for just this test
    vi.mocked(require('../../../hooks/settings/useBanList').default).mockImplementation(useBanListMock);
    
    renderBanListSettings();
    
    expect(screen.getByText(/removing/)).toBeInTheDocument();
  });

  it('shows empty state when no banned words', () => {
    // Create a temporary mock for this specific test
    const useBanListMock = vi.fn().mockReturnValue({
      banList: { words: [] },
      getBanList: vi.fn(),
      addBanListWords: vi.fn(),
      removeBanListWords: vi.fn(),
      isLoading: false,
      error: null,
      clearError: vi.fn(),
    });
    
    // Override the mock for just this test
    vi.mocked(require('../../../hooks/settings/useBanList').default).mockImplementation(useBanListMock);
    
    renderBanListSettings();
    
    expect(screen.getByText(/noIgnoredWords/)).toBeInTheDocument();
  });

  it('fetches ban list on initial render', () => {
    renderBanListSettings();
    
    expect(mockGetBanList).toHaveBeenCalled();
  });
}); 