import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {useFileContext} from './FileContext';
import highlightManager from '../utils/HighlightManager';
import {getFileKey} from './PDFViewerContext';
import { HighlightType, HighlightRect, FileAnnotationsMap } from '../types/pdfTypes';

/**
 * Interface for the HighlightContext that provides methods for managing highlights
 */
interface HighlightContextProps {
    // Basic highlight operations
    getAnnotations: (page: number, fileKey?: string) => HighlightRect[];
    addAnnotation: (page: number, ann: HighlightRect, fileKey?: string) => void;
    removeAnnotation: (page: number, id: string, fileKey?: string) => void;
    updateAnnotation: (page: number, updatedAnn: HighlightRect, fileKey?: string) => void;
    
    // Batch operations
    clearAnnotations: (fileKey?: string) => void;
    clearAnnotationsByType: (type: HighlightType, pageNumber?: number, fileKey?: string) => void;
    clearAnnotationsForFile: (fileKey: string) => void;
    
    // Highlight ID generation
    getNextHighlightId: (prefix?: string) => string;
    
    // Selection state
    selectedAnnotation: HighlightRect | null;
    setSelectedAnnotation: React.Dispatch<React.SetStateAction<HighlightRect | null>>;
    
    // Visibility toggles
    showSearchHighlights: boolean;
    setShowSearchHighlights: React.Dispatch<React.SetStateAction<boolean>>;
    showEntityHighlights: boolean;
    setShowEntityHighlights: React.Dispatch<React.SetStateAction<boolean>>;
    showManualHighlights: boolean;
    setShowManualHighlights: React.Dispatch<React.SetStateAction<boolean>>;
    
    // Import/Export
    exportAnnotations: (fileKey?: string) => string;
    importAnnotations: (data: string, fileKey?: string) => boolean;
    
    // Collection access
    getAllFileAnnotations: () => FileAnnotationsMap;
    getFileAnnotations: (fileKey: string) => Map<number, HighlightRect[]> | undefined;
    
    // Entity processing
    resetProcessedEntityPages: () => void;
    
    // Text search operations
    deleteHighlightsByText: (text: string, fileKey?: string) => number;
    findHighlightsByText: (text: string, fileKey?: string) => HighlightRect[];
    
    // Async variants for performance-critical operations
    deleteHighlightsByTextAsync: (text: string, fileKey?: string) => Promise<number>;
    findHighlightsByTextAsync: (text: string, fileKey?: string) => Promise<HighlightRect[]>;
}

const HighlightContext = createContext<HighlightContextProps | undefined>(undefined);

export const useHighlightContext = () => {
    const context = useContext(HighlightContext);
    if (!context) {
        throw new Error('useHighlightContext must be used within a HighlightProvider');
    }
    return context;
};

export const HighlightProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {currentFile} = useFileContext();

    // Store annotations in a Map: fileKey -> Map<pageNumber, highlights[]>
    // This allows efficient storage and lookup by file and page
    const [fileAnnotations, setFileAnnotations] = useState<FileAnnotationsMap>(new Map());

    const [selectedAnnotation, setSelectedAnnotation] = useState<HighlightRect | null>(null);
    const [showSearchHighlights, setShowSearchHighlights] = useState(true);
    const [showEntityHighlights, setShowEntityHighlights] = useState(true);
    const [showManualHighlights, setShowManualHighlights] = useState(true);

    // Track the last active file to prevent unnecessary resets
    const lastActiveFileRef = useRef<string | null>(null);

    // Get a unique key for the current file
    const getCurrentFileKey = useCallback((): string => {
        if (!currentFile) return '_default';
        return getFileKey(currentFile);
    }, [currentFile]);

    // Initialize fileAnnotations from the highlightManager when component mounts
    useEffect(() => {
        // Load all highlight data from highlightManager (which uses both IndexedDB and localStorage)
        const loadHighlights = async () => {
            try {
                console.log(`[HighlightContext] Loading highlights from storage...`);
                
                // Import all data from highlightManager (which includes both localStorage and IndexedDB)
                const allHighlights = await highlightManager.exportHighlights();
                
                if (allHighlights.length > 0) {
                    console.log(`[HighlightContext] Processing ${allHighlights.length} highlights from storage`);
                    
                    // Group highlights by fileKey and page number
                    const newFileAnnotations = new Map<string, Map<number, HighlightRect[]>>();
    
                    allHighlights.forEach(highlight => {
                        const fileKey = highlight.fileKey ?? '_default';
                        const page = highlight.page;
    
                        // Get or create file map
                        let fileMap = newFileAnnotations.get(fileKey);
                        if (!fileMap) {
                            fileMap = new Map<number, HighlightRect[]>();
                            newFileAnnotations.set(fileKey, fileMap);
                        }
    
                        // Get or create page highlights
                        let pageHighlights = fileMap.get(page) || [];
    
                        // Add highlight to page
                        pageHighlights = [...pageHighlights, highlight];
                        fileMap.set(page, pageHighlights);
                    });
    
                    setFileAnnotations(newFileAnnotations);
                    console.log(`[HighlightContext] Loaded ${allHighlights.length} highlights from storage`);
                    
                    // Log file highlight counts for debugging
                    newFileAnnotations.forEach((fileMap, fileKey) => {
                        let count = 0;
                        fileMap.forEach(highlights => {
                            count += highlights.length;
                        });
                        console.log(`[HighlightContext] File ${fileKey}: ${count} highlights across ${fileMap.size} pages`);
                    });
                } else {
                    console.log('[HighlightContext] No highlights found in storage');
                }
                
                // Listen for highlight load events from storage
                const handleHighlightsLoaded = (event: Event) => {
                    const customEvent = event as CustomEvent;
                    const { fileKey, count } = customEvent.detail || {};
                    
                    if (fileKey && count > 0) {
                        console.log(`[HighlightContext] Received highlights-loaded event for ${fileKey} with ${count} highlights`);
                        
                        // Refresh highlights for this file from highlightManager
                        highlightManager.exportHighlights(fileKey)
                            .then(fileHighlights => {
                                // Update our in-memory state with these highlights
                                if (fileHighlights.length > 0) {
                                    setFileAnnotations(prev => {
                                        const newFileAnnotations = new Map(prev);
                                        
                                        // Create a new file map for this fileKey
                                        const fileMap = new Map<number, HighlightRect[]>();
                                        
                                        // Group highlights by page
                                        fileHighlights.forEach(highlight => {
                                            const page = highlight.page;
                                            let pageHighlights = fileMap.get(page) || [];
                                            pageHighlights = [...pageHighlights, highlight];
                                            fileMap.set(page, pageHighlights);
                                        });
                                        
                                        // Update the file entry
                                        newFileAnnotations.set(fileKey, fileMap);
                                        
                                        return newFileAnnotations;
                                    });
                                    
                                    console.log(`[HighlightContext] Updated in-memory state with ${fileHighlights.length} highlights for ${fileKey}`);
                                }
                            })
                            .catch(error => {
                                console.error(`[HighlightContext] Error refreshing highlights for ${fileKey}:`, error);
                            });
                    }
                };
                
                // Listen for highlight loading events
                window.addEventListener('file-highlights-loaded', handleHighlightsLoaded);
                
                // Clean up event listener
                return () => {
                    window.removeEventListener('file-highlights-loaded', handleHighlightsLoaded);
                };
            } catch (error) {
                console.error('[HighlightContext] Error loading highlights:', error);
            }
        };
        
        loadHighlights();
    }, []);

    const resetProcessedEntityPages = useCallback(() => {
        // This function will be called when we need to force re-processing of entity highlights
        // Only reset if we have entity detection results to process
        // This prevents unnecessary resets when switching files
        const fileKey = getCurrentFileKey();

        // Create an event that useHighlights hook can listen for
        window.dispatchEvent(new CustomEvent('reset-entity-highlights', {
            detail: {fileKey, resetType: 'detection-update'}
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
            console.log(`[HighlightContext] File changed from ${lastActiveFileRef.current ?? 'none'} to ${currentFileKey}`);
            lastActiveFileRef.current = currentFileKey;

            // We don't reset entity highlights here anymore to preserve them when switching files
            // This is the key change to fix the entity highlight persistence issue
        }
    }, [currentFile, getCurrentFileKey]);

    // Generate a unique ID using the highlightManager
    const getNextHighlightId = useCallback((prefix?: string): string => {
        return highlightManager.generateUniqueId(prefix ?? '');
    }, []);

    // Get annotations for a specific page and file
    const getAnnotations = useCallback((page: number, fileKey?: string): HighlightRect[] => {
        const targetFileKey = fileKey ?? getCurrentFileKey();
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
        const targetFileKey = fileKey ?? getCurrentFileKey();

        // Ensure annotation has a unique ID and proper fileKey
        const annotationWithFileKey: HighlightRect = {
            ...ann,
            id: ann.id || getNextHighlightId(ann.type),
            fileKey: targetFileKey,
            // Add timestamp if not present for better tracking
            timestamp: ann.timestamp ?? Date.now()
        };
        // For entity highlights, check for duplicates (within a small tolerance)
        if (annotationWithFileKey.type === HighlightType.ENTITY) {
            const existingAnnotations = getAnnotations(page, targetFileKey);
            const duplicate = existingAnnotations.find(a =>
                a.type === HighlightType.ENTITY &&
                a.text === annotationWithFileKey.text &&
                Math.abs(a.x - annotationWithFileKey.x) < 5 &&
                Math.abs(a.y - annotationWithFileKey.y) < 5 &&
                Math.abs(a.w - annotationWithFileKey.w) < 5 &&
                Math.abs(a.h - annotationWithFileKey.h) < 5
            );
            if (duplicate) {
                // Skip adding duplicate detection highlight
                return;
            }
        }
        // Store annotation in highlightManager for persistence
        highlightManager.storeHighlightData(annotationWithFileKey);

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

            // Only add the annotation if it doesn't already exist
            if (!pageAnnotations.some(a => a.id === annotationWithFileKey.id)) {
                fileMap.set(page, [...pageAnnotations, annotationWithFileKey]);
            }

            return newMap;
        });
    }, [getCurrentFileKey, getNextHighlightId, getAnnotations]);

    // Remove annotation from a specific file and page
    const removeAnnotation = useCallback((page: number, id: string, fileKey?: string) => {
        const targetFileKey = fileKey ?? getCurrentFileKey();

        // Remove from highlightManager first
        highlightManager.removeHighlightData(id);

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
        const targetFileKey = fileKey ?? getCurrentFileKey();

        // Ensure the updated annotation has the right fileKey
        const annotationWithFileKey: HighlightRect = {
            ...updatedAnn,
            fileKey: targetFileKey,
            timestamp: updatedAnn.timestamp ?? Date.now()
        };

        // Update in highlightManager
        highlightManager.storeHighlightData(annotationWithFileKey);

        setFileAnnotations(prev => {
            const newMap = new Map(prev);
            const fileMap = newMap.get(targetFileKey);
            if (!fileMap) return newMap;

            const pageAnnotations = fileMap.get(page);
            if (!pageAnnotations) return newMap;

            // Update the annotation
            fileMap.set(page, pageAnnotations.map(ann =>
                ann.id === updatedAnn.id ? annotationWithFileKey : ann
            ));

            return newMap;
        });

        // Update selected annotation if it's the one being updated
        setSelectedAnnotation(curr => {
            if (curr && curr.page === page && curr.id === updatedAnn.id) {
                return annotationWithFileKey;
            }
            return curr;
        });
    }, [getCurrentFileKey]);

    // Clear all annotations for a specific file or current file
    const clearAnnotations = useCallback((fileKey?: string) => {
        const targetFileKey = fileKey ?? getCurrentFileKey();

        // Get all highlights from this file
        const fileMap = fileAnnotations.get(targetFileKey);
        if (fileMap) {
            // Remove all highlights from this file from the highlightManager
            fileMap.forEach((highlights) => {
                highlights.forEach(highlight => {
                    highlightManager.removeHighlightData(highlight.id);
                });
            });
        }

        setFileAnnotations(prev => {
            const newMap = new Map(prev);
            newMap.delete(targetFileKey);
            return newMap;
        });

        // Reset selected annotation
        setSelectedAnnotation(null);
    }, [getCurrentFileKey, fileAnnotations]);

    // Clear annotations for a specific file
    const clearAnnotationsForFile = useCallback((fileKey: string) => {
        // Get all highlights from this file
        const fileMap = fileAnnotations.get(fileKey);
        if (fileMap) {
            // Remove all highlights from this file from the highlightManager
            fileMap.forEach((highlights) => {
                highlights.forEach(highlight => {
                    highlightManager.removeHighlightData(highlight.id);
                });
            });
        }

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
    }, [fileAnnotations]);

    // Clear annotations by type, with optional page number and file key filtering
    const clearAnnotationsByType = useCallback((
        type: HighlightType,
        pageNumber?: number,
        fileKey?: string
    ) => {
        const targetFileKey = fileKey ?? getCurrentFileKey();

        setFileAnnotations(prev => {
            const newMap = new Map(prev);
            const fileMap = newMap.get(targetFileKey);
            if (!fileMap) return newMap;

            // If a specific page is given, only update that page
            if (pageNumber !== undefined) {
                const pageAnnotations = fileMap.get(pageNumber);
                if (!pageAnnotations) return newMap;

                // Remove highlights of this type from highlightManager
                pageAnnotations.forEach(highlight => {
                    if (highlight.type === type) {
                        highlightManager.removeHighlightData(highlight.id);
                    }
                });

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
                    // Remove highlights of this type from highlightManager
                    annotations.forEach(highlight => {
                        if (highlight.type === type) {
                            highlightManager.removeHighlightData(highlight.id);
                        }
                    });

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
        const targetFileKey = fileKey ?? getCurrentFileKey();

        // This is a synchronous method for backward compatibility
        // It returns a JSON string of the current in-memory highlights
        
        // Start the async export in the background to update cache
        highlightManager.exportHighlights(targetFileKey)
            .catch(error => {
                console.error('[HighlightContext] Error in background export:', error);
            });
        
        // Get highlights from our in-memory state
        const highlights: HighlightRect[] = [];
        const fileMap = fileAnnotations.get(targetFileKey);
        
        if (fileMap) {
            fileMap.forEach(pageHighlights => {
                highlights.push(...pageHighlights);
            });
        }
        
        return JSON.stringify(highlights);
    }, [getCurrentFileKey, fileAnnotations]);

    // Import annotations from JSON string
    const importAnnotations = useCallback((data: string, fileKey?: string): boolean => {
        try {
            const targetFileKey = fileKey ?? getCurrentFileKey();
            const parsed = JSON.parse(data) as HighlightRect[];

            // Ensure each highlight has the right fileKey
            const highlightsWithFileKey = parsed.map(highlight => ({
                ...highlight,
                fileKey: targetFileKey
            }));

            // Import into highlightManager
            highlightManager.importHighlights(highlightsWithFileKey);

            // Update state
            setFileAnnotations(prev => {
                const newMap = new Map(prev);

                // Group highlights by page
                const fileMap = new Map<number, HighlightRect[]>();

                highlightsWithFileKey.forEach(highlight => {
                    const page = highlight.page;
                    const pageHighlights = fileMap.get(page) || [];
                    fileMap.set(page, [...pageHighlights, highlight]);
                });

                // Update the file entry
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

    // Async version - for new code
    const deleteHighlightsByTextAsync = useCallback(async (text: string, fileKey?: string): Promise<number> => {
        const targetFileKey = fileKey ?? getCurrentFileKey();
        const highlightsToDelete = await highlightManager.findHighlightsByText(text, targetFileKey);

        // Remove all matching highlights
        let count = 0;
        for (const highlight of highlightsToDelete) {
            await removeAnnotation(highlight.page, highlight.id, highlight.fileKey);
            count++;
        }

        return count;
    }, [getCurrentFileKey, removeAnnotation]);
    
    // Synchronous backward compatibility wrapper
    const deleteHighlightsByText = useCallback((text: string, fileKey?: string): number => {
        const targetFileKey = fileKey ?? getCurrentFileKey();
        
        // Start the async operation in the background
        deleteHighlightsByTextAsync(text, targetFileKey)
            .catch(error => {
                console.error('[HighlightContext] Error in background delete:', error);
            });
        
        // Return a best guess count from in-memory data
        const normalizedText = text.toLowerCase().trim();
        let count = 0;
        
        fileAnnotations.forEach((fileMap, fileK) => {
            if (targetFileKey && fileK !== targetFileKey) return;
            
            fileMap.forEach((pageAnnotations, page) => {
                const toRemove: string[] = [];
                
                pageAnnotations.forEach(ann => {
                    const highlightText = ann.text?.toLowerCase().trim() || '';
                    if (highlightText === normalizedText) {
                        toRemove.push(ann.id);
                        count++;
                    }
                });
            });
        });
        
        return count;
    }, [getCurrentFileKey, deleteHighlightsByTextAsync, fileAnnotations]);

    // Async version - for new code 
    const findHighlightsByTextAsync = useCallback(async (text: string, fileKey?: string): Promise<HighlightRect[]> => {
        const targetFileKey = fileKey ?? getCurrentFileKey();
        return await highlightManager.findHighlightsByText(text, targetFileKey);
    }, [getCurrentFileKey]);
    
    // Synchronous backward compatibility wrapper
    const findHighlightsByText = useCallback((text: string, fileKey?: string): HighlightRect[] => {
        const targetFileKey = fileKey ?? getCurrentFileKey();
        // This is a synchronous version that returns an empty array immediately
        // The actual async search will happen in the background
        
        // Start the asynchronous operation to update cache in the background
        highlightManager.findHighlightsByText(text, targetFileKey)
        
        // Return a best-effort result from in-memory data
        const results: HighlightRect[] = [];
        const normalizedText = text.toLowerCase().trim();
        
        fileAnnotations.forEach((fileMap, fileK) => {
            if (targetFileKey && fileK !== targetFileKey) return;
            
            fileMap.forEach(pageAnnotations => {
                pageAnnotations.forEach(ann => {
                    const highlightText = ann.text?.toLowerCase().trim() || '';
                    if (highlightText === normalizedText) {
                        results.push(ann);
                    }
                });
            });
        });
        
        return results;
    }, [getCurrentFileKey, fileAnnotations]);

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
                deleteHighlightsByText,
                findHighlightsByText,
                // New async methods
                deleteHighlightsByTextAsync,
                findHighlightsByTextAsync
            }}
        >
            {children}
        </HighlightContext.Provider>
    );
};
