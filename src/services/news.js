/**
 * src/services/news.js
 * Récupération d'actualités locales par commune via le flux RSS public
 * Google News (recherche plein texte, sans clé API),
 * et alertes civiques (pollens, météo, qualité de l'air).
 */

const newsCache = new Map();
const NEWS_TIMEOUT_MS = 8000;
const MAX_ITEMS = 4;

// Alertes civiques : flux RSS publics (pollens RNSA, météo France)
const ALERT_SOURCES = {
  pollen: {
    name: 'Bulletin pollens',
    url: 'https://www.pollens.fr/rss/france.xml',
    regionMap: {
      'Île-de-France': 'ile-de-france',
      'Auvergne-Rhône-Alpes': 'auvergne-rhone-alpes',
      'Hauts-de-France': 'hauts-de-france',
      'Grand Est': 'grand-est',
      'Normandie': 'normandie',
      'Bretagne': 'bretagne',
      'Pays de la Loire': 'pays-de-la-loire',
      'Centre-Val de Loire': 'centre-val-de-loire',
      'Bourgogne-Franche-Comté': 'bourgogne-franche-comte',
      'Nouvelle-Aquitaine': 'nouvelle-aquitaine',
      'Occitanie': 'occitanie',
      'Provence-Alpes-Côte d\'Azur': 'provence-alpes-cote-d-azur',
      'Corse': 'corse'
    }
  },
  meteo: {
    name: 'Alertes météo',
    url: 'https://www.meteofrance.com/rss/vigilance_metropole.xml'
  }
};

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Requêtes thématiques : 'general' = actualités locales, 'travaux' = chantiers/voirie
const NEWS_QUERIES = {
  general: (commune) => `"${commune.nom}" ${commune.codeDepartement || ''}`,
  travaux: (commune) => `"${commune.nom}" (travaux OR chantier OR voirie OR circulation OR stationnement OR déviation) ${commune.codeDepartement || ''}`,
  sorties: (commune) => `"${commune.nom}" (sortie OR spectacle OR festival OR manifestation OR animation OR exposition OR concert) ${commune.codeDepartement || ''}`,
  economie: (commune) => `"${commune.nom}" (emploi OR entreprise OR commerce OR artisan OR association OR projet OR inauguration OR développement) ${commune.codeDepartement || ''}`
};

async function fetchRssItems(commune, theme = 'general') {
  const depart = NEWS_QUERIES[theme] ? theme : 'general';
  const query = encodeURIComponent(NEWS_QUERIES[depart](commune));
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
      description: item.querySelector('description')?.textContent?.trim() || ''
    }));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Récupère et parse un flux RSS public (proxy allorigins pour CORS).
 */
async function fetchPublicRss(url) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEWS_TIMEOUT_MS);
  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.contents) return [];
    const doc = new DOMParser().parseFromString(data.contents, 'text/xml');
    if (doc.querySelector('parsererror')) return [];

    return Array.from(doc.querySelectorAll('item')).map(item => ({
      title: item.querySelector('title')?.textContent?.trim() || '',
      link: item.querySelector('link')?.textContent?.trim() || '',
      pubDate: item.querySelector('pubDate')?.textContent?.trim() || '',
      description: item.querySelector('description')?.textContent?.trim() || ''
    }));
  } catch (err) {
    console.warn('Flux RSS indisponible:', url, err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Récupère les alertes civiques pour une commune (pollens, météo).
 * @param {Object} commune - avec codeDepartement, regionNom
 * @returns {Promise<{pollen: string[], meteo: string[]}>}
 */
export async function fetchCivicAlerts(commune) {
  if (!commune) return { pollen: [], meteo: [] };

  const cacheKey = `alerts:${commune.code || commune.nom}`;
  if (newsCache.has(cacheKey)) {
    return newsCache.get(cacheKey);
  }

  const alerts = { pollen: [], meteo: [] };

  // Pollens par région
  if (commune.regionNom && ALERT_SOURCES.pollen.regionMap[commune.regionNom]) {
    try {
      const regionSlug = ALERT_SOURCES.pollen.regionMap[commune.regionNom];
      const pollenUrl = `https://www.pollens.fr/rss/${regionSlug}.xml`;
      const items = await fetchPublicRss(pollenUrl);
      alerts.pollen = items.slice(0, 2).map(i => ({
        title: i.title,
        description: i.description?.replace(/<[^>]+>/g, '').substring(0, 200) || '',
        link: i.link
      }));
    } catch (err) {
      console.warn('Pollens indisponibles', err);
    }
  }

  // Alertes météo par département (vigilance nationale filtrée par code dept)
  if (commune.codeDepartement) {
    try {
      const items = await fetchPublicRss(ALERT_SOURCES.meteo.url);
      const deptStr = String(commune.codeDepartement);
      alerts.meteo = items
        .filter(item => {
          const desc = normalize(item.description || '');
          return desc.includes(deptStr) || desc.includes(`département ${deptStr}`);
        })
        .slice(0, 2)
        .map(i => ({
          title: i.title,
          description: i.description?.replace(/<[^>]+>/g, '').substring(0, 200) || '',
          link: i.link
        }));
    } catch (err) {
      console.warn('Alertes météo indisponibles', err);
    }
  }

  newsCache.set(cacheKey, alerts);
  return alerts;
}

/**
 * Retourne les actualités les plus pertinentes pour une commune.
 * @param {string} theme 'general' | 'travaux'
 * @returns {Promise<Array<{title, link, source, pubDate}>>}
 */
export async function fetchCommuneNews(commune, theme = 'general') {
  if (!commune || !commune.nom) return [];

  const cacheKey = `${commune.code || commune.nom}:${theme}`;
  if (newsCache.has(cacheKey)) {
    return newsCache.get(cacheKey);
  }

  let items = [];
  try {
    const raw = await fetchRssItems(commune, theme);
    const nomNorm = normalize(commune.nom);

    // Priorité aux articles mentionnant explicitement la commune
    const scored = raw
      .map(item => {
        const haystack = normalize(`${item.title} ${item.description}`);
        return { item, score: haystack.includes(nomNorm) ? 1 : 0 };
      })
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item);

    // Dédupliquer : Google News republie souvent le même titre via
    // plusieurs sources ; on garde la première occurrence.
    const seenTitles = new Set();
    const unique = scored.filter((item) => {
      const key = normalize(item.title).replace(/[^a-z0-9]+/g, ' ').trim();
      if (!key || seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    items = unique.slice(0, MAX_ITEMS);
  } catch (err) {
    console.warn('Actualités indisponibles pour', commune.nom, err);
  }

  newsCache.set(cacheKey, items);
  return items;
}
