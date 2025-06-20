import en from './en';
import no from './no';

// Add more language imports here as needed

export const translations = {
  en,
  no,
  // Add more languages here
};

export type TranslationKey = keyof typeof en;
export type NestedTranslationKey<T extends TranslationKey> = keyof typeof en[T];

// Function to get nested translation
export function getNestedTranslation<T extends TranslationKey, K extends NestedTranslationKey<T>>(
  language: string,
  category: T,
  key: K
): string {
  if (!translations[language as keyof typeof translations]) {
    return en[category][key as keyof typeof en[T]] as string;
  }
  
  const langTranslations = translations[language as keyof typeof translations];
    if (!langTranslations[category]?.[key as keyof typeof langTranslations[T]]) {
    return en[category][key as keyof typeof en[T]] as string;
  }

    return langTranslations[category][key as keyof typeof langTranslations[T]] as string;
}

export default translations; 