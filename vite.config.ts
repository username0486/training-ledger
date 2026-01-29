import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

// Generate build version (commit hash or timestamp)
function getBuildVersion(): string {
  try {
    // Try to get git commit hash (first 8 chars)
    return execSync('git rev-parse --short=8 HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    // Fallback to timestamp if git is not available
    return Date.now().toString(36)
  }
}

const BUILD_VERSION = getBuildVersion()

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    // Inject build version into service worker
    {
      name: 'inject-build-version-sw',
      writeBundle() {
        // Read the service worker template from public
        const swPath = path.resolve(__dirname, 'public/sw.js')
        let swContent = readFileSync(swPath, 'utf-8')
        
        // Replace __BUILD_VERSION__ placeholder with actual version
        swContent = swContent.replace(/__BUILD_VERSION__/g, BUILD_VERSION)
        
        // Write transformed service worker to dist
        const distSwPath = path.resolve(__dirname, 'dist/sw.js')
        writeFileSync(distSwPath, swContent, 'utf-8')
        console.log(`[Vite] Injected build version ${BUILD_VERSION} into service worker`)
      },
    },
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
  define: {
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
})
