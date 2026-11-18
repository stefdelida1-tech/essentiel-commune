/**
 * tests/freshness.test.mjs
 * Validation de la règle anti-obsolescence (fenêtre 60 jours)
 * et du filtrage des événements (aujourd'hui → +60 jours).
 */

import { isFresh, parseDate, filterFreshItems, filterEventsInWindow, FRESHNESS_WINDOW_DAYS } from '../src/services/freshness.js';

function assert(cond, msg) {
  if (!cond) throw new Error(`Échec : ${msg}`);
}

const NOW = new Date('2026-11-17T12:00:00Z').getTime();
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString();

// parseDate
assert(parseDate('Tue, 17 Nov 2026 12:46:53 GMT') !== null, 'pubDate RFC 822 doit être parsé');
assert(parseDate('2026-11-17') !== null, 'date ISO doit être parsée');
assert(parseDate('') === null && parseDate(null) === null && parseDate('pas une date') === null, 'dates invalides -> null');

// isFresh : fenêtre 60 jours
assert(isFresh(daysAgo(10), { now: NOW }), 'article de 10 jours = frais');
assert(isFresh(daysAgo(59), { now: NOW }), 'article de 59 jours = frais');
assert(!isFresh(daysAgo(61), { now: NOW }), 'article de 61 jours = masqué');
assert(!isFresh(null, { now: NOW }), 'article sans date = masqué');
assert(isFresh(daysAgo(0), { now: NOW, maxFutureDays: 2 }), 'date du jour = fraîche');
assert(FRESHNESS_WINDOW_DAYS === 60, 'fenêtre par défaut = 60 jours');

// filterFreshItems
const items = [
  { title: 'récent', d: daysAgo(5) },
  { title: 'vieux', d: daysAgo(90) },
  { title: 'sans date', d: null }
];
const kept = filterFreshItems(items, i => i.d, { now: NOW });
assert(kept.length === 1 && kept[0].title === 'récent', 'seul l\'article frais est conservé');

// filterEventsInWindow : aujourd'hui → +60 j, jamais de passés
const events = [
  { title: 'passé hier', start: daysAgo(1), end: daysAgo(1) },
  { title: 'en cours', start: daysAgo(1), end: daysAgo(-2) },
  { title: 'aujourd\'hui', start: daysAgo(0), end: daysAgo(-1) },
  { title: 'dans 30 j', start: daysAgo(-30), end: daysAgo(-30) },
  { title: 'dans 59 j', start: daysAgo(-59), end: daysAgo(-59) },
  { title: 'trop loin', start: daysAgo(-61), end: daysAgo(-61) },
  { title: 'sans date', start: null, end: null }
];
const windowed = filterEventsInWindow(events, { now: new Date(NOW) });
const titles = windowed.map(e => e.title);
assert(!titles.includes('passé hier'), 'événement passé = exclu');
assert(titles.includes('en cours'), 'événement en cours = inclus');
assert(titles.includes('aujourd\'hui'), 'événement du jour = inclus');
assert(titles.includes('dans 30 j'), 'événement J+30 = inclus');
assert(titles.includes('dans 59 j'), 'événement J+59 = inclus');
assert(!titles.includes('trop loin'), 'événement J+61 = exclu');
assert(!titles.includes('sans date'), 'événement sans date = exclu');

console.log('✅ Tests de fraîcheur des données validés.');
