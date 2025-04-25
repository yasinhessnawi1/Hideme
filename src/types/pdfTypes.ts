// src/types/pdfTypes.ts

/**
 * PDF Viewport interface representing a page viewport from PDF.js
 */
export interface PDFPageViewport {
    width: number;
    height: number;
    transform?: number[];
    scale?: number;
    rotation?: number;

    // The key method used for highlight bounding boxes:
    convertToViewportRectangle(pdfRect: [number, number, number, number]): [number, number, number, number];
}

/**
 * TextItem interface representing a chunk of text from PDF.js
 */
export interface TextItem {
    str: string;          // The text content for this chunk
    transform: number[];  // The transform matrix (scale, offset, etc.)
    width: number;        // The chunk's width in text space
    height?: number;
    dir?: string;         // e.g. 'ltr' or 'rtl'
    fontName?: string;
}

/**
 * TextContent interface from PDF.js containing all text chunks for a page
 */
export interface TextContent {
    items: TextItem[];
    styles?: Record<string, any>;
}

/**
 * Highlight types enum shared across the application
 */
export enum HighlightType {
    MANUAL = 'MANUAL',
    SEARCH = 'SEARCH',
    ENTITY = 'ENTITY',
}

/**
 * Highlight rectangle representing a highlight on a page
 */
export enum HighlightCreationMode {
    RECTANGULAR = 'RECTANGULAR',
    TEXT_SELECTION = 'TEXT_SELECTION',
}

export interface HighlightRect {
    id: string;
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
    color?: string;
    opacity?: number;
    type?: HighlightType;
    text?: string;
    entity?: string;
    model?: string;
    fileKey: string;
    timestamp?: number;
    // Add these properties to store original coordinates for proper scaling
    originalX?: number;
    originalY?: number;
    originalW?: number;
    originalH?: number;
    // Add this to track which method was used to create the highlight
    creationMode?: HighlightCreationMode;
}

/**
 * File annotations map structure: fileKey -> {pageNumber -> highlights[]}
 */
export type FileAnnotationsMap = Map<string, Map<number, HighlightRect[]>>;

/**
 * ViewportSize interface used for highlight calculations
 */
export interface ViewportSize {
    cssWidth: number;
    cssHeight: number;
    offsetX: number;
    offsetY: number;
    scaleX: number;
    scaleY: number;
}




/**
 * Navigation options for scrolling and page navigation
 */
export interface NavigationOptions {
    behavior?: ScrollBehavior;
    alignToTop?: boolean;
    highlightThumbnail?: boolean;
    forceFileChange?: boolean;
}

/**
 * Entity detection options
 */
export interface EntityOptions {
    pageNumber?: number;
    forceReprocess?: boolean;
}

/**
 * Storage statistics
 */
export interface StorageStats {
    totalSizeFormatted: number;
    fileCount: number;
    percentUsed: number;
}
