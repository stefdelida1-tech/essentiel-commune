/**
 * src/components/NewsletterTemplate.js
 * Modèle éditorial de bulletin d'information et d'actualités locales contextualisé
 * Inspiré du format d'édition Substack "L'Essentiel de [Commune]" par Nicolas Ratisbonne
 */

import { getCustomPublication } from '../services/publications.js';

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildNewsSection(commune, news) {
  const items = (news || [])
    .filter(item => item && item.title)
    .map(item => {
      const title = escapeHtml(item.title);
      const source = item.source ? ` <span style="color: #64748b; font-size: 0.82rem;">— ${escapeHtml(item.source)}</span>` : '';
      const link = item.link
        ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" style="color: #1e40af; text-decoration: none;"><strong>${title}</strong></a>${source}`
        : `<strong>${title}</strong>${source}`;
      return `<li>${link}</li>`;
    })
    .join('');

  return {
    tag: '📰 Actualités locales',
    title: `Ce qui fait l'actualité de ${commune.nom}`,
    content: `
      <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.6rem;">
        ${items}
      </ul>
      <p style="margin-top: 0.75rem; font-size: 0.82rem; color: #64748b; font-style: italic;">
        Sources : fils d'actualité en ligne, sélectionnés pour ${escapeHtml(commune.nom)}.
      </p>
    `
  };
}

function buildRepèresSection(commune) {
  const items = [];
  if (commune.population) {
    items.push(`<li>👥 <strong>Population :</strong> ${commune.population.toLocaleString('fr-FR')} habitants (estimation INSEE via geo.api.gouv.fr)</li>`);
  }
  if (commune.surfaceKm2) {
    items.push(`<li>🗺️ <strong>Superficie :</strong> ${commune.surfaceKm2} km²</li>`);
  }
  if (commune.densite) {
    items.push(`<li>📏 <strong>Densité :</strong> ${commune.densite.toLocaleString('fr-FR')} hab/km²</li>`);
  }
  if (commune.typologie) {
    items.push(`<li>🏷️ <strong>Typologie :</strong> ${commune.typologie}</li>`);
  }
  if (commune.gentile) {
    items.push(`<li>🗣️ <strong>Gentilé :</strong> ${commune.gentile}</li>`);
  }
  const cps = commune.codesPostaux || [];
  if (cps.length > 0) {
    const liste = cps.slice(0, 3).join(', ') + (cps.length > 3 ? ` et ${cps.length - 3} autre(s)` : '');
    items.push(`<li>📮 <strong>Codes postaux :</strong> ${liste} (${cps.length} au total)</li>`);
  }
  if (commune.epciNom) {
    items.push(`<li>🤝 <strong>Intercommunalité :</strong> ${commune.epciNom}</li>`);
  }
  if (commune.maire?.maire) {
    items.push(`<li>🏛️ <strong>Maire :</strong> ${commune.maire.maire}${commune.maire.mandat ? ` (mandat ${commune.maire.mandat})` : ''}</li>`);
  }
  if (items.length === 0) return null;

  return {
    tag: '📊 Repères du territoire',
    title: `Les chiffres de ${commune.nom} en un coup d'œil`,
    content: `
      <ul style="padding-left: 1.25rem; line-height: 1.7; display: flex; flex-direction: column; gap: 0.35rem;">
        ${items.join('')}
      </ul>
    `
  };
}

/** Insère les rubriques dynamiques (actualités RSS + repères territoire) après la 1ʳᵉ section. */
function injectDynamicSections(sections, commune) {
  const result = [...sections];
  if (commune.localNews && commune.localNews.length > 0) {
    result.splice(1, 0, buildNewsSection(commune, commune.localNews));
  }
  const repèresSection = buildRepèresSection(commune);
  if (repèresSection) {
    result.splice(1 + (commune.localNews?.length ? 1 : 0), 0, repèresSection);
  }
  return result;
}

export function generateCommuneBulletin(commune) {
  if (!commune) return null;

  // 1. Vérifier si une publication officielle sur-mesure existe (ex: Bondy)
  const customPub = getCustomPublication(commune.code);
  if (customPub) {
    return {
      isCustom: true,
      communeName: commune.nom,
      insee: commune.code,
      department: commune.departementNom ? `${commune.codeDepartement} - ${commune.departementNom}` : `Département ${commune.codeDepartement}`,
      editionDate: customPub.editionDate,
      title: customPub.title,
      subtitle: customPub.subtitle,
      substackUrl: customPub.substackUrl,
      author: customPub.author,
      photoUrl: commune.photoUrl || null,
      sections: injectDynamicSections(customPub.sections || [], commune),
      chiffreSemaine: customPub.chiffreSemaine,
      pratique: {
        urgences: 'SAMU : 15 | Pompiers : 18 | Police/Gendarmerie : 17 | Urgence Européenne : 112',
        contactMairie: commune.mairieAdresse ? `Mairie : ${commune.mairieAdresse}` : `Hôtel de Ville de ${commune.nom}`,
        telephone: commune.mairie?.telephone || null,
        horaires: commune.mairie?.horaires || null
      }
    };
  }

  // 2. Sinon, génération automatique calquée sur le même format éditorial dynamique
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  });

  const pop = commune.population ? commune.population.toLocaleString('fr-FR') : 'Non renseignée';
  const dep = commune.departementNom || `Département ${commune.codeDepartement}`;
  const reg = commune.regionNom ? ` (${commune.regionNom})` : '';
  const epci = commune.epciNom || null;
  const mairie = commune.mairieAdresse ? `située : ${commune.mairieAdresse}` : 'en mairie centrale';

  // Chiffre de la semaine dynamique
  let chiffreCle = pop;
  let chiffreDesc = `habitants recensés au sein de la commune de ${commune.nom}.`;
  if (commune.densite) {
    chiffreCle = `${commune.densite.toLocaleString('fr-FR')} hab/km²`;
    chiffreDesc = `C'est la densité démographique de ${commune.nom} pour une superficie de ${commune.surfaceKm2 || 'plusieurs'} km².`;
  }

  // Éditorial d'ouverture, calqué sur le ton de l'édition de Bondy
  const introSubtitle = `Le rendez-vous d'information des habitants de ${commune.nom}. Lisible en 2 minutes chrono.`;
  let editorialText = '';
  switch (commune.cadreDeVieType) {
    case 'metropole':
      editorialText = `Bienvenue dans l'édition d'information citoyenne de ${commune.nom}. Forte de ses ${pop} résidents, notre commune s'inscrit dans les grandes dynamiques urbaines de ${dep}${reg}. Retrouvez l'essentiel des actualités, mobilités et services du quotidien.`;
      break;
    case 'urbain':
      editorialText = `Bienvenue dans l'édition locale de ${commune.nom}. Avec ${pop} habitants, notre ville veille à conjuguer vitalité économique, services de proximité et qualité du cadre de vie en ${dep}.`;
      break;
    case 'bourg':
      editorialText = `Bienvenue dans l'édition citoyenne de ${commune.nom}. Pôle de centralité de son bassin de vie (${pop} habitants), la commune soutient le commerce de proximité, les initiatives locales et la convivialité en ${dep}.`;
      break;
    default: // rural
      editorialText = `Bienvenue dans l'édition d'information de ${commune.nom}. Avec ses ${pop} habitants, notre commune valorise son authenticité rurale, la solidarité entre voisins et la préservation de notre environnement en ${dep}.`;
      break;
  }

  // Helper pour construire les liens d'actualités (max 3 par défaut)
  const buildLinks = (news, max = 3) => (news || [])
    .filter(item => item && item.title)
    .slice(0, max)
    .map(item => {
      const title = escapeHtml(item.title);
      const source = item.source ? ` <span style="color: #64748b; font-size: 0.82rem;">— ${escapeHtml(item.source)}</span>` : '';
      return item.link
        ? `<li><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" style="color: #1e40af; text-decoration: none;"><strong>${title}</strong></a>${source}</li>`
        : `<li><strong>${title}</strong>${source}</li>`;
    })
    .join('');

  // Helper pour la section rappel citoyen (max 2 articles)
  const buildSectionLinks = (news, max = 2) => (news || [])
    .filter(item => item && item.title)
    .slice(0, max)
    .map(item => {
      const title = escapeHtml(item.title);
      const source = item.source ? ` <span style="color: #64748b; font-size: 0.82rem;">— ${escapeHtml(item.source)}</span>` : '';
      return item.link
        ? `<li><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" style="color: #1e40af; text-decoration: none;"><strong>${title}</strong></a>${source}</li>`
        : `<li><strong>${title}</strong>${source}</li>`;
    })
    .join('');

  const travauxLinks = buildLinks(commune.travauxNews);
  const sortiesLinks = buildLinks(commune.sortiesNews);
  const economieLinks = buildLinks(commune.economieNews);
  const santeLinks = buildSectionLinks(commune.santeNews);
  const seniorsLinks = buildSectionLinks(commune.seniorsNews);
  const dechetsLinks = buildSectionLinks(commune.dechetsNews);

  const sections = [
    {
      tag: '🚨 Info Travaux & Circulation',
      title: 'Chantiers et mobilités à anticiper',
      content: travauxLinks ? `
        <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem;">
          ${travauxLinks}
        </ul>
        <p style="margin-top: 0.75rem; background: #eff6ff; padding: 0.6rem; border-radius: 6px; font-size: 0.88rem;">
          🚗 <strong>Astuce mobilité :</strong> Privilégiez les modes de déplacement actifs et le covoiturage pour les courts trajets en centre-bourg.
        </p>
      ` : `
        <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem;">
          <li><strong>Voiries et domaine public :</strong> Les opérations d'entretien et de réfection se poursuivent sur la commune de ${commune.nom}. Respectez la signalisation temporaire et adaptez vos trajets aux déviations éventuelles.</li>
          <li><strong>Stationnement :</strong> Des fermetures temporaires de stationnement peuvent être mises en place autour des chantiers en cours. Renseignez-vous en mairie avant vos déplacements.</li>
          <li><strong>Transports et déplacements :</strong> Consultez les horaires et les éventuelles perturbations des lignes desservant ${commune.nom} avant de partir.</li>
        </ul>
        <p style="margin-top: 0.75rem; background: #eff6ff; padding: 0.6rem; border-radius: 6px; font-size: 0.88rem;">
          🚗 <strong>Astuce mobilité :</strong> Privilégiez les modes de déplacement actifs et le covoiturage pour les courts trajets en centre-bourg.
        </p>
      `
    },
    {
      tag: `📅 Que faire à ${commune.nom} ?`,
      title: 'Sorties, sports et animations de la semaine',
      content: sortiesLinks ? `
        <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.6rem;">
          ${sortiesLinks}
        </ul>
        <p style="margin-top: 0.75rem; font-size: 0.82rem; color: #64748b; font-style: italic;">
          📆 Pour l'agenda complet : site de la mairie et offices de tourisme.
        </p>
      ` : `
        <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.6rem;">
          <li>📅 <strong>Agenda municipal :</strong> Consultez le site de la mairie et les supports d'information pour les animations, expositions et rencontres de la semaine.</li>
          <li>🏛️ <strong>Vie associative :</strong> Clubs sportifs, comités des fêtes et associations culturelles animent la vie locale. Contactez la mairie pour proposer une initiative ou une sortie.</li>
          <li>🎨 <strong>En famille :</strong> Les structures municipales et intercommunales organisent régulièrement des animations dédiées aux enfants et aux familles.</li>
        </ul>
      `
    },
    {
      tag: '💼 Vie locale & Initiatives',
      title: 'Démarches, accompagnement et projets locaux',
      content: `
        ${economieLinks ? `
        <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">
          ${economieLinks}
        </ul>
        ` : ''}
        <p style="line-height: 1.6; margin-bottom: 0.5rem;">
          L'accueil citoyen de la mairie vous reçoit pour vos formalités (${mairie}). Les services publics sont également accessibles via la Maison France Services et le portail de démarches en ligne. Artisans, commerçants et associations de ${commune.nom} : vous pouvez transmettre vos actualités pour les prochaines éditions.
        </p>
        ${epci ? `
        <p style="font-size: 0.88rem; margin-bottom: 0.5rem;">
          🔗 <strong>Intercommunalité :</strong> le tri des déchets, les déchèteries et une partie des services publics sont coordonnés par <strong>${epci}</strong>.
        </p>
        ` : ''}
        <p style="font-size: 0.85rem; color: #64748b; font-style: italic;">
          💡 Vous souhaitez faire rayonner une initiative locale ? Contactez la mairie ou la rédaction de <em>L'Essentiel de ${commune.nom}</em>.
        </p>
      `
    },
    {
      tag: '📌 Le rappel citoyen de la semaine',
      title: 'Santé, sécurité et environnement',
      content: (() => {
        const alerts = commune.civicAlerts || {};
        const meteoItems = (alerts.meteo || []).map(m => {
          const title = escapeHtml(m.title);
          const desc = escapeHtml(m.description);
          const link = m.link ? `<a href="${escapeHtml(m.link)}" target="_blank" rel="noopener noreferrer" style="color: #1e40af; text-decoration: none;">Détails</a>` : '';
          return `<li>⚠️ <strong>${title}</strong> ${desc ? `: ${desc}` : ''} ${link}</li>`;
        }).join('');

        const airQuality = commune.airQuality;
        const airItem = airQuality ? `<li>🌬️ <strong>Qualité de l'air :</strong> ${airQuality.label} (AQI ${airQuality.aqi}) — ${airQuality.interpretation}</li>` : '';

        const santeContent = santeLinks ? `
          <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">
            ${santeLinks}
          </ul>
        ` : '';

        const seniorsContent = seniorsLinks ? `
          <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">
            ${seniorsLinks}
          </ul>
        ` : '';

        const dechetsContent = dechetsLinks ? `
          <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">
            ${dechetsLinks}
          </ul>
        ` : '';

        return `
          ${meteoItems ? `<ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">${meteoItems}</ul>` : ''}
          <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem;">
            ${airItem}
          </ul>
          ${santeContent}
          ${seniorsContent}
          ${dechetsContent}
          <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem;">
            ${!santeLinks ? `<li>🎗️ <strong>Santé et prévention :</strong> Les campagnes de dépistage et de sensibilisation (saisonnières ou thématiques) sont annoncées par la mairie et les structures de santé locales.</li>` : ''}
            ${!seniorsLinks ? `<li>🎁 <strong>Seniors et familles :</strong> Les actions sociales et les dispositifs d'aide (CCAS, aides locales) peuvent être demandés auprès de la mairie ou des structures compétentes.</li>` : ''}
            ${!dechetsLinks ? `<li>♻️ <strong>Tri et déchets :</strong> Respectez le calendrier de collecte et les consignes de tri de votre secteur pour un service plus efficace.</li>` : ''}
          </ul>
        `;
      })()
    }
  ];

  // Rubriques dynamiques : actualités RSS + repères territoire
  const finalSections = injectDynamicSections(sections, commune);

  if (commune.wikiExtract) {
    finalSections.push({
      tag: '🏛️ Histoire & Patrimoine',
      title: `Découverte et mémoire de ${commune.nom}`,
      content: `<p style="line-height: 1.6;">${commune.wikiExtract}</p>`
    });
  }

  return {
    isCustom: false,
    communeName: commune.nom,
    insee: commune.code,
    department: `${commune.codeDepartement} - ${dep}`,
    editionDate: dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
    title: `L'Essentiel de ${commune.nom}`,
    subtitle: introSubtitle,
    photoUrl: commune.photoUrl || null,
    editorial: {
      title: `Le mot du territoire`,
      content: editorialText
    },
    sections: finalSections,
    chiffreSemaine: {
      chiffre: chiffreCle,
      texte: chiffreDesc
    },
    pratique: {
      urgences: 'SAMU : 15 | Pompiers : 18 | Police/Gendarmerie : 17 | Urgence Européenne : 112',
      contactMairie: commune.mairieAdresse ? `Mairie : ${commune.mairieAdresse}` : `Mairie de ${commune.nom} (${commune.codesPostaux?.[0] || commune.codeDepartement})`,
      telephone: commune.mairie?.telephone || null,
      horaires: commune.mairie?.horaires || null
    }
  };
}

export function renderBulletinHtml(bulletin) {
  if (!bulletin) return '';

  return `
    <article class="bulletin-sheet" role="article" aria-label="Bulletin d'information de ${bulletin.communeName}">
      <!-- En-tête du bulletin -->
      <header class="bulletin-header">
        <div class="bulletin-topline">
          <span>RÉPUBLIQUE FRANÇAISE</span>
          <span>${bulletin.department}</span>
          <span>ÉDITION : ${bulletin.editionDate}</span>
        </div>
        
        ${bulletin.photoUrl ? `
          <div class="bulletin-illustration">
            <img src="${bulletin.photoUrl}" alt="${bulletin.communeName}" class="bulletin-hero-image" loading="lazy">
          </div>
        ` : ''}

        <h1 class="bulletin-title">${bulletin.title}</h1>
        <p class="bulletin-subtitle">${bulletin.subtitle}</p>
        
        ${bulletin.substackUrl ? `
          <div style="margin-top: 0.85rem;" class="no-print">
            <a href="${bulletin.substackUrl}" target="_blank" rel="noopener noreferrer" class="btn-action btn-primary" style="display: inline-flex; font-size: 0.88rem; padding: 0.45rem 1rem;">
              📬 Lire l'original & s'abonner sur Substack
            </a>
          </div>
        ` : ''}
      </header>

      ${bulletin.editorial ? `
        <!-- Éditorial -->
        <section class="bulletin-editorial">
          <h2>${bulletin.editorial.title}</h2>
          <p>${bulletin.editorial.content}</p>
        </section>
      ` : ''}

      <!-- Rubriques de l'édition -->
      <section class="bulletin-articles-grid">
        ${bulletin.sections.map(sec => `
          <div class="bulletin-article-card">
            <span class="article-tag">${sec.tag}</span>
            <h3 style="font-size: 1.05rem; margin-bottom: 0.5rem; color: #0f172a;">${sec.title}</h3>
            <div>${sec.content}</div>
          </div>
        `).join('')}
      </section>

      <!-- Le chiffre de la semaine -->
      ${bulletin.chiffreSemaine ? `
        <section style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 8px; padding: 1.25rem; display: flex; align-items: center; gap: 1.25rem;">
          <div style="font-size: 2.2rem; font-weight: 800; color: #1e40af; line-height: 1;">
            ${bulletin.chiffreSemaine.chiffre}
          </div>
          <div>
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #3b82f6; letter-spacing: 0.5px;">
              Le Chiffre Clé
            </div>
            <div style="font-size: 0.92rem; color: #1e3a8a; margin-top: 0.2rem; line-height: 1.4;">
              ${bulletin.chiffreSemaine.texte}
            </div>
          </div>
        </section>
      ` : ''}

      <!-- Encadré Pratique -->
      <footer class="bulletin-footer-box">
        <div class="footer-contacts">
          <strong>${bulletin.pratique.contactMairie}</strong>
        </div>
        ${bulletin.pratique.telephone ? `
        <div class="footer-contacts" style="margin-top: 0.25rem;">
          📞 <strong>Téléphone :</strong> ${bulletin.pratique.telephone}
        </div>
        ` : ''}
        ${bulletin.pratique.horaires ? `
        <div class="footer-contacts" style="margin-top: 0.25rem; font-size: 0.85rem;">
          🕐 <strong>Horaires d'ouverture :</strong> ${bulletin.pratique.horaires}
        </div>
        ` : ''}
        <div class="footer-contacts" style="margin-top: 0.25rem;">
          <strong>Services d'Urgence :</strong> ${bulletin.pratique.urgences}
        </div>
        <div class="footer-note">
          Document d'information locale citoyenne non commercial • Édité via <em>L'Essentiel de ma Commune</em>
          ${bulletin.author ? ` • Rédigé par ${bulletin.author}` : ''}
        </div>
      </footer>
    </article>
  `;
}
