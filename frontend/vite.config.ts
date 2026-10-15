import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // Proxia /api/* para o backend NestJS na porta 3000 durante o desenvolvimento.
      // Isso evita problemas de CORS sem precisar configurar headers no backend.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
