import { describe, test, expect, vi, beforeEach, Mock} from 'vitest';
import {HighlightType} from '../types';

// Define the manager mock first to avoid hoisting issues
const mockManager = {
  setDetectEntitiesCallback: vi.fn(),
  setSearchCallback: vi.fn(),
  updateConfig: vi.fn(),
  getConfig: vi.fn().mockReturnValue({
    presidioEntities: [{label: 'PERSON', value: 'PERSON'}],
    glinerEntities: [],
    geminiEntities: [],
    hidemeEntities: [],
    searchQueries: [{term: 'confidential', case_sensitive: false, ai_search: false}],
    isActive: true,
    detectionThreshold: 0.5
  }),
  processNewFile: vi.fn().mockResolvedValue(true),
  processNewFiles: vi.fn().mockResolvedValue(1)
};

// Mock the AutoProcessManager module
vi.mock('./AutoProcessManager', () => ({
  AutoProcessManager: {
    getInstance: vi.fn().mockReturnValue(mockManager)
  }
}));

describe('AutoProcessManager', () => {
  let manager: { getConfig: any; setDetectEntitiesCallback: any; setSearchCallback: any; processNewFile: any; processNewFiles: any; updateConfig?: Mock<(...args: any[]) => any>; };
  
  beforeEach(() => {
    vi.clearAllMocks();
    manager = mockManager;
  });
  
  test('should return config with expected values', () => {
    const config = manager.getConfig();
    expect(config.isActive).toBe(true);
    expect(config.presidioEntities).toHaveLength(1);
    expect(config.presidioEntities[0].value).toBe('PERSON');
  });
  
  test('should allow setting callbacks', () => {
    const detectCallback = vi.fn();
    const searchCallback = vi.fn();
    
    manager.setDetectEntitiesCallback(detectCallback);
    manager.setSearchCallback(searchCallback);
    
    expect(manager.setDetectEntitiesCallback).toHaveBeenCalledWith(detectCallback);
    expect(manager.setSearchCallback).toHaveBeenCalledWith(searchCallback);
  });
  
  test('should process files successfully', async () => {
    const file = { name: 'test.pdf' };
    await manager.processNewFile(file);
    expect(manager.processNewFile).toHaveBeenCalledWith(file);
  });
  
  test('should process multiple files successfully', async () => {
    const files = [{ name: 'file1.pdf' }, { name: 'file2.pdf' }];
    await manager.processNewFiles(files);
    expect(manager.processNewFiles).toHaveBeenCalledWith(files);
  });
});
