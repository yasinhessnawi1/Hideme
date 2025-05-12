import { useEffect, useState } from 'react';

// Available languages
export const AVAILABLE_LANGUAGES = {
  en: 'English',
  no: 'Norwegian',
  // Add more languages as needed
};

export type Language = keyof typeof AVAILABLE_LANGUAGES;

// Default language
export const DEFAULT_LANGUAGE: Language = 'en';

// Local storage key for saved language preference
const LANGUAGE_STORAGE_KEY = 'hideme_language';

// Get initial language from localStorage or browser, fallback to default
export function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  
  // Try to get from localStorage first
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
  if (savedLanguage && Object.keys(AVAILABLE_LANGUAGES).includes(savedLanguage)) {
    return savedLanguage;
  }
  
  // Try to get from browser settings
  const browserLanguage = navigator.language.split('-')[0] as Language;
  if (browserLanguage && Object.keys(AVAILABLE_LANGUAGES).includes(browserLanguage)) {
    return browserLanguage;
  }
  
  // Fallback to default
  return DEFAULT_LANGUAGE;
}

// Save language preference
export function saveLanguagePreference(language: Language): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
}

type Translations = {
  [category: string]: {
    [key: string]: string;
  };
};

const translations: Translations = {
  auth: {
    passwordsDoNotMatch: 'Passwords do not match',
    usernameRequired: 'Username is required',
    emailRequired: 'Email is required',
    passwordTooShort: 'Password is too short',
    passwordRequired: 'Password is required',
    loginSuccess: 'Login successful',
    loginFailed: 'Login failed',
    signUpForm: 'Sign Up Form',
    loginForm: 'Login Form',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter your full name',
    email: 'Email',
    emailPlaceholder: 'Enter your email',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    signUp: 'Sign Up',
    login: 'Login',
    alreadyHaveAccount: 'Already have an account?',
    noAccount: 'Don\'t have an account?',
    loginHere: 'Login here',
    signUpHere: 'Sign up here'
  },
  notifications: {
    close_notification: 'Close notification',
    toast_position: 'Toast position: {position}',
    confirmation_overlay: 'Confirmation overlay',
    close_dialog: 'Close dialog'
  },
  pdf: {
    noFilesSelectedOrNoContentToRedact: 'No files selected for redaction or no content to redact.',
    noRedactionContentFound: 'No redaction content found in selected files.',
    confirmRedactionSingle: 'Are you sure you want to redact the highlighted content in {fileName}? This will create a new PDF document.',
    confirmRedactionMultiple: 'Are you sure you want to redact the highlighted content in {fileCount} files? This will create new PDF documents.',
    confirmRedactionTitle: 'Confirm Redaction',
    pageThumbnails: 'Page Thumbnails',
    pages: 'Pages',
    pdfFiles: 'PDF Files',
    files: 'Files',
    documentHistory: 'Document History',
    history: 'History',
    of: 'of',
    previousPage: 'Previous Page',
    nextPage: 'Next Page',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    page: 'Page',
    redact: 'Redact',
    highlight: 'Highlight',
    download: 'Download',
    processing: 'Processing',
    processingCompleted: 'Processing Completed',
    processingFailed: 'Processing Failed',
    unknownError: 'Unknown Error',
    dismissStatus: 'Dismiss Status',
    noDocumentLoaded: 'No Document Loaded',
    loadingDocument: 'Loading Document'
  },
  toolbar: {
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fitToWidth: 'Fit to Width',
    fitToPage: 'Fit to Page',
    rotateClockwise: 'Rotate Clockwise',
    rotateCounterClockwise: 'Rotate Counter Clockwise',
    previousPage: 'Previous Page',
    nextPage: 'Next Page',
    download: 'Download',
    print: 'Print',
    search: 'Search',
    annotations: 'Annotations',
    bookmarks: 'Bookmarks',
    settings: 'Settings',
    help: 'Help',
    close: 'Close',
    addedToIgnoreList: 'Added to ignore list',
    noTextToAddToIgnoreListTitle: 'No text to add to ignore list',
    noTextToAddToIgnoreListMessage: 'This type of highlight does not have text, please enter the text you want to add to the ignore list',
    addToIgnoreList: 'Add to ignore list',
    inputLabel: 'Text to add to ignore list',
    inputPlaceholder: 'Enter text to add to ignore list',
    deleteAllSameFailed: 'Delete All Same failed! Try refreshing the page!',
    allHighlightsDeleted: 'All {entity} highlights deleted!',
    deletedHighlightsForOccurrences: 'Deleted highlights for {count} text occurrences',
    noMatchingHighlightsFound: 'No matching highlights found to delete',
    errorRemovingHighlightsByText: 'Error removing highlights by text: {error}',
    highlightAllSameFailed: 'Highlight All Same failed! Try refreshing the page!',
    addedHighlightsForText: 'Added {count} highlights for text "{text}"',
    noAdditionalOccurrencesFound: 'No additional occurrences of text "{text}" found.',
    errorHighlightingAllOccurrences: 'Error highlighting all occurrences: {error}',
    delete: 'Delete',
    deleteAll: 'Delete All {entity}',
    deleteAllSameText: 'Delete All Same Text',
    highlightAllSame: 'Highlight All Same',
  },
};

// Custom hook for language management
export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const t = (category: string, key: string, params?: Record<string, any>) => {
    const translation = translations[category]?.[key] || `${category}.${key}`;
    if (params) {
      return Object.keys(params).reduce((str, param) => {
        return str.replace(`{${param}}`, params[param]);
      }, translation);
    }
    return translation;
  };

  // Initialize on mount
  useEffect(() => {
    setLanguageState(getInitialLanguage());
  }, []);
  
  // Change language and save preference
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    saveLanguagePreference(newLanguage);
  };
  
  return { language, setLanguage, t };
} 