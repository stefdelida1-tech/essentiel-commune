/**
 * tests/newsletter.test.mjs
 * Validation du module de bulletin d'information et d'actualités communales
 */

import { generateCommuneBulletin, renderBulletinHtml } from '../src/components/NewsletterTemplate.js';

async function runTests() {
  console.log('🧪 Démarrage des tests de l\'Étape 4 (Page Newsletter / Bulletin communal)...');

  const testCommune = {
    nom: "Saint-Germain-de-la-Grange",
    code: "78550",
    codesPostaux: ["78640"],
    population: 1840,
    codeDepartement: "78"
  };

  // Test 1: Génération des données éditoriales du bulletin
  const bulletin = generateCommuneBulletin(testCommune);
  if (!bulletin || bulletin.communeName !== testCommune.nom) {
    throw new Error('Échec génération bulletin : nom de commune non conforme.');
  }
  console.log('  ✅ Test 1 : Modèle de données éditoriales généré avec succès.');

  // Test 2: Richesse du contenu (éditorial, rubriques, infos pratiques)
  if (!bulletin.editorial || !bulletin.editorial.content.includes('1\u202f840') && !bulletin.editorial.content.includes('1 840')) {
    throw new Error('Échec éditorial : la population n\'apparaît pas correctement formatée.');
  }
  if (!Array.isArray(bulletin.articles) || bulletin.articles.length < 3) {
    throw new Error('Échec rubriques : le bulletin doit contenir au moins 3 articles d\'actualité.');
  }
  console.log('  ✅ Test 2 : Structure éditoriale complète (éditorial, vie municipale, environnement, agenda).');

  // Test 3: Rendu HTML du bulletin
  const html = renderBulletinHtml(bulletin);
  if (!html.includes('L\'Écho de Saint-Germain-de-la-Grange')) {
    throw new Error('Échec rendu HTML : titre principal manquant.');
  }
  if (!html.includes('SAMU : 15')) {
    throw new Error('Échec rendu HTML : numéros d\'urgence manquants.');
  }
  console.log('  ✅ Test 3 : Rendu HTML sémantique et complet validé.');

  // Test 4: Respect de l'absence de collecte d'e-mail (conformité RGPD)
  if (html.includes('<input type="email"') || html.includes('newsletter-subscription')) {
    throw new Error('Conformité RGPD violée : aucun formulaire de collecte d\'e-mail ne doit être présent dans le bulletin par défaut.');
  }
  console.log('  ✅ Test 4 : Conformité RGPD respectée (lecture 100% citoyenne sans inscription ni collecte).');

  console.log('✨ Tous les tests de l\'Étape 4 sont validés avec succès !');
}

runTests().catch(err => {
  console.error('❌ Échec des tests de l\'Étape 4 :', err.message);
  process.exit(1);
});
