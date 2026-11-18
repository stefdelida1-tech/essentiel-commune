/**
 * src/services/events.js
 * Événements locaux à venir pour une commune.
 *
 * Sources (par ordre de priorité) :
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

const EVENTS_TIMEOUT_MS = 8000;
const MAX_EVENTS = 5;
const eventsCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const DATATOURISME_API_KEY = import.meta.env?.VITE_DATATOURISME_API_KEY || '';
const OPENAGENDA_API_KEY = import.meta.env?.VITE_OPENAGENDA_API_KEY || '';

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
    image: ev.image || null
  })).filter(e => e.title);
}

/**
 * Événements locaux à venir (fenêtre : aujourd'hui → +60 jours).
 * @returns {Promise<Array<{title,start,end,lieu,url?,source}>}
 */
export async function fetchCommuneEvents(commune) {
  if (!commune || (!DATATOURISME_API_KEY && !OPENAGENDA_API_KEY)) return [];

  const cacheKey = `events:${commune.code || commune.nom}`;
  const cached = eventsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  const [dtEvents, oaEvents] = await Promise.all([
    fetchDatatourismeEvents(commune).catch(() => []),
    fetchOpenAgendaEvents(commune).catch(() => [])
  ]);

  const seen = new Set();
  const merged = [...dtEvents, ...oaEvents]
    .map(e => ({
      title: e.title,
      start: e.start ? new Date(e.start).toISOString() : null,
      end: e.end ? new Date(e.end).toISOString() : null,
      lieu: e.lieu || null,
      url: e.url || null,
      source: e.url ? 'OpenAgenda' : 'DATAtourisme'
    }))
    .filter(e => {
      if (!e.start || !parseDate(e.start)) return false;
      const key = e.title.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôùûüç]+/gi, ' ').trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const items = filterEventsInWindow(merged)
    .sort((a, b) => parseDate(a.start) - parseDate(b.start))
    .slice(0, MAX_EVENTS);

  eventsCache.set(cacheKey, { data: items, timestamp: Date.now() });
  return items;
}
