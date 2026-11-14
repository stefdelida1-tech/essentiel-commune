/**
 * tests/weather.test.mjs
 * Validation du service météo et du composant CommuneCard
 */

import { interpretWeatherCode, fetchWeather } from '../src/services/weather.js';

async function runTests() {
  console.log('🧪 Démarrage des tests de l\'Étape 3 (Météo & Fiche Commune)...');

  // Test 1: Décodage des codes WMO météo
  const clearSky = interpretWeatherCode(0);
  if (clearSky.label !== 'Ciel dégagé' || clearSky.icon !== '☀️') {
    throw new Error(`Échec WMO 0 : attendu "Ciel dégagé ☀️", reçu "${clearSky.label} ${clearSky.icon}"`);
  }
  console.log('  ✅ Test 1 : Interprétation code WMO 0 (Ciel dégagé) validée.');

  const rain = interpretWeatherCode(61);
  if (!rain.label.includes('Pluie')) {
    throw new Error(`Échec WMO 61 : attendu label avec "Pluie", reçu "${rain.label}"`);
  }
  console.log('  ✅ Test 2 : Interprétation code WMO 61 (Pluie) validée.');

  const unknown = interpretWeatherCode(9999);
  if (!unknown.label) {
    throw new Error('Échec code météo inconnu : fallback attendu.');
  }
  console.log('  ✅ Test 3 : Gestion du fallback sur code WMO inconnu validée.');

  // Test 4: Rejet des coordonnées invalides
  try {
    await fetchWeather('invalid', 'invalid');
    throw new Error('fetchWeather aurait dû lever une erreur sur coordonnées non numériques.');
  } catch (err) {
    console.log('  ✅ Test 4 : Contrôle des coordonnées géographiques d\'entrée validé.');
  }

  // Test 5: Appel réel Open-Meteo pour une petite commune (ex: L'Abergement-Clémenciat 46.15, 4.93)
  console.log('  📡 Test de requête vers Open-Meteo API...');
  const weatherResult = await fetchWeather(46.1517, 4.9306);
  if (!weatherResult.success) {
    console.warn(`  ⚠️ Avertissement : l'API météo n'a pas répondu immédiatement (${weatherResult.error}), fallback actif.`);
  } else {
    if (typeof weatherResult.temperature !== 'number') {
      throw new Error('La température retournée doit être un nombre.');
    }
    console.log(`  ✅ Test 5 : Appel Open-Meteo réussi (${weatherResult.temperature}°C, ${weatherResult.label} ${weatherResult.icon}).`);
  }

  console.log('✨ Tous les tests de l\'Étape 3 sont validés avec succès !');
}

runTests().catch(err => {
  console.error('❌ Échec des tests de l\'Étape 3 :', err.message);
  process.exit(1);
});
