// src/components/pdf/highlighters/HighlightContextMenu.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Highlighter, X } from 'lucide-react';
import { HighlightRect, HighlightType, useHighlightContext } from '../../../contexts/HighlightContext';
import highlightManager from '../../../utils/HighlightManager';
import '../../../styles/modules/pdf/HighlightContextMenu.css'

interface HighlightContextMenuProps {
    position: { x: number; y: number };
    highlight: HighlightRect;
    onClose: () => void;
}

const HighlightContextMenu: React.FC<HighlightContextMenuProps> = ({
                                                                       position,
                                                                       highlight,
                                                                       onClose
                                                                   }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const { removeAnnotation, clearAnnotationsByType, addAnnotation } = useHighlightContext();

    // Handle delete current highlight
    const handleDelete = () => {
        if (highlight && highlight.id) {
            removeAnnotation(highlight.page, highlight.id, highlight.fileKey);
            highlightManager.removeHighlightData(highlight.id);
            onClose();
        }
    };

    // Handle delete all with same text
    const handleDeleteAllSameText = () => {
        if (!highlight.text || !highlight.fileKey) {
            onClose();
            return;
        }

        const highlightsWithSameText = highlightManager.findHighlightsByText(
            highlight.text,
            highlight.fileKey
        );

        // Delete each highlight with the same text
        highlightsWithSameText.forEach(h => {
            removeAnnotation(h.page, h.id, h.fileKey);
            highlightManager.removeHighlightData(h.id);
        });

        onClose();
    };

    // Handle highlight all instances of the same text
    const handleHighlightAllSame = () => {
        if (!highlight.text || !highlight.fileKey) {
            onClose();
            return;
        }

        // For this functionality, we'd need to re-process the PDF content to find all
        // instances of the text. Since this requires text extraction from all pages,
        // we'll implement a simple version that uses search capabilities.

        // Simulate a search for this term by dispatching a custom event
        window.dispatchEvent(new CustomEvent('highlight-all-same-text', {
            detail: {
                text: highlight.text,
                fileKey: highlight.fileKey,
                highlightType: highlight.type,
                color: highlight.color
            }
        }));

        onClose();
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        // Add a timer to auto-close the menu after a while
        const timeoutId = setTimeout(onClose, 5000);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            clearTimeout(timeoutId);
        };
    }, [onClose]);

    // Adjust position if menu would render outside viewport
    const adjustedPosition = useRef({ x: position.x, y: position.y });

    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Adjust horizontal position if needed
            if (position.x + rect.width > viewportWidth) {
                adjustedPosition.current.x = viewportWidth - rect.width - 10;
            }

            // Adjust vertical position if needed
            if (position.y + rect.height > viewportHeight) {
                adjustedPosition.current.y = viewportHeight - rect.height - 10;
            }
        }
    }, [position]);

    // Only show text-specific options if highlight has text
    const showTextOptions = !!highlight.text;

    return (
        <div
            ref={menuRef}
            className="highlight-context-menu"
            style={{
                position: 'fixed',
                left: adjustedPosition.current.x,
                top: adjustedPosition.current.y,
                zIndex: 1000,
                backgroundColor: 'var(--background)',
                boxShadow: 'var(--shadow-md)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border)',
                padding: '4px 0',
                minWidth: '180px',
                animation: 'fadeIn 0.2s ease'
            }}
        >
            <div className="context-menu-header" style={{
                padding: '4px 8px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    {highlight.text ? `"${highlight.text.length > 15 ? highlight.text.substring(0, 15) + '...' : highlight.text}"` :
                        highlight.entity ? `Entity: ${highlight.entity}` : 'Highlight'}
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <X size={14} />
                </button>
            </div>

            <div className="context-menu-item" onClick={handleDelete}>
                <Trash2 size={16} />
                <span>Delete</span>
            </div>

            {showTextOptions && (
                <>
                    <div className="context-menu-item" onClick={handleDeleteAllSameText}>
                        <Trash2 size={16} />
                        <span>Delete All Same Text</span>
                    </div>
                    <div className="context-menu-item" onClick={handleHighlightAllSame}>
                        <Highlighter size={16} />
                        <span>Highlight All Same</span>
                    </div>
                </>
            )}

            {highlight.entity && (
                <div className="context-menu-item-info" style={{
                    padding: '4px 16px',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--muted-foreground)',
                    borderTop: '1px solid var(--border)',
                    marginTop: '4px'
                }}>
                    {highlight.model && `Model: ${highlight.model}`}
                </div>
            )}
        </div>
    );
};

export default HighlightContextMenu;
