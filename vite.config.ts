/// <reference types="vitest" />
import { createRequire } from 'node:module';
import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

import react from '@vitejs/plugin-react';
import * as path from 'path';

const require = createRequire(import.meta.url);
const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
const cMapsDir = normalizePath(path.join(pdfjsDistPath, 'cmaps'));
export default defineConfig({
    plugins: [react() , viteStaticCopy({
        targets: [
            {
                src: cMapsDir,
                dest: '',
            },
        ],
    })],
    server: {
        hmr: {
            overlay: false,
        },
    },
    resolve: {
        alias: {
            'pdfjs-dist': path.resolve('./node_modules/pdfjs-dist')
        }
    },
    // Add the Vitest configuration
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './setup.ts',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            all: true,
            include: ['src/**/*.{js,jsx,ts,tsx}'],
        }
    }
});