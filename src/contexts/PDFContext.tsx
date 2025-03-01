import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { HighlightRect } from './HighlightContext';

export interface OptionType {
    value: string;
    label: string;
}

export interface RedactionItem {
    entity_type: string;
    start: number;
    end: number;
    score: number;
    bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
    boxes?: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    }[];
    content?: string;
    model?: 'presidio' | 'gliner' | 'gemini';
}

export interface RedactionMapping {
    pages: {
        page: number;
        sensitive: RedactionItem[];
    }[];
}

interface PDFContextProps {
    file: File | null;
    setFile: (file: File | null) => void;
    numPages: number;
    setNumPages: React.Dispatch<React.SetStateAction<number>>;
    currentPage: number;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    scrollToPage: (pageNumber: number) => void;
    pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    zoomLevel: number;
    setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
    isEditingMode: boolean;
    setIsEditingMode: React.Dispatch<React.SetStateAction<boolean>>;
    highlightColor: string;
    setHighlightColor: React.Dispatch<React.SetStateAction<string>>;
    searchQueries: string[];
    setSearchQueries: React.Dispatch<React.SetStateAction<string[]>>;
    isRegexSearch: boolean;
    setIsRegexSearch: React.Dispatch<React.SetStateAction<boolean>>;
    isCaseSensitive: boolean;
    setIsCaseSensitive: React.Dispatch<React.SetStateAction<boolean>>;
    searchResults: { page: number; matches: number }[];
    selectedMlEntities: OptionType[];
    setSelectedMlEntities: React.Dispatch<React.SetStateAction<OptionType[]>>;
    selectedAiEntities: OptionType[];
    setSelectedAiEntities: React.Dispatch<React.SetStateAction<OptionType[]>>;
    detectionMapping: RedactionMapping | null;
    setDetectionMapping: React.Dispatch<React.SetStateAction<RedactionMapping | null>>;
    renderedPages: Set<number>;
    setRenderedPages: React.Dispatch<React.SetStateAction<Set<number>>>;
    activeScrollPage: number;
    mainContainerRef: React.RefObject<HTMLDivElement | null>;
    selectedGlinerEntities: OptionType[];
    setSelectedGlinerEntities: React.Dispatch<React.SetStateAction<OptionType[]>>;
}

const PDFContext = createContext<PDFContextProps | undefined>(undefined);

export const usePDFContext = () => {
    const context = useContext(PDFContext);
    if (!context) {
        throw new Error('usePDFContext must be used within a PDFProvider');
    }
    return context;
};

export const PDFProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [file, setFileInternal] = useState<File | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const mainContainerRef = useRef<HTMLDivElement | null>(null);
    const [selectedGlinerEntities, setSelectedGlinerEntities] = useState<OptionType[]>([]);

    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isEditingMode, setIsEditingMode] = useState(true);
    const [highlightColor, setHighlightColor] = useState('#00ff15');

    const [searchQueries, setSearchQueries] = useState<string[]>([]);
    const [searchResults, setSearchResults] = useState<{ page: number; matches: number }[]>([]);

    const [isRegexSearch, setIsRegexSearch] = useState(false);
    const [isCaseSensitive, setIsCaseSensitive] = useState(false);

    const [selectedMlEntities, setSelectedMlEntities] = useState<OptionType[]>([]);
    const [selectedAiEntities, setSelectedAiEntities] = useState<OptionType[]>([]);
    const [detectionMapping, setDetectionMapping] = useState<RedactionMapping | null>(null);

    const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set([1]));
    const [activeScrollPage, setActiveScrollPage] = useState(1);

    const scrollToPage = useCallback(
        (pageNumber: number) => {
            if (pageNumber < 1 || pageNumber > numPages) return;
            const pageRef = pageRefs.current[pageNumber - 1];
            if (pageRef && mainContainerRef.current) {
                const containerRect = mainContainerRef.current.getBoundingClientRect();
                const pageRect = pageRef.getBoundingClientRect();
                const scrollTop = pageRef.offsetTop - (containerRect.height - pageRect.height) / 2;
                mainContainerRef.current.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth',
                });
                setCurrentPage(pageNumber);
            }
        },
        [numPages]
    );

    const setFile = useCallback((newFile: File | null) => {
        setFileInternal(newFile);
        if (newFile) {
            setCurrentPage(1);
            setSearchQueries([]);
            setSelectedMlEntities([]);
            setSelectedGlinerEntities([]); // Reset Gliner entities
            setSelectedAiEntities([]);
            setDetectionMapping(null);
            setRenderedPages(new Set([1]));
        }
    }, []);

    useEffect(() => {
        pageRefs.current = Array(numPages).fill(null);
    }, [numPages]);

    useEffect(() => {
        const handleScroll = () => {
            if (!mainContainerRef.current || numPages === 0) return;
            let maxVisiblePage = 1;
            let maxVisibleArea = 0;

            for (let i = 0; i < pageRefs.current.length; i++) {
                const pageRef = pageRefs.current[i];
                if (!pageRef) continue;
                const containerRect = mainContainerRef.current.getBoundingClientRect();
                const pageRect = pageRef.getBoundingClientRect();
                const xOverlap = Math.max(
                    0,
                    Math.min(containerRect.right, pageRect.right) - Math.max(containerRect.left, pageRect.left)
                );
                const yOverlap = Math.max(
                    0,
                    Math.min(containerRect.bottom, pageRect.bottom) - Math.max(containerRect.top, pageRect.top)
                );
                const overlapArea = xOverlap * yOverlap;
                if (overlapArea > maxVisibleArea) {
                    maxVisibleArea = overlapArea;
                    maxVisiblePage = i + 1;
                }
            }

            setActiveScrollPage(maxVisiblePage);
            if (maxVisiblePage !== currentPage) {
                setCurrentPage(maxVisiblePage);
            }

            const newRendered = new Set(renderedPages);
            for (let i = Math.max(1, maxVisiblePage - 2); i <= Math.min(numPages, maxVisiblePage + 2); i++) {
                newRendered.add(i);
            }
            if (newRendered.size !== renderedPages.size) {
                setRenderedPages(newRendered);
            }
        };

        const container = mainContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [numPages, currentPage, renderedPages]);

    return (
        <PDFContext.Provider
            value={{
                selectedGlinerEntities,
                setSelectedGlinerEntities,
                file,
                setFile,
                numPages,
                setNumPages,
                currentPage,
                setCurrentPage,
                scrollToPage,
                pageRefs,
                zoomLevel,
                setZoomLevel,
                isEditingMode,
                setIsEditingMode,
                highlightColor,
                setHighlightColor,
                searchQueries,
                setSearchQueries,
                isRegexSearch,
                setIsRegexSearch,
                isCaseSensitive,
                setIsCaseSensitive,
                searchResults,
                selectedMlEntities,
                setSelectedMlEntities,
                selectedAiEntities,
                setSelectedAiEntities,
                detectionMapping,
                setDetectionMapping,
                renderedPages,
                setRenderedPages,
                activeScrollPage,
                mainContainerRef,
            }}
        >
            {children}
        </PDFContext.Provider>
    );
};
