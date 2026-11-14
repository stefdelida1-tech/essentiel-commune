/**
 * scripts/generate_sitemap.mjs
 * Génération du sitemap XML pour le référencement naturel (SEO)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://essentiel-commune.vercel.app';

async function generateSitemap() {
  console.log('🗺️ Génération du sitemap XML...');
  const dataPath = path.resolve(__dirname, '../data/communes.json');
  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');

  const rawData = await fs.readFile(dataPath, 'utf-8');
  const communes = JSON.parse(rawData);

  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Page d'accueil principale -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
`;

  // Référencer un échantillon représentatif de communes (par exemple les 500 premières pour garder un sitemap léger et ultra-rapide)
  const sample = communes.slice(0, 500);
  for (const c of sample) {
    xml += `  <url>
    <loc>${BASE_URL}/#commune=${c.code}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  xml += `</urlset>\n`;

  await fs.writeFile(sitemapPath, xml, 'utf-8');
  console.log(`✅ Sitemap XML généré avec succès dans : ${sitemapPath} (${sample.length + 1} URLs recensées).`);
}

generateSitemap().catch(err => {
  console.error('❌ Erreur génération sitemap :', err);
  process.exit(1);
});
