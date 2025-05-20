import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    PRESIDIO_ENTITY_KEYS,
    GLINER_ENTITY_KEYS,
    GEMINI_ENTITY_KEYS,
    HIDEME_ENTITY_KEYS,
    buildEntityOptions,
    getPresidioOptions,
    getGlinerOptions,
    getGeminiOptions,
    getHidemeOptions,
    MODEL_COLORS,
    METHOD_ID_MAP,
    getColorDotStyle,
    handleAllOptions,
    prepareEntitiesForApi,
    createEntityBatch,
    entitiesToOptions,
    getEntityTranslationKeyAndModel
} from './EntityUtils';
import { OptionType } from '../types';

describe('EntityUtils', () => {
    // Mock translation function
    const mockT = vi.fn((namespace: string, key: string) => `translated_${key}`);
    
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    describe('Entity key constants', () => {
        it('should define PRESIDIO_ENTITY_KEYS', () => {
            expect(PRESIDIO_ENTITY_KEYS).toBeInstanceOf(Array);
            expect(PRESIDIO_ENTITY_KEYS.length).toBeGreaterThan(0);
            expect(PRESIDIO_ENTITY_KEYS[0]).toHaveProperty('value');
            expect(PRESIDIO_ENTITY_KEYS[0]).toHaveProperty('key');
        });
        
        it('should define GLINER_ENTITY_KEYS', () => {
            expect(GLINER_ENTITY_KEYS).toBeInstanceOf(Array);
            expect(GLINER_ENTITY_KEYS.length).toBeGreaterThan(0);
            expect(GLINER_ENTITY_KEYS[0]).toHaveProperty('value');
            expect(GLINER_ENTITY_KEYS[0]).toHaveProperty('key');
        });
        
        it('should define GEMINI_ENTITY_KEYS', () => {
            expect(GEMINI_ENTITY_KEYS).toBeInstanceOf(Array);
            expect(GEMINI_ENTITY_KEYS.length).toBeGreaterThan(0);
            expect(GEMINI_ENTITY_KEYS[0]).toHaveProperty('value');
            expect(GEMINI_ENTITY_KEYS[0]).toHaveProperty('key');
        });
        
        it('should define HIDEME_ENTITY_KEYS', () => {
            expect(HIDEME_ENTITY_KEYS).toBeInstanceOf(Array);
            expect(HIDEME_ENTITY_KEYS.length).toBeGreaterThan(0);
            expect(HIDEME_ENTITY_KEYS[0]).toHaveProperty('value');
            expect(HIDEME_ENTITY_KEYS[0]).toHaveProperty('key');
        });
    });
    
    describe('buildEntityOptions', () => {
        it('should convert entity keys to options with translations', () => {
            const entityKeys = [
                { value: 'TEST1', key: 'test1' },
                { value: 'TEST2', key: 'test2' }
            ];
            
            const result = buildEntityOptions(entityKeys, mockT);
            
            expect(result).toEqual([
                { value: 'TEST1', label: 'translated_test1' },
                { value: 'TEST2', label: 'translated_test2' }
            ]);
            
            // Verify translation function was called correctly
            expect(mockT).toHaveBeenCalledWith('entityDetection', 'test1');
            expect(mockT).toHaveBeenCalledWith('entityDetection', 'test2');
        });
    });
    
    describe('getEntityOptions functions', () => {
        it('should get presidio options with translations', () => {
            const options = getPresidioOptions(mockT);
            expect(options).toBeInstanceOf(Array);
            expect(options.length).toEqual(PRESIDIO_ENTITY_KEYS.length);
            expect(options[0]).toHaveProperty('value', PRESIDIO_ENTITY_KEYS[0].value);
            expect(options[0]).toHaveProperty('label', `translated_${PRESIDIO_ENTITY_KEYS[0].key}`);
        });
        
        it('should get gliner options with translations', () => {
            const options = getGlinerOptions(mockT);
            expect(options).toBeInstanceOf(Array);
            expect(options.length).toEqual(GLINER_ENTITY_KEYS.length);
            expect(options[0]).toHaveProperty('value', GLINER_ENTITY_KEYS[0].value);
            expect(options[0]).toHaveProperty('label', `translated_${GLINER_ENTITY_KEYS[0].key}`);
        });
        
        it('should get gemini options with translations', () => {
            const options = getGeminiOptions(mockT);
            expect(options).toBeInstanceOf(Array);
            expect(options.length).toEqual(GEMINI_ENTITY_KEYS.length);
            expect(options[0]).toHaveProperty('value', GEMINI_ENTITY_KEYS[0].value);
            expect(options[0]).toHaveProperty('label', `translated_${GEMINI_ENTITY_KEYS[0].key}`);
        });
        
        it('should get hideme options with translations', () => {
            const options = getHidemeOptions(mockT);
            expect(options).toBeInstanceOf(Array);
            expect(options.length).toEqual(HIDEME_ENTITY_KEYS.length);
            expect(options[0]).toHaveProperty('value', HIDEME_ENTITY_KEYS[0].value);
            expect(options[0]).toHaveProperty('label', `translated_${HIDEME_ENTITY_KEYS[0].key}`);
        });
    });
    
    describe('MODEL_COLORS and METHOD_ID_MAP', () => {
        it('should define colors for each model', () => {
            expect(MODEL_COLORS).toHaveProperty('presidio');
            expect(MODEL_COLORS).toHaveProperty('gliner');
            expect(MODEL_COLORS).toHaveProperty('gemini');
            expect(MODEL_COLORS).toHaveProperty('hideme');
            
            expect(MODEL_COLORS.presidio).toMatch(/#[0-9a-f]{6}/i); // Should be a hex color
        });
        
        it('should define method IDs for each model', () => {
            expect(METHOD_ID_MAP).toHaveProperty('presidio');
            expect(METHOD_ID_MAP).toHaveProperty('gliner');
            expect(METHOD_ID_MAP).toHaveProperty('gemini');
            expect(METHOD_ID_MAP).toHaveProperty('hideme');
            
            expect(METHOD_ID_MAP.presidio).toBe(1);
            expect(METHOD_ID_MAP.gliner).toBe(2);
            expect(METHOD_ID_MAP.gemini).toBe(3);
            expect(METHOD_ID_MAP.hideme).toBe(4);
        });
    });
    
    describe('getColorDotStyle', () => {
        it('should return style object for a color dot', () => {
            const style = getColorDotStyle('#ff0000');
            
            expect(style).toHaveProperty('backgroundColor', '#ff0000');
            expect(style).toHaveProperty('display', 'inline-block');
            expect(style).toHaveProperty('width', '10px');
            expect(style).toHaveProperty('height', '10px');
            expect(style).toHaveProperty('borderRadius', '50%');
        });
    });
    
    describe('handleAllOptions', () => {
        const allOptions: OptionType[] = [
            { value: 'ALL_TEST', label: 'All' },
            { value: 'TEST1', label: 'Test 1' },
            { value: 'TEST2', label: 'Test 2' },
            { value: 'TEST3', label: 'Test 3' }
        ];
        
        it('should return empty array for empty selection', () => {
            const result = handleAllOptions([], allOptions, 'ALL_TEST');
            expect(result).toEqual([]);
        });
        
        it('should return only ALL option when ALL is selected', () => {
            const selectedOptions = [
                { value: 'ALL_TEST', label: 'All' },
                { value: 'TEST1', label: 'Test 1' }
            ];
            
            const result = handleAllOptions(selectedOptions, allOptions, 'ALL_TEST');
            expect(result).toEqual([{ value: 'ALL_TEST', label: 'All' }]);
        });
        
        it('should return only ALL option when all individual options are selected', () => {
            const selectedOptions = [
                { value: 'TEST1', label: 'Test 1' },
                { value: 'TEST2', label: 'Test 2' },
                { value: 'TEST3', label: 'Test 3' }
            ];
            
            const result = handleAllOptions(selectedOptions, allOptions, 'ALL_TEST');
            expect(result).toEqual([{ value: 'ALL_TEST', label: 'All' }]);
        });
        
        it('should return selected options as-is when not all are selected', () => {
            const selectedOptions = [
                { value: 'TEST1', label: 'Test 1' },
                { value: 'TEST2', label: 'Test 2' }
            ];
            
            const result = handleAllOptions(selectedOptions, allOptions, 'ALL_TEST');
            expect(result).toEqual(selectedOptions);
        });
    });
    
    describe('prepareEntitiesForApi', () => {
        it('should return empty array for empty selection', () => {
            const result = prepareEntitiesForApi([], 'ALL_TEST');
            expect(result).toEqual([]);
        });
        
        it('should return ALL option when ALL is selected', () => {
            const selectedOptions = [
                { value: 'ALL_TEST', label: 'All' },
                { value: 'TEST1', label: 'Test 1' }
            ];
            
            const result = prepareEntitiesForApi(selectedOptions, 'ALL_TEST');
            expect(result).toEqual(['ALL_TEST']);
        });
        
        it('should return individual values when no ALL option is selected', () => {
            const selectedOptions = [
                { value: 'TEST1', label: 'Test 1' },
                { value: 'TEST2', label: 'Test 2' }
            ];
            
            const result = prepareEntitiesForApi(selectedOptions, 'ALL_TEST');
            expect(result).toEqual(['TEST1', 'TEST2']);
        });
    });
    
    describe('createEntityBatch', () => {
        it('should create a batch with method ID and entity texts', () => {
            const selectedEntities = [
                { value: 'ALL_TEST', label: 'All' },
                { value: 'TEST1', label: 'Test 1' },
                { value: 'TEST2', label: 'Test 2' }
            ];
            
            const result = createEntityBatch(selectedEntities, 1);
            
            expect(result).toEqual({
                method_id: 1,
                entity_texts: ['TEST1', 'TEST2']
            });
            
            // Should filter out ALL options
            expect(result.entity_texts).not.toContain('ALL_TEST');
        });
    });
    
    describe('entitiesToOptions', () => {
        it('should convert entity strings to option objects', () => {
            const entities = ['TEST1', 'TEST2'];
            const availableOptions = [
                { value: 'TEST1', label: 'Test 1' },
                { value: 'TEST2', label: 'Test 2' },
                { value: 'TEST3', label: 'Test 3' }
            ];
            
            const result = entitiesToOptions(entities, availableOptions);
            
            expect(result).toEqual([
                { value: 'TEST1', label: 'Test 1' },
                { value: 'TEST2', label: 'Test 2' }
            ]);
        });
        
        it('should handle case insensitive matching', () => {
            const entities = ['test1', 'TEST2'];
            const availableOptions = [
                { value: 'TEST1', label: 'Test 1' },
                { value: 'TEST2', label: 'Test 2' }
            ];
            
            const result = entitiesToOptions(entities, availableOptions);
            
            expect(result).toEqual([
                { value: 'TEST1', label: 'Test 1' },
                { value: 'TEST2', label: 'Test 2' }
            ]);
        });
        
        it('should handle empty or null inputs', () => {
            const result1 = entitiesToOptions([], []);
            expect(result1).toEqual([]);
            
            const result2 = entitiesToOptions(null as any, []);
            expect(result2).toEqual([]);
        });
        
        it('should not include ALL options in the result', () => {
            const entities = ['TEST1'];
            const availableOptions = [
                { value: 'ALL_TEST', label: 'All' },
                { value: 'TEST1', label: 'Test 1' }
            ];
            
            const result = entitiesToOptions(entities, availableOptions);
            
            expect(result).toEqual([
                { value: 'TEST1', label: 'Test 1' }
            ]);
        });
    });
    
    describe('getEntityTranslationKeyAndModel', () => {
        it('should identify presidio entities', () => {
            const result = getEntityTranslationKeyAndModel('PERSON_P');
            expect(result).toEqual({ key: 'person', model: 'presidio' });
        });
        
        it('should identify entity by key in order of model priority', () => {
            const result = getEntityTranslationKeyAndModel('person');
            expect(result).toEqual({ key: 'person', model: 'presidio' });
            
            const glinerSpecific = getEntityTranslationKeyAndModel('passport number');
            expect(glinerSpecific).toEqual({ key: 'passportNumber', model: 'gliner' });
        });
        
        it('should identify gemini entities', () => {
            const result = getEntityTranslationKeyAndModel('PERSON-G');
            expect(result).toEqual({ key: 'person', model: 'gemini' });
        });
        
        it('should identify hideme entities', () => {
            const result = getEntityTranslationKeyAndModel('PERSON-H');
            expect(result).toEqual({ key: 'person', model: 'hideme' });
        });
        
        it('should return null for unknown entities', () => {
            const result = getEntityTranslationKeyAndModel('UNKNOWN_ENTITY');
            expect(result).toEqual({ key: null, model: null });
        });
        
        it('should match by key as well as by value', () => {
            const result = getEntityTranslationKeyAndModel('person');
            expect(result.key).not.toBeNull();
        });
    });
}); 