import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Hero from './Hero';

// Mock the FloatingPaper component
vi.mock('./FloatingPaper', () => ({
  FloatingPaper: ({ count }: { count: number }) => (
    <div data-testid="floating-paper" data-count={count}>Mock FloatingPaper</div>
  ),
}));

// Mock framer-motion to avoid animations in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} data-testid="motion-div">
        {children}
      </div>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className} data-testid="motion-p">
        {children}
      </p>
    ),
  },
}));

// Mock the language context
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (namespace: string, key: string) => `${key}_translated`,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

describe('Hero', () => {
  it('renders the hero component', () => {
    render(<Hero />);
    const heroElement = document.querySelector('.hero');
    expect(heroElement).toBeInTheDocument();
  });

  it('renders the FloatingPaper component with correct props', () => {
    render(<Hero />);
    const floatingPaper = screen.getByTestId('floating-paper');
    expect(floatingPaper).toBeInTheDocument();
    expect(floatingPaper.getAttribute('data-count')).toBe('6');
  });

  it('renders the hero title with translation', () => {
    render(<Hero />);
    const heroTitle = document.querySelector('.hero-title');
    expect(heroTitle).toBeInTheDocument();
    expect(heroTitle?.textContent).toContain('transformTitle_translated');
    expect(heroTitle?.textContent).toContain('safeOnes_translated');
  });

  it('renders the hero description with translation', () => {
    render(<Hero />);
    const heroDescription = screen.getByTestId('motion-p');
    expect(heroDescription).toBeInTheDocument();
    expect(heroDescription.textContent).toBe('heroDescription_translated');
  });

  it('renders with animation elements', () => {
    render(<Hero />);
    const motionElements = screen.getAllByTestId(/motion-/);
    expect(motionElements.length).toBeGreaterThan(0);
  });

  it('renders the hero content structure', () => {
    render(<Hero />);
    expect(document.querySelector('.hero-content')).toBeInTheDocument();
    expect(document.querySelector('.hero-text')).toBeInTheDocument();
    expect(document.querySelector('.floating-papers')).toBeInTheDocument();
    expect(document.querySelector('.robo-animation')).toBeInTheDocument();
  });
}); 