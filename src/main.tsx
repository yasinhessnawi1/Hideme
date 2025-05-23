import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/index.css';
import './styles/components/LanguageSwitcher.css';
import App from './App';
import { pdfjs } from 'react-pdf';
import ErrorBoundary from "./contexts/ErrorBoundary";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useLanguage } from './contexts/LanguageContext';

// Make sure to set the worker source before rendering the app
// and use the correct URL format for Vite
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

// Create a function to ensure the worker is loaded
const ensureWorkerLoaded = () => {
    return new Promise<void>((resolve) => {
        // If the worker is already loaded, resolve immediately
        if (pdfjs.GlobalWorkerOptions.workerPort) {
            console.log('PDF.js worker already loaded');
            resolve();
            return;
        }

        // Otherwise, wait for the worker to load
        const checkWorkerInterval = setInterval(() => {
            if (pdfjs.GlobalWorkerOptions.workerPort) {
                console.log('PDF.js worker loaded');
                clearInterval(checkWorkerInterval);
                resolve();
            }
        }, 10);

        // Safety timeout to prevent infinite checking
        setTimeout(() => {
            clearInterval(checkWorkerInterval);
            console.warn('PDF.js worker loading timed out, proceeding anyway');
            resolve();
        }, 30);
    });
};

// Initialize the application once the worker is ready
const initializeApp = async () => {
    try {
        // This ensures the worker is loaded before rendering
        await ensureWorkerLoaded();

        const rootElement = document.getElementById('root');
        if (rootElement) {
            createRoot(rootElement).render(
                <StrictMode>
                    <BrowserRouter>
                        <ErrorBoundary>
                            <App />
                        </ErrorBoundary>
                    </BrowserRouter>
                </StrictMode>
            );
        } else {
            console.error('Root element not found');
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        // Use a static fallback message here, since hooks can't be used
        const rootElement = document.getElementById('root');
        if (rootElement) {
            rootElement.innerHTML = `<div style="color: red; padding: 20px;">App initialization failed. Please reload the page.</div>`;
        }
    }
};

// Start the initialization process
initializeApp();
