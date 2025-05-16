import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import LanguageSwitcher from './LanguageSwitcher';

// Mock dependencies with direct implementation
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn((lang) => {
      // This mock allows us to capture the language change
      mockSetLanguageCalls.push(lang);
    }),
    t: (category: string, key: string) => {
      // Return human-readable translations for languages
      if (category === 'languages') {
        if (key === 'en') return 'English';
        if (key === 'no') return 'Norwegian';
      }
      return `${category}.${key}`;
    }
  })
}));

// Mock i18n utils
vi.mock('../../utils/i18n', () => ({
  AVAILABLE_LANGUAGES: {
    en: 'English',
    no: 'Norwegian'
  },
  Language: {
    EN: 'en',
    NO: 'no'
  }
}));

// Track mock function calls
const mockSetLanguageCalls: string[] = [];

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetLanguageCalls.length = 0;
  });

  // Test default render
  test('renders language button with current language', () => {
    render(<LanguageSwitcher />);
    
    // Check button exists with translated language name
    const button = screen.getByRole('button', { expanded: false });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('English');
    
    // Dropdown should be closed initially
    expect(screen.queryByText('Norwegian')).not.toBeInTheDocument();
  });

  // Test dropdown opening
  test('opens dropdown when button is clicked', () => {
    render(<LanguageSwitcher />);
    
    // Get and click the button
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Dropdown should be open
    expect(button).toHaveAttribute('aria-expanded', 'true');
    
    // Should show both language options in dropdown
    const dropdown = screen.getByRole('button', { expanded: true }).nextElementSibling;
    expect(dropdown).toBeInTheDocument();
    expect(dropdown?.textContent).toContain('English');
    expect(dropdown?.textContent).toContain('Norwegian');
  });

  // Test language selection
  test('changes language when option is clicked', () => {
    render(<LanguageSwitcher />);
    
    // Open the dropdown
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Click on the Norwegian option using more specific selector
    const norwegianOption = screen.getAllByText('Norwegian')[0];
    fireEvent.click(norwegianOption);
    
    // Should call setLanguage with 'no'
    expect(mockSetLanguageCalls).toContain('no');
    
    // Dropdown should close after selection
    expect(screen.queryByText('Norwegian')).not.toBeInTheDocument();
  });

  // Test current language is highlighted
  test('highlights current language in dropdown', () => {
    render(<LanguageSwitcher />);
    
    // Open the dropdown
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Get dropdown buttons
    const dropdownButtons = screen.getAllByRole('button');
    
    // Find the English and Norwegian buttons in the dropdown (not the main button)
    const dropdownItems = dropdownButtons.filter(btn => btn.classList.contains('dropdown-item'));
    const enButton = dropdownItems.find(btn => btn.textContent === 'English');
    const noButton = dropdownItems.find(btn => btn.textContent === 'Norwegian');
    
    // English should have active class, Norwegian should not
    expect(enButton).toHaveClass('active');
    expect(noButton).not.toHaveClass('active');
  });

  // Test custom class name
  test('applies custom className', () => {
    render(<LanguageSwitcher className="custom-class" />);
    
    const switcher = screen.getByRole('button').closest('.language-switcher');
    expect(switcher).toHaveClass('custom-class');
  });

  // Test dropdown position
  test('applies correct dropdown position', () => {
    render(<LanguageSwitcher dropdownPosition="top" />);
    
    // Open the dropdown
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Find dropdown and check position class
    const dropdown = button.nextElementSibling;
    expect(dropdown).toHaveClass('top');
  });
}); 