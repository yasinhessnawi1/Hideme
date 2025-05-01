import {
    presidioOptions,
    glinerOptions,
    geminiOptions,
    hidemeOptions,
    MODEL_COLORS,
    METHOD_ID_MAP,
    handleAllOptions,
    prepareEntitiesForApi,
    createEntityBatch,
    entitiesToOptions,
    getColorDotStyle
} from './EntityUtils';
import { OptionType } from '../types';
import { Mock, test, expect, describe } from 'vitest';




describe('EntityUtils', () => {
    // Test Model Options Arrays
    describe('Model option arrays', () => {
        test('presidioOptions should contain valid options', () => {
            expect(presidioOptions).toBeInstanceOf(Array);
            expect(presidioOptions.length).toBeGreaterThan(0);
            expect(presidioOptions[0]).toHaveProperty('value');
            expect(presidioOptions[0]).toHaveProperty('label');
            // Check for ALL option
            expect(presidioOptions.some(option => option.value === 'ALL_PRESIDIO_P')).toBe(true);
        });

        test('glinerOptions should contain valid options', () => {
            expect(glinerOptions).toBeInstanceOf(Array);
            expect(glinerOptions.length).toBeGreaterThan(0);
            expect(glinerOptions[0]).toHaveProperty('value');
            expect(glinerOptions[0]).toHaveProperty('label');
            // Check for ALL option
            expect(glinerOptions.some(option => option.value === 'ALL_GLINER')).toBe(true);
        });

        test('geminiOptions should contain valid options', () => {
            expect(geminiOptions).toBeInstanceOf(Array);
            expect(geminiOptions.length).toBeGreaterThan(0);
            expect(geminiOptions[0]).toHaveProperty('value');
            expect(geminiOptions[0]).toHaveProperty('label');
            // Check for ALL option
            expect(geminiOptions.some(option => option.value === 'ALL_GEMINI')).toBe(true);
        });

        test('hidemeOptions should contain valid options', () => {
            expect(hidemeOptions).toBeInstanceOf(Array);
            expect(hidemeOptions.length).toBeGreaterThan(0);
            expect(hidemeOptions[0]).toHaveProperty('value');
            expect(hidemeOptions[0]).toHaveProperty('label');
            // Check for ALL option
            expect(hidemeOptions.some(option => option.value === 'ALL_HIDEME')).toBe(true);
        });
    });

    // Test MODEL_COLORS
    describe('MODEL_COLORS', () => {
        test('should have correct color values for all models', () => {
            expect(MODEL_COLORS.presidio).toBe('#ffd771');
            expect(MODEL_COLORS.gliner).toBe('#ff7171');
            expect(MODEL_COLORS.gemini).toBe('#7171ff');
            expect(MODEL_COLORS.hideme).toBe('#71ffa0');
        });
    });

    // Test METHOD_ID_MAP
    describe('METHOD_ID_MAP', () => {
        test('should map model names to correct method IDs', () => {
            expect(METHOD_ID_MAP.presidio).toBe(1);
            expect(METHOD_ID_MAP.gliner).toBe(2);
            expect(METHOD_ID_MAP.gemini).toBe(3);
            expect(METHOD_ID_MAP.hideme).toBe(4);
        });
    });

    // Test getColorDotStyle
    describe('getColorDotStyle', () => {
        test('should return correct style object for a given color', () => {
            const style = getColorDotStyle('#ff0000');

            expect(style).toEqual({
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#ff0000',
                marginRight: '8px',
                verticalAlign: 'middle'
            });
        });
    });

    // Test handleAllOptions
    describe('handleAllOptions', () => {
        test('should return empty array when no options are selected', () => {
            const result = handleAllOptions([], presidioOptions, 'ALL_PRESIDIO_P');
            expect(result).toEqual([]);
        });

        test('should return only ALL option when ALL is selected', () => {
            const selectedOptions: OptionType[] = [
                { value: 'ALL_PRESIDIO_P', label: 'All Presidio Entities' },
                { value: 'PERSON_P', label: 'Person' }
            ];

            const result = handleAllOptions(selectedOptions, presidioOptions, 'ALL_PRESIDIO_P');

            expect(result).toHaveLength(1);
            expect(result[0].value).toBe('ALL_PRESIDIO_P');
        });

        test('should return only ALL option when all individual options are selected', () => {
            // Create array with all options except the ALL option
            const individualOptions = presidioOptions.filter(option => option.value !== 'ALL_PRESIDIO_P');

            const result = handleAllOptions(individualOptions, presidioOptions, 'ALL_PRESIDIO_P');

            expect(result).toHaveLength(1);
            expect(result[0].value).toBe('ALL_PRESIDIO_P');
        });

        test('should return original selection when only some options are selected', () => {
            const selectedOptions: OptionType[] = [
                { value: 'PERSON_P', label: 'Person' },
                { value: 'EMAIL_ADDRESS_P', label: 'Email Address' }
            ];

            const result = handleAllOptions(selectedOptions, presidioOptions, 'ALL_PRESIDIO_P');

            expect(result).toEqual(selectedOptions);
        });
    });

    // Test prepareEntitiesForApi
    describe('prepareEntitiesForApi', () => {
        test('should return empty array when no options are selected', () => {
            const result = prepareEntitiesForApi([], 'ALL_PRESIDIO_P');
            expect(result).toEqual([]);
        });

        test('should return ALL flag when ALL option is selected', () => {
            const selectedOptions: OptionType[] = [
                { value: 'ALL_PRESIDIO_P', label: 'All Presidio Entities' }
            ];

            const result = prepareEntitiesForApi(selectedOptions, 'ALL_PRESIDIO_P');

            expect(result).toEqual(['ALL_PRESIDIO_P']);
        });

        test('should return individual values when specific options are selected', () => {
            const selectedOptions: OptionType[] = [
                { value: 'PERSON_P', label: 'Person' },
                { value: 'EMAIL_ADDRESS_P', label: 'Email Address' }
            ];

            const result = prepareEntitiesForApi(selectedOptions, 'ALL_PRESIDIO_P');

            expect(result).toEqual(['PERSON_P', 'EMAIL_ADDRESS_P']);
        });
    });

    // Test createEntityBatch
    describe('createEntityBatch', () => {
        test('should create a valid entity batch for API submission', () => {
            const selectedEntities: OptionType[] = [
                { value: 'PERSON_P', label: 'Person' },
                { value: 'EMAIL_ADDRESS_P', label: 'Email Address' },
                { value: 'ALL_PRESIDIO_P', label: 'All Presidio Entities' }
            ];

            const methodId = 1;

            const result = createEntityBatch(selectedEntities, methodId);

            expect(result).toEqual({
                method_id: 1,
                entity_texts: ['PERSON_P', 'EMAIL_ADDRESS_P']
            });
        });

        test('should filter out ALL options', () => {
            const selectedEntities: OptionType[] = [
                { value: 'ALL_PRESIDIO_P', label: 'All Presidio Entities' }
            ];

            const methodId = 1;

            const result = createEntityBatch(selectedEntities, methodId);

            expect(result.entity_texts).toHaveLength(0);
        });

        test('should handle empty selection', () => {
            const selectedEntities: OptionType[] = [];
            const methodId = 1;

            const result = createEntityBatch(selectedEntities, methodId);

            expect(result).toEqual({
                method_id: 1,
                entity_texts: []
            });
        });
    });

    // Test entitiesToOptions
    describe('entitiesToOptions', () => {
        test('should convert entities to option objects', () => {
            const entities = ['PERSON_P', 'EMAIL_ADDRESS_P'];

            const result = entitiesToOptions(entities, presidioOptions);

            expect(result).toHaveLength(2);
            expect(result[0].value).toBe('PERSON_P');
            expect(result[0].label).toBe('Person');
            expect(result[1].value).toBe('EMAIL_ADDRESS_P');
            expect(result[1].label).toBe('Email Address');
        });

        test('should handle case-insensitive matching', () => {
            const entities = ['person_p', 'email_address_p'];

            const result = entitiesToOptions(entities, presidioOptions);

            expect(result).toHaveLength(2);
            expect(result[0].value).toBe('PERSON_P');
            expect(result[1].value).toBe('EMAIL_ADDRESS_P');
        });

        test('should handle empty entities array', () => {
            const entities: string[] = [];

            const result = entitiesToOptions(entities, presidioOptions);

            expect(result).toEqual([]);
        });

        test('should handle null/undefined entities', () => {
            const result = entitiesToOptions(null as any, presidioOptions);

            expect(result).toEqual([]);
        });

        test('should handle entities not in available options', () => {
            const entities = ['NONEXISTENT_ENTITY'];

            const result = entitiesToOptions(entities, presidioOptions);

            expect(result).toEqual([]);
        });
    });
});