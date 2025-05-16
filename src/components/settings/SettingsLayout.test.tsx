import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsLayout from './SettingsLayout';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

// Mock the language context to return predictable values for tests
vi.mock('../../contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useLanguage: () => ({
    t: (namespace: string, key: string) => {
      // Map keys to expected text for tests
      const translations: Record<string, string> = {
        'settings.generalSettings': 'General Settings',
        'settings.account': 'Account',
        'settings.entitiesList': 'Entities',
        'settings.searchList': 'Search',
        'settings.ignoreList': 'Ignore',
        'settings.loadingSettings': 'Loading settings',
        'settings.goBack': 'Go back',
        'settings.title': 'Settings',
        'settings.manageAccountSettings': 'Manage your account settings'
      };
      return translations[`${namespace}.${key}`] || key;
    },
    language: 'en',
    setLanguage: vi.fn(),
  })
}));

// Mock the settings hooks
vi.mock('../../hooks/settings/useSettings', () => ({
  default: () => ({
    isLoading: false,
    error: null,
    settings: { theme: 'light', autoProcessing: true },
    getSettings: vi.fn().mockResolvedValue({}),
  }),
}));

// Mock router hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock LoadingContext
let mockIsLoading = false;
vi.mock('../../contexts/LoadingContext', () => ({
  LoadingProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useLoading: () => ({
    isLoading: () => mockIsLoading,
    startLoading: vi.fn(),
    stopLoading: vi.fn(),
  }),
}));

// Mock all the tabs components
vi.mock('./tabs/GeneralSettings', () => ({
  default: () => <div data-testid="general-settings">General Settings</div>,
}));

vi.mock('./tabs/AccountSettings', () => ({
  default: () => <div data-testid="account-settings">Account Settings</div>,
}));

vi.mock('./tabs/EntitySettings', () => ({
  default: () => <div data-testid="entity-settings">Entity Settings</div>,
}));

vi.mock('./tabs/SearchSettings', () => ({
  default: () => <div data-testid="search-settings">Search Settings</div>,
}));

vi.mock('./tabs/BanListSettings', () => ({
  default: () => <div data-testid="banlist-settings">Ban List Settings</div>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <NotificationProvider>
          {ui}
        </NotificationProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('SettingsLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
  });

  it('renders the settings layout with title', () => {
    renderWithProviders(<SettingsLayout />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('should display the General settings tab by default', () => {
    renderWithProviders(<SettingsLayout />);
    expect(screen.getByTestId('general-settings')).toBeInTheDocument();
  });

  it('should switch to Account tab when clicked', () => {
    renderWithProviders(<SettingsLayout />);
    
    // Find the Account tab button by its text content
    const accountTab = screen.getByText('Account');
    fireEvent.click(accountTab);
    
    expect(screen.getByTestId('account-settings')).toBeInTheDocument();
  });

  it('should switch to Entity tab when clicked', () => {
    renderWithProviders(<SettingsLayout />);
    
    const entityTab = screen.getByText('Entities');
    fireEvent.click(entityTab);
    
    expect(screen.getByTestId('entity-settings')).toBeInTheDocument();
  });

  it('should switch to Search tab when clicked', () => {
    renderWithProviders(<SettingsLayout />);
    
    const searchTab = screen.getByText('Search');
    fireEvent.click(searchTab);
    
    expect(screen.getByTestId('search-settings')).toBeInTheDocument();
  });

  it('should switch to Ban List tab when clicked', () => {
    renderWithProviders(<SettingsLayout />);
    
    const banlistTab = screen.getByText('Ignore');
    fireEvent.click(banlistTab);
    
    expect(screen.getByTestId('banlist-settings')).toBeInTheDocument();
  });

  it('should handle the go back button', () => {
    renderWithProviders(<SettingsLayout />);
    
    const backButton = screen.getByLabelText('Go back');
    fireEvent.click(backButton);
    
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('should handle loading state', () => {
    mockIsLoading = true;

    renderWithProviders(<SettingsLayout />);
    
    expect(screen.getByText('Loading settings')).toBeInTheDocument();
    expect(screen.queryByTestId('general-settings')).not.toBeInTheDocument();
  });
}); 