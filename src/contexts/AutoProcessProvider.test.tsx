import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AutoProcessProvider } from '../contexts/AutoProcessProvider';
import { useAutoProcess } from '../hooks/general/useAutoProcess';

// Mock the useAutoProcess hook
vi.mock('../hooks/general/useAutoProcess', () => ({
    useAutoProcess: vi.fn()
}));

describe('AutoProcessProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementation
        vi.mocked(useAutoProcess).mockReturnValue({
            getConfig: vi.fn(() => ({
                isActive: true,
                searchQueries: [],
                presidioEntities: [],
                glinerEntities: [],
                geminiEntities: [],
                hidemeEntities: [],
                detectionThreshold: 0.5,
                useBanlist: true,
                banlistWords: []
            })),
            processNewFile: vi.fn(),
            processNewFiles: vi.fn(),
            setAutoProcessingEnabled: vi.fn()
        });
    });

    test.skip('should render its children', () => {
        const { getByText } = render(
            <AutoProcessProvider>
                <div>Test Child</div>
            </AutoProcessProvider>
        );

        expect(getByText('Test Child')).toBeInTheDocument();
    });

    test.skip('should initialize with useAutoProcess hook', () => {
        const getConfigMock = vi.fn(() => ({
            isActive: true,
            searchQueries: [{ term: 'test', case_sensitive: false, ai_search: false }],
            presidioEntities: [{ value: 'test', label: 'test' }],
            glinerEntities: [],
            geminiEntities: [],
            hidemeEntities: [],
            detectionThreshold: 0.7,
            useBanlist: true,
            banlistWords: ['test']
        }));

        vi.mocked(useAutoProcess).mockReturnValue({
            getConfig: getConfigMock,
            processNewFile: vi.fn(),
            processNewFiles: vi.fn(),
            setAutoProcessingEnabled: vi.fn()
        });

        render(<AutoProcessProvider><div /></AutoProcessProvider>);

        // Should call getConfig during initialization
        expect(getConfigMock).toHaveBeenCalled();
    });

    test.skip('should get configuration with multiple entity types', () => {
        const getConfigMock = vi.fn(() => ({
            isActive: true,
            searchQueries: [
                { term: 'search1', case_sensitive: false, ai_search: false },
                { term: 'search2', case_sensitive: false, ai_search: false }
            ],
            presidioEntities: [{ value: 'entity1', label: 'Entity 1' }],
            glinerEntities: [{ value: 'entity2', label: 'Entity 2' }],
            geminiEntities: [{ value: 'entity3', label: 'Entity 3' }],
            hidemeEntities: [{ value: 'entity4', label: 'Entity 4' }],
            detectionThreshold: 0.8,
            useBanlist: true,
            banlistWords: ['banned1', 'banned2']
        }));

        vi.mocked(useAutoProcess).mockReturnValue({
            getConfig: getConfigMock,
            processNewFile: vi.fn(),
            processNewFiles: vi.fn(),
            setAutoProcessingEnabled: vi.fn()
        });

        render(<AutoProcessProvider><div /></AutoProcessProvider>);

        // Should call getConfig during initialization
        expect(getConfigMock).toHaveBeenCalled();
    });

    test.skip('should handle inactive configuration', () => {
        const getConfigMock = vi.fn(() => ({
            isActive: false,
            searchQueries: [],
            presidioEntities: [],
            glinerEntities: [],
            geminiEntities: [],
            hidemeEntities: [],
            detectionThreshold: 0.5,
            useBanlist: false,
            banlistWords: []
        }));

        vi.mocked(useAutoProcess).mockReturnValue({
            getConfig: getConfigMock,
            processNewFile: vi.fn(),
            processNewFiles: vi.fn(),
            setAutoProcessingEnabled: vi.fn()
        });

        render(<AutoProcessProvider><div /></AutoProcessProvider>);

        // Should call getConfig during initialization
        expect(getConfigMock).toHaveBeenCalled();
    });
});