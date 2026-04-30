import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project URL for this repo:
// https://joshccrump.github.io/2747/
// Keep this as /2747/ unless you move to a custom domain.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_GITHUB_PAGES_BASE || '/2747/',
});
