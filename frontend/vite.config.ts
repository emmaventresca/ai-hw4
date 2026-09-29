import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The FastAPI backend serves both the JSON API and the product images. Proxying
// /api and /media in dev keeps the frontend on same-origin relative URLs.
const BACKEND = process.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8010'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/media': { target: BACKEND, changeOrigin: true },
    },
  },
})
