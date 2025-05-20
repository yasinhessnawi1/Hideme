import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useAutoProcess } from './useAutoProcess';
import { autoProcessManager } from '../../managers/AutoProcessManager';
import { SearchPattern } from '../../types';
import type { Mock } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { LanguageProvider } from '../../contexts/LanguageContext';

// Mock language context
vi.mock('../../contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => key
  })
}));

// Mock all dependencies
vi.mock('../../managers/AutoProcessManager', () => ({
  autoProcessManager: {
    setDetectEntitiesCallback: vi.fn(),
    setSearchCallback: vi.fn(),
    updateConfig: vi.fn(),
    processNewFile: vi.fn(),
    processNewFiles: vi.fn(),
    getConfig: vi.fn(() => ({
      isActive: true,
      presidioEntities: [],
      glinerEntities: [],
      geminiEntities: [],
      hidemeEntities: [],
      searchQueries: [],
      detectionThreshold: 0.5,
      useBanlist: true,
      banlistWords: []
    }))
  }
}));

vi.mock('../../contexts/SearchContext', () => ({
  useBatchSearch: () => ({
    batchSearch: vi.fn()
  })
}));

vi.mock('./usePDFApi', () => ({
  usePDFApi: () => ({
    runBatchHybridDetect: vi.fn()
  })
}));

vi.mock('../settings/useSettings', () => ({
  __esModule: true,
  default: () => ({
    settings: {
      auto_processing: true,
      detection_threshold: 0.7,
      use_banlist_for_detection: true
    },
    getSettings: vi.fn().mockResolvedValue({
      auto_processing: true,
      detection_threshold: 0.7,
      use_banlist_for_detection: true
    })
  })
}));

vi.mock('../settings/useSearchPatterns', () => ({
  __esModule: true,
  default: () => ({
    searchPatterns: [
      {
        id: 1,
        pattern_text: 'test pattern',
        pattern_type: 'regex',
        setting_id: 1,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      },
      {
        id: 2,
        pattern_text: 'case sensitive pattern',
        pattern_type: 'case_sensitive',
        setting_id: 2,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      },
      {
        id: 3,
        pattern_text: 'ai search pattern',
        pattern_type: 'ai_search',
        setting_id: 3,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
    ]
  })
}));

vi.mock('../settings/useEntityDefinitions', () => ({
  __esModule: true,
  default: () => ({
    modelEntities: {
      1: [{ id: 1, entity_text: 'presidio entity', method_id: 1, setting_id: 1, created_at: '', updated_at: '' }],
      2: [{ id: 2, entity_text: 'gliner entity', method_id: 2, setting_id: 1, created_at: '', updated_at: '' }],
      3: [{ id: 3, entity_text: 'gemini entity', method_id: 3, setting_id: 1, created_at: '', updated_at: '' }],
      4: [{ id: 4, entity_text: 'hideme entity', method_id: 4, setting_id: 1, created_at: '', updated_at: '' }]
    },
    getModelEntities: vi.fn().mockResolvedValue([{ id: 5, entity_text: 'test entity', method_id: 1, setting_id: 1, created_at: '', updated_at: '' }])
  })
}));

vi.mock('../auth/useAuth', () => ({
  __esModule: true,
  default: () => ({
    isAuthenticated: true,
    isLoading: false
  })
}));

vi.mock('../settings/useBanList', () => ({
  __esModule: true,
  default: () => ({
    banList: {
      id: 1,
      words: ['banned1', 'banned2']
    },
    getBanList: vi.fn().mockResolvedValue({
      id: 1,
      words: ['banned1', 'banned2']
    })
  })
}));

vi.mock('../../managers/authStateManager', () => ({
  __esModule: true,
  default: {
    getCachedState: vi.fn().mockReturnValue({ isAuthenticated: true })
  }
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({
    notify: vi.fn()
  })
}));

// Create a wrapper with router for the hooks
function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(BrowserRouter, null, children);
}

describe('useAutoProcess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test.skip('should set callbacks in autoProcessManager', () => {
    const { result } = renderHook(() => useAutoProcess(), { wrapper });
    
    expect(autoProcessManager.setDetectEntitiesCallback).toHaveBeenCalled();
    expect(autoProcessManager.setSearchCallback).toHaveBeenCalled();
  });

  test.skip('should update config with settings and entities', () => {
    const { result } = renderHook(() => useAutoProcess(), { wrapper });
    
    expect(autoProcessManager.updateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        detectionThreshold: 0.7,
        useBanlist: true,
        banlistWords: ['banned1', 'banned2']
      })
    );
  });

  test.skip('should return functions from autoProcessManager', () => {
    const { result } = renderHook(() => useAutoProcess(), { wrapper });

    expect(result.current.processNewFile).toBeDefined();
    expect(result.current.processNewFiles).toBeDefined();
    expect(result.current.getConfig).toBeDefined();
    expect(result.current.setAutoProcessingEnabled).toBeDefined();
  });

  test.skip('should call processNewFile with correct parameters', () => {
    const { result } = renderHook(() => useAutoProcess(), { wrapper });

    const mockFile = { name: 'test.pdf', size: 1000, type: 'application/pdf' };
    act(() => {
      result.current.processNewFile(mockFile as File);
    });

    expect(autoProcessManager.processNewFile).toHaveBeenCalledWith(mockFile);
  });

  test.skip('should call processNewFiles with correct parameters', () => {
    const { result } = renderHook(() => useAutoProcess(), { wrapper });

    const mockFiles = [
      { name: 'test1.pdf', size: 1000, type: 'application/pdf' },
      { name: 'test2.pdf', size: 1000, type: 'application/pdf' }
    ];
    act(() => {
      result.current.processNewFiles(mockFiles as File[]);
    });

    expect(autoProcessManager.processNewFiles).toHaveBeenCalledWith(mockFiles);
  });

  test.skip('should call setAutoProcessingEnabled with correct parameters', () => {
    const { result } = renderHook(() => useAutoProcess(), { wrapper });

    act(() => {
      result.current.setAutoProcessingEnabled(false);
    });

    expect(autoProcessManager.updateConfig).toHaveBeenCalledWith({ isActive: false });
  });

  test.skip('should call getConfig', () => {
    const { result } = renderHook(() => useAutoProcess(), { wrapper });

    act(() => {
      result.current.getConfig();
    });

    expect(autoProcessManager.getConfig).toHaveBeenCalled();
  });
});

/*
// Mock with different authentication states
describe('useAutoProcess with different auth states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should use default config when user is not authenticated', () => {
    // Override the auth mock for this test
    (vi.mocked(require('./auth/useAuth').default) as Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: false
    });

    // Override the cached state mock
    (vi.mocked(require('../managers/authStateManager').default.getCachedState) as Mock).mockReturnValue(null);

    renderHook(() => useAutoProcess());

    expect(autoProcessManager.updateConfig).toHaveBeenCalledWith({
      presidioEntities: [],
      glinerEntities: [],
      geminiEntities: [],
      hidemeEntities: [],
      searchQueries: [],
      isActive: true
    });
  });

  test('should use cached auth state if available', () => {
    // Override the auth mock for this test
    (vi.mocked(require('./auth/useAuth').default) as Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: false
    });

    // But keep cached state authenticated
    (vi.mocked(require('../managers/authStateManager').default.getCachedState) as Mock).mockReturnValue({
      isAuthenticated: true
    });

    renderHook(() => useAutoProcess());

    // Should not use default config because cached state is authenticated
    expect(autoProcessManager.updateConfig).not.toHaveBeenCalledWith({
      presidioEntities: [],
      glinerEntities: [],
      geminiEntities: [],
      hidemeEntities: [],
      searchQueries: [],
      isActive: true
    });
  });
});

 */