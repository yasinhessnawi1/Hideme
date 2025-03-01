import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// Define highlight types
export enum HighlightType {
    MANUAL = 'MANUAL',
    SEARCH = 'SEARCH',
    ENTITY = 'ENTITY',
}

export interface HighlightRect {
    id: string;  // changed from number to string
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    opacity?: number;
    type?: HighlightType;
    entity?: string;
    text?: string;
}

interface HighlightContextProps {
    annotations: Record<number, HighlightRect[]>;
    setAnnotations: React.Dispatch<React.SetStateAction<Record<number, HighlightRect[]>>>;
    addAnnotation: (page: number, ann: HighlightRect) => void;
    removeAnnotation: (page: number, id: string) => void;
    updateAnnotation: (page: number, updatedAnn: HighlightRect) => void;
    clearAnnotations: () => void;
    clearAnnotationsByType: (type: HighlightType, pageNumber?: number) => void;
    getNextHighlightId: () => string; // new signature: no parameter, returns a string
    selectedAnnotation: HighlightRect | null;
    setSelectedAnnotation: React.Dispatch<React.SetStateAction<HighlightRect | null>>;
    showSearchHighlights: boolean;
    setShowSearchHighlights: React.Dispatch<React.SetStateAction<boolean>>;
    showEntityHighlights: boolean;
    setShowEntityHighlights: React.Dispatch<React.SetStateAction<boolean>>;
    showManualHighlights: boolean;
    setShowManualHighlights: React.Dispatch<React.SetStateAction<boolean>>;
}

const HighlightContext = createContext<HighlightContextProps | undefined>(undefined);

export const useHighlightContext = () => {
    const context = useContext(HighlightContext);
    if (!context) {
        throw new Error('useHighlightContext must be used within a HighlightProvider');
    }
    return context;
};

export const HighlightProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [annotations, setAnnotations] = useState<Record<number, HighlightRect[]>>({});

    // Use a single counter for all highlight IDs.
    const nextHighlightIdRef = useRef(1);

    const [selectedAnnotation, setSelectedAnnotation] = useState<HighlightRect | null>(null);
    const [showSearchHighlights, setShowSearchHighlights] = useState(true);
    const [showEntityHighlights, setShowEntityHighlights] = useState(true);
    const [showManualHighlights, setShowManualHighlights] = useState(true);

    const getNextHighlightId = useCallback((): string => {
        const id = nextHighlightIdRef.current;
        nextHighlightIdRef.current += 1;
        return id.toString();
    }, []);

    const addAnnotation = useCallback((page: number, ann: HighlightRect) => {
        setAnnotations((prev) => {
            const pageAnns = prev[page] || [];
            return { ...prev, [page]: [...pageAnns, ann] };
        });
    }, []);

    const removeAnnotation = useCallback((page: number, id: string) => {
        setAnnotations((prev) => {
            const pageAnns = prev[page] || [];
            const filtered = pageAnns.filter((ann) => ann.id !== id);
            if (filtered.length === 0) {
                const { [page]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [page]: filtered };
        });
        setSelectedAnnotation((curr) => {
            if (curr && curr.page === page && curr.id === id) {
                return null;
            }
            return curr;
        });
    }, []);

    const updateAnnotation = useCallback((page: number, updatedAnn: HighlightRect) => {
        setAnnotations((prev) => {
            const pageAnns = prev[page] || [];
            return {
                ...prev,
                [page]: pageAnns.map((ann) => (ann.id === updatedAnn.id ? updatedAnn : ann)),
            };
        });
        setSelectedAnnotation((curr) => {
            if (curr && curr.page === page && curr.id === updatedAnn.id) {
                return updatedAnn;
            }
            return curr;
        });
    }, []);

    const clearAnnotations = useCallback(() => {
        setAnnotations({});
        setSelectedAnnotation(null);
        nextHighlightIdRef.current = 1;
    }, []);

    const clearAnnotationsByType = useCallback((type: HighlightType, pageNumber?: number) => {
        setAnnotations((prev) => {
            if (pageNumber !== undefined) {
                const pageAnns = prev[pageNumber] || [];
                const filtered = pageAnns.filter((a) => a.type !== type);
                return { ...prev, [pageNumber]: filtered };
            }
            const newMap: Record<number, HighlightRect[]> = {};
            Object.entries(prev).forEach(([pageStr, arr]) => {
                const filtered = arr.filter((a) => a.type !== type);
                if (filtered.length > 0) {
                    newMap[parseInt(pageStr)] = filtered;
                }
            });
            return newMap;
        });
        setSelectedAnnotation((curr) => {
            if (curr && curr.type === type) {
                if (pageNumber === undefined || curr.page === pageNumber) {
                    return null;
                }
            }
            return curr;
        });
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('pdf-annotations', JSON.stringify(annotations));
        } catch (error) {
            console.error('Error saving annotations:', error);
        }
    }, [annotations]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('pdf-annotations');
            if (saved) {
                setAnnotations(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Error loading annotations:', error);
        }
    }, []);

    return (
        <HighlightContext.Provider
            value={{
                annotations,
                setAnnotations,
                addAnnotation,
                removeAnnotation,
                updateAnnotation,
                clearAnnotations,
                clearAnnotationsByType,
                getNextHighlightId,
                selectedAnnotation,
                setSelectedAnnotation,
                showSearchHighlights,
                setShowSearchHighlights,
                showEntityHighlights,
                setShowEntityHighlights,
                showManualHighlights,
                setShowManualHighlights,
            }}
        >
            {children}
        </HighlightContext.Provider>
    );
};
