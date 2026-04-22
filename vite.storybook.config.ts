import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config used only by Storybook. Keep this separate from `vite.config.ts` so
 * the library build (dts + lib mode) does not run in the docs environment.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@amsborse/cosmic-ui': fileURLToPath(new URL('src/index.ts', import.meta.url)),
    },
  },
});
