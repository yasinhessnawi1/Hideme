import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: false,
    },
  },
  resolve: {
    alias: {
      'pdfjs-dist': path.resolve('./node_modules/pdfjs-dist')
    }
  }
});
