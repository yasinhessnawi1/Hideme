// src/types.ts
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
/** Defines the possible types of highlights. */
/**
 * Common type definitions for the application
 */

/** Defines the possible types of highlights. */
export enum HighlightType {
    SEARCH = 'SEARCH',
    ENTITY = 'ENTITY',
    MANUAL = 'MANUAL',
    OTHER = 'OTHER', // optional
}

/** A rectangle on a particular page. */
export interface HighlightRect {
    /** Unique ID for this highlight (can be a string or number). */
    id: string;

    /** 1-based PDF page number this highlight belongs to. */
    page: number;

    /** X and Y coordinate in the page's "viewport" space. */
    x: number;
    y: number;

    /** Width and height of the highlight box. */
    w: number;
    h: number;

    /** Color in any valid CSS format (e.g. '#FFD700' or 'rgba(255,215,0,0.4)'). */
    color: string;

    /** Opacity from 0 to 1 (can also be baked into color). */
    opacity?: number;

    /** Type/category of the highlight (search, entity, manual, etc.). */
    type?: HighlightType;

    /** Optionally store the highlighted text for manual highlights or searches. */
    text?: string;

    /** Optionally store an entity label. */
    entity?: string;

    /** Any other custom fields you need. */
    [key: string]: any;
}

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
