/**
 * src/components/NewsletterTemplate.js
 * Modèle éditorial de bulletin d'information et d'actualités locales contextualisé
 * Inspiré du format d'édition Substack "L'Essentiel de [Commune]" par Nicolas Ratisbonne
 */

import { getCustomPublication } from '../services/publications.js';

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
      sections: customPub.sections,
      chiffreSemaine: customPub.chiffreSemaine,
      pratique: {
        urgences: 'SAMU : 15 | Pompiers : 18 | Police/Gendarmerie : 17 | Urgence Européenne : 112',
        contactMairie: commune.mairieAdresse ? `Mairie : ${commune.mairieAdresse}` : `Hôtel de Ville de ${commune.nom}`
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
  const epci = commune.epciNom || 'l\'intercommunalité';
  const mairie = commune.mairieAdresse ? `située : ${commune.mairieAdresse}` : 'en mairie centrale';

  // Chiffre de la semaine dynamique
  let chiffreCle = pop;
  let chiffreDesc = `habitants recensés au sein de la commune de ${commune.nom}.`;
  if (commune.densite) {
    chiffreCle = `${commune.densite.toLocaleString('fr-FR')} hab/km²`;
    chiffreDesc = `C'est la densité démographique de ${commune.nom} pour une superficie de ${commune.surfaceKm2 || 'plusieurs'} km².`;
  }

  // Éditorial selon typologie
  let introSubtitle = `Le rendez-vous d'information citoyenne des habitants de ${commune.nom}. Lisible en 2 minutes chrono.`;
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

  const sections = [
    {
      tag: '🚨 Cadre de vie & Travaux',
      title: 'Aménagements urbains et mobilités',
      content: `
        <p style="line-height: 1.6;">
          Les opérations d'entretien des voiries, du domaine public et des réseaux se poursuivent sur la commune de ${commune.nom}. Respectez la signalisation temporaire et adaptez vos trajets aux déviations éventuelles.
        </p>
      `
    },
    {
      tag: '💼 Vie locale & Mairie',
      title: `Services municipaux et démarches citoyennes`,
      content: `
        <p style="line-height: 1.6;">
          L'accueil citoyen vous reçoit pour vos formalités (${mairie}). Vous pouvez aussi préparer vos démarches en ligne sur le portail public national.
        </p>
      `
    },
    {
      tag: '♻️ Environnement & Déchets',
      title: `Gestion locale coordonnée avec ${epci}`,
      content: `
        <p style="line-height: 1.6;">
          Le ramassage des ordures, le tri sélectif et les déchèteries sont organisés avec <strong>${epci}</strong>. Consultez le calendrier de collecte de votre secteur et favorisez les points d'apport volontaire.
        </p>
      `
    }
  ];

  if (commune.wikiExtract) {
    sections.push({
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
    sections,
    chiffreSemaine: {
      chiffre: chiffreCle,
      texte: chiffreDesc
    },
    pratique: {
      urgences: 'SAMU : 15 | Pompiers : 18 | Police/Gendarmerie : 17 | Urgence Européenne : 112',
      contactMairie: commune.mairieAdresse ? `Mairie : ${commune.mairieAdresse}` : `Mairie de ${commune.nom} (${commune.codesPostaux?.[0] || commune.codeDepartement})`
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
