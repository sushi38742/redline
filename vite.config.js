import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During development the React app (5173) proxies API calls to the
// Redline scan engine running on the Express server (8787).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
