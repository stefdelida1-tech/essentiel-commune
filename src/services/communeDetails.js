/**
 * src/services/communeDetails.js
 * Service d'enrichissement dynamique des données communales
 * (geo.api.gouv.fr, Recherche Entreprises, Wikipedia Open API,
 *  Open-Meteo météo/qualité de l'air, annuaire-mairie.fr)
 */

import { fetchWeather, fetchAirQuality } from './weather.js';
import { fetchMairieInfo } from './annuaire.js';

const detailsCache = new Map();

export async function fetchCommuneDetails(commune) {
  if (!commune || !commune.code) return null;

  const code = commune.code;
  if (detailsCache.has(code)) {
    return detailsCache.get(code);
  }

  // 1. Requête geo.api.gouv.fr détaillée (EPCI, département, région, surface, siren)
  const geoPromise = fetch(`https://geo.api.gouv.fr/communes/${code}?fields=nom,code,codesPostaux,population,codeDepartement,departement,region,epci,centre,surface,siren`)
    .then(r => r.ok ? r.json() : {})
    .catch(() => ({}));

  // 2. Requête Wikipédia (résumé et photo/blason)
  const wikiPromise = fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(commune.nom)}`, {
    headers: { 'User-Agent': 'EssentielCommune/1.0 (contact@essentiel-commune.vercel.app)' }
  })
    .then(r => r.ok ? r.json() : {})
    .catch(() => ({}));

  const [geoData, wikiData] = await Promise.all([geoPromise, wikiPromise]);

  // Coordonnées de la commune (centre géographique officiel)
  const centreCoords = geoData.centre?.coordinates; // [lng, lat]
  const lng = typeof centreCoords?.[0] === 'number' ? centreCoords[0] : (commune.lng ?? commune.lon ?? null);
  const lat = typeof centreCoords?.[1] === 'number' ? centreCoords[1] : (commune.lat ?? null);

  // Requêtes satellites : météo, qualité de l'air, infos mairie
  const meteoPromise = (lat !== null && lng !== null)
    ? Promise.all([fetchWeather(lat, lng), fetchAirQuality(lat, lng)])
        .then(([meteo, air]) => ({ meteo, air }))
        .catch(() => null)
    : Promise.resolve(null);
  const mairiePromise = fetchMairieInfo({ ...commune, nom: geoData.nom || commune.nom }).catch(() => null);
  const [satellite, mairieInfo] = await Promise.all([meteoPromise, mairiePromise]);

  // 3. Recherche de l'adresse officielle de la Mairie via son SIREN
  let mairieAdresse = null;
  const siren = geoData.siren || commune.siren;
  if (siren) {
    try {
      const entRes = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}`);
      if (entRes.ok) {
        const entData = await entRes.json();
        const siege = entData.results?.[0]?.siege;
        mairieAdresse = siege?.geo_adresse || siege?.adresse || null;
      }
    } catch {}
  }

  const population = geoData.population ?? commune.population ?? 0;
  const surfaceKm2 = geoData.surface ? (geoData.surface / 100).toFixed(1) : null;
  const densite = (surfaceKm2 && population) ? Math.round(population / parseFloat(surfaceKm2)) : null;

  // Typologie du territoire selon population et densité
  let typologie = 'Commune rurale';
  let cadreDeVieType = 'rural';
  if (population >= 50000 || (densite && densite >= 1500)) {
    typologie = 'Pôle métropolitain / Grand centre urbain';
    cadreDeVieType = 'metropole';
  } else if (population >= 10000 || (densite && densite >= 500)) {
    typologie = 'Ville moyenne';
    cadreDeVieType = 'urbain';
  } else if (population >= 2000) {
    typologie = 'Bourg centre / Petite ville';
    cadreDeVieType = 'bourg';
  }

  const enriched = {
    ...commune,
    nom: geoData.nom || commune.nom,
    code: geoData.code || commune.code,
    codesPostaux: geoData.codesPostaux || commune.codesPostaux || [],
    population,
    codeDepartement: geoData.codeDepartement || commune.codeDepartement,
    departementNom: geoData.departement?.nom || `Département ${commune.codeDepartement}`,
    regionNom: geoData.region?.nom || '',
    epciNom: geoData.epci?.nom || null,
    surfaceKm2,
    densite,
    typologie,
    cadreDeVieType,
    mairieAdresse,
    lat,
    lng,
    meteo: satellite?.meteo?.success ? satellite.meteo : null,
    qualiteAir: satellite?.air?.success ? satellite.air : null,
    maire: mairieInfo || null,
    wikiExtract: wikiData.extract || null,
    photoUrl: wikiData.thumbnail?.source || null,
    wikiUrl: wikiData.content_urls?.desktop?.page || null
  };

  detailsCache.set(code, enriched);
  return enriched;
}
