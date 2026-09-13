import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const resolve = (p: string) => root + p;

// Three entries: popup + options are HTML pages, background is an ES-module
// service worker (manifest `background.type: "module"`). Fixed file names so
// manifest.json can reference them without a hashing step.
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome110',
    sourcemap: false,
    rollupOptions: {
      input: {
        popup: resolve('popup.html'),
        options: resolve('options.html'),
        background: resolve('src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
