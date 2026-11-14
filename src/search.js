/**
 * src/search.js
 * Moteur de recherche rapide de communes par nom ou code postal
 */

export function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['-]/g, ' ')
    .trim();
}

export class CommuneSearchEngine {
  constructor(communes = []) {
    this.communes = [];
    this.index = [];
    if (communes.length > 0) {
      this.init(communes);
    }
  }

  init(communes) {
    this.communes = communes;
    this.index = communes.map((c, i) => {
      const normNom = normalizeText(c.nom);
      const postaux = (c.codesPostaux || []).join(' ');
      return {
        index: i,
        normNom,
        postaux,
        code: c.code
      };
    });
  }

  search(query, limit = 8) {
    if (!query) return [];
    const cleanQuery = normalizeText(query);
    if (cleanQuery.length < 2) return [];

    const isNumeric = /^\d+$/.test(cleanQuery);
    const results = [];

    for (let i = 0; i < this.index.length; i++) {
      const item = this.index[i];
      let matches = false;

      if (isNumeric) {
        if (item.postaux.includes(cleanQuery) || item.code.startsWith(cleanQuery)) {
          matches = true;
        }
      } else {
        if (item.normNom.startsWith(cleanQuery) || item.normNom.includes(' ' + cleanQuery)) {
          matches = true;
        }
      }

      if (matches) {
        results.push(this.communes[item.index]);
        if (results.length >= limit) break;
      }
    }

    // Si on a moins de résultats et que ce n'est pas numérique, recherche substring plus large
    if (results.length < limit && !isNumeric && cleanQuery.length >= 3) {
      for (let i = 0; i < this.index.length; i++) {
        const item = this.index[i];
        if (!results.includes(this.communes[item.index]) && item.normNom.includes(cleanQuery)) {
          results.push(this.communes[item.index]);
          if (results.length >= limit) break;
        }
      }
    }

    return results;
  }
}
