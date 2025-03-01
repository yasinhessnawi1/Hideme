// src/types/pdfTypes.d.ts

// We export each interface so you can import them in other files:

export interface PDFPageViewport {
    width: number;
    height: number;
    transform?: number[];
    scale?: number;
    rotation?: number;

    // The key method used for highlight bounding boxes:
    convertToViewportRectangle(pdfRect: [number, number, number, number]): [number, number, number, number];
}

export interface TextItem {
    str: string;          // The text content for this chunk
    transform: number[];  // The transform matrix (scale, offset, etc.)
    width: number;        // The chunk's width in text space
    height?: number;
    dir?: string;         // e.g. 'ltr' or 'rtl'
    fontName?: string;
}

export interface TextContent {
    items: TextItem[];
    styles?: Record<string, any>;
}

export interface ExtracteText {
    pages: Page[];
}

export interface Page {
    page:  number;
    words: Word[];
}

export interface Word {
    text: string;
    x0:   number;
    y0:   number;
    x1:   number;
    y1:   number;
}
