/**
 * src/services/annuaire.js
 * Informations de la mairie et des services publics d'une commune.
 *
 *  - Maire et mandat : Répertoire National des Élus (RNE), jeu de données
 *    officiel data.gouv.fr « elus-maires-mai.csv » exposé via l'API tabulaire
 *    tabular-api.data.gouv.fr (actualisé après chaque échéance électorale).
 *  - Coordonnées (téléphone, horaires, e-mail, site) : API Annuaire
 *    Service-Public (api-lannuaire.service-public.fr, dataset
 *    « api-lannuaire-administration »), avec la date de modification de la
 *    fiche exposée pour contrôle de fraîcheur.
 */

import { isFresh, parseDate } from './freshness.js';

const RNE_MAIRES_RESOURCE = '2876a346-d50c-4911-934e-19ee07b0e503';
const ANNUAIRE_DATASET = 'api-lannuaire-administration';
const TIMEOUT_MS = 8000;

const mairieCache = new Map();
const servicesCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 heure

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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

function formatMandateYears(startDateStr) {
  // Mandat municipal : 6 ans à compter de la prise de fonction
  const start = parseDate(startDateStr);
  if (start === null) return null;
  const d = new Date(start);
  const endYear = d.getFullYear() + 6;
  return `${d.getFullYear()}-${endYear}`;
}

/**
 * Maire de la commune via le Répertoire National des Élus.
 * @returns {Promise<{maire: string, mandat: string|null, dateReference: string|null}|null>}
 */
async function fetchMaireFromRNE(commune) {
  const code = commune?.code;
  const depart = commune?.codeDepartement;
  if (!code || !depart) return null;

  const colCommune = encodeURIComponent('Code de la commune');
  const colDepart = encodeURIComponent('Code du département');
  const url = `https://tabular-api.data.gouv.fr/api/resources/${RNE_MAIRES_RESOURCE}/data/`
    + `?${colCommune}__exact=${code}&${colDepart}__exact=${depart}&page_size=5`;

  const data = await fetchJson(url);
  const rows = data?.data || [];
  if (!rows.length) return null;

  // Sécurité : si plusieurs lignes, on retient le mandat le plus récent
  const row = rows
    .slice()
    .sort((a, b) => parseDate(b['Date de début de la fonction']) - parseDate(a['Date de début de la fonction']))[0];

  const prenom = (row["Prénom de l'élu"] || '').trim();
  const nom = (row["Nom de l'élu"] || '').trim();
  if (!prenom && !nom) return null;

  return {
    maire: `${prenom} ${nom}`.trim(),
    mandat: formatMandateYears(row['Date de début de la fonction'] || row['Date de début du mandat']),
    dateReference: row['Date de début de la fonction'] || row['Date de début du mandat'] || null
  };
}

/** Parse la plage d'ouverture JSON de la fiche annuaire en texte lisible. */
function formatHoraires(plageOuverture) {
  if (!plageOuverture) return null;
  let plages;
  try {
    plages = typeof plageOuverture === 'string' ? JSON.parse(plageOuverture) : plageOuverture;
  } catch {
    return null;
  }
  if (!Array.isArray(plages) || !plages.length) return null;

  const fmt = (h) => (h || '').slice(0, 5);
  const lines = plages.map(p => {
    const jour = p.nom_jour_fin && p.nom_jour_fin !== p.nom_jour_debut
      ? `${p.nom_jour_debut}–${p.nom_jour_fin}`
      : p.nom_jour_debut;
    const creneaux = [
      (p.valeur_heure_debut_1 && p.valeur_heure_fin_1) ? `${fmt(p.valeur_heure_debut_1)} à ${fmt(p.valeur_heure_fin_1)}` : null,
      (p.valeur_heure_debut_2 && p.valeur_heure_fin_2) ? `${fmt(p.valeur_heure_debut_2)} à ${fmt(p.valeur_heure_fin_2)}` : null
    ].filter(Boolean).join(' / ');
    return creneaux ? `${jour} : ${creneaux}` : null;
  }).filter(Boolean);

  return lines.length ? lines.slice(0, 6).join(' • ') : null;
}

function parseFirstJsonArrayField(value) {
  if (!value) return null;
  try {
    const arr = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

/**
 * Fiches « mairie » de la commune via l'API Annuaire Service-Public.
 * @returns {Promise<Array<object>>} fiches triées par date de modification décroissante
 */
async function fetchMairieRecords(commune) {
  const code = commune?.code;
  if (!code) return [];

  const where = encodeURIComponent(`code_insee_commune LIKE "${code}" and pivot LIKE "mairie"`);
  const url = `https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/${ANNUAIRE_DATASET}/records?where=${where}&limit=10&order_by=date_modification_datetime%20desc`;

  const data = await fetchJson(url);
  return (data?.results || [])
    .filter(r => r.statut_de_diffusion !== false)
    .sort((a, b) => parseDate(b.date_modification_datetime) - parseDate(a.date_modification_datetime));
}

/**
 * Coordonnées de la mairie (téléphone, horaires, e-mail, site) depuis la
 * fiche la plus récemment modifiée du Répertoire de l'administration.
 * La date de mise à jour de la fiche est retournée (`dateMaj`) pour
 * traçabilité ; une fiche sans date fiable n'est pas utilisée.
 *
 * @returns {Promise<{telephone, horaires, email, site, dateMaj}|null>}
 */
async function fetchMairieContact(commune) {
  const records = await fetchMairieRecords(commune);
  const record = records.find(r => parseDate(r.date_modification_datetime) !== null);
  if (!record) return null;

  const phones = parseFirstJsonArrayField(record.telephone);
  const telephone = phones?.[0]?.valeur?.trim() || null;
  const horaires = formatHoraires(record.plage_ouverture);
  const email = record.adresse_courriel?.trim() || null;
  const sites = parseFirstJsonArrayField(record.site_internet);
  const site = sites?.[0]?.valeur?.trim() || null;

  if (!telephone && !horaires && !email && !site) return null;

  return { telephone, horaires, email, site, dateMaj: record.date_modification_datetime };
}

/**
 * @returns {Promise<{maire, mandat, telephone, horaires, email, site, dateMaj}|null>}
 */
export async function fetchMairieInfo(commune) {
  const code = commune?.code;
  if (!code) return null;
  if (mairieCache.has(code)) return mairieCache.get(code);

  const [rne, contact] = await Promise.all([
    fetchMaireFromRNE(commune).catch(() => null),
    fetchMairieContact(commune).catch(() => null)
  ]);

  let info = null;
  if (rne || contact) {
    info = {
      maire: rne?.maire || null,
      mandat: rne?.mandat || null,
      dateReference: rne?.dateReference || null,
      telephone: contact?.telephone || null,
      horaires: contact?.horaires || null,
      email: contact?.email || null,
      site: contact?.site || null,
      dateMaj: contact?.dateMaj || null
    };
  }

  mairieCache.set(code, info);
  return info;
}

/**
 * Services publics et points d'accueil de la commune (hors mairie),
 * limités aux fiches modifiées dans les 60 derniers jours.
 * @returns {Promise<Array<{nom, telephone, url, dateMaj}>>}
 */
export async function fetchServicesPublics(commune) {
  const code = commune?.code;
  if (!code) return [];
  if (servicesCache.has(code)) return servicesCache.get(code);

  const where = encodeURIComponent(`code_insee_commune LIKE "${code}"`);
  const url = `https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/${ANNUAIRE_DATASET}/records?where=${where}&limit=50&order_by=date_modification_datetime%20desc`;

  const data = await fetchJson(url);
  const results = data?.results || [];

  const items = results
    // Anti-obsolescence : fiches modifiées il y a moins de 60 jours uniquement
    .filter(r => isFresh(r.date_modification_datetime, { maxFutureDays: 0 }))
    .map(r => {
      const phones = parseFirstJsonArrayField(r.telephone);
      // pivot est une chaîne JSON (ex. '[{"type_service_local": "mairie"}]')
      const pivotList = parseFirstJsonArrayField(r.pivot) || [];
      const isMairie = pivotList.some(p => /mairie/i.test(p?.type_service_local || ''));
      return {
        nom: r.nom || null,
        telephone: phones?.[0]?.valeur?.trim() || null,
        url: r.url_service_public || null,
        isMairie,
        dateMaj: r.date_modification_datetime || null
      };
    })
    .filter(s => s.nom && !s.isMairie)
    .slice(0, 4);

  servicesCache.set(code, items);
  return items;
}
