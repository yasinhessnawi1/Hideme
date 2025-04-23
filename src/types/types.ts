// src/types.ts

/**
 * Generic API response
 */
export interface ApiResponse<T> {
    data: T;
    message?: string;
    status?: number;
}

/**
 * Cache options for API requests
 */
export interface CacheOptions {
    ttl?: number;
    forceRefresh?: boolean;
    cacheKey?: string;
}

/**
 * Method ID mapping
 */
export interface MethodIdMap {
    [key: string]: number;
}

export interface RedactionMapping {
    pages: Page[]
}

export interface Page {
    page: number
    sensitive: Sensitive[]
}

export interface Sensitive {
    original_text: string
    entity_type: string
    start: number
    end: number
    score: number
    bbox: Bbox
}

export interface Bbox {
    x0: number
    y0: number
    x1: number
    y1: number
}
export interface FileDetectionResult {
    fileKey : string
    fileName: string
    entities_detected: DetectionSummary
    performance: Performance
}

export interface DetectionSummary {
    by_type: {
        entity_type: string
        count: number
    }
    by_page: {
        page: number
        count: number
    }
    total: number
}
export interface Performance {
    entity_density: number
    words_count: number
    pages_count: number
    sanitize_time: number
}
export interface FileInfo {
    filename: string
    content_type: string
    size: string
}
export interface FileResult {
    file: string
    status: string
    results: Results
}

export interface RedactionRequest {
    file_results: FileResult
}

export interface Results {
    redaction_mapping: RedactionMapping
    file_info: FileInfo
}
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
}

export interface Pages {
    page: number;
    sensitive: RedactionItem[];

}

/** Defines the possible types of highlights. */
/**
 * Common type definitions for the application
 */



/** Option type for select dropdowns */
export interface OptionType {
    value: string;
    label: string;
}

/** Redaction item representing an entity to be redacted */
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
