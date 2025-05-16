import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrueFocus from './TrueFocus';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, animate, transition }: any) => (
      <div 
        className={className} 
        data-testid="motion-div" 
        data-animate={JSON.stringify(animate)} 
        data-transition={JSON.stringify(transition)} 
        style={style}
      >
        {children}
      </div>
    ),
  },
}));

describe('TrueFocus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Element's getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 10,
      top: 10,
      width: 100,
      height: 30,
      right: 110,
      bottom: 40,
      x: 10,
      y: 10,
      toJSON: () => {}
    });
  });

  it('renders with default props', () => {
    render(<TrueFocus />);
    
    // Check if the container is rendered
    expect(document.querySelector('.focus-container')).toBeInTheDocument();
    
    // Check if default text is rendered
    const words = document.querySelectorAll('.focus-word');
    expect(words.length).toBe(2); // "True Focus" has 2 words
    expect(words[0].textContent).toBe('True');
    expect(words[1].textContent).toBe('Focus');
    
    // Check if focus frame is rendered
    expect(screen.getByTestId('motion-div')).toBeInTheDocument();
  });

  it('renders with custom sentence', () => {
    render(<TrueFocus sentence="Hello World Example" />);
    
    // Check if custom text is rendered with correct word count
    const words = document.querySelectorAll('.focus-word');
    expect(words.length).toBe(3);
    expect(words[0].textContent).toBe('Hello');
    expect(words[1].textContent).toBe('World');
    expect(words[2].textContent).toBe('Example');
  });

  it('applies custom styling based on props', () => {
    render(
      <TrueFocus 
        sentence="Styled Text" 
        blurAmount={10} 
        borderColor="red" 
        glowColor="rgba(255, 0, 0, 0.6)" 
      />
    );
    
    // Check if custom styling is applied to words
    const words = document.querySelectorAll('.focus-word');
    expect((words[0] as HTMLElement).style.getPropertyValue('--border-color')).toBe('red');
    expect((words[0] as HTMLElement).style.getPropertyValue('--glow-color')).toBe('rgba(255, 0, 0, 0.6)');
    
    // The first word should start active and not blurred
    expect((words[0] as HTMLElement).style.filter).toBe('blur(0px)');
    
    // Other words should be blurred with custom amount
    expect((words[1] as HTMLElement).style.filter).toBe('blur(10px)');
    
    // Check if custom styling is applied to focus frame
    const focusFrame = screen.getByTestId('motion-div');
    expect(focusFrame.style.getPropertyValue('--border-color')).toBe('red');
    expect(focusFrame.style.getPropertyValue('--glow-color')).toBe('rgba(255, 0, 0, 0.6)');
  });

  it('handles manual mode correctly', () => {
    render(<TrueFocus sentence="Manual Mode Test" manualMode={true} />);
    
    const words = document.querySelectorAll('.focus-word');
    
    // All words should have the manual class
    Array.from(words).forEach(word => {
      expect(word.classList.contains('manual')).toBe(true);
    });
    
    // Initially all words should be blurred except the first one
    expect((words[0] as HTMLElement).style.filter).toBe('blur(0px)'); // First word is active by default
    expect((words[1] as HTMLElement).style.filter).toBe('blur(5px)'); // Others are blurred
    expect((words[2] as HTMLElement).style.filter).toBe('blur(5px)');
    
    // Hover over a word to make it active
    fireEvent.mouseEnter(words[1]);
    
    // After hover, that word should be active
    expect((words[1] as HTMLElement).style.filter).toBe('blur(0px)');
    
    // Mouse leave should keep the last active word
    fireEvent.mouseLeave(words[1]);
    
    // The word should remain last active word (index 1)
    expect((words[1] as HTMLElement).style.filter).toBe('blur(0px)');
  });

  it('sets up focus frame with correct animation props', () => {
    render(<TrueFocus sentence="Animation Test" animationDuration={0.8} />);
    
    const focusFrame = screen.getByTestId('motion-div');
    const animateData = JSON.parse(focusFrame.getAttribute('data-animate') || '{}');
    const transitionData = JSON.parse(focusFrame.getAttribute('data-transition') || '{}');
    
    // Check animation values
    expect(animateData).toHaveProperty('x');
    expect(animateData).toHaveProperty('y');
    expect(animateData).toHaveProperty('width');
    expect(animateData).toHaveProperty('height');
    expect(animateData).toHaveProperty('opacity', 1);
    
    // Check that custom duration is applied
    expect(transitionData).toHaveProperty('duration', 0.8);
  });

  it('renders corner elements in focus frame', () => {
    render(<TrueFocus />);
    
    const focusFrame = screen.getByTestId('motion-div');
    const corners = focusFrame.querySelectorAll('.corner');
    
    // Should have 4 corners
    expect(corners.length).toBe(4);
    
    // Verify corner classes
    expect(corners[0].classList.contains('top-left')).toBe(true);
    expect(corners[1].classList.contains('top-right')).toBe(true);
    expect(corners[2].classList.contains('bottom-left')).toBe(true);
    expect(corners[3].classList.contains('bottom-right')).toBe(true);
  });
}); 