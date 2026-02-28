import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
  esbuild: {
    pure: mode === 'production'
      ? ['console.log', 'console.info', 'console.debug', 'console.trace']
      : [],
  },
  server: {
    allowedHosts: ['localhost-vite.mobulum.xyz','my-purchases.mobulum.com', 'my-purchases.github.io'],
  },
}))