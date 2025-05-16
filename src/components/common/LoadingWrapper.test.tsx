import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import LoadingWrapper from './LoadingWrapper';

// Mock dependencies - directly mock the useLanguage implementation
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (category: string, key: string) => {
      if (category === 'common' && key === 'loading') {
        return 'Loading...'; // Return a real string instead of a translation key
      }
      return `${category}.${key}`;
    }
  })
}));

vi.mock('./Spinner', () => ({
  default: () => <div data-testid="spinner">Spinner</div>
}));

describe('LoadingWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test showing children when not loading
  test('renders children when not loading', () => {
    render(
      <LoadingWrapper isLoading={false}>
        <div data-testid="test-content">Content</div>
      </LoadingWrapper>
    );
    
    // Check that children are rendered
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    
    // Check that spinner is not rendered
    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
  });

  // Test showing spinner when loading
  test('renders spinner when loading', () => {
    render(
      <LoadingWrapper isLoading={true}>
        <div data-testid="test-content">Content</div>
      </LoadingWrapper>
    );
    
    // Check that spinner is rendered
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    
    // Check for loading text using the actual string text
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Children should not be visible (but they're in the DOM since we're using opacity for overlay)
    expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
  });
  
  // Test loading with overlay
  test('renders overlay with children when loading with overlay=true', () => {
    render(
      <LoadingWrapper isLoading={true} overlay={true}>
        <div data-testid="test-content">Content</div>
      </LoadingWrapper>
    );
    
    // Both spinner and content should be in the DOM
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    
    // Check for loading message
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Check wrapper classes
    const wrapper = screen.getByTestId('test-content').parentElement;
    expect(wrapper).toHaveClass('loading-wrapper-container');
    expect(wrapper?.firstElementChild).toHaveClass('loading-wrapper-overlay');
  });
  
  // Test custom fallback content
  test('renders custom fallback content when provided', () => {
    render(
      <LoadingWrapper 
        isLoading={true}
        fallback={<div data-testid="custom-fallback">Custom Loading Message</div>}
      >
        <div data-testid="test-content">Content</div>
      </LoadingWrapper>
    );
    
    // Check that custom fallback is rendered instead of default spinner
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Loading Message')).toBeInTheDocument();
    
    // Check that children are not rendered
    expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
  });
  
  // Test custom fallback with overlay
  test('renders custom fallback in overlay when provided with overlay=true', () => {
    render(
      <LoadingWrapper 
        isLoading={true}
        overlay={true}
        fallback={<div data-testid="custom-fallback">Custom Loading Message</div>}
      >
        <div data-testid="test-content">Content</div>
      </LoadingWrapper>
    );
    
    // Both custom fallback and content should be in the DOM
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    
    // Spinner should not be rendered
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    
    // Check wrapper classes
    const wrapper = screen.getByTestId('test-content').parentElement;
    expect(wrapper).toHaveClass('loading-wrapper-container');
    expect(wrapper?.firstElementChild).toHaveClass('loading-wrapper-overlay');
  });
}); 