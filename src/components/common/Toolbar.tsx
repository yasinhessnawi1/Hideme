import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FaUndo} from 'react-icons/fa';
import {useLanguage} from '../../contexts/LanguageContext';

export type ToolbarSectionAlignment = 'left' | 'center' | 'right';

export type ToolbarTranslationKey =
  | 'zoomIn'
  | 'zoomOut'
  | 'fitToWidth'
  | 'fitToPage'
  | 'rotateClockwise'
  | 'rotateCounterClockwise'
  | 'previousPage'
  | 'nextPage'
  | 'annotations'
  | 'bookmarks'
  | 'addedToIgnoreList'
  | 'noTextToAddToIgnoreListTitle'
  | 'noTextToAddToIgnoreListMessage'
  | 'addToIgnoreList'
  | 'inputLabel'
  | 'inputPlaceholder'
  | 'deleteAllSameFailed'
  | 'allHighlightsDeleted'
  | 'deletedHighlightsForOccurrences'
  | 'noMatchingHighlightsFound'
  | 'errorRemovingHighlightsByText'
  | 'highlightAllSameFailed'
  | 'addedHighlightsForText'
  | 'noAdditionalOccurrencesFound'
  | 'errorHighlightingAllOccurrences'
  | 'deleteAll'
  | 'deleteAllSameText'
  | 'highlightAllSame';

export interface ToolbarButtonProps {
  icon: React.ReactNode;
  label?: ToolbarTranslationKey;
  title: ToolbarTranslationKey;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}

export interface ToolbarDropdownItem {
  id: string;
  type: 'checkbox' | 'button' | 'color' | 'divider' | 'custom';
  label?: ToolbarTranslationKey;
  checked?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onChange?: (value: any) => void;
  colorValue?: string;
  customContent?: React.ReactNode;
}

export interface ToolbarDropdownProps {
  icon: React.ReactNode;
  label?: ToolbarTranslationKey;
  title: ToolbarTranslationKey;
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
  const { t } = useLanguage();
  return (
    <button
      onClick={onClick}
      className={`toolbar-button ${active ? 'active' : ''} ${className}`}
      title={title ? t('toolbar', title) : undefined}
      disabled={disabled}
    >
      {icon}
      {label && <span className="button-label">{isToolbarTranslationKey(label) ? t('toolbar', label) : label}</span>}
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
  const { t } = useLanguage();
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
        title={title ? t('toolbar', title) : undefined}
      >
        {icon}
        {label && <span className="button-label">{isToolbarTranslationKey(label) ? t('toolbar', label) : label}</span>}
      </button>

      {isOpen && (
        <div
          className="dropdown-menu"
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
        >
          {sectionTitle && <h5 className="dropdown-title">{isToolbarTranslationKey(sectionTitle) ? t('toolbar', sectionTitle) : sectionTitle}</h5>}

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
                    {item.label ? (isToolbarTranslationKey(item.label) ? t('toolbar', item.label) : item.label) : null}
                  </label>
                )}

                {item.type === 'button' && (
                  <button onClick={item.onClick}>
                    {item.label ? (isToolbarTranslationKey(item.label) ? t('toolbar', item.label) : item.label) : null}
                  </button>
                )}

                {item.type === 'color' && (
                  <label onClick={(e) => e.stopPropagation()}>
                    {item.label ? (isToolbarTranslationKey(item.label) ? t('toolbar', item.label) : item.label) : null}
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
  const { t } = useLanguage();
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
        title={"zoomOut"}
        onClick={handleZoomOut}
        disabled={zoomLevel <= minZoom}
      />

      <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>

      <ToolbarButton
        icon={<span>+</span>}
        title={"zoomIn"}
        onClick={handleZoomIn}
        disabled={zoomLevel >= maxZoom}
      />

      <ToolbarButton
        label={"fitToPage"}
        title={"fitToPage"}
        icon={<FaUndo/>}
        onClick={handleZoomReset}
      />
    </>
  );
};

// Add this helper function at the top of the file
function isToolbarTranslationKey(key: any): key is ToolbarTranslationKey {
  return [
    'zoomIn', 'zoomOut', 'fitToWidth', 'fitToPage', 'rotateClockwise', 'rotateCounterClockwise',
    'previousPage', 'nextPage', 'annotations', 'bookmarks', 'addedToIgnoreList',
    'noTextToAddToIgnoreListTitle', 'noTextToAddToIgnoreListMessage', 'addToIgnoreList',
    'inputLabel', 'inputPlaceholder', 'deleteAllSameFailed', 'allHighlightsDeleted',
    'deletedHighlightsForOccurrences', 'noMatchingHighlightsFound', 'errorRemovingHighlightsByText',
    'highlightAllSameFailed', 'addedHighlightsForText', 'noAdditionalOccurrencesFound',
    'errorHighlightingAllOccurrences', 'deleteAll', 'deleteAllSameText', 'highlightAllSame'
  ].includes(key);
}

// Export all components
export {
  Toolbar,
  ToolbarSection,
  ToolbarButton,
  ToolbarDropdown,
};
