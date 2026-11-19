/**
 * src/services/news.js
 * Récupération d'actualités locales par commune via le flux RSS public
 * Google News (recherche plein texte, sans clé API),
 * et alertes civiques (pollens, météo, qualité de l'air).
 */

import { isFresh, parseDate } from './freshness.js';

const newsCache = new Map();
const NEWS_TIMEOUT_MS = 8000;
const MAX_ITEMS = 4;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 heure

// Alertes civiques : API GeoAPI pour les vigilances météo par département
const ALERT_SOURCES = {
  meteo: {
    name: 'Alertes météo',
    // GeoAPI endpoint pour la vigilance météo
    url: (codeDepartement) => `https://geo.api.gouv.fr/departements/${codeDepartement}?fields=nom,codeRegion`
  }
};

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Requêtes thématiques : 'general' = actualités locales, 'travaux' = chantiers/voirie
// Le filtre Google News `when:60d` limite la remontée aux articles des 60 derniers jours.
const NEWS_QUERIES = {
  general: (commune) => `"${commune.nom}" ${commune.codeDepartement || ''} when:60d`,
  travaux: (commune) => `"${commune.nom}" (travaux OR chantier OR voirie OR circulation OR stationnement OR déviation) ${commune.codeDepartement || ''} when:60d`,
  sorties: (commune) => `"${commune.nom}" (sortie OR spectacle OR festival OR manifestation OR animation OR exposition OR concert) ${commune.codeDepartement || ''} when:60d`,
  economie: (commune) => `"${commune.nom}" (emploi OR entreprise OR commerce OR artisan OR association OR projet OR inauguration OR développement) ${commune.codeDepartement || ''} when:60d`,
  sante: (commune) => `(dépistage OR vaccination OR santé OR prévention OR campagne) ${commune.codeDepartement || ''} when:60d`,
  seniors: (commune) => `(seniors OR personnes âgées OR aide sociale OR CCAS OR solidarité OR allocataire) ${commune.codeDepartement || ''} when:60d`,
  dechets: (commune) => `(tri OR déchets OR collecte OR recyclage OR déchèterie OR verre OR compost) ${commune.codeDepartement || ''} when:60d`
};

async function fetchRssQuery(rawQuery) {
  const query = encodeURIComponent(rawQuery);
  // Endpoint same-origin proxyfié (proxy Vite en dev, rewrite Vercel en prod)
  // car news.google.com n'expose pas d'en-tête CORS.
  const url = `/gnrss/search?q=${query}&hl=fr&gl=FR&ceid=FR:fr`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEWS_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) return [];

    return Array.from(doc.querySelectorAll('item')).map(item => ({
      title: item.querySelector('title')?.textContent?.trim() || '',
      link: item.querySelector('link')?.textContent?.trim() || '',
      source: item.querySelector('source')?.textContent?.trim() || '',
      pubDate: item.querySelector('pubDate')?.textContent?.trim() || '',
      pubDateTs: parseDate(item.querySelector('pubDate')?.textContent?.trim()),
      description: item.querySelector('description')?.textContent?.trim() || ''
    }));
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRssItems(commune, theme = 'general') {
  const depart = NEWS_QUERIES[theme] ? theme : 'general';
  return fetchRssQuery(NEWS_QUERIES[depart](commune));
}

/**
 * Récupère les alertes civiques pour une commune (alertes météo via Google News).
 * @param {Object} commune - avec codeDepartement, regionNom
 * @returns {Promise<{pollen: string[], meteo: string[]}>}
 */
export async function fetchCivicAlerts(commune) {
  if (!commune) return { pollen: [], meteo: [] };

  const cacheKey = `alerts:${commune.code || commune.nom}`;
  const cached = newsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  const alerts = { pollen: [], meteo: [] };

  // Alertes météo via Google News thématique
  if (commune.codeDepartement) {
    try {
      const query = encodeURIComponent(`alerte météo OR vigilance OR orage OR canicule OR neige OR vent ${commune.codeDepartement} when:60d`);
      const url = `/gnrss/search?q=${query}&hl=fr&gl=FR&ceid=FR:fr`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), NEWS_TIMEOUT_MS);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
          const xml = await res.text();
          const doc = new DOMParser().parseFromString(xml, 'text/xml');
          if (!doc.querySelector('parsererror')) {
            const items = Array.from(doc.querySelectorAll('item'))
              // Anti-obsolescence : seules les alertes de moins de 60 jours sont retenues
              .filter(item => isFresh(item.querySelector('pubDate')?.textContent?.trim()))
              .map(item => ({
                title: item.querySelector('title')?.textContent?.trim() || '',
                link: item.querySelector('link')?.textContent?.trim() || '',
                description: item.querySelector('description')?.textContent?.trim() || ''
              }));
            alerts.meteo = items.slice(0, 2).map(i => ({
              title: i.title,
              description: i.description?.replace(/<[^>]+>/g, '').substring(0, 200) || '',
              link: i.link
            }));
          }
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      console.warn('Alertes météo indisponibles', err);
    }
  }

  newsCache.set(cacheKey, { data: alerts, timestamp: Date.now() });
  return alerts;
}

// Requête de repli géographique pour les petites communes : quand la recherche
// sur le nom exact renvoie trop peu d'articles frais, on élargit à l'EPCI
// (intercommunalité) puis au département.
const FALLBACK_PREFIXES = /^(Communauté de communes?|Communauté d'agglomération|Communauté urbaine|Métropole du Grand Paris|Pays)\s+(de|d'|des|du)?\s*/i;

function fallbackNewsTarget(commune) {
  const epci = (commune.epciNom || '').replace(FALLBACK_PREFIXES, '').trim();
  if (epci && epci.length >= 4) {
    return { pseudo: { ...commune, nom: epci }, perimetre: `EPCI : ${commune.epciNom}` };
  }
  const dep = commune.departementNom || (commune.codeDepartement ? `Département ${commune.codeDepartement}` : null);
  if (dep) {
    return { pseudo: { ...commune, nom: dep }, perimetre: `Département : ${dep}` };
  }
  return null;
}

/**
 * Retourne les actualités les plus pertinentes pour une commune.
 * @param {string} theme 'general' | 'travaux'
 * @returns {Promise<Array<{title, link, source, pubDate}>>}
 */
export async function fetchCommuneNews(commune, theme = 'general') {
  if (!commune || !commune.nom) return [];

  const cacheKey = `${commune.code || commune.nom}:${theme}`;
  const cached = newsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  let items = [];
  try {
    const raw = await fetchRssItems(commune, theme);
    const nomNorm = normalize(commune.nom);

    // Anti-obsolescence : on ne garde que les articles publiés
    // dans les 60 derniers jours (ou sans date fiable : exclus).
    const fresh = raw.filter(item => isFresh(item.pubDateTs ?? item.pubDate));

    // Priorité aux articles mentionnant explicitement la commune
    const scored = fresh
      .map(item => {
        const haystack = normalize(`${item.title} ${item.description}`);
        return { item, score: haystack.includes(nomNorm) ? 1 : 0 };
      })
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item);

    // Dédupliquer : Google News republie souvent le même titre via
    // plusieurs sources ; on garde la première occurrence.
    const seenTitles = new Set();
    const dedupe = (list) => list.filter((item) => {
      const key = normalize(item.title).replace(/[^a-z0-9]+/g, ' ').trim();
      if (!key || seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    items = dedupe(scored);

    // Fallback géographique (petites communes rurales) : si moins de 3
    // articles propres et frais, on complète via l'EPCI puis le département.
    if (items.length < 3) {
      const target = fallbackNewsTarget(commune);
      if (target) {
        const rawFallback = await fetchRssItems(target.pseudo, theme).catch(() => []);
        const freshFallback = rawFallback
          .filter(item => isFresh(item.pubDateTs ?? item.pubDate))
          .map(item => ({ ...item, perimetre: target.perimetre }));
        const extra = dedupe(freshFallback).slice(0, MAX_ITEMS - items.length);
        items = items.concat(extra);
      }
    }

    items = items.slice(0, MAX_ITEMS);
  } catch (err) {
    console.warn('Actualités indisponibles pour', commune.nom, err);
  }

  newsCache.set(cacheKey, { data: items, timestamp: Date.now() });
  return items;
}
