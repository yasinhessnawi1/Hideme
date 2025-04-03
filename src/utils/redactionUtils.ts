// src/utils/redactionUtils.ts
import { HighlightRect, HighlightType } from "../contexts/HighlightContext";
import { RedactionMapping, Page, Sensitive, FileInfo, FileResult } from "../types/types";
import { getFileKey } from "../contexts/PDFViewerContext";

/**
 * Creates a full redaction mapping object from annotations, search results, and detection mapping
 *
 * @param fileAnnotations Record of page numbers to annotation arrays
 * @param searchResults Map of page numbers to search term maps
 * @param detectionMapping Existing detection mapping from entity detection
 * @param includeSearchHighlights Whether to include search highlights in redaction
 * @param includeEntityHighlights Whether to include entity highlights in redaction
 * @param includeManualHighlights Whether to include manual highlights in redaction
 * @returns A complete redaction mapping ready for API submission
 */
export function createFullRedactionMapping(
    fileAnnotations: Record<number, HighlightRect[]>,
    searchResults: Map<number, Map<string, any>>,
    detectionMapping: any,
    includeSearchHighlights: boolean = true,
    includeEntityHighlights: boolean = true,
    includeManualHighlights: boolean = true
): RedactionMapping {
    // Initialize the redaction mapping
    const fullMapping: RedactionMapping = {
        pages: []
    };

    // Build a set of pages that need to be included in the mapping
    const pages = new Set<number>();

    // Add pages from annotations if they should be included
    if (Object.keys(fileAnnotations).length > 0 && (includeManualHighlights || includeSearchHighlights || includeEntityHighlights)) {
        Object.keys(fileAnnotations).forEach(page => {
            pages.add(parseInt(page, 10));
        });
    }

    // Add pages from search results if they should be included
    if (searchResults.size > 0 && includeSearchHighlights) {
        searchResults.forEach((_, page) => {
            pages.add(page);
        });
    }

    // Add pages from detection mapping if they should be included
    if (detectionMapping?.pages && includeEntityHighlights) {
        detectionMapping.pages.forEach((page: any) => {
            if (page.page) {
                pages.add(page.page);
            }
        });
    }

    // Process each page and build the redaction mapping
    Array.from(pages).sort((a, b) => a - b).forEach(pageNumber => {
        const pageMapping: Page = {
            page: pageNumber,
            sensitive: []
        };

        // Process annotations for this page
        if (fileAnnotations[pageNumber]) {
            fileAnnotations[pageNumber].forEach(annotation => {
                if (!shouldIncludeAnnotation(annotation, includeManualHighlights, includeSearchHighlights, includeEntityHighlights)) {
                    return;
                }

                const sensitive: Sensitive = createSensitiveFromAnnotation(annotation);
                pageMapping.sensitive.push(sensitive);
            });
        }

        // Process search results for this page
        if (searchResults.has(pageNumber) && includeSearchHighlights) {
            const pageSearchResults = searchResults.get(pageNumber);
            if (pageSearchResults) {
                pageSearchResults.forEach((results, term) => {
                    results.forEach((result: any) => {
                        const sensitive: Sensitive = {
                            original_text: term,
                            entity_type: 'SEARCH',
                            score: 1.0,
                            start: 0, // Not tracked in our data model
                            end: 0,   // Not tracked in our data model
                            bbox: {
                                x0: result.x,
                                y0: result.y,
                                x1: result.x + result.w,
                                y1: result.y + result.h
                            }
                        };
                        pageMapping.sensitive.push(sensitive);
                    });
                });
            }
        }

        // Process entity detection results for this page if available
        if (detectionMapping?.pages && includeEntityHighlights) {
            const detectionPage = detectionMapping.pages.find((p: any) => p.page === pageNumber);
            if (detectionPage?.sensitive && Array.isArray(detectionPage.sensitive)) {
                // Add these sensitive items to our page mapping
                pageMapping.sensitive.push(...detectionPage.sensitive);
            }
        }

        // Only add the page to the mapping if it has sensitive content to redact
        if (pageMapping.sensitive.length > 0) {
            fullMapping.pages.push(pageMapping);
        }
    });

    return fullMapping;
}

/**
 * Determines if an annotation should be included in the redaction mapping
 * based on its type and the inclusion flags
 */
function shouldIncludeAnnotation(
    annotation: HighlightRect,
    includeManualHighlights: boolean,
    includeSearchHighlights: boolean,
    includeEntityHighlights: boolean
): boolean {
    switch (annotation.type) {
        case HighlightType.MANUAL:
            return includeManualHighlights;
        case HighlightType.SEARCH:
            return includeSearchHighlights;
        case HighlightType.ENTITY:
            return includeEntityHighlights;
        default:
            return false;
    }
}

/**
 * Creates a Sensitive object from a highlight annotation
 */
function createSensitiveFromAnnotation(annotation: HighlightRect): Sensitive {
   if (annotation.type === "SEARCH"){
       return {
           original_text: annotation.text ?? 'Unknown',
           entity_type: (annotation.entity ?? annotation.type) || 'MANUAL',
           score: 1.0,
           start: 0, // Not tracked in our highlighting model
           end: 0,   // Not tracked in our highlighting model
           bbox: {
               x0: annotation.x,
               y0: annotation.y,
               x1: annotation.x + annotation.w,
               y1: annotation.y + annotation.h
           }
       };
   }else if (annotation.type === 'ENTITY') {
       return {
           original_text: annotation.text ?? 'Unknown',
           entity_type: (annotation.entity ?? annotation.type) || 'MANUAL',
           score: 1.0,
           start: 0, // Not tracked in our highlighting model
           end: 0,   // Not tracked in our highlighting model
           bbox: {
               x0: annotation.x + 5,
               y0: annotation.y + 5,
               x1: (annotation.x + annotation.w) -4,
               y1: (annotation.y + annotation.h)-4
           }
       };
    }else {
   return {
       original_text: annotation.text ?? 'Unknown',
       entity_type: annotation.entity ?? annotation.type ?? 'MANUAL',
       score: 1.0,
       start: 0, // Not tracked in our highlighting model
       end: 0,   // Not tracked in our highlighting model
       bbox: {
           x0: annotation.x + 3,
           y0: annotation.y + 3,
           x1: annotation.x + annotation.w,
           y1: annotation.y + annotation.h
       }
   };
   }
}

/**
 * Creates a RedactionRequest object for the API from a mapping of fileKeys to redaction mappings
 */
export function createRedactionRequest(
    files: File[],
    redactionMappings: Record<string, RedactionMapping>,
): { file_results: FileResult[] } {
    const fileResults: FileResult[] = [];

    files.forEach(file => {
        const fileKey = getFileKey(file);
        if (redactionMappings[fileKey]) {
            const fileResult: FileResult = {
                file: file.name,
                status: "success",
                results: {
                    redaction_mapping: redactionMappings[fileKey],
                    file_info: createFileInfo(file)
                }
            };
            fileResults.push(fileResult);
        }
    });

    return { file_results: fileResults };
}

/**
 * Creates a FileInfo object from a File
 */
function createFileInfo(file: File): FileInfo {
    return {
        filename: file.name,
        content_type: file.type,
        size: file.size.toString()
    };
}

/**
 * Get statistics about the redaction mapping
 */
export function getRedactionStatistics(mapping: RedactionMapping) {
    const stats = {
        totalItems: 0,
        byType: {} as Record<string, number>,
        byPage: {} as Record<string, number>
    };

    if (!mapping.pages) {
        return stats;
    }

    mapping.pages.forEach(page => {
        if (!page.sensitive || !Array.isArray(page.sensitive)) {
            return;
        }

        const pageKey = `page_${page.page}`;
        stats.byPage[pageKey] = page.sensitive.length;
        stats.totalItems += page.sensitive.length;

        page.sensitive.forEach(item => {
            const entityType = item.entity_type || 'UNKNOWN';
            stats.byType[entityType] = (stats.byType[entityType] || 0) + 1;
        });
    });

    return stats;
}

/**
 * Process the redacted file blobs and replace the appropriate files in the application state
 */
export async function processRedactedFiles(
    redactedFiles: Record<string, Blob>,
    updateFiles: (files: File[], replace: boolean) => void,
    currentFiles: File[],
    selectedFiles: File[],
    scope: 'current' | 'selected' | 'all'
): Promise<void> {
    // Convert blobs to File objects
    const redactedFileObjects: File[] = [];

    // Process each redacted file and create File objects
    for (const [fileKey, blob] of Object.entries(redactedFiles)) {
        // Find the original file that matches this key
        const originalFile = currentFiles.find(file => getFileKey(file) === fileKey);

        if (originalFile) {
            // Create a new File object with '-redacted' suffix
            const filename = originalFile.name.replace('.pdf', '-redacted.pdf');
            const redactedFile = new File([blob], filename, { type: 'application/pdf' });
            redactedFileObjects.push(redactedFile);
        }
    }

    if (redactedFileObjects.length === 0) {
        throw new Error('No redacted files were successfully processed');
    }

    // Determine which existing files to keep based on scope
    let filesToKeep: File[] = [];

    switch (scope) {
        case 'current':
            // Keep all files except the current one(s) that were redacted
            filesToKeep = currentFiles.filter(file => {
                const fileKey = getFileKey(file);
                return !redactedFiles[fileKey];
            });
            break;

        case 'selected':
            // Keep all files except the selected ones that were redacted
            filesToKeep = currentFiles.filter(file => {
                const fileKey = getFileKey(file);
                const isSelected = selectedFiles.includes(file);
                return !(isSelected && redactedFiles[fileKey]);
            });
            break;

        case 'all':
            // Replace all files, so keep none of the existing ones
            filesToKeep = [];
            break;
    }

    // Combine the files to keep with the new redacted files
    const updatedFiles = [...filesToKeep, ...redactedFileObjects];

    // Update the files in the application state
    updateFiles(updatedFiles, true);

    return Promise.resolve();
}
