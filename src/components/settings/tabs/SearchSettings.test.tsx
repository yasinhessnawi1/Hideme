import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchSettings from './SearchSettings';
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
const mockGetSearchPatterns = vi.fn().mockResolvedValue([]);
const mockCreateSearchPattern = vi.fn().mockResolvedValue({});
const mockDeleteSearchPattern = vi.fn().mockResolvedValue({});
const mockClearError = vi.fn();

// Mock the search patterns hook
vi.mock('../../../hooks/settings/useSearchPatterns', () => ({
  default: () => ({
    searchPatterns: [
      { id: 1, pattern_text: 'confidential', pattern_type: 'normal' },
      { id: 2, pattern_text: 'secret', pattern_type: 'case_sensitive' },
      { id: 3, pattern_text: 'account number', pattern_type: 'ai_search' },
    ],
    getSearchPatterns: mockGetSearchPatterns,
    createSearchPattern: mockCreateSearchPattern,
    deleteSearchPattern: mockDeleteSearchPattern,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

// Mock auth hook
vi.mock('../../../hooks/auth/useAuth', () => ({
  default: () => ({
    isAuthenticated: true,
    isLoading: false,
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

const renderSearchSettings = () => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <NotificationProvider>
          <LoadingProvider>
            <SearchSettings />
          </LoadingProvider>
        </NotificationProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('SearchSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the search settings component', () => {
    renderSearchSettings();
    expect(screen.getByText(/savedSearchTerms/)).toBeInTheDocument();
  });

  it('displays the list of search patterns', () => {
    renderSearchSettings();
    expect(screen.getByText('confidential')).toBeInTheDocument();
    expect(screen.getByText('secret')).toBeInTheDocument();
    expect(screen.getByText('account number')).toBeInTheDocument();
  });

  it('displays badges for different pattern types', () => {
    renderSearchSettings();
    
    // Case sensitive badge
    const caseSensitiveBadge = screen.getByText('Aa');
    expect(caseSensitiveBadge).toBeInTheDocument();
    
    // AI badge
    const aiBadge = screen.getByText('AI');
    expect(aiBadge).toBeInTheDocument();
  });

  it('allows adding a new search term', async () => {
    mockCreateSearchPattern.mockResolvedValueOnce({ 
      id: 4, 
      pattern_text: 'newterm',
      pattern_type: 'normal'
    });
    
    renderSearchSettings();
    
    // Type a new search term
    const inputField = screen.getByLabelText(/saveNewSearchTerm/);
    fireEvent.change(inputField, { target: { value: 'newterm' } });
    
    // Click the add button
    const addButton = screen.getByRole('button', { name: /addTerm/ });
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockCreateSearchPattern).toHaveBeenCalledWith({
        pattern_text: 'newterm',
        pattern_type: 'normal',
      });
    });
  });

  it('allows adding a case sensitive search term', async () => {
    mockCreateSearchPattern.mockResolvedValueOnce({ 
      id: 4, 
      pattern_text: 'casesensitive',
      pattern_type: 'case_sensitive'
    });
    
    renderSearchSettings();
    
    // Type a new search term
    const inputField = screen.getByLabelText(/saveNewSearchTerm/);
    fireEvent.change(inputField, { target: { value: 'casesensitive' } });
    
    // Toggle case sensitivity
    const caseSensitiveToggle = screen.getByLabelText(/caseSensitive/);
    fireEvent.click(caseSensitiveToggle);
    
    // Click the add button
    const addButton = screen.getByRole('button', { name: /addTerm/ });
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockCreateSearchPattern).toHaveBeenCalledWith({
        pattern_text: 'casesensitive',
        pattern_type: 'case_sensitive',
      });
    });
  });

  it('allows adding an AI search term', async () => {
    mockCreateSearchPattern.mockResolvedValueOnce({ 
      id: 4, 
      pattern_text: 'aisearch',
      pattern_type: 'ai_search'
    });
    
    renderSearchSettings();
    
    // Type a new search term
    const inputField = screen.getByLabelText(/saveNewSearchTerm/);
    fireEvent.change(inputField, { target: { value: 'aisearch' } });
    
    // Toggle AI search
    const aiSearchToggle = screen.getByLabelText(/aiSearch/);
    fireEvent.click(aiSearchToggle);
    
    // Click the add button
    const addButton = screen.getByRole('button', { name: /addTerm/ });
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockCreateSearchPattern).toHaveBeenCalledWith({
        pattern_text: 'aisearch',
        pattern_type: 'ai_search',
      });
    });
  });

  it('shows error when trying to add an empty search term', async () => {
    renderSearchSettings();
    
    // Try to add an empty search term
    const addButton = screen.getByRole('button', { name: /addTerm/ });
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalled();
    });
  });

  it('shows error when trying to add a duplicate search term', async () => {
    renderSearchSettings();
    
    // Try to add a search term that already exists
    const inputField = screen.getByLabelText(/saveNewSearchTerm/);
    fireEvent.change(inputField, { target: { value: 'confidential' } });
    
    const addButton = screen.getByRole('button', { name: /addTerm/ });
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalled();
    });
  });

  it('allows removing a search term', async () => {
    mockDeleteSearchPattern.mockResolvedValueOnce({});
    
    renderSearchSettings();
    
    // Find the remove button for 'secret'
    const removeButtons = screen.getAllByRole('button', { name: '' }); // The X buttons have no accessible name
    // Click the second remove button (for 'secret')
    fireEvent.click(removeButtons[1]); 
    
    await waitFor(() => {
      expect(mockDeleteSearchPattern).toHaveBeenCalledWith(2); // ID of 'secret'
    });
  });

  it('handles clearing all search terms', async () => {
    mockDeleteSearchPattern.mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockResolvedValueOnce({});
    
    renderSearchSettings();
    
    // Click the clear all button
    const clearAllButton = screen.getByRole('button', { name: /clearAll/ });
    fireEvent.click(clearAllButton);
    
    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      // Should call deleteSearchPattern for each pattern
      expect(mockDeleteSearchPattern).toHaveBeenCalledTimes(3);
    });
  });

  it('shows loading state when fetching patterns', () => {
    // Mock auth loading state specifically for this test
    vi.mock('../../../hooks/auth/useAuth', () => ({
      default: () => ({
        isAuthenticated: true,
        isLoading: true, // Set to loading
        user: { id: '1', name: 'Test User' },
      }),
    }));
    
    renderSearchSettings();
    
    expect(screen.getByText(/loading/)).toBeInTheDocument();
  });

  it('shows empty state when no search terms', () => {
    // Create a temporary mock
    const useSearchPatternsMock = vi.fn().mockReturnValue({
      searchPatterns: [],
      getSearchPatterns: vi.fn(),
      createSearchPattern: vi.fn(),
      deleteSearchPattern: vi.fn(),
      isLoading: false,
      error: null,
      clearError: vi.fn(),
    });
    
    // Override the mock for just this test
    vi.mocked(require('../../../hooks/settings/useSearchPatterns').default).mockImplementation(useSearchPatternsMock);
    
    renderSearchSettings();
    
    expect(screen.getByText(/noSavedSearchTerms/)).toBeInTheDocument();
  });

  it('fetches search patterns on initial render', () => {
    renderSearchSettings();
    
    expect(mockGetSearchPatterns).toHaveBeenCalled();
  });
}); 