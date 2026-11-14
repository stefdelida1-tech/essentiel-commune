/**
 * tests/newsletter.test.mjs
 * Validation du module de bulletin d'information contextualisé
 */

import { generateCommuneBulletin, renderBulletinHtml } from '../src/components/NewsletterTemplate.js';

async function runTests() {
  console.log('🧪 Démarrage des tests du bulletin d\'information contextualisé...');

  // Cas 1 : Commune urbaine / métropole (ex: Bondy)
  const bondyCommune = {
    nom: "Bondy",
    code: "93010",
    codesPostaux: ["93140"],
    population: 50595,
    codeDepartement: "93",
    departementNom: "Seine-Saint-Denis",
    regionNom: "Île-de-France",
    epciNom: "Métropole du Grand Paris",
    cadreDeVieType: "metropole",
    typologie: "Pôle métropolitain / Grand centre urbain",
    densite: 9262,
    mairieAdresse: "ESPLANADE CLAUDE FUZIER 93140 BONDY",
    wikiExtract: "Bondy est une commune française du département de la Seine-Saint-Denis, en région Île-de-France."
  };

  const bulletinBondy = generateCommuneBulletin(bondyCommune);
  if (!bulletinBondy) {
    throw new Error('Échec génération bulletin Bondy.');
  }

  // Vérification de la contextualisation urbaine (ne doit pas être qualifié de "rural" !)
  if (bulletinBondy.editorial.content.includes('cadre de vie rural')) {
    throw new Error('Anomalie : Bondy (50 000 hab) ne doit pas être qualifiée de rurale.');
  }
  if (!bulletinBondy.editorial.content.includes('Métropole du Grand Paris') && !bulletinBondy.editorial.content.includes('dynamiques métropolitaines')) {
    throw new Error('Anomalie : le bulletin de Bondy doit refléter sa dimension métropolitaine.');
  }
  console.log('  ✅ Test 1 : Contextualisation urbaine de Bondy validée (éditorial métropolitain).');

  // Vérification de l'intégration de la Mairie et de l'intercommunalité
  const htmlBondy = renderBulletinHtml(bulletinBondy);
  if (!htmlBondy.includes('ESPLANADE CLAUDE FUZIER 93140 BONDY')) {
    throw new Error('Adresse officielle de la mairie manquante dans le bulletin de Bondy.');
  }
  if (!htmlBondy.includes('Métropole du Grand Paris')) {
    throw new Error('Nom de l\'intercommunalité manquant dans le bulletin de Bondy.');
  }
  console.log('  ✅ Test 2 : Adresse de la mairie et nom de l\'EPCI intégrés avec succès.');

  // Cas 2 : Petite commune rurale (ex: L'Abergement-Clémenciat)
  const ruralCommune = {
    nom: "L'Abergement-Clémenciat",
    code: "01001",
    codesPostaux: ["01400"],
    population: 860,
    codeDepartement: "01",
    departementNom: "Ain",
    regionNom: "Auvergne-Rhône-Alpes",
    epciNom: "CC de la Dombes",
    cadreDeVieType: "rural",
    typologie: "Commune rurale"
  };

  const bulletinRural = generateCommuneBulletin(ruralCommune);
  if (!bulletinRural.editorial.content.includes('authenticité rurale') && !bulletinRural.editorial.content.includes('cadre naturel')) {
    throw new Error('Anomalie : une petite commune doit conserver sa contextualisation rurale.');
  }
  console.log('  ✅ Test 3 : Contextualisation rurale préservée pour les villages.');

  console.log('✨ Tous les tests du bulletin contextualisé sont validés avec succès !');
}

runTests().catch(err => {
  console.error('❌ Échec des tests :', err.message);
  process.exit(1);
});
