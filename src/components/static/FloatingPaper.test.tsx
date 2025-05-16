import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FloatingPaper } from './FloatingPaper';

// Mock framer-motion to avoid animations in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} data-testid="motion-div" data-props={JSON.stringify(props)}>
        {children}
      </div>
    ),
  },
}));

// Mock resize listener
const mockResizeListener = vi.fn();

describe('FloatingPaper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
    
    // Mock addEventListener and removeEventListener
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'resize') {
        mockResizeListener.mockImplementation(handler as any);
      }
    });
    
    vi.spyOn(window, 'removeEventListener').mockImplementation((event, handler) => {
      if (event === 'resize') {
        // This is enough for testing that it was called
      }
    });
  });

  it('renders the floating paper container', () => {
    render(<FloatingPaper />);
    const container = document.querySelector('.floating-paper-container');
    expect(container).toBeInTheDocument();
  });

  it('renders the default number of papers (10)', () => {
    render(<FloatingPaper />);
    const papers = screen.getAllByTestId('motion-div');
    expect(papers.length).toBe(10);
  });

  it('renders the specified number of papers', () => {
    render(<FloatingPaper count={5} />);
    const papers = screen.getAllByTestId('motion-div');
    expect(papers.length).toBe(5);
  });

  it('adds resize event listener on mount', () => {
    render(<FloatingPaper />);
    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('removes resize event listener on unmount', () => {
    const { unmount } = render(<FloatingPaper />);
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('each paper contains the paper content and icon', () => {
    render(<FloatingPaper count={1} />);
    const paper = screen.getByTestId('motion-div');
    const paperContent = document.querySelector('.paper-content');
    
    expect(paper).toBeInTheDocument();
    expect(paperContent).toBeInTheDocument();
    expect(document.querySelector('.paper-icon')).toBeInTheDocument();
  });
}); 