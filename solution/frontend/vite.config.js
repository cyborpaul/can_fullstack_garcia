// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // lee .env.[mode]
  const API_TARGET = env.VITE_DEV_API_TARGET || 'http://localhost:9010'
  const API_BASE = env.VITE_API_BASE || '/api'

  return {
    plugins: [react()],
    server: {
      port: 9999,
      proxy: {
        [API_BASE]: {
          target: API_TARGET,
          changeOrigin: true,
          rewrite: (p) => p
        }
      }
    },
    build: { outDir: 'dist' }
  }
})
