import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(() => {
  // Пытаемся безопасно прочитать приватник Игрока 3 для локального дев-сервера

  let devPlayer3Key = ''
  try {
    const envPath = path.resolve(__dirname, '../.private/wallets.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const match = content.match(/PLAYER3_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)
      if (match) devPlayer3Key = match[1]
    }
  } catch (e) {
    // В CI/CD или на проде .private может отсутствовать
  }

  return {
    plugins: [react()],
    base: './', // relative base so assets load correctly on GitHub Pages, Capacitor and Tauri
    define: {
      __DEV_LOCAL_PK__: JSON.stringify(devPlayer3Key)
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      watch: {
        usePolling: true, // for instant file change detection over WSL/Windows filesystem
      },
      hmr: {
        protocol: 'ws',
        port: 5173,
      },
    },
  }
})

