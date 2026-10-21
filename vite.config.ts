import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path tuned for GitHub Pages.
// Use "/" for a Repository Project (https://<user>.github.io/<repo>/).
// Use "/caderno-digital/" if hosting under a custom path.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
})
