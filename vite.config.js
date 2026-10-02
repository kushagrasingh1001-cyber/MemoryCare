import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for MemoryCare.
// - `host` + `allowedHosts` let the app run inside cloud preview environments
//   (and on your LAN phone) without "Blocked request" errors.
// - the React plugin enables Fast Refresh during development.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
