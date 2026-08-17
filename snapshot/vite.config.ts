import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';
import packageJson from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
