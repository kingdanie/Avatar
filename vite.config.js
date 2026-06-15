import { defineConfig } from 'vite'

export default defineConfig({
  base: '/Avatar/',
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
  },
})
