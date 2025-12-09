import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000, // 30 seconds for AI vs AI games
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
