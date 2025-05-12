import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, DEFAULT_LANGUAGE, getInitialLanguage, saveLanguagePreference } from '../utils/i18n';
import { translations, TranslationKey, NestedTranslationKey } from '../utils/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: <T extends TranslationKey, K extends NestedTranslationKey<T>>(
    category: T,
    key: K,
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
  const t = <T extends TranslationKey, K extends NestedTranslationKey<T>>(
    category: T,
    key: K,
    params?: Record<string, string | number>
  ): string => {
    let translation = translations[language]?.[category]?.[key as any] as string
      || translations[DEFAULT_LANGUAGE][category][key as keyof typeof translations[typeof DEFAULT_LANGUAGE][T]] as string;

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