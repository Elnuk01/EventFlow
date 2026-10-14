import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';

const rootDir = typeof import.meta.dirname === 'string' ? import.meta.dirname : path.dirname(fileURLToPath(import.meta.url));

/**
 * Ensures static hosting platforms without dynamic rewrite engines
 * serve the SPA entry point at /auth/callback and as a 404 fallback.
 */
function spaFallbacksPlugin(): Plugin {
  return {
    name: 'spa-fallbacks-plugin',
    closeBundle() {
      const distDir = path.resolve(rootDir, 'dist');
      const indexPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;

      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // 1. Generate dist/auth/callback/index.html for static directory resolution
      const callbackDir = path.join(distDir, 'auth', 'callback');
      fs.mkdirSync(callbackDir, { recursive: true });
      fs.writeFileSync(path.join(callbackDir, 'index.html'), indexContent, 'utf-8');

      // 2. Generate dist/auth/callback.html for clean URL file resolution
      fs.writeFileSync(path.join(distDir, 'auth', 'callback.html'), indexContent, 'utf-8');

      // 3. Generate dist/404.html for static hosting fallback
      fs.writeFileSync(path.join(distDir, '404.html'), indexContent, 'utf-8');
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), spaFallbacksPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
