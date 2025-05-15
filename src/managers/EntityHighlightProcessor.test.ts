import { describe, test, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { EntityHighlightProcessor } from './EntityHighlightProcessor';
import { HighlightType } from '../types';
import { highlightStore } from '../store/HighlightStore';
import processingStateService from '../services/client-services/ProcessingStateService';
import summaryPersistenceStore from '../store/SummaryPersistenceStore';

// Mock dependencies
vi.mock('../store/HighlightStore', () => ({
  highlightStore: {
    removeHighlightsByType: vi.fn().mockResolvedValue(true),
    addMultipleHighlights: vi.fn()
  }
}));

vi.mock('../services/client-services/ProcessingStateService', () => ({
  default: {
    completeProcessing: vi.fn()
  }
}));

vi.mock('../store/SummaryPersistenceStore', () => ({
  default: {
    addAnalyzedFile: vi.fn(),
    updateFileSummary: vi.fn()
  }
}));

// Mock console.log to prevent noisy output
const originalConsoleLog = console.log;
console.log = vi.fn();

describe('EntityHighlightProcessor', () => {
  // Mock window.dispatchEvent
  const originalDispatchEvent = window.dispatchEvent;
  let dispatchEventSpy: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset addMultipleHighlights mock for each test
    vi.mocked(highlightStore.addMultipleHighlights).mockImplementation((highlights) => {
      return Promise.resolve(highlights.map(h => h.id || 'generated-id'));
    });
    
    // Mock window.dispatchEvent
    dispatchEventSpy = vi.fn();
    window.dispatchEvent = dispatchEventSpy;
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    window.dispatchEvent = originalDispatchEvent;
  });
  
  // Restore console.log after all tests
  afterAll(() => {
    console.log = originalConsoleLog;
  });
  
  describe('processDetectionResults', () => {
    test('should handle empty detection results', async () => {
      // Act
      const result = await EntityHighlightProcessor.processDetectionResults(
        'test-file-key',
        null
      );
      
      // Assert
      expect(result).toEqual([]);
      expect(highlightStore.removeHighlightsByType).not.toHaveBeenCalled();
      expect(highlightStore.addMultipleHighlights).not.toHaveBeenCalled();
    });
    
    test('should handle detection results with no pages', async () => {
      // Arrange
      const detectionResult = {
        redaction_mapping: {}
      };
      
      // Act
      const result = await EntityHighlightProcessor.processDetectionResults(
        'test-file-key',
        detectionResult
      );
      
      // Assert
      expect(result).toEqual([]);
      // The actual implementation doesn't call removeHighlightsByType for results with no pages
      expect(highlightStore.removeHighlightsByType).not.toHaveBeenCalled();
      expect(highlightStore.addMultipleHighlights).not.toHaveBeenCalled();
    });
    
    test('should handle detection results with empty pages array', async () => {
      // Arrange
      const detectionResult = {
        redaction_mapping: {
          pages: []
        }
      };
      
      // Act
      const result = await EntityHighlightProcessor.processDetectionResults(
        'test-file-key',
        detectionResult
      );
      
      // Assert
      expect(result).toEqual([]);
      expect(highlightStore.removeHighlightsByType).toHaveBeenCalled();
      // When there are no pages to process, addMultipleHighlights is called with empty array
      const addMultipleHighlightsCalls = vi.mocked(highlightStore.addMultipleHighlights).mock.calls;
      expect(addMultipleHighlightsCalls.length).toBe(1);
      expect(addMultipleHighlightsCalls[0][0]).toEqual([]);
    });
    
    test('should process valid entity detection results', async () => {
      // Arrange
      const fileKey = 'test-file-key';
      const detectionResult = {
        entities_detected: { total: 3, PERSON: 2, EMAIL: 1 },
        performance: { entity_density: 0.02 },
        pages: [
          {
            page: 1,
            sensitive: [
              {
                bbox: { x0: 10, y0: 20, x1: 30, y1: 40 },
                entity_type: 'PERSON',
                original_text: 'John Doe',
                engine: 'presidio'
              },
              {
                bbox: { x0: 50, y0: 60, x1: 70, y1: 80 },
                entity_type: 'EMAIL',
                original_text: 'john@example.com',
                engine: 'gliner'
              }
            ]
          },
          {
            page: 2,
            sensitive: [
              {
                bbox: { x0: 15, y0: 25, x1: 35, y1: 45 },
                entity_type: 'PERSON',
                original_text: 'Jane Smith',
                engine: 'gemini'
              }
            ]
          }
        ]
      };
      
      // Set up return value for addMultipleHighlights
      vi.mocked(highlightStore.addMultipleHighlights).mockResolvedValue(
        ['id-1', 'id-2', 'id-3']
      );
      
      // Act
      const result = await EntityHighlightProcessor.processDetectionResults(
        fileKey,
        detectionResult
      );
      
      // Assert
      expect(highlightStore.removeHighlightsByType).toHaveBeenCalledWith(
        fileKey,
        HighlightType.ENTITY
      );
      
      // Check that highlights were created and added
      expect(highlightStore.addMultipleHighlights).toHaveBeenCalled();
      const addedHighlights = vi.mocked(highlightStore.addMultipleHighlights).mock.calls[0][0];
      
      // Should be 3 highlights (2 on page 1, 1 on page 2)
      expect(addedHighlights.length).toBe(3);
      
      // Check first highlight's properties
      const firstHighlight = addedHighlights[0];
      expect(firstHighlight.page).toBe(1);
      expect(firstHighlight.x).toBe(5); // x0 - 5 (padding)
      expect(firstHighlight.y).toBe(15); // y0 - 5 (padding)
      expect(firstHighlight.w).toBe(23); // (x1 - x0) + 3
      expect(firstHighlight.h).toBe(25); // (y1 - y0) + 5
      expect(firstHighlight.text).toBe('John Doe');
      expect(firstHighlight.entity).toBe('PERSON');
      expect(firstHighlight.model).toBe('presidio');
      expect(firstHighlight.type).toBe(HighlightType.ENTITY);
      expect(firstHighlight.fileKey).toBe(fileKey);
      
      // Check persistence service was called
      expect(summaryPersistenceStore.addAnalyzedFile).toHaveBeenCalledWith('entity', fileKey);
      expect(summaryPersistenceStore.updateFileSummary).toHaveBeenCalledWith(
        'entity',
        expect.objectContaining({
          fileKey,
          entities_detected: detectionResult.entities_detected,
          performance: detectionResult.performance
        })
      );
      
      // Check highlight IDs were returned
      expect(result).toEqual(['id-1', 'id-2', 'id-3']);
    });
    
    test('should handle detection results with missing bbox', async () => {
      // Arrange
      const fileKey = 'test-file-key';
      const detectionResult = {
        entities_detected: { total: 1 },
        performance: { entity_density: 0.01 },
        pages: [
          {
            page: 1,
            sensitive: [
              {
                // Missing bbox
                entity_type: 'PERSON',
                original_text: 'John Doe',
                engine: 'presidio'
              }
            ]
          }
        ]
      };
      
      vi.mocked(highlightStore.addMultipleHighlights).mockResolvedValue([]);
      
      // Act
      const result = await EntityHighlightProcessor.processDetectionResults(
        fileKey,
        detectionResult
      );
      
      // Assert
      expect(highlightStore.addMultipleHighlights).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
    
    test('should dispatch custom event when isAutoProcess is true', async () => {
      // Arrange
      const fileKey = 'test-file-key';
      const detectionResult = {
        entities_detected: { total: 1 },
        performance: { entity_density: 0.01 },
        pages: [
          {
            page: 1,
            sensitive: [
              {
                bbox: { x0: 10, y0: 20, x1: 30, y1: 40 },
                entity_type: 'PERSON',
                original_text: 'John Doe',
                engine: 'presidio'
              }
            ]
          }
        ]
      };
      
      vi.mocked(highlightStore.addMultipleHighlights).mockResolvedValue(['id-1']);
      
      // Act
      await EntityHighlightProcessor.processDetectionResults(
        fileKey,
        detectionResult,
        true // isAutoProcess = true
      );
      
      // Assert
      expect(dispatchEventSpy).toHaveBeenCalled();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.type).toBe('auto-processing-complete');
      expect(event.detail).toEqual(expect.objectContaining({
        fileKey,
        hasEntityResults: true,
        detectionResult
      }));
      
      expect(processingStateService.completeProcessing).toHaveBeenCalledWith(
        fileKey,
        true,
        detectionResult
      );
    });
    
    test('should handle direct mapping structure without redaction_mapping wrapper', async () => {
      // Arrange
      const fileKey = 'test-file-key';
      const detectionResult = {
        pages: [
          {
            page: 1,
            sensitive: [
              {
                bbox: { x0: 10, y0: 20, x1: 30, y1: 40 },
                entity_type: 'PERSON',
                original_text: 'John Doe'
              }
            ]
          }
        ]
      };
      
      vi.mocked(highlightStore.addMultipleHighlights).mockResolvedValue(['id-1']);
      
      // Act
      await EntityHighlightProcessor.processDetectionResults(
        fileKey,
        detectionResult
      );
      
      // Assert
      const addedHighlights = vi.mocked(highlightStore.addMultipleHighlights).mock.calls[0][0];
      expect(addedHighlights.length).toBe(1);
    });
    
    test('should use default engine name when not specified', async () => {
      // Arrange
      const fileKey = 'test-file-key';
      const detectionResult = {
        pages: [
          {
            page: 1,
            sensitive: [
              {
                bbox: { x0: 10, y0: 20, x1: 30, y1: 40 },
                entity_type: 'PERSON',
                original_text: 'John Doe'
                // No engine specified
              }
            ]
          }
        ]
      };
      
      vi.mocked(highlightStore.addMultipleHighlights).mockResolvedValue(['id-1']);
      
      // Act
      await EntityHighlightProcessor.processDetectionResults(
        fileKey,
        detectionResult
      );
      
      // Assert
      const addedHighlights = vi.mocked(highlightStore.addMultipleHighlights).mock.calls[0][0];
      expect(addedHighlights[0].model).toBe('presidio'); // Default model
    });
    
    test('should handle error when updating persistence store', async () => {
      // Arrange
      const fileKey = 'test-file-key';
      const detectionResult = {
        entities_detected: { total: 1 },
        performance: { entity_density: 0.01 },
        pages: [
          {
            page: 1,
            sensitive: [
              {
                bbox: { x0: 10, y0: 20, x1: 30, y1: 40 },
                entity_type: 'PERSON',
                original_text: 'John Doe'
              }
            ]
          }
        ]
      };
      
      vi.mocked(highlightStore.addMultipleHighlights).mockResolvedValue(['id-1']);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(summaryPersistenceStore.updateFileSummary).mockImplementationOnce(() => {
        throw new Error('Store update failed');
      });
      
      // Act
      const result = await EntityHighlightProcessor.processDetectionResults(
        fileKey,
        detectionResult
      );
      
      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '[EntityHighlightProcessor] Error updating persistence store:',
        expect.any(Error)
      );
      expect(result).toEqual(['id-1']); // Should still return highlight IDs
    });
  });
});
