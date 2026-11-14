/**
 * src/components/NewsletterTemplate.js
 * Modèle éditorial de bulletin d'information et d'actualités locales
 */

export function generateCommuneBulletin(commune) {
  if (!commune) return null;

  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  });

  return {
    communeName: commune.nom,
    insee: commune.code,
    postal: commune.codesPostaux?.[0] || 'N/A',
    department: commune.codeDepartement,
    editionDate: dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
    editorial: {
      title: `Le mot de la vie locale — ${commune.nom}`,
      content: `Bienvenue dans le bulletin d'information citoyen de ${commune.nom}. Avec ses ${commune.population?.toLocaleString('fr-FR') || 'quelques'} habitants, notre territoire privilégie la convivialité, la proximité et la valorisation du cadre de vie rural.`
    },
    articles: [
      {
        tag: 'Vie municipale',
        title: 'Horaires d\'ouverture et permanence municipale',
        content: `Pour toutes vos démarches citoyennes, la mairie de ${commune.nom} vous accueille lors des permanences hebdomadaires. Vous pouvez également effectuer vos pré-demandes en ligne sur le portail national service-public.fr.`
      },
      {
        tag: 'Environnement & Cadre de vie',
        title: 'Calendrier des collectes et tri sélectif',
        content: 'Rappel citoyen : le tri des emballages et la collecte des déchets s\'effectuent selon le planning de l\'intercommunalité. Les points d\'apport volontaire pour le verre et les biodéchets restent accessibles 7j/7.'
      },
      {
        tag: 'Agenda & Animations',
        title: 'Rencontres associatives et marchés de terroir',
        content: 'Retrouvez les producteurs locaux et les temps forts associatifs qui animent la commune ce trimestre. Venez échanger et soutenir l\'économie de proximité.'
      }
    ],
    pratique: {
      urgences: 'SAMU : 15 | Pompiers : 18 | Police/Gendarmerie : 17 | Urgence Européenne : 112',
      contactMairie: `Mairie de ${commune.nom} (${commune.codesPostaux?.[0] || commune.codeDepartement})`
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
          <span>DÉPARTEMENT ${bulletin.department}</span>
          <span>ÉDITION : ${bulletin.editionDate}</span>
        </div>
        <h1 class="bulletin-title">L'Écho de ${bulletin.communeName}</h1>
        <p class="bulletin-subtitle">Bulletin d'information citoyenne & de vie locale • Code Insee ${bulletin.insee}</p>
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
          <strong>Infos Pratiques & Urgences :</strong> ${bulletin.pratique.urgences}
        </div>
        <div class="footer-note">
          Document d'information locale citoyenne non commercial • Édité via <em>L'Essentiel de ma Commune</em>
        </div>
      </footer>
    </article>
  `;
}
