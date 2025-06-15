
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'


export default defineConfig({
  plugins: [vue()],
  base: "/",
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') } // mirrors vue.config.js
  },
  server: {
    host: '0.0.0.0',
    port: 80,      // whatever you used before
    open: true
  },
  build: {
    outDir: 'dist',  // same as CLI default
  }
})