import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // Build optimizations for production
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate sourcemaps for debugging (set to false to reduce bundle size)
    sourcemap: false,
    
    // Use esbuild for minification (faster, built-in)
    minify: 'esbuild',
    
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'ui-vendor': ['framer-motion', 'lucide-react'],
          // State management
          'state-vendor': ['zustand', 'axios'],
        },
      },
    },
    
    // Increase chunk size warning limit (default is 500kb)
    chunkSizeWarningLimit: 1000,
  },
  
  // Esbuild options - drop console.log in production
  esbuild: {
    drop: ['console', 'debugger'],
  },
  
  // Preview server configuration (for testing production build locally)
  preview: {
    port: 4173,
    strictPort: true,
    // Required for SPA: serve index.html for all unknown paths
    historyApiFallback: true,
  },
  
  // Dev server configuration
  server: {
    port: 5174,
    strictPort: false,
    open: true,
    proxy: {
      // Forward local /api requests to the local backend so there's no CORS in dev.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
