import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        en: resolve(__dirname, 'en.html'),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined
          if (id.includes('/node_modules/three/')) return 'vendor-three'
          if (id.includes('/node_modules/gsap/')) return 'vendor-gsap'
          return 'vendor'
        },
      },
    },
  },
})
