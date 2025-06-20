import React, {createContext, useContext, useEffect, useState} from 'react';
import {DEFAULT_LANGUAGE, getInitialLanguage, Language, saveLanguagePreference} from '../utils/i18n';
import {translations} from '../utils/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
    t: (
      category: string,
      key: string,
      params?: Record<string, string | number>
  ) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  // Initialize language from storage on mount
  useEffect(() => {
    setLanguageState(getInitialLanguage());
  }, []);

  // Set language and save preference
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    saveLanguagePreference(newLanguage);
  };

  // Translation function with parameter interpolation
    const t = (
        category: string,
        key: string,
    params?: Record<string, string | number>
  ): string => {
        const langTranslations = translations[language as keyof typeof translations];
        const defaultTranslations = translations[DEFAULT_LANGUAGE];

        let translation: string;

        try {
            translation = (langTranslations?.[category as keyof typeof langTranslations] as any)?.[key] as string
                || (defaultTranslations[category as keyof typeof defaultTranslations] as any)?.[key] as string
                || key;
        } catch {
            translation = key;
        }

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{${paramKey}}`, String(paramValue));
      });
    }
    return translation;
  };

  const contextValue: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
};

export default LanguageContext; 