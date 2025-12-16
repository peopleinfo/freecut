import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Remotion Player - loaded when preview is needed
          'remotion-player': ['@remotion/player', '@remotion/media'],
          // Remotion Renderer - only needed for export
          'remotion-renderer': ['@remotion/renderer'],
          // Remotion core and utilities
          'remotion-core': [
            'remotion',
            '@remotion/transitions',
            '@remotion/shapes',
            '@remotion/layout-utils',
            '@remotion/gif',
            '@remotion/google-fonts',
          ],
          // Media processing - loaded on demand
          'media-processing': ['mediabunny'],
          // UI framework
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-scroll-area',
          ],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['mediabunny'],
  },
})
