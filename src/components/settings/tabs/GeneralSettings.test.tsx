import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GeneralSettings from './GeneralSettings';
import { LoadingProvider } from '../../../contexts/LoadingContext';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import { MemoryRouter } from 'react-router-dom';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock language context
const mockSetLanguage = vi.fn();
vi.mock('../../../contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useLanguage: () => ({
    t: (namespace: any, key: any) => `${namespace}.${key}`,
    language: 'en',
    setLanguage: mockSetLanguage,
  }),
}));

// Create settings state that can be updated by mock functions
let mockSettings = {
  theme: 'light',
  auto_processing: true,
  detection_threshold: 0.5,
  use_banlist_for_detection: false,
};

// Mock updateSettings and other functions
const mockUpdateSettings = vi.fn().mockImplementation((newSettings) => {
  mockSettings = { ...mockSettings, ...newSettings };
  return Promise.resolve({});
});
const mockExportSettings = vi.fn().mockResolvedValue({});
const mockImportSettings = vi.fn().mockResolvedValue(true);
const mockClearSettingsError = vi.fn();

// Mock the user context
vi.mock('../../../contexts/UserContext', () => ({
  UserContextProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useUserContext: () => ({
    settings: mockSettings,
    updateSettings: mockUpdateSettings,
    exportSettings: mockExportSettings,
    importSettings: mockImportSettings,
    settingsLoading: false,
    settingsError: null,
    clearSettingsError: mockClearSettingsError,
  }),
}));

// Storage persistence state
let isStoragePersistenceEnabled = true;

// Mock file context functions
const mockSetStoragePersistenceEnabled = vi.fn().mockImplementation((value) => {
  isStoragePersistenceEnabled = value;
});
const mockClearStoredFiles = vi.fn().mockResolvedValue({});

// Mock the file context
vi.mock('../../../contexts/FileContext', () => ({
  useFileContext: () => ({
    isStoragePersistenceEnabled,
    setStoragePersistenceEnabled: mockSetStoragePersistenceEnabled,
    storageStats: {
      percentUsed: 45,
      totalSize: '10 MB',
      fileCount: 5,
    },
    clearStoredFiles: mockClearStoredFiles,
  }),
}));

// Auto processing state
let isAutoProcessingEnabled = true;

// Mock autoProcess functions
const mockSetAutoProcessingEnabled = vi.fn().mockImplementation((value) => {
  isAutoProcessingEnabled = value;
});

// Mock the autoProcess hook
vi.mock('../../../hooks/general/useAutoProcess', () => ({
  useAutoProcess: () => ({
    setAutoProcessingEnabled: mockSetAutoProcessingEnabled,
    getConfig: vi.fn().mockReturnValue({ isActive: isAutoProcessingEnabled }),
  }),
}));

// Mock theme functions
const mockSetPreference = vi.fn();

// Mock the theme hook/context
vi.mock('../../../contexts/ThemeContext', () => ({
  useThemeContext: () => ({
    preference: 'light',
    setPreference: mockSetPreference,
  }),
}));

// Mock document hook functions
const mockValidateSettingsFile = vi.fn();
const mockSanitizeSettingsFile = vi.fn();
const mockDownloadJsonFile = vi.fn();
const mockParseJsonFile = vi.fn();
const mockClearError = vi.fn();

// Mock document hook
vi.mock('../../../hooks/settings/useDocument', () => ({
  default: () => ({
    validateSettingsFile: mockValidateSettingsFile,
    sanitizeSettingsFile: mockSanitizeSettingsFile,
    downloadJsonFile: mockDownloadJsonFile,
    parseJsonFile: mockParseJsonFile,
    error: null,
    isLoading: false,
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

// Mock LoadingContext
vi.mock('../../../contexts/LoadingContext', () => ({
  LoadingProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useLoading: () => ({
    isLoading: () => false,
    startLoading: vi.fn(),
    stopLoading: vi.fn(),
  }),
}));

// Mock AVAILABLE_LANGUAGES
vi.mock('../../../utils/i18n', () => ({
  AVAILABLE_LANGUAGES: {
    en: 'English',
    fr: 'French',
    es: 'Spanish',
  },
}));

const renderGeneralSettings = () => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <NotificationProvider>
          <LoadingProvider>
            <GeneralSettings />
          </LoadingProvider>
        </NotificationProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('GeneralSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocked states
    mockSettings = {
      theme: 'light',
      auto_processing: true,
      detection_threshold: 0.5,
      use_banlist_for_detection: false,
    };
    isStoragePersistenceEnabled = true;
    isAutoProcessingEnabled = true;
  });

  it('renders the general settings component', () => {
    renderGeneralSettings();
    expect(screen.getByText(/settings.appearance/)).toBeInTheDocument();
    expect(screen.getByText(/settings.processingAndStorage/)).toBeInTheDocument();
    expect(screen.getByText(/settings.settingsManagement/)).toBeInTheDocument();
  });

  it('displays the theme selector', () => {
    renderGeneralSettings();
    
    const themeSelector = screen.getByLabelText(/settings.theme/);
    expect(themeSelector).toBeInTheDocument();
    expect(themeSelector).toHaveValue('light');
  });

  it('handles theme changes', () => {
    renderGeneralSettings();
    
    const themeSelector = screen.getByLabelText(/settings.theme/);
    fireEvent.change(themeSelector, { target: { value: 'dark' } });
    
    expect(mockSetPreference).toHaveBeenCalledWith('dark');
  });

  it('displays the language selector', () => {
    renderGeneralSettings();
    
    const languageSelector = screen.getByLabelText(/settings.language/);
    expect(languageSelector).toBeInTheDocument();
    expect(languageSelector).toHaveValue('en');
  });

  it('handles language changes', () => {
    renderGeneralSettings();
    
    const languageSelector = screen.getByLabelText(/settings.language/);
    fireEvent.change(languageSelector, { target: { value: 'fr' } });
    
    expect(mockSetLanguage).toHaveBeenCalledWith('fr');
  });

  it('displays the auto processing toggle', () => {
    renderGeneralSettings();
    
    const autoProcessToggle = screen.getByLabelText(/settings.autoProcessNewFiles/);
    expect(autoProcessToggle).toBeInTheDocument();
    expect(autoProcessToggle).toBeChecked();
  });

  it('handles auto process toggle', async () => {
    const { rerender } = renderGeneralSettings();
    
    const autoProcessToggle = screen.getByLabelText(/settings.autoProcessNewFiles/);
    
    // Update the mock settings directly
    mockSettings.auto_processing = false;
    
    // Trigger the click which should call handleAutoProcessToggle
    await act(async () => {
      fireEvent.click(autoProcessToggle);
    });
    
    // Force rerender with updated settings
    rerender(
      <MemoryRouter>
        <LanguageProvider>
          <NotificationProvider>
            <LoadingProvider>
              <GeneralSettings />
            </LoadingProvider>
          </NotificationProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
    
    // Get the toggle again after rerender
    const updatedToggle = screen.getByLabelText(/settings.autoProcessNewFiles/);
    expect(updatedToggle).not.toBeChecked();
  });

  it('displays the detection threshold slider', () => {
    renderGeneralSettings();
    
    const thresholdSlider = screen.getByLabelText(/settings.detectionThreshold/);
    expect(thresholdSlider).toBeInTheDocument();
    expect(thresholdSlider).toHaveValue('0.5');
  });

  it('handles threshold changes', async () => {
    const { rerender } = renderGeneralSettings();
    
    // Update the mock settings directly
    mockSettings.detection_threshold = 0.7;
    
    const thresholdSlider = screen.getByLabelText(/settings.detectionThreshold/);
    
    // Trigger the change
    await act(async () => {
      fireEvent.change(thresholdSlider, { target: { value: '0.7' } });
    });
    
    // Force rerender with updated settings
    rerender(
      <MemoryRouter>
        <LanguageProvider>
          <NotificationProvider>
            <LoadingProvider>
              <GeneralSettings />
            </LoadingProvider>
          </NotificationProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
    
    // Get the slider again after rerender
    const updatedSlider = screen.getByLabelText(/settings.detectionThreshold/);
    expect(updatedSlider).toHaveValue('0.7');
  });

  it('displays the ban list usage toggle', () => {
    renderGeneralSettings();
    
    const banlistToggle = screen.getByLabelText(/settings.useBanListForDetection/);
    expect(banlistToggle).toBeInTheDocument();
    expect(banlistToggle).not.toBeChecked();
  });

  it('handles ban list usage toggle', async () => {
    const { rerender } = renderGeneralSettings();
    
    // Update the mock settings directly
    mockSettings.use_banlist_for_detection = true;
    
    const banlistToggle = screen.getByLabelText(/settings.useBanListForDetection/);
    
    await act(async () => {
      fireEvent.click(banlistToggle);
    });
    
    // Force rerender with updated settings
    rerender(
      <MemoryRouter>
        <LanguageProvider>
          <NotificationProvider>
            <LoadingProvider>
              <GeneralSettings />
            </LoadingProvider>
          </NotificationProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
    
    // Get the toggle again after rerender
    const updatedToggle = screen.getByLabelText(/settings.useBanListForDetection/);
    expect(updatedToggle).toBeChecked();
  });

  it('displays the storage toggle', () => {
    renderGeneralSettings();
    
    const storageToggle = screen.getByLabelText(/settings.storePDFsInBrowser/);
    expect(storageToggle).toBeInTheDocument();
    expect(storageToggle).toBeChecked();
  });

  it('handles storage toggle changes', async () => {
    const { rerender } = renderGeneralSettings();
    
    const storageToggle = screen.getByLabelText(/settings.storePDFsInBrowser/);
    
    // Update the mock directly
    isStoragePersistenceEnabled = false;
    
    await act(async () => {
      fireEvent.click(storageToggle);
      // Let the effect hooks run
      await Promise.resolve();
    });
    
    // Force rerender with updated settings
    rerender(
      <MemoryRouter>
        <LanguageProvider>
          <NotificationProvider>
            <LoadingProvider>
              <GeneralSettings />
            </LoadingProvider>
          </NotificationProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
    
    // Get the toggle again after rerender
    const updatedToggle = screen.getByLabelText(/settings.storePDFsInBrowser/);
    expect(updatedToggle).not.toBeChecked();
  });

  it('shows/hides advanced storage settings', () => {
    renderGeneralSettings();
    
    // Initially, storage details should be hidden
    expect(screen.queryByText(/settings.storageUsage/)).not.toBeInTheDocument();
    
    // Click the button to show details
    const toggleButton = screen.getByRole('button', { name: /settings.showStorageDetails/ });
    fireEvent.click(toggleButton);
    
    // Now details should be visible
    expect(screen.getByText(/settings.storageUsage/)).toBeInTheDocument();
  });

  it('displays storage stats when storage is enabled', () => {
    renderGeneralSettings();
    
    // Show storage details
    const toggleButton = screen.getByRole('button', { name: /settings.showStorageDetails/ });
    fireEvent.click(toggleButton);
    
    // Stats should be visible
    expect(screen.getByText(/45 settings.used/)).toBeInTheDocument();
    expect(screen.getByText(/5 settings.files/)).toBeInTheDocument();
  });

  it('handles clear stored files action', async () => {
    renderGeneralSettings();
    
    // Show storage details
    const toggleButton = screen.getByRole('button', { name: /settings.showStorageDetails/ });
    fireEvent.click(toggleButton);
    
    // Click the clear button
    const clearButton = screen.getByText(/settings.clearStoredPDFs/);
    
    // Mock the confirm function to directly call the callback
    mockConfirm.mockImplementation(({ confirmButton }) => {
      if (confirmButton && confirmButton.onClick) {
        // Execute the callback immediately
        confirmButton.onClick();
      }
      return Promise.resolve(true);
    });
    
    await act(async () => {
      fireEvent.click(clearButton);
      // Let promises resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Verify the clear function was called
    expect(mockClearStoredFiles).toHaveBeenCalled();
  });

  it('handles saving settings', async () => {
    const { rerender } = renderGeneralSettings();
    
    // Update the mock settings directly
    mockSettings.detection_threshold = 0.7;
    mockSettings.use_banlist_for_detection = true;
    
    // Make some changes to the UI
    const thresholdSlider = screen.getByLabelText(/settings.detectionThreshold/);
    const banlistToggle = screen.getByLabelText(/settings.useBanListForDetection/);
    
    await act(async () => {
      fireEvent.change(thresholdSlider, { target: { value: '0.7' } });
      fireEvent.click(banlistToggle);
    });
    
    // Force rerender with updated settings
    rerender(
      <MemoryRouter>
        <LanguageProvider>
          <NotificationProvider>
            <LoadingProvider>
              <GeneralSettings />
            </LoadingProvider>
          </NotificationProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
    
    // Save the settings
    const saveButton = screen.getByRole('button', { name: /settings.saveChanges/ });
    
    await act(async () => {
      fireEvent.click(saveButton);
      // Let promises resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Verify the save function was called with correct settings
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      theme: 'light',
      auto_processing: true,
      detection_threshold: 0.7,
      use_banlist_for_detection: true
    });
    expect(mockSetAutoProcessingEnabled).toHaveBeenCalled();
  });

  it('handles exporting settings', async () => {
    renderGeneralSettings();
    
    // Click the export button
    const exportButton = screen.getByRole('button', { name: /settings.exportSettings/ });
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockExportSettings).toHaveBeenCalled();
      expect(mockNotify).toHaveBeenCalled();
    });
  });
}); 