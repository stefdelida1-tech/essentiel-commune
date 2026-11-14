/**
 * tests/map.test.mjs
 * Validation du module cartographique et du moteur de recherche
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CommuneSearchEngine, normalizeText } from '../src/search.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🧪 Démarrage des tests de l\'Étape 2 (Carte & Recherche)...');

  // Test 1: Normalisation de texte
  const sample = "Saint-Étienne-de-Chigny";
  const normalized = normalizeText(sample);
  if (normalized !== "saint etienne de chigny") {
    throw new Error(`Échec normalisation : attendu "saint etienne de chigny", reçu "${normalized}"`);
  }
  console.log('  ✅ Test 1 : Normalisation phonétique et sans accent validée.');

  // Test 2: Moteur de recherche avec échantillon
  const sampleCommunes = [
    { nom: "L'Abergement-Clémenciat", code: "01001", codesPostaux: ["01400"], population: 860, codeDepartement: "01" },
    { nom: "Ambérieu-en-Bugey", code: "01004", codesPostaux: ["01500"], population: 14000, codeDepartement: "01" },
    { nom: "Châtillon-sur-Chalaronne", code: "01093", codesPostaux: ["01400"], population: 4900, codeDepartement: "01" },
    { nom: "Saint-Jean-sur-Veyle", code: "01365", codesPostaux: ["01290"], population: 1160, codeDepartement: "01" }
  ];

  const engine = new CommuneSearchEngine(sampleCommunes);

  // Recherche par préfixe de nom
  const resName = engine.search("Aberg");
  if (resName.length !== 1 || resName[0].code !== "01001") {
    throw new Error('Échec recherche par nom : "Aberg" devrait trouver L\'Abergement-Clémenciat');
  }
  console.log('  ✅ Test 2 : Recherche textuelle par nom fonctionnelle.');

  // Recherche par code postal
  const resPostal = engine.search("01400");
  if (resPostal.length !== 2) {
    throw new Error(`Échec recherche par code postal 01400 : attendu 2, reçu ${resPostal.length}`);
  }
  console.log('  ✅ Test 3 : Recherche par code postal (01400) fonctionnelle.');

  // Test 4: Vérification des éléments HTML essentiels dans index.html
  const htmlPath = path.resolve(__dirname, '../index.html');
  const htmlContent = await fs.readFile(htmlPath, 'utf-8');
  const requiredElements = ['id="map"', 'id="search-input"', 'id="commune-card"', 'id="stat-indicator"'];

  for (const el of requiredElements) {
    if (!htmlContent.includes(el)) {
      throw new Error(`Élément requis manquant dans index.html : ${el}`);
    }
  }
  console.log('  ✅ Test 4 : Structure HTML (carte, recherche, fiche, indicateur) validée.');

  // Test 5: Vérification de la feuille de style CSS
  const cssPath = path.resolve(__dirname, '../src/style.css');
  const cssStat = await fs.stat(cssPath);
  if (cssStat.size < 500) {
    throw new Error('La feuille de style src/style.css semble incomplète.');
  }
  console.log(`  ✅ Test 5 : Feuille de style CSS moderne validée (${cssStat.size} octets).`);

  console.log('✨ Tous les tests de l\'Étape 2 sont validés avec succès !');
}

runTests().catch(err => {
  console.error('❌ Échec des tests de l\'Étape 2 :', err.message);
  process.exit(1);
});
