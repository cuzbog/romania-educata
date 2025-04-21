import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    format: 'esnext', // DuckDB workers are ES modules,
    target: 'esnext'
  },
  base: '/romania-educata/',
})
