import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IconType } from 'react-icons';

export type ToolbarSectionAlignment = 'left' | 'center' | 'right';

export interface ToolbarButtonProps {
  icon: React.ReactNode;
  label?: string;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}

export interface ToolbarDropdownItem {
  id: string;
  type: 'checkbox' | 'button' | 'color' | 'divider' | 'custom';
  label?: string;
  checked?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onChange?: (value: any) => void;
  colorValue?: string;
  customContent?: React.ReactNode;
}

export interface ToolbarDropdownProps {
  icon: React.ReactNode;
  label?: string;
  title: string;
  items: ToolbarDropdownItem[];
  sectionTitle?: string;
  className?: string;
}

export interface ToolbarSidebarToggleProps {
  isCollapsed: boolean;
  position: 'left' | 'right';
  onClick: () => void;
}

export interface ToolbarSectionProps {
  children: React.ReactNode;
  alignment?: ToolbarSectionAlignment;
}

export interface ToolbarProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Button component
const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  title,
  onClick,
  disabled = false,
  active = false,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`toolbar-button ${active ? 'active' : ''} ${className}`}
      title={title}
      disabled={disabled}
    >
      {icon}
      {label && <span className="button-label">{label}</span>}
    </button>
  );
};

// Dropdown component
const ToolbarDropdown: React.FC<ToolbarDropdownProps> = ({
  icon,
  label,
  title,
  items,
  sectionTitle,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        const isClickInsideButton = buttonRef.current?.contains(event.target as Node) || false;
        const isClickInsideMenu = menuRef.current?.contains(event.target as Node) || false;

        if (!isClickInsideButton && !isClickInsideMenu) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`toolbar-dropdown ${className}`}>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="toolbar-button"
        title={title}
      >
        {icon}
        {label && <span className="button-label">{label}</span>}
      </button>

      {isOpen && (
        <div
          className="dropdown-menu"
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
        >
          {sectionTitle && <h5 className="dropdown-title">{sectionTitle}</h5>}
          
          {items.map((item) => {
            if (item.type === 'divider') {
              return <div key={item.id} className="dropdown-divider"></div>;
            }

            if (item.type === 'custom' && item.customContent) {
              return (
                <div key={item.id} className="dropdown-item">
                  {item.customContent}
                </div>
              );
            }

            return (
              <div key={item.id} className="dropdown-item">
                {item.type === 'checkbox' && (
                  <label onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onClick={item.onClick}
                      onChange={item.onChange ? (e) => item.onChange?.(e.target.checked) : undefined}
                      readOnly={!item.onChange}
                    />
                    {item.label}
                  </label>
                )}

                {item.type === 'button' && (
                  <button onClick={item.onClick}>
                    {item.label}
                  </button>
                )}

                {item.type === 'color' && (
                  <label onClick={(e) => e.stopPropagation()}>
                    {item.label}
                    <input
                      type="color"
                      value={item.colorValue}
                      onChange={item.onChange ? (e) => item.onChange?.(e.target.value) : undefined}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Section component
const ToolbarSection: React.FC<ToolbarSectionProps> = ({
  children,
  alignment = 'left',
}) => {
  return (
    <div className={`toolbar-section align-${alignment}`}>
      {children}
    </div>
  );
};

// Sidebar toggle button
const ToolbarSidebarToggle: React.FC<ToolbarSidebarToggleProps> = ({
  isCollapsed,
  position,
  onClick,
}) => {
  const LeftSidebarOpenIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
      <g id="SVGRepo_iconCarrier">
        <path
          d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z"
          stroke="#292D32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M14.97 2V22" stroke="#292D32" strokeWidth="1.5" strokeLinecap="round"
            strokeLinejoin="round"></path>
        <path d="M7.96997 9.43994L10.53 11.9999L7.96997 14.5599" stroke="#292D32" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"></path>
      </g>
    </svg>
  );

  const LeftSidebarCloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
      <g id="SVGRepo_iconCarrier">
        <path
          d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z"
          stroke="#292D32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M7.96997 2V22" stroke="#292D32" strokeWidth="1.5" strokeLinecap="round"
            strokeLinejoin="round"></path>
        <path d="M14.97 9.43994L12.41 11.9999L14.97 14.5599" stroke="#292D32" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"></path>
      </g>
    </svg>
  );

  const RightSidebarOpenIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
      <g id="SVGRepo_iconCarrier">
        <path
          d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z"
          stroke="#292D32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M7.97 2V22" stroke="#292D32" strokeWidth="1.5" strokeLinecap="round"
            strokeLinejoin="round"></path>
        <path d="M16.97 9.43994L14.41 11.9999L16.97 14.5599" stroke="#292D32" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"></path>
      </g>
    </svg>
  );

  const RightSidebarCloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
      <g id="SVGRepo_iconCarrier">
        <path
          d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z"
          stroke="#292D32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M14.97 2V22" stroke="#292D32" strokeWidth="1.5" strokeLinecap="round"
            strokeLinejoin="round"></path>
        <path d="M7.96997 9.43994L10.53 11.9999L7.96997 14.5599" stroke="#292D32" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"></path>
      </g>
    </svg>
  );

  return (
    <button
      onClick={onClick}
      className={`toolbar-button sidebar-toggle ${position} ${isCollapsed ? 'collapsed' : ''}`}
      title={isCollapsed ? `Show ${position} sidebar` : `Hide ${position} sidebar`}
      style={{ backgroundColor: 'transparent', border: 'none' }}
    >
      {position === 'left' ? 
        (isCollapsed ? <LeftSidebarOpenIcon /> : <LeftSidebarCloseIcon />) : 
        (isCollapsed ? <RightSidebarOpenIcon /> : <RightSidebarCloseIcon />)
      }
    </button>
  );
};

// Main toolbar component
const Toolbar: React.FC<ToolbarProps> = ({
  children,
  className = '',
  style = {},
}) => {
  return (
    <div className={`enhanced-toolbar ${className}`} style={style}>
      {children}
    </div>
  );
};

// Helper components for zoom controls
export interface ZoomControlsProps {
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  setZoomLevel,
  minZoom = 0.5,
  maxZoom = 3.0,
  zoomStep = 0.2,
}) => {
  const handleZoomIn = useCallback(() => {
    setZoomLevel(Math.min(zoomLevel + zoomStep, maxZoom));
  }, [zoomLevel, zoomStep, maxZoom, setZoomLevel]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(Math.max(zoomLevel - zoomStep, minZoom));
  }, [zoomLevel, zoomStep, minZoom, setZoomLevel]);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1.0);
  }, [setZoomLevel]);

  return (
    <>
      <ToolbarButton
        icon={<span>-</span>}
        title="Zoom Out"
        onClick={handleZoomOut}
        disabled={zoomLevel <= minZoom}
      />

      <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>

      <ToolbarButton
        icon={<span>+</span>}
        title="Zoom In"
        onClick={handleZoomIn}
        disabled={zoomLevel >= maxZoom}
      />

      <ToolbarButton
        label="Reset"
        title="Reset Zoom"
        icon={<></>}
        onClick={handleZoomReset}
      />
    </>
  );
};

// Export all components
export {
  Toolbar,
  ToolbarSection,
  ToolbarButton,
  ToolbarDropdown,
  ToolbarSidebarToggle,
};
