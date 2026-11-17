/**
 * src/services/communeDetails.js
 * Service d'enrichissement dynamique des données communales
 * (geo.api.gouv.fr, Recherche Entreprises, Wikipedia Open API,
 *  annuaire-mairie.fr, Wikidata)
 */

import { fetchMairieInfo } from './annuaire.js';
import { fetchAirQuality, interpretAqi } from './weather.js';

const detailsCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 heure
const WIKIDATA_UA = { 'User-Agent': 'EssentielCommune/1.0 (contact@essentiel-commune.vercel.app)' };

/** Recherche le gentilé de la commune via Wikidata (ex. "les Lyonnais"). */
async function fetchGentile(nom) {
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(nom)}&language=fr&format=json&limit=5&type=item`;
    const searchRes = await fetch(searchUrl, { headers: WIKIDATA_UA });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const hit = (searchData.search || []).find(e =>
      /commune|ville|municipalit|village/i.test(e.description || '')
    ) || searchData.search?.[0];
    if (!hit?.id) return null;

    const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${hit.id}&props=claims&format=json`;
    const entityRes = await fetch(entityUrl, { headers: WIKIDATA_UA });
    if (!entityRes.ok) return null;
    const entityData = await entityRes.json();
    // P1549 = gentilé, stocké en monolingualtext avec qualifier de langue
    const claims = entityData.entities?.[hit.id]?.claims?.P1549 || [];
    const frClaim = claims.find(c => c.mainsnak?.datavalue?.value?.language === 'fr');
    return frClaim?.mainsnak?.datavalue?.value?.text || null;
  } catch {
    return null;
  }
}

export async function fetchCommuneDetails(commune) {
  if (!commune || !commune.code) return null;

  const code = commune.code;
  const cached = detailsCache.get(code);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
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

  // Requêtes satellites : infos mairie (annuaire-mairie.fr) + gentilé (Wikidata) + qualité de l'air
  const mairiePromise = fetchMairieInfo({ ...commune, nom: geoData.nom || commune.nom }).catch(() => null);
  const gentilePromise = fetchGentile(geoData.nom || commune.nom).catch(() => null);
  const airQualityPromise = (lat && lng) ? fetchAirQuality(lat, lng).catch(() => null) : Promise.resolve(null);
  const [mairieInfo, gentile, airQualityRaw] = await Promise.all([mairiePromise, gentilePromise, airQualityPromise]);

  // Formater la qualité de l'air pour le template
  const airQuality = (airQualityRaw?.success && typeof airQualityRaw.usAqi === 'number')
    ? {
        aqi: airQualityRaw.usAqi,
        label: `AQI ${airQualityRaw.usAqi}`,
        interpretation: interpretAqi(airQualityRaw.usAqi)
      }
    : null;

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
    mairie: mairieInfo || null,
    gentile,
    airQuality,
    wikiExtract: wikiData.extract || null,
    photoUrl: wikiData.thumbnail?.source || null,
    wikiUrl: wikiData.content_urls?.desktop?.page || null
  };

  detailsCache.set(code, { data: enriched, timestamp: Date.now() });
  return enriched;
}
