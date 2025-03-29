import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useFileContext } from './FileContext';

// Define highlight types
export enum HighlightType {
    MANUAL = 'MANUAL',
    SEARCH = 'SEARCH',
    ENTITY = 'ENTITY',
}

export interface HighlightRect {
    id: string;
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
    fileKey?: string; // Added to track which file this highlight belongs to
    model?: string;
    timestamp?: number
}

// File annotations map structure: fileKey -> {pageNumber -> highlights[]}
type FileAnnotationsMap = Map<string, Map<number, HighlightRect[]>>;

interface HighlightContextProps {
    getAnnotations: (page: number, fileKey?: string) => HighlightRect[];
    addAnnotation: (page: number, ann: HighlightRect, fileKey?: string) => void;
    removeAnnotation: (page: number, id: string, fileKey?: string) => void;
    updateAnnotation: (page: number, updatedAnn: HighlightRect, fileKey?: string) => void;
    clearAnnotations: (fileKey?: string) => void;
    clearAnnotationsByType: (type: HighlightType, pageNumber?: number, fileKey?: string) => void;
    clearAnnotationsForFile: (fileKey: string) => void;
    getNextHighlightId: () => string;
    selectedAnnotation: HighlightRect | null;
    setSelectedAnnotation: React.Dispatch<React.SetStateAction<HighlightRect | null>>;
    showSearchHighlights: boolean;
    setShowSearchHighlights: React.Dispatch<React.SetStateAction<boolean>>;
    showEntityHighlights: boolean;
    setShowEntityHighlights: React.Dispatch<React.SetStateAction<boolean>>;
    showManualHighlights: boolean;
    setShowManualHighlights: React.Dispatch<React.SetStateAction<boolean>>;
    exportAnnotations: (fileKey?: string) => string;
    importAnnotations: (data: string, fileKey?: string) => boolean;
    getAllFileAnnotations: () => FileAnnotationsMap;
    resetProcessedEntityPages: () => void;
    getFileAnnotations: (fileKey: string) => Map<number, HighlightRect[]> | undefined;
    dumpAnnotationStats: () => void;
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
    const { currentFile } = useFileContext();

    // Store annotations in a Map: fileKey -> Map<pageNumber, highlights[]>
    // This allows efficient storage and lookup by file and page
    const [fileAnnotations, setFileAnnotations] = useState<FileAnnotationsMap>(new Map());

    // Use a single counter for all highlight IDs
    const nextHighlightIdRef = useRef(1);

    const [selectedAnnotation, setSelectedAnnotation] = useState<HighlightRect | null>(null);
    const [showSearchHighlights, setShowSearchHighlights] = useState(true);
    const [showEntityHighlights, setShowEntityHighlights] = useState(true);
    const [showManualHighlights, setShowManualHighlights] = useState(true);

    // Track the last active file to prevent unnecessary resets
    const lastActiveFileRef = useRef<string | null>(null);

    // Get a unique key for the current file
    const getCurrentFileKey = useCallback((): string => {
        if (!currentFile) return '_default';
        return `${currentFile.name}-${currentFile.lastModified}`;
    }, [currentFile]);

    const resetProcessedEntityPages = useCallback(() => {
        // This function will be called when we need to force re-processing of entity highlights
        console.log('[HighlightContext] Resetting processed entity pages');

        // Only reset if we have entity detection results to process
        // This prevents unnecessary resets when switching files
        const fileKey = getCurrentFileKey();

        // Create an event that useHighlights hook can listen for
        window.dispatchEvent(new CustomEvent('reset-entity-highlights', {
            detail: { fileKey, resetType: 'detection-update' }
        }));

        // Also reset the static processed entities map in EntityHighlightManager
        // This is done through a global function that will be available after our changes
        if (typeof window.resetEntityHighlightsForFile === 'function') {
            window.resetEntityHighlightsForFile(fileKey);
            console.log(`[HighlightContext] Reset entity highlights for file ${fileKey}`);
        }
    }, [getCurrentFileKey]);

    // Reset selected annotation when file changes, but preserve entity highlights
    useEffect(() => {
        if (!currentFile) return;

        const currentFileKey = getCurrentFileKey();

        // Only reset selected annotation
        setSelectedAnnotation(null);

        // Track file changes to prevent unnecessary resets
        if (lastActiveFileRef.current !== currentFileKey) {
            console.log(`[HighlightContext] File changed from ${lastActiveFileRef.current || 'none'} to ${currentFileKey}`);
            lastActiveFileRef.current = currentFileKey;

            // We don't reset entity highlights here anymore to preserve them when switching files
            // This is the key change to fix the entity highlight persistence issue
        }
    }, [currentFile, getCurrentFileKey]);

    // Generate a unique ID for new highlights
    const getNextHighlightId = useCallback((): string => {
        const id = nextHighlightIdRef.current;
        nextHighlightIdRef.current += 1;
        return id.toString();
    }, []);

    // Debugging function to log annotation statistics
    const dumpAnnotationStats = useCallback(() => {
        console.log('==== ANNOTATION STATS ====');
        console.log(`Total file entries: ${fileAnnotations.size}`);

        let totalHighlights = 0;
        let manualHighlights = 0;
        let entityHighlights = 0;
        let searchHighlights = 0;

        fileAnnotations.forEach((fileMap, fileKey) => {
            let fileHighlightCount = 0;
            let fileManualCount = 0;
            let fileEntityCount = 0;
            let fileSearchCount = 0;

            fileMap.forEach((highlights, pageNum) => {
                fileHighlightCount += highlights.length;

                highlights.forEach(h => {
                    if (h.type === HighlightType.MANUAL) fileManualCount++;
                    else if (h.type === HighlightType.ENTITY) fileEntityCount++;
                    else if (h.type === HighlightType.SEARCH) fileSearchCount++;
                });
            });

            console.log(`File ${fileKey}: ${fileHighlightCount} highlights (${fileManualCount} manual, ${fileEntityCount} entity, ${fileSearchCount} search) across ${fileMap.size} pages`);

            totalHighlights += fileHighlightCount;
            manualHighlights += fileManualCount;
            entityHighlights += fileEntityCount;
            searchHighlights += fileSearchCount;
        });

        console.log(`Total highlights: ${totalHighlights} (${manualHighlights} manual, ${entityHighlights} entity, ${searchHighlights} search)`);
        console.log('=========================');
    }, [fileAnnotations]);

    // Get annotations for a specific page and file
    const getAnnotations = useCallback((page: number, fileKey?: string): HighlightRect[] => {
        const targetFileKey = fileKey || getCurrentFileKey();
        const fileMap = fileAnnotations.get(targetFileKey);
        if (!fileMap) return [];

        const pageAnnotations = fileMap.get(page);

        // Ensure we're only returning annotations that belong to this file
        // This adds an extra layer of protection against cross-contamination
        return (pageAnnotations || []).filter(ann => !ann.fileKey || ann.fileKey === targetFileKey);
    }, [fileAnnotations, getCurrentFileKey]);

    // Get all annotations for a specific file
    const getFileAnnotations = useCallback((fileKey: string): Map<number, HighlightRect[]> | undefined => {
        return fileAnnotations.get(fileKey);
    }, [fileAnnotations]);

    // Add annotation to a specific file and page
    const addAnnotation = useCallback((page: number, ann: HighlightRect, fileKey?: string) => {
        const targetFileKey = fileKey || getCurrentFileKey();

        // Ensure annotation has the correct fileKey
        const annotationWithFileKey = {
            ...ann,
            fileKey: targetFileKey
        };

        setFileAnnotations(prev => {
            const newMap = new Map(prev);

            // Get or create the file map
            let fileMap = newMap.get(targetFileKey);
            if (!fileMap) {
                fileMap = new Map<number, HighlightRect[]>();
                newMap.set(targetFileKey, fileMap);
            }

            // Get or create the page annotations
            const pageAnnotations = fileMap.get(page) || [];

            // Check for duplicate IDs to prevent adding the same highlight twice
            const isDuplicate = pageAnnotations.some(existing => existing.id === annotationWithFileKey.id);
            if (isDuplicate) {
                console.log(`[HighlightContext] Duplicate highlight ID detected: ${annotationWithFileKey.id}, skipping`);
                return newMap;
            }

            // Add the new annotation
            fileMap.set(page, [...pageAnnotations, annotationWithFileKey]);

            return newMap;
        });
    }, [getCurrentFileKey]);

    // Remove annotation from a specific file and page
    const removeAnnotation = useCallback((page: number, id: string, fileKey?: string) => {
        const targetFileKey = fileKey || getCurrentFileKey();

        setFileAnnotations(prev => {
            const newMap = new Map(prev);
            const fileMap = newMap.get(targetFileKey);
            if (!fileMap) return newMap;

            const pageAnnotations = fileMap.get(page);
            if (!pageAnnotations) return newMap;

            // Filter out the annotation to remove
            const filtered = pageAnnotations.filter(ann => ann.id !== id);

            // If no annotations left on this page, remove the page entry
            if (filtered.length === 0) {
                fileMap.delete(page);

                // If no pages left for this file, remove the file entry
                if (fileMap.size === 0) {
                    newMap.delete(targetFileKey);
                }
            } else {
                fileMap.set(page, filtered);
            }

            return newMap;
        });

        // Reset selected annotation if it's the one being removed
        setSelectedAnnotation(curr => {
            if (curr && curr.page === page && curr.id === id) {
                return null;
            }
            return curr;
        });
    }, [getCurrentFileKey]);

    // Update an existing annotation
    const updateAnnotation = useCallback((page: number, updatedAnn: HighlightRect, fileKey?: string) => {
        const targetFileKey = fileKey || getCurrentFileKey();

        setFileAnnotations(prev => {
            const newMap = new Map(prev);
            const fileMap = newMap.get(targetFileKey);
            if (!fileMap) return newMap;

            const pageAnnotations = fileMap.get(page);
            if (!pageAnnotations) return newMap;

            // Update the annotation
            fileMap.set(page, pageAnnotations.map(ann =>
                ann.id === updatedAnn.id ? {...updatedAnn, fileKey: targetFileKey} : ann
            ));

            return newMap;
        });

        // Update selected annotation if it's the one being updated
        setSelectedAnnotation(curr => {
            if (curr && curr.page === page && curr.id === updatedAnn.id) {
                return {...updatedAnn, fileKey: targetFileKey};
            }
            return curr;
        });
    }, [getCurrentFileKey]);

    // Clear all annotations for a specific file or current file
    const clearAnnotations = useCallback((fileKey?: string) => {
        const targetFileKey = fileKey || getCurrentFileKey();

        setFileAnnotations(prev => {
            const newMap = new Map(prev);
            newMap.delete(targetFileKey);
            return newMap;
        });

        // Reset selected annotation
        setSelectedAnnotation(null);
    }, [getCurrentFileKey]);

    // Clear annotations for a specific file
    const clearAnnotationsForFile = useCallback((fileKey: string) => {
        setFileAnnotations(prev => {
            const newMap = new Map(prev);
            newMap.delete(fileKey);
            return newMap;
        });

        // Reset selected annotation if it belongs to this file
        setSelectedAnnotation(curr => {
            if (curr && curr.fileKey === fileKey) {
                return null;
            }
            return curr;
        });
    }, []);

    // Clear annotations by type, with optional page number and file key filtering
    const clearAnnotationsByType = useCallback((
        type: HighlightType,
        pageNumber?: number,
        fileKey?: string
    ) => {
        const targetFileKey = fileKey || getCurrentFileKey();

        setFileAnnotations(prev => {
            const newMap = new Map(prev);
            const fileMap = newMap.get(targetFileKey);
            if (!fileMap) return newMap;

            // If a specific page is given, only update that page
            if (pageNumber !== undefined) {
                const pageAnnotations = fileMap.get(pageNumber);
                if (!pageAnnotations) return newMap;

                const filtered = pageAnnotations.filter(ann => ann.type !== type);

                if (filtered.length === 0) {
                    fileMap.delete(pageNumber);

                    // If no pages left for this file, remove the file entry
                    if (fileMap.size === 0) {
                        newMap.delete(targetFileKey);
                    }
                } else {
                    fileMap.set(pageNumber, filtered);
                }
            } else {
                // Otherwise, update all pages
                for (const [page, annotations] of fileMap.entries()) {
                    const filtered = annotations.filter(ann => ann.type !== type);

                    if (filtered.length === 0) {
                        fileMap.delete(page);
                    } else {
                        fileMap.set(page, filtered);
                    }
                }

                // If no pages left for this file, remove the file entry
                if (fileMap.size === 0) {
                    newMap.delete(targetFileKey);
                }
            }

            return newMap;
        });

        // Reset selected annotation if it's of the type being cleared
        setSelectedAnnotation(curr => {
            if (curr && curr.type === type) {
                if (fileKey === undefined || curr.fileKey === fileKey) {
                    if (pageNumber === undefined || curr.page === pageNumber) {
                        return null;
                    }
                }
            }
            return curr;
        });
    }, [getCurrentFileKey]);

    // Export annotations to JSON string
    const exportAnnotations = useCallback((fileKey?: string): string => {
        const targetFileKey = fileKey || getCurrentFileKey();
        const fileMap = fileAnnotations.get(targetFileKey);

        if (!fileMap) return JSON.stringify({});

        // Convert Map to plain object for serialization
        const annotations: Record<string, HighlightRect[]> = {};

        for (const [page, highlights] of fileMap.entries()) {
            annotations[page.toString()] = highlights;
        }

        return JSON.stringify(annotations);
    }, [fileAnnotations, getCurrentFileKey]);

    // Import annotations from JSON string
    const importAnnotations = useCallback((data: string, fileKey?: string): boolean => {
        try {
            const targetFileKey = fileKey || getCurrentFileKey();
            const parsed = JSON.parse(data);

            setFileAnnotations(prev => {
                const newMap = new Map(prev);

                // Create a new file map
                const fileMap = new Map<number, HighlightRect[]>();

                // Add all page annotations
                for (const [pageStr, annotations] of Object.entries(parsed)) {
                    const page = parseInt(pageStr);
                    fileMap.set(page, (annotations as HighlightRect[]).map(ann => ({
                        ...ann,
                        fileKey: targetFileKey
                    })));
                }

                // Update the file map
                if (fileMap.size > 0) {
                    newMap.set(targetFileKey, fileMap);
                } else {
                    newMap.delete(targetFileKey);
                }

                return newMap;
            });

            return true;
        } catch (error) {
            console.error('Error importing annotations:', error);
            return false;
        }
    }, [getCurrentFileKey]);

    // Get all file annotations (for use in batch operations)
    const getAllFileAnnotations = useCallback((): FileAnnotationsMap => {
        return fileAnnotations;
    }, [fileAnnotations]);

    // Persist annotations in localStorage when they change
    useEffect(() => {
        try {
            // Convert the Map to a serializable format
            const serialized: Record<string, Record<string, HighlightRect[]>> = {};

            for (const [fileKey, fileMap] of fileAnnotations.entries()) {
                serialized[fileKey] = {};

                for (const [page, annotations] of fileMap.entries()) {
                    serialized[fileKey][page.toString()] = annotations;
                }
            }

            localStorage.setItem('pdf-annotations', JSON.stringify(serialized));
        } catch (error) {
            console.error('Error saving annotations:', error);
        }
    }, [fileAnnotations]);

    // Load annotations from localStorage when component mounts
    useEffect(() => {
        try {
            const saved = localStorage.getItem('pdf-annotations');
            if (saved) {
                const parsed = JSON.parse(saved);
                const loadedMap = new Map<string, Map<number, HighlightRect[]>>();

                for (const [fileKey, pageData] of Object.entries(parsed)) {
                    const fileMap = new Map<number, HighlightRect[]>();

                    for (const [pageStr, annotations] of Object.entries(pageData as Record<string, HighlightRect[]>)) {
                        const page = parseInt(pageStr);
                        fileMap.set(page, annotations);
                    }

                    if (fileMap.size > 0) {
                        loadedMap.set(fileKey, fileMap);
                    }
                }

                setFileAnnotations(loadedMap);

                // Update the highlight ID counter to be greater than any existing ID
                let maxId = 0;

                for (const fileMap of loadedMap.values()) {
                    for (const annotations of fileMap.values()) {
                        for (const ann of annotations) {
                            const id = parseInt(ann.id);
                            if (!isNaN(id) && id > maxId) {
                                maxId = id;
                            }
                        }
                    }
                }

                nextHighlightIdRef.current = maxId + 1;
            }
        } catch (error) {
            console.error('Error loading annotations:', error);
        }
    }, []);

    return (
        <HighlightContext.Provider
            value={{
                getAnnotations,
                addAnnotation,
                removeAnnotation,
                updateAnnotation,
                clearAnnotations,
                clearAnnotationsByType,
                clearAnnotationsForFile,
                getNextHighlightId,
                selectedAnnotation,
                setSelectedAnnotation,
                showSearchHighlights,
                setShowSearchHighlights,
                showEntityHighlights,
                setShowEntityHighlights,
                showManualHighlights,
                setShowManualHighlights,
                exportAnnotations,
                importAnnotations,
                getAllFileAnnotations,
                resetProcessedEntityPages,
                getFileAnnotations,
                dumpAnnotationStats
            }}
        >
            {children}
        </HighlightContext.Provider>
    );
};
