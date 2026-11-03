import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: true,
    hmr: {
      clientPort: 443
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('socket.io-client')) return 'socket';
            if (id.includes('react')) return 'vendor';
          }
        }
      }
    }
  }
})
