import React, { useState, useRef, useEffect } from 'react';
import { useHighlightContext, HighlightType, HighlightRect } from '../../contexts/HighlightContext';
import { usePDFContext } from '../../contexts/PDFContext';
import '../../styles/pdf/HighlightLayer.css';

interface ManualHighlightLayerProps {
  pageNumber: number;
  debug?: boolean;
  pageSize?: {
    width: number;
    height: number;
    offsetX?: number;
    offsetY?: number;
  };
}

const ManualHighlightLayer: React.FC<ManualHighlightLayerProps> = ({
  pageNumber,
  debug = false,
  pageSize,
}) => {
  const {
    annotations,
    selectedAnnotation,
    setSelectedAnnotation,
    removeAnnotation
  } = useHighlightContext();
  const { isEditingMode } = usePDFContext();
  const containerRef = useRef<HTMLDivElement>(null);

  // Only manual or “undefined type” highlights
  const manualAnnotations = (annotations[pageNumber] || []).filter(
    ann => ann.type === HighlightType.MANUAL || !ann.type
  );

  const [hoveredAnnotation, setHoveredAnnotation] = useState<{
    annotation: HighlightRect;
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !pageSize) return;
    const container = containerRef.current;

    container.style.width = `${pageSize.width}px`;
    container.style.height = `${pageSize.height}px`;
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '10020';
    container.style.transformOrigin = 'top left';

    if (pageSize.offsetX || pageSize.offsetY) {
      container.style.transform = `translate(${pageSize.offsetX || 0}px, ${pageSize.offsetY || 0}px)`;
    }

    if (debug) {
      console.log(`[ManualHighlightLayer] Page ${pageNumber} dimensions applied:`, {
        width: pageSize.width,
        height: pageSize.height,
        offsetX: pageSize.offsetX,
        offsetY: pageSize.offsetY
      });
    }
  }, [pageNumber, pageSize, debug]);

  const handleHighlightClick = (e: React.MouseEvent, annotation: HighlightRect) => {
    e.stopPropagation();
    if (!isEditingMode) return;

    if (selectedAnnotation && selectedAnnotation.id === annotation.id) {
      setSelectedAnnotation(null);
    } else {
      setSelectedAnnotation(annotation);
    }
  };

  const handleHighlightDoubleClick = (e: React.MouseEvent, annotation: HighlightRect) => {
    e.stopPropagation();
    if (!isEditingMode) return;
    // Double-click to remove manual highlights
    removeAnnotation(pageNumber, annotation.id);
  };

  const handleHighlightMouseEnter = (e: React.MouseEvent, annotation: HighlightRect) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoveredAnnotation({
      annotation,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top,
      },
    });
  };

  const handleHighlightMouseLeave = () => {
    setHoveredAnnotation(null);
  };

  return (
    <div
      ref={containerRef}
      className="manual-highlight-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: debug ? 'rgba(255,0,0,0.1)' : 'transparent',
        pointerEvents: 'none',
        overflow: 'hidden',
        boxSizing: 'border-box',
        border: debug ? '1px dotted red' : 'none'
      }}
    >
      {manualAnnotations.map((ann) => (
        <div
          key={`manual-highlight-${ann.id}`}
          className={`highlight-rect manual-highlight ${
            selectedAnnotation?.id === ann.id ? 'selected' : ''
          }`}
          style={{
            position: 'absolute',
            left: ann.x,
            top: ann.y,
            width: ann.w,
            height: ann.h,
            backgroundColor: ann.color || '#1aff00',
            opacity: ann.opacity ?? 0.3,
            cursor: isEditingMode ? 'pointer' : 'default',
            border: selectedAnnotation?.id === ann.id
              ? '2px dashed #000'
              : '1px solid rgba(0,0,0,0.2)',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
            zIndex: 30
          }}
          onClick={(e) => handleHighlightClick(e, ann)}
          onDoubleClick={(e) => handleHighlightDoubleClick(e, ann)}
          onMouseEnter={(e) => handleHighlightMouseEnter(e, ann)}
          onMouseLeave={handleHighlightMouseLeave}
        >
          {debug && (
            <div className="debug-info">
              <small
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '2px',
                  fontSize: '8px',
                  pointerEvents: 'none',
                }}
              >
                {`ID: ${ann.id}, X: ${Math.round(ann.x)}, Y: ${Math.round(ann.y)}, W: ${Math.round(ann.w)}, H: ${Math.round(ann.h)}`}
              </small>
            </div>
          )}
        </div>
      ))}

      {hoveredAnnotation && (
          <div
              className="highlight-tooltip manual-tooltip"
              style={{
                position: 'absolute', // Changed from 'fixed' to 'absolute'
                left: hoveredAnnotation.annotation.x + (hoveredAnnotation.annotation.w / 2),
                top: hoveredAnnotation.annotation.y ,
                pointerEvents: 'none',
                transform: 'translateX(-50%)',
                zIndex: 99999,
                background: 'rgba(0,0,0,0.8)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
          >
            {hoveredAnnotation.annotation.text
                ? `Highlight: "${hoveredAnnotation.annotation.text}"`
                : 'Manual highlight'}
          </div>
      )}
    </div>
  );
};

export default ManualHighlightLayer;
