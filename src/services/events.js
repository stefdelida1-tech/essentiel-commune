/**
 * src/services/events.js
 * Événements locaux à venir pour une commune.
 *
 * Sources (par ordre de priorité) :
 *  - France Évasion Régions / DATAtourisme, API ouverte sans clé
 *    (https://france-evasion-regions.com/api/open/evenements.json, Licence
 *    Ouverte v2.0) — flux mutualisé entre toutes les communes.
 *  - DATAtourisme API (https://api.datatourisme.fr/v1) — clé gratuite via
 *    https://www.datatourisme.fr/utiliser-les-donnees, exposée en VITE_DATATOURISME_API_KEY
 *  - OpenAgenda API v2 — clé gratuite via https://openagenda.com/, exposée en
 *    VITE_OPENAGENDA_API_KEY
 *
 * Règle stricte : seuls les événements non terminés et commençant dans les
 * 60 prochains jours sont retournés (voir freshness.js). Sans clé configurée,
 * le service retourne une liste vide et l'appelant retombe sur les
 * actualités "sorties" (elles-mêmes filtrées à 60 jours).
 */

import { filterEventsInWindow, parseDate } from './freshness.js';
import { fetchNeighborCommunes } from './neighborCommunes.js';

const EVENTS_TIMEOUT_MS = 8000;
const MAX_EVENTS = 5;
const eventsCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const DATATOURISME_API_KEY = import.meta.env?.VITE_DATATOURISME_API_KEY || '';
const OPENAGENDA_API_KEY = import.meta.env?.VITE_OPENAGENDA_API_KEY || '';

// Flux ouvert France Évasion (reprise DATAtourisme) : un seul fetch mutualisé
// pour toutes les communes, filtrage géographique côté client.
const FRANCE_EVASION_URL = 'https://france-evasion-regions.com/api/open/evenements.json?limit=500';
let franceEvasionCache = null; // { timestamp, items }

function normalizePlace(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Charge (et met en cache) le flux national d'événements France Évasion. */
async function fetchFranceEvasionFeed() {
  if (franceEvasionCache && (Date.now() - franceEvasionCache.timestamp) < CACHE_TTL_MS) {
    return franceEvasionCache.items;
  }
  const data = await fetchJson(FRANCE_EVASION_URL);
  const list = Array.isArray(data) ? data
    : (data?.evenements || data?.results || data?.data || []);
  franceEvasionCache = { timestamp: Date.now(), items: Array.isArray(list) ? list : [] };
  return franceEvasionCache.items;
}

/**
 * Événements via l'API ouverte France Évasion / DATAtourisme (sans clé).
 * Le flux est national : on ne conserve que les événements localisés sur la
 * commune (champ ville/commune — `lieuNames` permet d'élargir aux communes
 * voisines) ou, à défaut de commune renseignée, sur son département quand le
 * champ département est présent.
 */
async function fetchFranceEvasionEvents(commune, lieuNames = null) {
  if (!commune?.nom) return [];

  const feed = await fetchFranceEvasionFeed();
  if (!feed.length) return [];

  const nomNorm = normalizePlace(commune.nom);
  const departNorm = normalizePlace(commune.departementNom || commune.codeDepartement || '');

  return feed.map(ev => {
    const ville = ev.ville || ev.commune || ev.city || ev.code_postal_ville || '';
    const departement = ev.departement?.nom || ev.departement || ev.department || '';
    const villeNorm = normalizePlace(typeof ville === 'string' ? ville : '');
    const departNormEv = normalizePlace(typeof departement === 'string' ? departement : (departement?.nom || ''));

    // Correspondance sur la commune (ou sur une voisine si lieuNames est fourni) ;
    // sans ville renseignée, on accepte le département comme périmètre « proche ».
    const communeMatch = villeNorm
      ? (lieuNames
          ? lieuNames.has(villeNorm)
          : villeNorm === nomNorm || villeNorm.includes(nomNorm) || nomNorm.includes(villeNorm))
      : (departNormEv && (departNormEv === departNorm || departNormEv.includes(departNorm)));
    if (!communeMatch) return null;

    // Le nom de la ville est toujours affiché : indispensable quand
    // l'événement provient d'une commune voisine (fallback rural).
    const lieuParts = [ev.adresse, ville].filter(Boolean);
    const lieu = [...new Set(lieuParts.map(String))].join(', ') || departement || null;

    return {
      title: ev.nom || ev.titre || ev.title || '',
      start: ev.date_debut || ev.start || ev.date || null,
      end: ev.date_fin || ev.end || ev.date_debut || ev.start || null,
      lieu,
      url: ev.url || ev.lien || null,
      image: ev.photo || ev.image || null,
      source: 'France Évasion / DATAtourisme'
    };
  }).filter(e => e && e.title);
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EVENTS_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Événements via l'API DATAtourisme (POIs "entertainmentAndEvent").
 * La fenêtre de dates est portée par le champ takesPlaceAt du POI.
 */
async function fetchDatatourismeEvents(commune) {
  const depart = commune.codeDepartement;
  if (!depart || !DATATOURISME_API_KEY) return [];

  const url = 'https://api.datatourisme.fr/v1/entertainmentAndEvent'
    + `?api_key=${encodeURIComponent(DATATOURISME_API_KEY)}`
    + `&filters=${encodeURIComponent(`department=${depart}`)}`
    + '&fields=title,takesPlaceAt,location,addressUrl'
    + '&page_size=30';

  const data = await fetchJson(url);
  const pois = data?.data || data?.results || [];

  return pois.map(poi => {
    const places = Array.isArray(poi.takesPlaceAt) ? poi.takesPlaceAt : [];
    const place = places.find(pl => pl?.startDate || pl?.endDate) || places[0] || {};
    const communeName = (commune.nom || '').toLowerCase();
    const placeText = [
      poi.location?.description,
      poi.address?.addressLocality,
      poi.address?.streetAddress
    ].filter(Boolean).join(', ');
    return {
      title: poi.title || poi.name || '',
      start: place.startDate || null,
      end: place.endDate || place.startDate || null,
      lieu: placeText || null,
      source: 'DATAtourisme',
      // On ne retient que les événements explicitement localisés sur la commune
      // quand le lieu est renseigné ; sinon on les laisse au filtre géographique.
      _communeMatch: !placeText || placeText.toLowerCase().includes(communeName)
    };
  }).filter(e => e.title && e._communeMatch !== false);
}

/**
 * Événements via l'API OpenAgenda v2.
 */
async function fetchOpenAgendaEvents(commune) {
  if (!OPENAGENDA_API_KEY || !commune?.nom) return [];

  const where = encodeURIComponent(JSON.stringify({
    type: 'city',
    city: commune.nom,
    department: commune.departementNom || undefined
  }));
  const url = `https://api.openagenda.com/v2/events?locales=fr&key=${encodeURIComponent(OPENAGENDA_API_KEY)}`
    + `&where=${where}&limit=20&order=start`;

  const data = await fetchJson(url);
  const hits = data?.hits || [];

  return hits.map(ev => ({
    title: typeof ev.title === 'string' ? ev.title : (ev.title?.fr || ''),
    start: ev.start || null,
    end: ev.end || ev.start || null,
    lieu: ev.location?.[0]?.description || null,
    url: ev.url || null,
    image: ev.image || null,
    source: 'OpenAgenda'
  })).filter(e => e.title);
}

/**
 * Événements locaux à venir (fenêtre : aujourd'hui → +60 jours).
 * @returns {Promise<Array<{title,start,end,lieu,url?,source}>}
 */
export async function fetchCommuneEvents(commune) {
  if (!commune || !commune.nom) return [];

  const cacheKey = `events:${commune.code || commune.nom}`;
  const cached = eventsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  const [feEvents, dtEvents, oaEvents] = await Promise.all([
    fetchFranceEvasionEvents(commune).catch(() => []),
    fetchDatatourismeEvents(commune).catch(() => []),
    fetchOpenAgendaEvents(commune).catch(() => [])
  ]);

  const toMerged = (e) => ({
    title: e.title,
    start: e.start ? new Date(e.start).toISOString() : null,
    end: e.end ? new Date(e.end).toISOString() : null,
    lieu: e.lieu || null,
    url: e.url || null,
    source: e.source || (e.url ? 'OpenAgenda' : 'DATAtourisme')
  });

  const seen = new Set();
  const dedupeFilter = (e) => {
    if (!e.start || !parseDate(e.start)) return false;
    const key = e.title.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôùûüç]+/gi, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };

  let rawEvents = [...feEvents, ...dtEvents, ...oaEvents];

  // Fallback géographique (petites communes rurales) : si aucun événement
  // propre dans la fenêtre J → J+60, on élargit aux communes voisines
  // (même code postal, sinon même département) en gardant le nom de la ville.
  let neighborEvents = [];
  const probe = filterEventsInWindow(rawEvents.map(toMerged)).length;
  if (probe === 0) {
    const neighbors = await fetchNeighborCommunes(commune).catch(() => []);
    if (neighbors.length) {
      const lieuNames = new Set([commune.nom, ...neighbors.map(n => n.nom)].map(normalizePlace));
      neighborEvents = await fetchFranceEvasionEvents(commune, lieuNames).catch(() => []);
      rawEvents = rawEvents.concat(neighborEvents);
    }
  }

  const merged = rawEvents.map(toMerged).filter(dedupeFilter);

  const items = filterEventsInWindow(merged)
    .sort((a, b) => parseDate(a.start) - parseDate(b.start))
    .slice(0, MAX_EVENTS);

  eventsCache.set(cacheKey, { data: items, timestamp: Date.now() });
  return items;
}
