/**
 * tests/legal.test.mjs
 * Validation de la conformité juridique, des mentions légales et du RGPD
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🧪 Démarrage des tests de l\'Étape 6 (Conformité juridique & RGPD)...');

  // Test 1: Mentions légales
  const mentionsPath = path.resolve(__dirname, '../public/mentions-legales.html');
  const mentionsHtml = await fs.readFile(mentionsPath, 'utf-8');

  if (!mentionsHtml.includes('Nicolas Ratisbonne')) {
    throw new Error('Échec Mentions Légales : nom de l\'éditeur "Nicolas Ratisbonne" manquant.');
  }
  if (!mentionsHtml.includes('Vercel Inc.')) {
    throw new Error('Échec Mentions Légales : mention de l\'hébergeur "Vercel Inc." manquante.');
  }
  if (!mentionsHtml.includes('geo.api.gouv.fr') || !mentionsHtml.includes('Licence Ouverte')) {
    throw new Error('Échec Mentions Légales : mention de la source des données ouvertes (Etalab / geo.api.gouv.fr) manquante.');
  }
  console.log('  ✅ Test 1 : Mentions Légales complètes et conformes (Éditeur, Hébergeur, Licence Ouverte).');

  // Test 2: Politique de confidentialité et RGPD
  const privacyPath = path.resolve(__dirname, '../public/politique-confidentialite.html');
  const privacyHtml = await fs.readFile(privacyPath, 'utf-8');

  if (!privacyHtml.includes('RGPD') || !privacyHtml.includes('Aucun cookie traceur')) {
    throw new Error('Échec RGPD : clauses de non-utilisation de cookies ou référence RGPD manquantes.');
  }
  if (!privacyHtml.includes('droit à l\'oubli') && !privacyHtml.includes('effacement')) {
    throw new Error('Échec RGPD : droit à l\'effacement / oubli non explicité.');
  }
  console.log('  ✅ Test 2 : Politique de confidentialité validée (zéro traceur, droits RGPD explicites).');

  // Test 3: Composant interactif LegalNotice
  const componentPath = path.resolve(__dirname, '../src/components/LegalNotice.js');
  const componentCode = await fs.readFile(componentPath, 'utf-8');

  if (!componentCode.includes('Nicolas Ratisbonne') || !componentCode.includes('Vercel Inc.')) {
    throw new Error('Échec composant : le modal interactif doit intégrer les coordonnées de l\'éditeur et de l\'hébergeur.');
  }
  console.log('  ✅ Test 3 : Composant modale interactif LegalNotice validé.');

  // Test 4: Accessibilité (RGAA) dans index.html
  const indexPath = path.resolve(__dirname, '../index.html');
  const indexHtml = await fs.readFile(indexPath, 'utf-8');

  if (!indexHtml.includes('aria-label="Fermer"') || !indexHtml.includes('role="dialog"')) {
    throw new Error('Échec RGAA : rôles et libellés d\'accessibilité manquants pour les modales.');
  }
  console.log('  ✅ Test 4 : Attributs sémantiques et conformité d\'accessibilité (RGAA) validés.');

  console.log('✨ Tous les tests de l\'Étape 6 sont validés avec succès !');
}

runTests().catch(err => {
  console.error('❌ Échec des tests de l\'Étape 6 :', err.message);
  process.exit(1);
});
