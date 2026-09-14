/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@components': path.resolve(__dirname, './src/components'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@config': path.resolve(__dirname, './src/config'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@app_types': path.resolve(__dirname, './src/types'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // Forward WebSocket upgrades (sandbox preview tunnels under /api/sandbox/...)
        ws: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    // The suite mounts heavy workspace components (monaco, sandbox FS, rich
    // text) and runs 20+ files in parallel workers — on slower machines the
    // default 5s per-test cap is hit before a slow mount finishes. Keep a
    // generous ceiling so tests fail on real breakage, not CPU contention.
    testTimeout: 30000,
  },
});
