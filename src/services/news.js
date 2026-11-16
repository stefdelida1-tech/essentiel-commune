/**
 * src/services/news.js
 * Récupération d'actualités locales par commune via le flux RSS public
 * Google News (recherche plein texte, sans clé API).
 */

const newsCache = new Map();
const NEWS_TIMEOUT_MS = 8000;
const MAX_ITEMS = 4;

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

async function fetchRssItems(commune) {
  const departement = commune.codeDepartement ? ` ${commune.codeDepartement}` : '';
  const query = encodeURIComponent(`"${commune.nom}"${departement}`);
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
 * Retourne les actualités les plus pertinentes pour une commune.
 * @returns {Promise<Array<{title, link, source, pubDate}>>}
 */
export async function fetchCommuneNews(commune) {
  if (!commune || !commune.nom) return [];

  const cacheKey = commune.code || commune.nom;
  if (newsCache.has(cacheKey)) {
    return newsCache.get(cacheKey);
  }

  let items = [];
  try {
    const raw = await fetchRssItems(commune);
    const nomNorm = normalize(commune.nom);

    // Priorité aux articles mentionnant explicitement la commune
    const scored = raw
      .map(item => {
        const haystack = normalize(`${item.title} ${item.description}`);
        return { item, score: haystack.includes(nomNorm) ? 1 : 0 };
      })
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item);

    items = scored.slice(0, MAX_ITEMS);
  } catch (err) {
    console.warn('Actualités indisponibles pour', commune.nom, err);
  }

  newsCache.set(cacheKey, items);
  return items;
}
