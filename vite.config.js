import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    manifest: true,
    rolldownOptions: {
      output: {
        // Directorio explícito para excluir todos los chunks admin del precaché.
        chunkFileNames: (chunk) => chunk.moduleIds.some((id) =>
          /\/src\/(?:pages\/admin\/|components\/admin\/|layouts\/Admin|state\/Admin|lib\/admin)/.test(id))
          ? 'assets/admin/[name]-[hash].js' : 'assets/[name]-[hash].js',
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      workbox: {
        globIgnores: ['**/admin/**'],
        // El panel administrativo debe obtener siempre el shell vigente.
        // Evita que una instalación PWA antigua resuelva /admin/* con un
        // index.html cacheado que aún no conoce las rutas administrativas.
        navigateFallbackDenylist: [/^\/admin(?:\/|$)/],
      },
      manifest: {
        name: 'AndesMarket',
        short_name: 'AndesMarket',
        description: 'Pide tus productos del minimarket desde tu celular.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f3f5f1',
        theme_color: '#3a9a5c',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
