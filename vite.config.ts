import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'date-fns', 'html2pdf.js'],
    exclude: ['lucide-react']
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  server: {
    watch: {
      usePolling: true
    }
  }
});
