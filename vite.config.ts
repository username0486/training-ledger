import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    // Ensure proper chunking for better caching
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  // Base path for production (root domain)
  base: '/',
  // Ensure public folder assets are properly copied
  publicDir: 'public',
  // Dev server configuration for consistent port and HMR
  server: {
    port: 5174,
    strictPort: false, // Allow fallback to next available port if 5174 is busy
    hmr: {
      port: 5174,
      clientPort: 5174, // Explicitly set client port for HMR
    },
  },
})
