/// <reference types="vitest" />
import {createRequire} from 'node:module';
import {defineConfig, normalizePath} from 'vite';
import {viteStaticCopy} from 'vite-plugin-static-copy';
import {VitePWA} from 'vite-plugin-pwa';

import react from '@vitejs/plugin-react';
import * as path from 'path';

const require = createRequire(import.meta.url);
const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
const cMapsDir = normalizePath(path.join(pdfjsDistPath, 'cmaps'));

export default defineConfig({
    plugins: [
        react(),
        viteStaticCopy({
            targets: [
                {
                    src: cMapsDir,
                    dest: '',
                },
            ],
        }),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
            },
            includeAssets: ['favicon.ico', 'app_images/ios/180.png', 'app_images/android/*'],
            manifest: {
                name: 'Hide Me - PDF Redaction Tool',
                short_name: 'HideMe',
                description: 'An advanced PDF redaction and sensitive information removal tool',
                theme_color: '#ffffff',
                background_color: '#ffffff',
                display: 'standalone',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: 'app_images/android/android-launchericon-192-192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'app_images/android/android-launchericon-512-512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'app_images/android/android-launchericon-512-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: 'app_images/android/android-launchericon-144-144.png',
                        sizes: '144x144',
                        type: 'image/png'
                    },
                    {
                        src: 'app_images/android/android-launchericon-96-96.png',
                        sizes: '96x96',
                        type: 'image/png'
                    },
                    {
                        src: 'app_images/android/android-launchericon-72-72.png',
                        sizes: '72x72',
                        type: 'image/png'
                    },
                    {
                        src: 'app_images/android/android-launchericon-48-48.png',
                        sizes: '48x48',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
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
        coverage: {
            provider: 'v8',
            reporter: [
                ['text', { maxCols: 120 }], // Increases table width
                'json',
                'html'
            ],
            all: true,
            include: ['src/**/*.{js,jsx,ts,tsx}'],
            reportOnFailure: true,  // Add this line
        }
    }
});