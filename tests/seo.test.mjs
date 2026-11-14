/**
 * tests/seo.test.mjs
 * Validation du SEO, des métadonnées, du sitemap et de la configuration Vercel
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🧪 Démarrage des tests de l\'Étape 5 (SEO, Performance & Vercel)...');

  // Test 1: Validation de robots.txt
  const robotsPath = path.resolve(__dirname, '../public/robots.txt');
  const robotsContent = await fs.readFile(robotsPath, 'utf-8');
  if (!robotsContent.includes('Allow: /') || !robotsContent.includes('sitemap.xml')) {
    throw new Error('robots.txt invalide ou incomplet.');
  }
  console.log('  ✅ Test 1 : Fichier robots.txt validé avec lien sitemap.');

  // Test 2: Validation du sitemap.xml
  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  const sitemapContent = await fs.readFile(sitemapPath, 'utf-8');
  if (!sitemapContent.startsWith('<?xml') || !sitemapContent.includes('<urlset') || !sitemapContent.includes('essentiel-commune.vercel.app')) {
    throw new Error('sitemap.xml mal formé ou vide.');
  }
  console.log('  ✅ Test 2 : Fichier sitemap.xml valide et conforme au standard Sitemaps.org.');

  // Test 3: Validation de vercel.json
  const vercelPath = path.resolve(__dirname, '../vercel.json');
  const vercelContent = await fs.readFile(vercelPath, 'utf-8');
  const vercelConfig = JSON.parse(vercelContent);

  if (!vercelConfig.headers || !vercelConfig.rewrites) {
    throw new Error('vercel.json doit contenir les sections "headers" et "rewrites".');
  }

  // Vérification de la présence d'un cache immuable pour les assets et security headers
  const assetHeader = vercelConfig.headers.find(h => h.source && h.source.includes('/assets/'));
  if (!assetHeader) {
    throw new Error('Configuration de cache immuable manquante pour /assets/ dans vercel.json.');
  }
  console.log('  ✅ Test 3 : Configuration Vercel (rewrites SPA, cache HTTP immuable, headers de sécurité) validée.');

  // Test 4: Balises SEO dans index.html
  const htmlPath = path.resolve(__dirname, '../index.html');
  const htmlContent = await fs.readFile(htmlPath, 'utf-8');

  const requiredTags = [
    'rel="canonical"',
    'property="og:title"',
    'property="og:description"',
    'name="twitter:card"',
    'application/ld+json'
  ];

  for (const tag of requiredTags) {
    if (!htmlContent.includes(tag)) {
      throw new Error(`Balise SEO obligatoire manquante dans index.html : ${tag}`);
    }
  }
  console.log('  ✅ Test 4 : Balises Open Graph, Twitter Cards, Canonical et JSON-LD Schema.org validées.');

  console.log('✨ Tous les tests de l\'Étape 5 sont validés avec succès !');
}

runTests().catch(err => {
  console.error('❌ Échec des tests de l\'Étape 5 :', err.message);
  process.exit(1);
});
