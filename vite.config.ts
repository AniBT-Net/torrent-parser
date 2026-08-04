import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    // Devtools only in development — keeps production bundle lean
    mode === 'development' && vueDevTools(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    // Single-page tool: one vendor chunk for long-term cache of Vue runtime
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue/') || id.includes('node_modules/@vue/')) {
            return 'vue'
          }
          if (id.includes('node_modules/pinia')) {
            return 'vue'
          }
          if (id.includes('node_modules/bencode') || id.includes('node_modules/uint8-util')) {
            return 'bencode'
          }
        },
      },
    },
    chunkSizeWarningLimit: 400,
  },
  base: '/',
}))
