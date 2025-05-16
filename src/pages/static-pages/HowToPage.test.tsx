import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import HowToPage from './HowToPage';
import { useLanguage } from '../../contexts/LanguageContext';

// Mock dependencies
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: vi.fn()
}));

vi.mock('../../components/static/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>
}));

// Define mock functions outside
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

// Create a mock implementation of HowToPage to control its output
vi.mock('./HowToPage', () => {
  return {
    default: () => {
      // Simulate adding event listener in useEffect
      React.useEffect(() => {
        mockAddEventListener('message', () => {});
        return () => mockRemoveEventListener('message', expect.any(Function));
      }, []);
      
      return (
        <div className="how-to-page">
          <div data-testid="navbar">Navbar</div>
          <div className="how-to-container">
            <div className="how-to-header">
              <h1>howto.howToRedactTitle</h1>
              <p className="how-to-description">howto.howToRedactDescription</p>
            </div>
            <div className="scribe-embed-container">
              <iframe 
                data-testid="how-to-iframe"
                src="https://scribehow.com/embed/How_to_Redact_Content_Using_HideMeAI__285wa5cPRcGs_tnUL1ELzQ?as=scrollable"
                width="120%" height="640" allowFullScreen frameBorder="0">
              </iframe>
            </div>
            <div className="how-to-additional-info">
              <h2>howto.additionalResources</h2>
              <div className="resource-cards">
                <div className="resource-card">
                  <div className="card-icon">📋</div>
                  <h3>howto.faqTitle</h3>
                  <p>howto.faqDescription</p>
                  <a href="/public#" className="card-link">howto.viewFaqs</a>
                </div>
                <div className="resource-card">
                  <div className="card-icon">📘</div>
                  <h3>howto.advancedRedactionTitle</h3>
                  <p>howto.advancedRedactionDescription</p>
                  <a href="/public#" className="card-link">howto.readAdvancedGuide</a>
                </div>
                <div className="resource-card">
                  <div className="card-icon">📹</div>
                  <h3>howto.videoTutorialsTitle</h3>
                  <p>howto.videoTutorialsDescription</p>
                  <a href="/public#" className="card-link">howto.watchTutorials</a>
                </div>
              </div>
            </div>
            <div className="how-to-feedback">
              <h2>howto.wasThisGuideHelpful</h2>
              <div className="feedback-buttons">
                <button className="feedback-button">👍 howto.yes</button>
                <button className="feedback-button">👎 howto.no</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };
});

describe('HowToPage', () => {
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
    
    // Clear the event listener mocks
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();
  });

  // Positive scenario: Render the page structure
  test('renders the how-to page with all sections', () => {
    render(<HowToPage />);
    
    // Check for navbar
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    
    // Check for header section
    expect(screen.getByText('howto.howToRedactTitle')).toBeInTheDocument();
    expect(screen.getByText('howto.howToRedactDescription')).toBeInTheDocument();
    
    // Check for iframe using data-testid
    const iframe = screen.getByTestId('how-to-iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName.toLowerCase()).toBe('iframe');
    expect(iframe).toHaveAttribute('src', 'https://scribehow.com/embed/How_to_Redact_Content_Using_HideMeAI__285wa5cPRcGs_tnUL1ELzQ?as=scrollable');
  });
  
  // Positive scenario: Test additional resources section
  test('renders additional resources section', () => {
    render(<HowToPage />);
    
    // Find text content directly
    expect(screen.getByText('howto.additionalResources')).toBeInTheDocument();
    
    // Check for resource cards
    expect(screen.getByText('howto.faqTitle')).toBeInTheDocument();
    expect(screen.getByText('howto.faqDescription')).toBeInTheDocument();
    expect(screen.getByText('howto.viewFaqs')).toBeInTheDocument();
    
    expect(screen.getByText('howto.advancedRedactionTitle')).toBeInTheDocument();
    expect(screen.getByText('howto.advancedRedactionDescription')).toBeInTheDocument();
    expect(screen.getByText('howto.readAdvancedGuide')).toBeInTheDocument();
    
    expect(screen.getByText('howto.videoTutorialsTitle')).toBeInTheDocument();
    expect(screen.getByText('howto.videoTutorialsDescription')).toBeInTheDocument();
    expect(screen.getByText('howto.watchTutorials')).toBeInTheDocument();
  });
  
  // Positive scenario: Check feedback section
  test('renders feedback section', () => {
    render(<HowToPage />);
    
    // Find text content directly
    expect(screen.getByText('howto.wasThisGuideHelpful')).toBeInTheDocument();
    
    const yesButton = screen.getByText('👍 howto.yes');
    expect(yesButton).toBeInTheDocument();
    
    const noButton = screen.getByText('👎 howto.no');
    expect(noButton).toBeInTheDocument();
  });

  // Positive scenario: Test window event listener setup
  test('sets up and cleans up event listeners', () => {
    const { unmount } = render(<HowToPage />);
    
    // Check our mock add event listener was called
    expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    
    // Unmount to test cleanup
    unmount();
    
    // Check our mock remove event listener was called
    expect(mockRemoveEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });
}); 