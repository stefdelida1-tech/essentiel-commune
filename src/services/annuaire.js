/**
 * src/services/annuaire.js
 * Récupération des informations de la mairie (nom du maire, mandat)
 * via annuaire-mairie.fr, derrière le proxy same-origin /am.
 */

const mairieCache = new Map();
const MAIRIE_TIMEOUT_MS = 8000;

function slugify(nom) {
  return (nom || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * @returns {Promise<{maire: string, mandat: string|null}|null>}
 */
export async function fetchMairieInfo(commune) {
  const code = commune?.code;
  const slug = slugify(commune?.nom);
  if (!code || !slug) return null;
  if (mairieCache.has(code)) return mairieCache.get(code);

  let info = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MAIRIE_TIMEOUT_MS);
    const res = await fetch(`/am/ville-${slug}.html`, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const html = await res.text();
      // Ex. : "... maire de Lyon se nomme Monsieur Grégory DOUCET (mandat 2026-2032)."
      const match = html.match(/maire de [^<]*?se nomme\s+(?:Monsieur|Madame)?\s*([^<(]+?)(?:\s*\(|<|\.)/i);
      const mandatMatch = html.match(/mandat\s+(\d{4}\s*-\s*\d{4})/i);

      // Téléphone : premier lien "tel:" après la mention "Téléphone :"
      const telMatch = html.match(/Téléphone\s*:<\/strong>\s*<a href="tel:([^"]+)"[^>]*>([^<]+)</i)
        || html.match(/href="tel:([^"]+)"[^>]*>([^<]+)</i);
      const telephone = telMatch ? telMatch[2].replace(/\s+/g, ' ').trim() : null;

      // Horaires : lignes "Lundi : 07:30 à 12:30 - 13:30 à 17:00" etc.
      const horaires = Array.from(html.matchAll(
        /(?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\s*:\s*[^<]{4,90}/gi
      ))
        .map(m => m[0].replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').trim())
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 6)
        .join(' • ');

      if (match || telephone || horaires) {
        info = {
          maire: match ? match[1].replace(/\s+/g, ' ').trim() : null,
          mandat: mandatMatch ? mandatMatch[1].replace(/\s+/g, '') : null,
          telephone,
          horaires: horaires || null
        };
      }
    }
  } catch (err) {
    console.warn('Infos mairie indisponibles pour', code, err);
  }

  mairieCache.set(code, info);
  return info;
}
