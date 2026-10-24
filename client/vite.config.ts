import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // relative base so assets load correctly on GitHub Pages, Capacitor and Tauri
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true, // for instant file change detection over WSL/Windows filesystem
    },
    hmr: {
      protocol: 'ws',
      port: 5173,
      // Leaving out fixed host so Vite auto-detects: localhost on PC, 192.168.0.152 on mobile
    },
  },
})
