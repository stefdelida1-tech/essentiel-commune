/**
 * tests/data-pipeline.test.mjs
 * Validation du pipeline de données des communes
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🧪 Démarrage des tests du pipeline de données...');
  const dataPath = path.resolve(__dirname, '../data/communes.json');
  const publicDataPath = path.resolve(__dirname, '../public/data/communes.json');

  // Test 1: Existence des fichiers
  const fileExists = await fs.access(dataPath).then(() => true).catch(() => false);
  const publicExists = await fs.access(publicDataPath).then(() => true).catch(() => false);
  if (!fileExists || !publicExists) {
    throw new Error('Les fichiers communes.json ne sont pas présents dans data/ ou public/data/');
  }
  console.log('  ✅ Test 1 : Présence des fichiers validée.');

  // Test 2: Parsing JSON
  const rawData = await fs.readFile(dataPath, 'utf-8');
  const communes = JSON.parse(rawData);
  if (!Array.isArray(communes) || communes.length === 0) {
    throw new Error('Le fichier communes.json est vide ou n\'est pas un tableau.');
  }
  console.log(`  ✅ Test 2 : Format JSON valide (${communes.length} communes recensées).`);

  // Test 3: Vérification du seuil de population
  const overPop = communes.filter(c => c.population > 2000);
  if (overPop.length > 0) {
    throw new Error(`Anomalie : ${overPop.length} communes dépassent le seuil de 2000 habitants.`);
  }
  console.log('  ✅ Test 3 : Seuil de population <= 2 000 habitants respecté à 100%.');

  // Test 4: Intégrité des champs obligatoires et coordonnées
  let invalidCoords = 0;
  let missingFields = 0;

  for (const c of communes) {
    if (!c.nom || !c.code || !c.codeDepartement) {
      missingFields++;
    }
    if (!c.centre || !c.centre.coordinates || c.centre.coordinates.length !== 2) {
      invalidCoords++;
    }
  }

  if (missingFields > 0) {
    throw new Error(`Anomalie : ${missingFields} communes ont des champs obligatoires manquants.`);
  }
  console.log('  ✅ Test 4 : Tous les champs obligatoires (nom, code, département) sont conformes.');

  if (invalidCoords > 0) {
    console.warn(`  ⚠️ Avertissement : ${invalidCoords} communes sans coordonnées précises.`);
  } else {
    console.log('  ✅ Test 5 : Toutes les communes possèdent des coordonnées géographiques valides.');
  }

  console.log('✨ Tous les tests de l\'Étape 1 sont validés avec succès !');
}

runTests().catch(err => {
  console.error('❌ Échec des tests :', err.message);
  process.exit(1);
});
