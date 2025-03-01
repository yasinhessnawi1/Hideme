// In main.tsx
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/index.css';
import App from './App';
import { pdfjs } from 'react-pdf';

// Set the worker source to the CDN with the correct extension
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>
);
