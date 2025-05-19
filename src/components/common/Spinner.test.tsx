import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import Spinner from './Spinner';

// Mock dependencies - direct mock implementation
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (category: string, key: string) => {
      if (category === 'common' && key === 'loading') {
        return 'Loading...';
      }
      return `${category}.${key}`;
    }
  })
}));

// Mock the Lucide-react component
vi.mock('lucide-react', () => ({
  Loader2: ({ size, className, 'aria-label': ariaLabel }: { size?: number; className?: string; 'aria-label'?: string }) => (
    <div 
      data-testid="loader-icon" 
      data-size={size}
      className={className}
      aria-label={ariaLabel}
    >
      Loader Icon
    </div>
  )
}));

describe('Spinner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test with default props
  test('renders with default props', () => {
    render(<Spinner />);
    
    const spinnerIcon = screen.getByTestId('loader-icon');
    expect(spinnerIcon).toBeInTheDocument();
    
    // Check default size
    expect(spinnerIcon).toHaveAttribute('data-size', '16');
    
    // Check default className
    expect(spinnerIcon).toHaveClass('spinner');
    
    // Check aria-label from translation
    expect(spinnerIcon).toHaveAttribute('aria-label', 'Loading...');
  });

  // Test with custom size
  test('renders with custom size', () => {
    render(<Spinner size={32} />);
    
    const spinnerIcon = screen.getByTestId('loader-icon');
    expect(spinnerIcon).toBeInTheDocument();
    expect(spinnerIcon).toHaveAttribute('data-size', '32');
  });

  // Test with custom class name
  test('renders with custom class name', () => {
    render(<Spinner className="custom-spinner" />);
    
    const spinnerIcon = screen.getByTestId('loader-icon');
    expect(spinnerIcon).toBeInTheDocument();
    expect(spinnerIcon).toHaveClass('spinner');
    expect(spinnerIcon).toHaveClass('custom-spinner');
  });
}); 