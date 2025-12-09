import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base: "./"' permite que el juego funcione en subcarpetas (ej. GitHub Pages)
  base: './', 
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})