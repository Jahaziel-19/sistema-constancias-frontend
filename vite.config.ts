import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// Proxy: en desarrollo redirige las peticiones /api del frontend a la API local
// (http://localhost:8000/api), evitando problemas de CORS. En producción no se usa.
const DEV_PROXY_TARGET = process.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
  server: {
    proxy: {
      "/api": {
        target: DEV_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
