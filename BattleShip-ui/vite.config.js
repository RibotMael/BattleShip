import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      // On intercepte tous les appels commençant par /api
      '/api': {
        target: 'https://battleship-api-i276.onrender.com',
        changeOrigin: true,
        secure: false, // Utile si le certificat SSL pose souci en local
      }
    }
  }
})