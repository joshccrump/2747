import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For a project page like https://YOURUSER.github.io/YOURREPO/
// set VITE_GITHUB_PAGES_BASE to /YOURREPO/ in GitHub Actions.
// For a custom domain or user site, leave it as /.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_GITHUB_PAGES_BASE || '/',
});
