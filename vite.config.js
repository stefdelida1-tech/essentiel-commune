import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // L'assistant local utilise Ollama sans exposer de service local en production.
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, '')
      },
      // Proxy same-origin vers le flux RSS Google News (pas de CORS côté client).
      // Équivalent prod : rewrite "/gnrss/:path*" dans vercel.json.
      '/gnrss': {
        target: 'https://news.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gnrss/, '/rss')
      },
      // Proxy same-origin vers annuaire-mairie.fr (pas de CORS côté client).
      // Équivalent prod : rewrite "/am/:path*" dans vercel.json.
      '/am': {
        target: 'https://www.annuaire-mairie.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/am/, '')
      }
    }
  }
});
