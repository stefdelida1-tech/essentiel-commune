/**
 * src/services/publications.js
 * Registre des publications citoyennes réelles et locales (Substack / Éditions citoyennes)
 */

export const LOCAL_PUBLICATIONS = {
  // Édition réelle de Bondy par Nicolas Ratisbonne
  '93010': {
    title: "L’Essentiel de Bondy",
    subtitle: "Le rendez-vous d’information des Bondynois. Lisible en 2 minutes chrono.",
    substackUrl: "https://nicolastfn.substack.com/p/lessentiel-de-bondy-0",
    author: "Nicolas Ratisbonne",
    chiffreSemaine: {
      chiffre: "500",
      texte: "C’est le nombre d’offres d’emploi qui seront proposées directement à Bondy lors du prochain Forum de l’Emploi d’Est Ensemble (50 entreprises présentes, coaching CV et création d’entreprise). Bloquez la date dans vos agendas !"
    },
    sections: [
      {
        tag: "🚨 Info Travaux & Circulation",
        title: "Chantiers et mobilités à anticiper",
        content: `
          <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem;">
            <li><strong>Allée de la Fauvette :</strong> Circulation totalement arrêtée dans toute l'impasse pour réfection.</li>
            <li><strong>Avenue Blériot & Rue de la Philosophie :</strong> Travaux en cours avec fermetures temporaires de stationnement (suivre les déviations locales).</li>
            <li><strong>Avenue du Maréchal de Lattre de Tassigny :</strong> Grand chantier de rénovation entre l’avenue Gallieni et le carrefour Julie-Victoire Daubié.</li>
          </ul>
          <p style="margin-top: 0.75rem; background: #eff6ff; padding: 0.6rem; border-radius: 6px; font-size: 0.88rem;">
            🚗 <strong>Astuce mobilité :</strong> Deux nouvelles stations d'autopartage sont actives au <em>163 avenue de la République</em> et <em>rue Jules Guesde</em> (face à l'Hôtel de Ville).
          </p>
        `
      },
      {
        tag: "📅 Que faire ce week-end à Bondy ?",
        title: "Sorties, sports et animations familiales",
        content: `
          <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.6rem;">
            <li>🎾 <strong>Après-midi Tennis gratuit :</strong> L’association <em>Fête le Mur</em> organise une animation ouverte à tous sur les terrains d'Urban Tennis de la Place Nicole Neuburger.</li>
            <li>🏛️ <strong>Journées de l’Architecture :</strong> Visite guidée et médiation autour du patrimoine et de l’exposition Design à l’Hôtel de Ville (Salle Isidore Suarez).</li>
            <li>🎨 <strong>Exposition Hommage à André Malraux :</strong> Exposition d’illustrations à la salle d’exposition de l’Auditorium / Cinéma André Malraux (accès libre).</li>
            <li>🧸 <strong>En famille :</strong> Le Mois de la Petite Enfance (« On joue ? ») se poursuit dans les structures municipales.</li>
          </ul>
        `
      },
      {
        tag: "💼 Vie locale & Initiatives",
        title: "La « Pépithèque » pour les entrepreneurs et permanences CCI",
        content: `
          <p style="line-height: 1.6; margin-bottom: 0.5rem;">
            <strong>Nouveau à Bondy :</strong> Vous avez un projet d'entreprise ? La nouvelle bibliothèque située <em>rue Henri Varagnat</em> accueille une formule inédite de pépinière d'entreprises. De plus, la Chambre de Commerce et d'Industrie (CCI) assure désormais des permanences d’accompagnement à la <strong>Maison France Services</strong> (avenue Jean Lebas).
          </p>
          <p style="font-size: 0.85rem; color: #64748b; font-style: italic;">
            💡 Commerçants, artisans ou associations de Bondy : vous pouvez transmettre vos actualités pour les prochaines éditions.
          </p>
        `
      },
      {
        tag: "📌 Le rappel citoyen de la semaine",
        title: "Santé et solidarité locale",
        content: `
          <ul style="padding-left: 1.25rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem;">
            <li>🎗️ <strong>Octobre Rose à l’Hôtel de Ville :</strong> Journée spéciale de sensibilisation et prévention santé (Salle Sauvat, Hôtel de Ville).</li>
            <li>🎁 <strong>Seniors (70 ans et +) & Colis de fin d’année :</strong> Pensez à vous rapprocher du CCAS (<strong>01 48 50 53 40</strong>) pour réserver votre colis gourmand de fin d'année.</li>
          </ul>
        `
      }
    ]
  }
};

export function getCustomPublication(code) {
  return LOCAL_PUBLICATIONS[code] || null;
}
