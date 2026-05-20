import { defineConfig } from 'vite';

export default defineConfig({
  base: '/data-kalsul/',
  server: {
    port: 5173,
    proxy: {
      '/data-kalsul/api': {
        target: 'https://super-bas.com',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
