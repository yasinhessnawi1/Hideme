import {HighlightRect} from "../types";

export function getCorrectedBoundingBox(highlight: HighlightRect) {
    // Get the bounding box from the current highlight
    if (highlight.type === 'SEARCH' || highlight.type === 'ENTITY') {
        return {
            x0: highlight.x + 5,
            y0: highlight.y + 5,
            x1: ((highlight.x + 5) + highlight.w) - 3,
            y1: (highlight.y + 5) + highlight.h - 5
        };
    } else {
        return {
            x0: highlight.x,
            y0: highlight.y,
            x1: (highlight.x + highlight.w),
            y1: (highlight.y + highlight.h)
        };
    }
}
