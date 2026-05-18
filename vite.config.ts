import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['three', 'three-globe', 'three/examples/jsm/controls/OrbitControls']
    }
  }
})
