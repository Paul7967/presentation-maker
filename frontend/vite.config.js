import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,jsx}', 'src/__tests__/**/*.{js,jsx}'],
    setupFiles: ['./src/test/setup.js'],
    globals: true,
  },
})
