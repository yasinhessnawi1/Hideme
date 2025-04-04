import React, { useState, useLayoutEffect, useRef, useCallback } from 'react';
import { PDFPageViewport } from '../types/pdfTypes';

interface PageSizeData {
    cssWidth: number;
    cssHeight: number;
    offsetX: number;
    offsetY: number;
    scaleX: number;
    scaleY: number;
}

export const useViewportSize = (
    wrapperRef: React.RefObject<HTMLDivElement | null>,
    viewport: PDFPageViewport | null,
    zoomLevel: number
) => {
    const [viewportSize, setViewportSize] = useState<PageSizeData>({
        cssWidth: 0,
        cssHeight: 0,
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1
    });

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const resizeObserver = useRef<ResizeObserver | null>(null);

    // Set canvas ref
    const setCanvasReference = useCallback((canvas: HTMLCanvasElement | null) => {
        if (canvas !== canvasRef.current) {
            canvasRef.current = canvas;
            measureViewport();
        }
    }, []);

    // Measure viewport dimensions
    const measureViewport = useCallback(() => {
        if (!canvasRef.current || !wrapperRef.current || !viewport) return;

        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;

        const canvasRect = canvas.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        const cssWidth = canvasRect.width;
        const cssHeight = canvasRect.height;
        const offsetX = canvasRect.left - wrapperRect.left;
        const offsetY = canvasRect.top - wrapperRect.top;

        const scaleX = cssWidth / viewport.width;
        const scaleY = cssHeight / viewport.height;

        setViewportSize({
            cssWidth,
            cssHeight,
            offsetX,
            offsetY,
            scaleX,
            scaleY
        });
    }, [viewport, wrapperRef]);

    // Set up resize observer
    useLayoutEffect(() => {
        if (!canvasRef.current) return;

        // Clean up previous observer
        if (resizeObserver.current) {
            resizeObserver.current.disconnect();
        }

        // Create new observer
        resizeObserver.current = new ResizeObserver(() => {
            measureViewport();
        });

        // Observe canvas
        resizeObserver.current.observe(canvasRef.current);

        // Measure immediately
        measureViewport();

        return () => {
            if (resizeObserver.current) {
                resizeObserver.current.disconnect();
            }
        };
    }, [canvasRef.current, viewport, zoomLevel, measureViewport]);

    return {
        viewportSize,
        setCanvasReference,
        measureViewport
    };
};
