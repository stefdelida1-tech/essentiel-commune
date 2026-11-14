/**
 * tests/newsletter.test.mjs
 * Validation du module de bulletin d'information contextualisé et intégration Substack
 */

import { generateCommuneBulletin, renderBulletinHtml } from '../src/components/NewsletterTemplate.js';

async function runTests() {
  console.log('🧪 Démarrage des tests du bulletin d\'information...');

  // Cas 1 : Commune avec publication sur-mesure (Bondy - Édition N°0 par Nicolas Ratisbonne)
  const bondyCommune = {
    nom: "Bondy",
    code: "93010",
    codesPostaux: ["93140"],
    population: 50595,
    codeDepartement: "93",
    departementNom: "Seine-Saint-Denis",
    regionNom: "Île-de-France",
    epciNom: "Métropole du Grand Paris",
    cadreDeVieType: "metropole",
    typologie: "Pôle métropolitain / Grand centre urbain",
    densite: 9262,
    mairieAdresse: "ESPLANADE CLAUDE FUZIER 93140 BONDY",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/H%C3%B4tel_Ville_Bondy_2.jpg/330px-H%C3%B4tel_Ville_Bondy_2.jpg"
  };

  const bulletinBondy = generateCommuneBulletin(bondyCommune);
  if (!bulletinBondy || !bulletinBondy.isCustom) {
    throw new Error('Échec : Bondy doit charger sa publication sur-mesure.');
  }

  const htmlBondy = renderBulletinHtml(bulletinBondy);

  // Vérifier la présence des contenus réels de l'édition Substack
  if (!htmlBondy.includes('Allée de la Fauvette') || !htmlBondy.includes('Avenue du Maréchal de Lattre de Tassigny')) {
    throw new Error('Échec : les vraies informations travaux de Bondy doivent être affichées.');
  }
  if (!htmlBondy.includes('Fête le Mur') || !htmlBondy.includes('Place Nicole Neuburger')) {
    throw new Error('Échec : l\'événement Tennis gratuit doit être présent.');
  }
  if (!htmlBondy.includes('500') || !htmlBondy.includes('Forum de l’Emploi d’Est Ensemble')) {
    throw new Error('Échec : le chiffre de la semaine (500 offres) doit être présent.');
  }
  if (!htmlBondy.includes('nicolastfn.substack.com')) {
    throw new Error('Échec : le lien vers la newsletter Substack originale doit être présent.');
  }
  console.log('  ✅ Test 1 : Intégration de l\'Édition N°0 de Bondy (Substack de Nicolas Ratisbonne) 100% validée.');

  // Cas 2 : Commune générique (ex: L'Abergement-Clémenciat)
  const ruralCommune = {
    nom: "L'Abergement-Clémenciat",
    code: "01001",
    codesPostaux: ["01400"],
    population: 860,
    codeDepartement: "01",
    departementNom: "Ain",
    regionNom: "Auvergne-Rhône-Alpes",
    epciNom: "CC de la Dombes",
    cadreDeVieType: "rural",
    typologie: "Commune rurale"
  };

  const bulletinRural = generateCommuneBulletin(ruralCommune);
  const htmlRural = renderBulletinHtml(bulletinRural);

  if (!htmlRural.includes('L\'Essentiel de L\'Abergement-Clémenciat')) {
    throw new Error('Échec : titre du bulletin rural non conforme.');
  }
  if (!htmlRural.includes('CC de la Dombes')) {
    throw new Error('Échec : le nom de l\'intercommunalité doit être présent.');
  }
  console.log('  ✅ Test 2 : Génération dynamique contextuelle pour les autres communes validée.');

  console.log('✨ Tous les tests de publication et newsletters sont validés avec succès !');
}

runTests().catch(err => {
  console.error('❌ Échec des tests :', err.message);
  process.exit(1);
});
