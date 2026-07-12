import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import path from 'path';
import { readFileSync } from 'fs';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@background': path.resolve(__dirname, 'src/background'),
      '@content': path.resolve(__dirname, 'src/content'),
      '@sidepanel': path.resolve(__dirname, 'src/sidepanel'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@knowledge-base': path.resolve(__dirname, 'src/knowledge-base'),
    },
  },
  plugins: [
    react(),
    webExtension({
      manifest: () =>
        JSON.parse(
          readFileSync(path.resolve(__dirname, 'src/manifest.json'), 'utf-8')
        ),
      additionalInputs: ['src/content/index.ts'],
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
