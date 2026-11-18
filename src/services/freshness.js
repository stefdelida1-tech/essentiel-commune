/**
 * src/services/freshness.js
 * Règle anti-obsolescence : toute information datée de plus de
 * FRESHNESS_WINDOW_DAYS jours (ou sans date fiable) est masquée.
 */

export const FRESHNESS_WINDOW_DAYS = 60;
export const FRESHNESS_WINDOW_MS = FRESHNESS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * Parse une date hétérogène : Date, timestamp, ISO 8601 ou pubDate RFC 822
 * (format des flux RSS, ex. "Tue, 17 Nov 2026 12:46:53 GMT").
 * @returns {number|null} timestamp ms ou null si la date est absente/invalide
 */
export function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') return null;
  const t = Date.parse(value.trim());
  return Number.isNaN(t) ? null : t;
}

/**
 * Une donnée est "fraîche" si sa date est fiable et se situe dans la fenêtre
 * [now - maxDays, now + maxFutureDays]. Par défaut on accepte aussi les dates
 * légèrement futures ( fuseaux, planification ).
 * @param {Date|number|string|null} value
 * @param {Object} [opts]
 * @param {number} [opts.maxDays=60] fenêtre vers le passé autorisée
 * @param {number} [opts.maxFutureDays=1] tolérance de dates futures (en jours)
 * @param {number} [opts.now] timestamp de référence (testable)
 */
export function isFresh(value, { maxDays = FRESHNESS_WINDOW_DAYS, maxFutureDays = 1, now = Date.now() } = {}) {
  const t = parseDate(value);
  if (t === null) return false;
  const age = now - t;
  return age <= maxDays * 24 * 60 * 60 * 1000 && age >= -maxFutureDays * 24 * 60 * 60 * 1000;
}

/**
 * Filtre une liste d'éléments datés : ne conserve que les éléments frais.
 * @param {Array} items
 * @param {Function} getDate fn(item) -> date parsable
 */
export function filterFreshItems(items, getDate, opts) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => isFresh(getDate(item), opts));
}

/**
 * Filtre des événements sur la fenêtre éditoriale : du jour J à J+60 jours.
 * Un événement est conservé s'il n'est pas terminé (end >= début du jour)
 * et s'il commence avant la fin de la fenêtre. Les événements sans date de
 * début fiable sont rejetés.
 * @param {Array<{start?:*, end?:*}>} events
 * @param {Object} [opts] {now, windowDays}
 */
export function filterEventsInWindow(events, { now = new Date(), windowDays = FRESHNESS_WINDOW_DAYS } = {}) {
  if (!Array.isArray(events)) return [];
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const windowEnd = dayStart + windowDays * 24 * 60 * 60 * 1000;

  return events.filter((ev) => {
    const start = parseDate(ev?.start);
    const end = parseDate(ev?.end) ?? start;
    if (start === null) return false;
    if (end !== null && end < dayStart) return false; // événement terminé
    if (start > windowEnd) return false;               // trop lointain
    return true;
  });
}
