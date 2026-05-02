import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  server: { port: 3000 },
  test: { environment: 'jsdom' },
  plugins: [crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        // Keep standalone mode working
        main: 'index.html'
      }
    }
  }
});
