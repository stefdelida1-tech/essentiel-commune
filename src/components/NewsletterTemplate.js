/**
 * src/components/NewsletterTemplate.js
 * Modèle éditorial de bulletin d'information et d'actualités locales contextualisé
 */

export function generateCommuneBulletin(commune) {
  if (!commune) return null;

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

  // Éditorial sur-mesure selon la typologie territoriale
  let editorialText = '';
  switch (commune.cadreDeVieType) {
    case 'metropole':
      editorialText = `Bienvenue dans le bulletin d'information citoyen de ${commune.nom}. Forte de ses ${pop} habitants${commune.densite ? ` (${commune.densite.toLocaleString('fr-FR')} hab/km²)` : ''}, notre commune vibre au rythme des dynamiques métropolitaines en ${dep}${reg}. Ce bulletin met en avant la qualité du service public, la proximité citoyenne et le développement des mobilités durables.`;
      break;
    case 'urbain':
      editorialText = `Bienvenue dans le bulletin d'information citoyen de ${commune.nom}. Avec une population de ${pop} habitants, notre ville concilie harmonieusement développement économique, équipements sportifs et culturels, et préservation d'un cadre de vie à dimension humaine en ${dep}.`;
      break;
    case 'bourg':
      editorialText = `Bienvenue dans le bulletin d'information citoyen de ${commune.nom}. Pôle de centralité et de services pour son bassin de vie avec ${pop} habitants, notre commune soutient le commerce local, les initiatives associatives et la vie collective en ${dep}.`;
      break;
    default: // rural
      editorialText = `Bienvenue dans le bulletin d'information citoyen de ${commune.nom}. Avec ses ${pop} habitants, notre commune privilégie l'authenticité rurale, la convivialité entre habitants et la préservation de notre environnement naturel en ${dep}.`;
      break;
  }

  // Articles adaptés et enrichis
  const articles = [
    {
      tag: 'Vie municipale & Démarches',
      title: `Accueil citoyen et services de l'Hôtel de Ville`,
      content: `L'administration municipale de ${commune.nom} (${mairie}) vous accompagne pour vos démarches du quotidien : état civil, inscriptions scolaires, recensement et urbanisme. Pensez également à utiliser le portail national service-public.fr pour préparer vos dossiers en ligne.`
    },
    {
      tag: 'Environnement & Services Publics',
      title: `Gestion des déchets et cadre de vie avec ${epci}`,
      content: `La collecte des ordures ménagères, le tri sélectif des emballages et la valorisation des déchets sont assurés en coordination avec ${epci}. Respectez les consignes de tri et participez à la propreté de nos rues et espaces partagés.`
    }
  ];

  // Article Histoire & Identité locale (issu de Wikipédia si disponible)
  if (commune.wikiExtract) {
    articles.push({
      tag: 'Histoire & Patrimoine',
      title: `Repères historiques et découverte de ${commune.nom}`,
      content: commune.wikiExtract
    });
  } else {
    articles.push({
      tag: 'Vie associative & Animations',
      title: `Temps forts et animations citoyennes à ${commune.nom}`,
      content: `Retrouvez le tissu associatif, les rendez-vous festifs et les marchés locaux qui animent ${commune.nom} tout au long de l'année. Venez vous impliquer dans les projets citoyens !`
    });
  }

  return {
    communeName: commune.nom,
    insee: commune.code,
    postal: commune.codesPostaux?.[0] || 'N/A',
    department: `${commune.codeDepartement} - ${dep}`,
    region: commune.regionNom,
    epci: commune.epciNom,
    surface: commune.surfaceKm2 ? `${commune.surfaceKm2} km²` : null,
    densite: commune.densite ? `${commune.densite.toLocaleString('fr-FR')} hab/km²` : null,
    typologie: commune.typologie || 'Commune de France',
    mairieAdresse: commune.mairieAdresse,
    photoUrl: commune.photoUrl,
    editionDate: dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
    editorial: {
      title: `Le mot de la vie locale — ${commune.nom}`,
      content: editorialText
    },
    articles,
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

        <h1 class="bulletin-title">L'Écho de ${bulletin.communeName}</h1>
        <p class="bulletin-subtitle">
          ${bulletin.typologie} • Code Insee ${bulletin.insee}
          ${bulletin.surface ? ` • Surface : ${bulletin.surface}` : ''}
          ${bulletin.densite ? ` • Densité : ${bulletin.densite}` : ''}
        </p>
      </header>

      <!-- Éditorial -->
      <section class="bulletin-editorial">
        <h2>${bulletin.editorial.title}</h2>
        <p>${bulletin.editorial.content}</p>
      </section>

      <!-- Rubriques / Articles -->
      <section class="bulletin-articles-grid">
        ${bulletin.articles.map(art => `
          <div class="bulletin-article-card">
            <span class="article-tag">${art.tag}</span>
            <h3>${art.title}</h3>
            <p>${art.content}</p>
          </div>
        `).join('')}
      </section>

      <!-- Encadré Pratique -->
      <footer class="bulletin-footer-box">
        <div class="footer-contacts">
          <strong>${bulletin.pratique.contactMairie}</strong>
        </div>
        <div class="footer-contacts" style="margin-top: 0.25rem;">
          <strong>Services d'Urgence :</strong> ${bulletin.pratique.urgences}
        </div>
        <div class="footer-note">
          Document d'information locale citoyenne non commercial • Données ouvertes geo.api.gouv.fr & Wikipédia • Édité via <em>L'Essentiel de ma Commune</em>
        </div>
      </footer>
    </article>
  `;
}
