import React, {useRef, useState, useEffect, useLayoutEffect} from 'react';
import {createPortal} from 'react-dom';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    placement?: 'top' | 'bottom';
    className?: string;
}

const GAP = 8;

const Tooltip: React.FC<TooltipProps> = ({content, children, placement = 'top', className}) => {
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number }>({top: 0, left: 0});
    const triggerRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Calculate position after tooltip is rendered
    useLayoutEffect(() => {
        if (visible && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            let top = 0;
            let left = 0;
            if (placement === 'top') {
                top = triggerRect.top + window.scrollY - tooltipRect.height - GAP;
            } else {
                top = triggerRect.bottom + window.scrollY + GAP;
            }
            left = triggerRect.left + window.scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
            setCoords({top, left});
        }
    }, [visible, placement, content]);

    // Hide tooltip on scroll
    useEffect(() => {
        if (!visible) return;
        const hide = () => setVisible(false);
        window.addEventListener('scroll', hide, true);
        return () => window.removeEventListener('scroll', hide, true);
    }, [visible]);

    return (
        <>
      <span
          ref={triggerRef}
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
          onFocus={() => setVisible(true)}
          onBlur={() => setVisible(false)}
          tabIndex={0}
          style={{outline: 'none'}}
      >
        {children}
      </span>
            {visible && createPortal(
                <div
                    ref={tooltipRef}
                    className={`file-tooltip-portal ${placement} ${className ?? ''}`}
                    style={{
                        position: 'absolute',
                        zIndex: 99999,
                        left: coords.left,
                        top: coords.top,
                        pointerEvents: 'none',
                        backgroundColor: '#333',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        maxWidth: '300px',
                        wordBreak: 'break-word',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                    role="tooltip"
                >
                    {content}
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        borderWidth: '6px 6px 0 6px',
                        borderStyle: 'solid',
                        borderColor: '#333 transparent transparent transparent'
                    }}/>
                </div>,
                document.body
            )}
        </>
    );
};

export default Tooltip; 