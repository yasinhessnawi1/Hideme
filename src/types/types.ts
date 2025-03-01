// src/types.ts

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
    id: string | number;

    /** 1-based PDF page number this highlight belongs to. */
    page: number;

    /** X and Y coordinate in the page’s “viewport” space. */
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
    type: HighlightType | string;

    /** Optionally store the highlighted text for manual highlights or searches. */
    text?: string;

    /** Optionally store an entity label. */
    entity?: string;

    /** Any other custom fields you need. */
    [key: string]: any;

}
