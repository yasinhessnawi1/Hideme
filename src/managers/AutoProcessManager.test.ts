import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutoProcessManager, ProcessingConfig } from './AutoProcessManager';
import { getFileKey } from '../contexts/PDFViewerContext';
import processingStateService from '../services/client-services/ProcessingStateService';
import { highlightStore } from "../store/HighlightStore";
import summaryPersistenceStore from "../store/SummaryPersistenceStore";
import { HighlightType } from '../types';

// Mock dependencies
vi.mock('../contexts/PDFViewerContext', () => ({
  getFileKey: vi.fn((file) => `key-${file.name}`)
}));

vi.mock('../services/client-services/ProcessingStateService', () => ({
  default: {
    startProcessing: vi.fn(),
    updateProcessingInfo: vi.fn(),
    completeProcessing: vi.fn(),
    getProcessingInfo: vi.fn()
  }
}));

vi.mock('../store/HighlightStore', () => ({
  highlightStore: {
    getHighlightsByType: vi.fn(),
    removeHighlightsByType: vi.fn(),
    addMultipleHighlights: vi.fn()
  }
}));

vi.mock('../store/SummaryPersistenceStore', () => ({
  default: {
    getAnalyzedFiles: vi.fn().mockImplementation(() => new Set()),
    addAnalyzedFile: vi.fn(),
    getFileSummaries: vi.fn().mockReturnValue([]),
    updateFileSummary: vi.fn()
  }
}));

describe('AutoProcessManager', () => {
  let manager: AutoProcessManager;
  let mockDetectEntitiesCallback: any;
  let mockSearchCallback: any;
  
  // Mock files for testing
  const createMockFiles = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      name: `file-${i}.pdf`,
      size: 1000 + (i * 100),
      type: 'application/pdf',
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(500))
    } as unknown as File));
  };

  // Mock CustomEvent for testing
  const originalAddEventListener = window.addEventListener;
  const customEvents: Map<string, Function> = new Map();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the singleton instance
    vi.spyOn(AutoProcessManager as any, 'instance', 'set').mockImplementation(() => {});
    (AutoProcessManager as any).instance = null;
    
    manager = AutoProcessManager.getInstance();
    
    // Setup mocks
    mockDetectEntitiesCallback = vi.fn().mockResolvedValue({
      'file-0.pdf': {
        entities_detected: { total: 5 },
        performance: { entity_density: 0.01 },
        pages: [{ sensitive: [] }]
      }
    });
    
    mockSearchCallback = vi.fn().mockResolvedValue({});
    
    manager.setDetectEntitiesCallback(mockDetectEntitiesCallback);
    manager.setSearchCallback(mockSearchCallback);
    
    // Default config with some entities and search queries
    const config: Partial<ProcessingConfig> = {
      presidioEntities: [{ label: 'PERSON', value: 'PERSON' }],
      glinerEntities: [],
      geminiEntities: [],
      hidemeEntities: [],
      searchQueries: [{ term: 'confidential', case_sensitive: false, ai_search: false }],
      isActive: true,
      detectionThreshold: 0.5
    };
    
    manager.updateConfig(config);
    
    // Mock window event listeners for CustomEvents
    window.addEventListener = vi.fn((event, callback) => {
      customEvents.set(event, callback as Function);
    });
    
    // Mock highlight store responses
    vi.mocked(highlightStore.getHighlightsByType).mockReturnValue([]);
    
    // Mock summary persistence store
    vi.mocked(summaryPersistenceStore.getAnalyzedFiles).mockReturnValue(new Set());
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.addEventListener = originalAddEventListener;
    customEvents.clear();
  });

  describe('getInstance', () => {
    test('should return singleton instance', () => {
      // Act
      const instance1 = AutoProcessManager.getInstance();
      const instance2 = AutoProcessManager.getInstance();
      
      // Assert
      expect(instance1).toBe(instance2);
    });
  });

  describe('updateConfig', () => {
    test('should update configuration properties', () => {
      // Arrange
      const newConfig: Partial<ProcessingConfig> = {
        presidioEntities: [{ label: 'EMAIL', value: 'EMAIL' }],
        searchQueries: [
          { term: 'secret', case_sensitive: true, ai_search: false },
          { term: 'confidential', case_sensitive: false, ai_search: true }
        ],
        detectionThreshold: 0.8
      };
      
      // Act
      manager.updateConfig(newConfig);
      const config = manager.getConfig();
      
      // Assert
      expect(config.presidioEntities).toEqual([{ label: 'EMAIL', value: 'EMAIL' }]);
      expect(config.searchQueries).toHaveLength(2);
      expect(config.searchQueries[0].term).toBe('secret');
      expect(config.detectionThreshold).toBe(0.8);
      
      // Ensure properties not in newConfig remain unchanged
      expect(config.isActive).toBe(true);
      expect(config.glinerEntities).toEqual([]);
    });
    
    test('should handle partial updates', () => {
      // Arrange
      const initialConfig = manager.getConfig();
      const partialUpdate: Partial<ProcessingConfig> = {
        isActive: false
      };
      
      // Act
      manager.updateConfig(partialUpdate);
      const updatedConfig = manager.getConfig();
      
      // Assert
      expect(updatedConfig.isActive).toBe(false);
      expect(updatedConfig.presidioEntities).toEqual(initialConfig.presidioEntities);
      expect(updatedConfig.searchQueries).toEqual(initialConfig.searchQueries);
    });
  });

  describe('processNewFile', () => {
    test('should skip processing when auto-processing is disabled', async () => {
      // Arrange
      manager.updateConfig({ isActive: false });
      const mockFile = createMockFiles(1)[0];
      
      // Act
      const result = await manager.processNewFile(mockFile);
      
      // Assert
      expect(result).toBe(false);
      expect(mockDetectEntitiesCallback).not.toHaveBeenCalled();
      expect(mockSearchCallback).not.toHaveBeenCalled();
    });
    
    test('should skip processing for already processed files', async () => {
      // Arrange
      const mockFile = createMockFiles(1)[0];
      const fileKey = getFileKey(mockFile);
      
      // Mock files as already analyzed
      vi.mocked(summaryPersistenceStore.getAnalyzedFiles).mockImplementation((type) => {
        return new Set([fileKey]);
      });
      
      // Act
      const result = await manager.processNewFile(mockFile);
      
      // Assert
      expect(result).toBe(false);
      expect(mockDetectEntitiesCallback).not.toHaveBeenCalled();
      expect(mockSearchCallback).not.toHaveBeenCalled();
    });
    
    test('should process new file with entity detection and search', async () => {
      // Arrange
      const mockFile = createMockFiles(1)[0];
      const fileKey = getFileKey(mockFile);
      
      // Act
      const result = await manager.processNewFile(mockFile);
      
      // Assert
      expect(result).toBe(true);
      expect(mockDetectEntitiesCallback).toHaveBeenCalledWith([mockFile], expect.objectContaining({
        presidio: ['PERSON'],
        threshold: 0.5
      }));
      expect(mockSearchCallback).toHaveBeenCalled();
      expect(processingStateService.startProcessing).toHaveBeenCalled();
      expect(processingStateService.completeProcessing).toHaveBeenCalledWith(fileKey, true);
      expect(summaryPersistenceStore.addAnalyzedFile).toHaveBeenCalledTimes(2);
    });
    
    test('should handle entity detection errors', async () => {
      // Arrange
      const mockFile = createMockFiles(1)[0];
      const fileKey = getFileKey(mockFile);
      
      mockDetectEntitiesCallback.mockRejectedValueOnce(new Error('Detection failed'));
      
      // Act
      const result = await manager.processNewFile(mockFile);
      
      // Assert
      expect(result).toBe(false);
      expect(mockDetectEntitiesCallback).toHaveBeenCalled();
      expect(processingStateService.completeProcessing).toHaveBeenCalledWith(fileKey, false);
    });
    
    test('should skip entity detection if file already has entity highlights', async () => {
      // Arrange
      const mockFile = createMockFiles(1)[0];
      const fileKey = getFileKey(mockFile);
      
      // Mock existing entity highlights
      vi.mocked(highlightStore.getHighlightsByType).mockImplementation((key, type) => {
        if (key === fileKey && type === HighlightType.ENTITY) {
          return [{ id: 'highlight-1' }] as any;
        }
        return [];
      });
      
      // Mock file as already analyzed for entity detection
      vi.mocked(summaryPersistenceStore.getAnalyzedFiles).mockImplementation((type) => {
        if (type === 'entity') return new Set([fileKey]);
        return new Set();
      });
      
      // Act
      await manager.processNewFile(mockFile);
      
      // Assert
      expect(mockDetectEntitiesCallback).not.toHaveBeenCalled(); // Should skip entity detection
      expect(mockSearchCallback).toHaveBeenCalled(); // But still do search processing
    });
  });

  describe('processNewFiles', () => {
    test('should skip processing when auto-processing is disabled', async () => {
      // Arrange
      manager.updateConfig({ isActive: false });
      const mockFiles = createMockFiles(2);
      
      // Act
      const successCount = await manager.processNewFiles(mockFiles);
      
      // Assert
      expect(successCount).toBe(0);
      expect(mockDetectEntitiesCallback).not.toHaveBeenCalled();
      expect(mockSearchCallback).not.toHaveBeenCalled();
    });
    
    test('should process multiple files in batch', async () => {
      // Arrange
      const mockFiles = createMockFiles(2);
      
      // Act
      const successCount = await manager.processNewFiles(mockFiles);
      
      // Assert
      expect(successCount).toBeGreaterThan(0);
      expect(mockDetectEntitiesCallback).toHaveBeenCalled();
      expect(mockSearchCallback).toHaveBeenCalled();
      expect(processingStateService.startProcessing).toHaveBeenCalledTimes(2);
      expect(processingStateService.completeProcessing).toHaveBeenCalledTimes(2);
    });
    
    test('should skip already processed files', async () => {
      // Arrange
      const mockFiles = createMockFiles(3);
      const fileKey1 = getFileKey(mockFiles[0]);
      
      // Mock first file as already processed for both entity and search
      vi.mocked(summaryPersistenceStore.getAnalyzedFiles).mockImplementation((type) => {
        return new Set([fileKey1]);
      });
      
      // Act
      const successCount = await manager.processNewFiles(mockFiles);
      
      // Assert
      // Should only process 2 files, not 3
      expect(processingStateService.startProcessing).toHaveBeenCalledTimes(2);
    });
    
    test('should handle batch entity detection errors gracefully', async () => {
      // Arrange
      const mockFiles = createMockFiles(2);
      mockDetectEntitiesCallback.mockRejectedValueOnce(new Error('Batch detection failed'));
      
      // Act
      await manager.processNewFiles(mockFiles);
      
      // Assert
      expect(mockDetectEntitiesCallback).toHaveBeenCalled();
      expect(processingStateService.completeProcessing).toHaveBeenCalledWith(expect.any(String), false);
      
      // Should still try to do search processing
      expect(mockSearchCallback).toHaveBeenCalled();
    });
  });
});
