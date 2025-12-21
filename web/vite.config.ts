import { defineConfig } from 'npm:vite@5'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 9010,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
