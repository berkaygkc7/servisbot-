import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'lottie-web': 'lottie-web/build/player/lottie_light',
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-maps': ['@vis.gl/react-google-maps', '@turf/turf'],
          'vendor-utils': ['xlsx', 'date-fns', 'framer-motion']
        }
      }
    }
  }
})
