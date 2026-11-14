/**
 * fetch_geo.mjs
 * Script de collecte et filtrage des données géographiques des communes françaises via geo.api.gouv.fr
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Analyse des arguments en ligne de commande
const args = process.argv.slice(2);
function getArg(name, defaultValue = null) {
  const prefix = `--${name}=`;
  const match = args.find(a => a.startsWith(prefix));
  if (match) return match.substring(prefix.length);
  const flagIndex = args.indexOf(`--${name}`);
  if (flagIndex !== -1 && args[flagIndex + 1]) return args[flagIndex + 1];
  return defaultValue;
}

const maxPopArg = getArg('max-pop');
const maxPop = maxPopArg !== null ? parseInt(maxPopArg, 10) : null;
const minPopArg = getArg('min-pop');
const minPop = minPopArg !== null ? parseInt(minPopArg, 10) : null;
const deptFilter = getArg('dept');
const limitArg = getArg('limit');
const limit = limitArg !== null ? parseInt(limitArg, 10) : null;
const outputPath = getArg('output', path.resolve(__dirname, '../../../../data/communes.json'));

async function main() {
  console.log('📡 Récupération des communes depuis geo.api.gouv.fr...');
  
  let url = 'https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,population,codeDepartement,codeRegion,centre';
  if (deptFilter) {
    url += `&codeDepartement=${deptFilter}`;
  }

  const startTime = Date.now();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
  }

  let communes = await response.json();
  console.log(`✅ ${communes.length} communes brutes reçues en ${Date.now() - startTime}ms.`);

  // Filtrage selon population
  if (maxPop !== null) {
    console.log(`🔍 Application du filtre : population <= ${maxPop}`);
    communes = communes.filter(c => c.population !== undefined && c.population <= maxPop);
  }
  if (minPop !== null) {
    console.log(`🔍 Application du filtre : population >= ${minPop}`);
    communes = communes.filter(c => c.population !== undefined && c.population >= minPop);
  }

  // Tri par nom
  communes.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  if (limit !== null && limit > 0) {
    console.log(`✂️ Limitation à ${limit} communes pour le test.`);
    communes = communes.slice(0, limit);
  }

  console.log(`📊 Total après filtrage : ${communes.length} communes.`);

  // Sauvegarde
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(communes, null, 2), 'utf-8');
  console.log(`💾 Données sauvegardées dans : ${outputPath}`);
}

main().catch(err => {
  console.error('❌ Erreur lors de la récupération :', err);
  process.exit(1);
});
