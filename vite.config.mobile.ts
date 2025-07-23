import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Mobile-specific Vite configuration
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.MOBILE_APP': JSON.stringify(true)
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: './index.mobile.html'
      }
    }
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'date-fns', 
      '@capacitor/core',
      '@capacitor/app',
      '@capacitor/haptics',
      '@capacitor/keyboard',
      '@capacitor/status-bar'
    ],
    exclude: ['lucide-react']
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true
    }
  }
});