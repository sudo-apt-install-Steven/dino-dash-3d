import { defineConfig } from 'vite';

const lanProxy = {
  '/api/lan-info': 'http://127.0.0.1:5174',
  '/api/rooms': 'http://127.0.0.1:5174',
  '/ws': {
    target: 'ws://127.0.0.1:5174',
    ws: true
  }
};

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    open: false,
    watch: {
      ignored: ['**/*.md']
    },
    proxy: lanProxy
  },
  preview: {
    host: true,
    port: 4173,
    proxy: lanProxy
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200
  }
});
