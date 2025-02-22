// src/context/PdfContext.tsx
import React, { createContext, useContext, useState } from 'react';

/**
 * OptionType is typically used by react-select.
 * Adjust as needed for your entity data shape.
 */
export interface OptionType {
    value: string;
    label: string;
}

interface PdfContextProps {
    // Existing fields
    file: File | null;
    setFile: (file: File | null) => void;
    numPages: number;
    setNumPages: (pages: number) => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    isRedactionMode: boolean;
    setIsRedactionMode: (mode: boolean) => void;
    highlightColor: string;
    setHighlightColor: (color: string) => void;
    autoRedact: boolean;
    setAutoRedact: (val: boolean) => void;
    zoomLevel: number;
    setZoomLevel: (val: number) => void;

    // New fields
    searchQueries: string[]; // an array of search terms
    setSearchQueries: (val: string[]) => void;
    selectedMlEntities: OptionType[];
    setSelectedMlEntities: (vals: OptionType[]) => void;
    selectedAiEntities: OptionType[];
    setSelectedAiEntities: (vals: OptionType[]) => void;
    isEditingMode: boolean;
    setIsEditingMode: (val: boolean) => void;
}

const PdfContext = createContext<PdfContextProps | undefined>(undefined);

export const usePdfContext = () => {
    const context = useContext(PdfContext);
    if (!context) {
        throw new Error('usePdfContext must be used within a PdfProvider');
    }
    return context;
};

export const PdfProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Existing states
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isRedactionMode, setIsRedactionMode] = useState(false);
    const [highlightColor, setHighlightColor] = useState('#FF0000');
    const [autoRedact, setAutoRedact] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1.0);

    // New states
    const [searchQueries, setSearchQueries] = useState<string[]>([]); // now an array of strings
    const [selectedMlEntities, setSelectedMlEntities] = useState<OptionType[]>([]);
    const [selectedAiEntities, setSelectedAiEntities] = useState<OptionType[]>([]);
    const [isEditingMode, setIsEditingMode] = useState<boolean>(true); // default: editing on

    return (
        <PdfContext.Provider
            value={{
                // Existing
                file,
                setFile,
                numPages,
                setNumPages,
                currentPage,
                setCurrentPage,
                isRedactionMode,
                setIsRedactionMode,
                highlightColor,
                setHighlightColor,
                autoRedact,
                setAutoRedact,
                zoomLevel,
                setZoomLevel,

                // New
                searchQueries,
                setSearchQueries,
                selectedMlEntities,
                setSelectedMlEntities,
                selectedAiEntities,
                setSelectedAiEntities,
                isEditingMode,
                setIsEditingMode,
            }}
        >
            {children}
        </PdfContext.Provider>
    );
};
