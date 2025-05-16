import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EntitySettings from './EntitySettings';
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
const mockGetModelEntities = vi.fn().mockResolvedValue([]);
const mockReplaceModelEntities = vi.fn().mockResolvedValue({});
const mockClearError = vi.fn();

// Mock the entity definitions hook
vi.mock('../../../hooks/settings/useEntityDefinitions', () => ({
  default: () => ({
    modelEntities: {
      presidio: [{ entity_text: 'PERSON', entity_type: 'PERSON' }],
      gliner: [{ entity_text: 'NAME', entity_type: 'NAME' }],
      gemini: [{ entity_text: 'EMAIL', entity_type: 'EMAIL' }],
      hideme: [{ entity_text: 'ADDRESS', entity_type: 'ADDRESS' }],
    },
    getModelEntities: mockGetModelEntities,
    replaceModelEntities: mockReplaceModelEntities,
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

// Mock the METHOD_ID_MAP and other utility functions
vi.mock('../../../utils/EntityUtils', () => ({
  entitiesToOptions: vi.fn().mockImplementation((selected, options) => {
    return selected.map((s: any) => ({ entity_text: s, entity_type: s }));
  }),
  getGeminiOptions: () => [
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Phone' },
  ],
  getGlinerOptions: () => [
    { value: 'NAME', label: 'Name' },
    { value: 'LOCATION', label: 'Location' },
  ],
  getPresidioOptions: () => [
    { value: 'PERSON', label: 'Person' },
    { value: 'ORGANIZATION', label: 'Organization' },
  ],
  getHidemeOptions: () => [
    { value: 'ADDRESS', label: 'Address' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
  ],
  getColorDotStyle: () => ({ backgroundColor: '#ff0000' }),
  METHOD_ID_MAP: {
    presidio: 'presidio',
    gliner: 'gliner',
    gemini: 'gemini',
    hideme: 'hideme',
  },
  MODEL_COLORS: {
    presidio: '#ff0000',
    gliner: '#00ff00',
    gemini: '#0000ff',
    hideme: '#ffff00',
  },
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

const renderEntitySettings = () => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <NotificationProvider>
          <LoadingProvider>
            <EntitySettings />
          </LoadingProvider>
        </NotificationProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('EntitySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the entity settings component', () => {
    renderEntitySettings();
    expect(screen.getByText(/detectionSettings/)).toBeInTheDocument();
  });

  it('displays the accordions for all entity types', () => {
    renderEntitySettings();
    expect(screen.getByText(/presidio/i)).toBeInTheDocument();
    expect(screen.getByText(/gliner/i)).toBeInTheDocument();
    expect(screen.getByText(/gemini/i)).toBeInTheDocument();
    expect(screen.getByText(/hideme/i)).toBeInTheDocument();
  });

  it('toggles accordion visibility when clicked', () => {
    renderEntitySettings();
    
    // Initially all accordions should be open
    const presidioContent = screen.getByText(/Person/i).closest('.accordion-content');
    expect(presidioContent).toHaveClass('open');
    
    // Click the presidio accordion header to close it
    const presidioHeader = screen.getByText(/presidio/i).closest('button');
    if (presidioHeader) {
      fireEvent.click(presidioHeader);
    } else {
      throw new Error('Presidio header button not found');
    }
    
    // Accordion should now be closed
    expect(presidioContent).not.toHaveClass('open');
  });

  it('allows selecting entity options', () => {
    renderEntitySettings();
    
    // Find an unchecked checkbox in the presidio section and click it
    const orgCheckbox = screen.getByLabelText(/organization/i);
    expect(orgCheckbox).not.toBeChecked();
    
    fireEvent.click(orgCheckbox);
    
    // Now it should be checked
    expect(orgCheckbox).toBeChecked();
  });

  it('allows deselecting entity options', () => {
    renderEntitySettings();
    
    // Find a checked checkbox and uncheck it
    const personCheckbox = screen.getByLabelText(/person/i);
    expect(personCheckbox).toBeChecked();
    
    fireEvent.click(personCheckbox);
    
    // Now it should be unchecked
    expect(personCheckbox).not.toBeChecked();
  });

  it('handles select all button', () => {
    renderEntitySettings();
    
    // Find select all button for presidio and click it
    const selectAllButtons = screen.getAllByRole('button', { name: /selectAll/ });
    fireEvent.click(selectAllButtons[0]);
    
    // All checkboxes in that section should be checked
    const presidioCheckboxes = screen.getAllByLabelText(/(person|organization)/i);
    presidioCheckboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked();
    });
  });

  it('handles deselect all button', () => {
    renderEntitySettings();
    
    // Find deselect all button for presidio and click it
    const deselectAllButtons = screen.getAllByRole('button', { name: /deselectAll/ });
    fireEvent.click(deselectAllButtons[0]);
    
    // All checkboxes in that section should be unchecked
    const presidioCheckboxes = screen.getAllByLabelText(/(person|organization)/i);
    presidioCheckboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it('saves entity settings', async () => {
    mockReplaceModelEntities.mockResolvedValueOnce({});
    
    renderEntitySettings();
    
    // Make some changes to entities
    const personCheckbox = screen.getByLabelText(/person/i);
    fireEvent.click(personCheckbox); // Uncheck
    
    const emailCheckbox = screen.getByLabelText(/email/i);
    fireEvent.click(emailCheckbox); // Uncheck
    
    // Click save button
    const saveButton = screen.getByRole('button', { name: /saveChanges/ });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockReplaceModelEntities).toHaveBeenCalled();
      expect(mockNotify).toHaveBeenCalled();
    });
  });

  it('loads entity data on component mount', () => {
    renderEntitySettings();
    
    // Should call getModelEntities for each entity type
    expect(mockGetModelEntities).toHaveBeenCalledTimes(4);
  });

  it('shows loading state', () => {
    // Create a temporary mock for loading state
    const useEntityDefinitionsMock = vi.fn().mockReturnValue({
      modelEntities: {},
      getModelEntities: vi.fn(),
      replaceModelEntities: vi.fn(),
      isLoading: true,
      error: null,
      clearError: vi.fn(),
    });
    
    // Override the mock for just this test
    vi.mocked(require('../../../hooks/settings/useEntityDefinitions').default).mockImplementation(useEntityDefinitionsMock);
    
    renderEntitySettings();
    
    expect(screen.getByText(/loadingSettings/)).toBeInTheDocument();
  });

  it('dispatches settings-changed event when saving', async () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    mockReplaceModelEntities.mockResolvedValueOnce({});
    
    renderEntitySettings();
    
    // Click save button
    const saveButton = screen.getByRole('button', { name: /saveChanges/ });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      const eventArg = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(eventArg.type).toBe('settings-changed');
      expect(eventArg.detail.type).toBe('entity');
    });
  });
}); 