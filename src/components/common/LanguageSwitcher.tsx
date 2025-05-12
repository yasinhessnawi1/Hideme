import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { AVAILABLE_LANGUAGES, Language } from '../../utils/i18n';

interface LanguageSwitcherProps {
  className?: string;
  dropdownPosition?: 'top' | 'bottom';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className = '',
  dropdownPosition = 'bottom'
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`language-switcher ${className}`} ref={dropdownRef}>
      <button
        className="language-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {t('languages', language)}
      </button>

      {isOpen && (
        <div className={`language-dropdown ${dropdownPosition}`}>
          {Object.entries(AVAILABLE_LANGUAGES).map(([code, name]) => (
            <button
              key={code}
              className={`dropdown-item ${code === language ? 'active' : ''}`}
              onClick={() => {
                setLanguage(code as Language);
                setIsOpen(false);
              }}
            >
              {t('languages', code as 'en' | 'no')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher; 