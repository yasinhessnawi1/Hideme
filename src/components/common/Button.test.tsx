import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { Button } from './Button';
import { useLanguage } from '../../contexts/LanguageContext';

// Mock dependencies
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: vi.fn()
}));

describe('Button', () => {
  // Set up mock translation function
  const mockTranslate = vi.fn().mockImplementation((category, key) => `${category}.${key}`);
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for useLanguage
    vi.mocked(useLanguage).mockReturnValue({
      language: 'en',
      setLanguage: vi.fn(),
      t: mockTranslate
    });
  });

  // Positive scenario: Render the button with default props
  test('renders the button with default props', () => {
    render(<Button>Test Button</Button>);
    
    // Check that the button renders with the correct content
    const button = screen.getByText('Test Button').closest('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('shimmer-button');
    expect(button).toHaveTextContent('Test Button');
  });

  // Positive scenario: Render the button with custom props
  test('renders the button with custom props', () => {
    render(
      <Button 
        className="custom-class"
        background="rgba(255, 0, 0, 1)"
        shimmerColor="#ff0000"
        shimmerSize="0.1em"
        shimmerDuration="1s"
        borderRadius="5px"
        aria-label="Custom Button"
      >
        Custom Button
      </Button>
    );
    
    // Check that the button renders with customized props
    const button = screen.getByRole('button', { name: 'Custom Button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('shimmer-button');
    expect(button).toHaveClass('custom-class');
    
    // Check style attributes are applied
    expect(button).toHaveStyle('--shimmer-color: #ff0000');
    expect(button).toHaveStyle('--radius: 5px');
    expect(button).toHaveStyle('--speed: 1s');
    expect(button).toHaveStyle('--cut: 0.1em');
    expect(button).toHaveStyle('--bg: rgba(255, 0, 0, 1)');
  });

  // Positive scenario: Button is clickable and fires onClick event
  test('calls onClick handler when clicked', () => {
    const onClickMock = vi.fn();
    
    render(<Button onClick={onClickMock}>Clickable Button</Button>);
    
    const button = screen.getByText('Clickable Button').closest('button');
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });

  // Negative scenario: Button is disabled
  test('does not fire onClick when disabled', () => {
    const onClickMock = vi.fn();
    
    render(
      <Button 
        onClick={onClickMock} 
        disabled
      >
        Disabled Button
      </Button>
    );
    
    const button = screen.getByText('Disabled Button').closest('button');
    expect(button).not.toBeNull();
    expect(button).toBeDisabled();
    
    fireEvent.click(button!);
    expect(onClickMock).not.toHaveBeenCalled();
  });

  // Verify the translation function is called with the right arguments
  test('uses translation function for aria-label when not provided', () => {
    render(<Button>Translated Button</Button>);
    
    expect(mockTranslate).toHaveBeenCalledWith('common', 'button');
  });
  
  // Test that aria-label overrides the translation
  test('uses provided aria-label instead of translation', () => {
    render(
      <Button aria-label="Custom Label">
        Labeled Button
      </Button>
    );
    
    const button = screen.getByRole('button', { name: 'Custom Label' });
    expect(button).toBeInTheDocument();
    expect(mockTranslate).not.toHaveBeenCalledWith('common', 'button');
  });
}); 