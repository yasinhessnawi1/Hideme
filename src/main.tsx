// In main.tsx
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/index.css';
import App from './App';
import { pdfjs } from 'react-pdf';
import ErrorBoundary from "./contexts/ErrorBoundary";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
// Set the worker source to the CDN with the correct extension
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
        <BrowserRouter>
            <ErrorBoundary>
            <App />
            </ErrorBoundary>
        </BrowserRouter>
    </StrictMode>
);
