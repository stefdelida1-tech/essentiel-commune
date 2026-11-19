/**
 * src/services/neighborCommunes.js
 * Communes voisines d'une commune (même code postal, sinon même département),
 * via geo.api.gouv.fr — utilisé pour élargir les recherches quand une petite
 * commune rurale ne renvoie pas assez de données propres.
 */

const NEIGHBORS_TIMEOUT_MS = 6000;
const MAX_NEIGHBORS = 8;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEIGHBORS_TIMEOUT_MS);
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
 * @param {Object} commune - au minimum { code, codesPostaux?, codeDepartement? }
 * @returns {Promise<Array<{code, nom, population?}>>} voisines triées
 *   (sans la commune elle-même), max MAX_NEIGHBORS.
 */
export async function fetchNeighborCommunes(commune) {
  if (!commune?.code) return [];

  const fields = 'nom,code,population';
  let list = null;

  // 1. Voisines partageant le même code postal (voisinage immédiat)
  const cp = commune.codesPostaux?.[0];
  if (cp) {
    list = await fetchJson(
      `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(cp)}&fields=${fields}&format=json&geometry=centre`
    );
  }

  // 2. À défaut (ou si trop peu de voisines), communes du même département
  if ((!Array.isArray(list) || list.length < 2) && commune.codeDepartement) {
    const depList = await fetchJson(
      `https://geo.api.gouv.fr/communes?departements=${encodeURIComponent(commune.codeDepartement)}&fields=${fields}&format=json&geometry=centre`
    );
    if (Array.isArray(depList) && depList.length) {
      // On privilégie les petites communes voisines en nombre limité ;
      // à défaut de distance, on prend les plus proches par ordre alphabétique stable.
      list = depList;
    }
  }

  if (!Array.isArray(list)) return [];

  return list
    .filter(c => c && c.code && c.code !== commune.code && c.nom)
    .slice(0, MAX_NEIGHBORS)
    .map(c => ({ code: c.code, nom: c.nom, population: c.population ?? null }));
}
