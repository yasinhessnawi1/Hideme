import React from 'react';
import { render, screen } from '@testing-library/react';
import LandingPage from './LandingPage';
import { vi, describe, test, expect } from 'vitest';

// Mock dependencies
vi.mock('../../components/static/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>
}));

vi.mock('../../components/static/Hero', () => ({
  default: () => <div data-testid="hero">Hero Section</div>
}));

describe('LandingPage', () => {
  // Positive scenario: Renders all components
  test('renders navbar and hero components', () => {
    render(<LandingPage />);
    
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('hero')).toBeInTheDocument();
  });
  
  // Positive scenario: Has correct class names
  test('has the correct class names for styling', () => {
    const { container } = render(<LandingPage />);
    
    expect(container.querySelector('.landing-page')).toBeInTheDocument();
    expect(container.querySelector('.content')).toBeInTheDocument();
  });

  // Positive scenario: Correct structure
  test('has correct DOM structure', () => {
    render(<LandingPage />);
    
    const mainElement = screen.getByRole('main');
    expect(mainElement).toHaveClass('landing-page');
    
    const contentDiv = mainElement.querySelector('.content');
    expect(contentDiv).toBeInTheDocument();
    
    expect(contentDiv?.contains(screen.getByTestId('navbar'))).toBeTruthy();
    expect(contentDiv?.contains(screen.getByTestId('hero'))).toBeTruthy();
  });
}); 