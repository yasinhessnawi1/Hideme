import { RedactionMapping, Page, Sensitive, FileInfo, FileResult ,HighlightRect, HighlightType} from "../types";
import { getFileKey } from "../contexts/PDFViewerContext";
import {getCorrectedBoundingBox} from "./utilities";

/**
 * Creates a full redaction mapping object from annotations, search results, and detection mapping
 *
 * @param fileAnnotations Record of page numbers to annotation arrays
 * @param includeSearchHighlights Whether to include search highlights in redaction
 * @param includeEntityHighlights Whether to include entity highlights in redaction
 * @param includeManualHighlights Whether to include manual highlights in redaction
 * @returns A complete redaction mapping ready for API submission
 */
export function createFullRedactionMapping(
    fileAnnotations: Record<number, HighlightRect[]>,
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


    // Process each page and build the redaction mapping
    Array.from(pages).sort((a, b) => a - b).forEach(pageNumber => {
        const pageMapping: Page = {
            page: pageNumber,
            sensitive: []
        };

        // Process annotations for this page, filtering by type according to inclusion settings
        if (fileAnnotations[pageNumber]) {
            const filteredAnnotations = fileAnnotations[pageNumber].filter(annotation =>
                shouldIncludeAnnotation(annotation, includeManualHighlights, includeSearchHighlights, includeEntityHighlights)
            );

            // Convert each filtered annotation to a sensitive item
            filteredAnnotations.forEach(annotation => {
                const sensitive: Sensitive = createSensitiveFromAnnotation(annotation);
                pageMapping.sensitive.push(sensitive);
            });
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
    // If annotation doesn't have a type, treat it as manual
    const type = annotation.type || HighlightType.MANUAL;

    switch (type) {
        case HighlightType.MANUAL:
            return includeManualHighlights;
        case HighlightType.SEARCH:
            return includeSearchHighlights;
        case HighlightType.ENTITY:
            return includeEntityHighlights;
        default:
            // For unknown types, check if it's a search highlight based on properties
            if (annotation.type == HighlightType.SEARCH|| (annotation.text && annotation.text.length > 0)) {
                return includeSearchHighlights;
            }
            // If it has an entity property, treat it as an entity highlight
            if (annotation.entity) {
                return includeEntityHighlights;
            }
            // Default to manual highlights for anything else
            return includeManualHighlights;
    }
}

/**
 * Creates a Sensitive object from a highlight annotation
 */
function createSensitiveFromAnnotation(annotation: HighlightRect): Sensitive {
       return {
           original_text: annotation.text ?? 'Unknown',
           entity_type: (annotation.entity ?? annotation.type) || 'MANUAL',
           score: 1.0,
           start: 0, // Not tracked in our highlighting model
           end: 0,   // Not tracked in our highlighting model
           bbox: getCorrectedBoundingBox(annotation)
    };

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
): Promise<void> {
    // Convert blobs to File objects
    const redactedFileObjects: File[] = [];

    // Process each redacted file and create File objects
    for (const [fileKey, blob] of Object.entries(redactedFiles)) {
        // Find the original file that matches this key
        const originalFile = currentFiles.find(file => getFileKey(file) === fileKey);

        if (originalFile) {
            // Create a new File object with '-redacted' suffix
            const date = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = originalFile.name.replace('.pdf', `-redacted-${date}.pdf`);
            const redactedFile = new File([blob], filename, { type: 'application/pdf' });
            redactedFileObjects.push(redactedFile);
        }
    }

    if (redactedFileObjects.length === 0) {
        throw new Error('No redacted files were successfully processed');
    }
    // Update the files in the application state
    updateFiles(redactedFileObjects ,false);

    return Promise.resolve();
}
