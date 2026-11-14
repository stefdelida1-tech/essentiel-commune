# Plan d'Implémentation - L'Essentiel de ma Commune

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer une application web moderne, légère, performante et citoyenne permettant d'explorer les communes françaises de moins de 2 000 habitants, de consulter leurs informations clés (fiche synthétique, météo) et leurs actualités territoriales, hébergée sur Vercel.

**Architecture:** Application web statique/Jamstack avec Vite + HTML/JS/CSS moderne (ou React), cartographie Leaflet interactive, données pré-filtrées issues de `geo.api.gouv.fr`, météo en direct via Open-Meteo API, optimisée pour le déploiement Vercel Hobby.

**Tech Stack:** Node.js v22, Vite, Vanilla JS/TypeScript ou React, Leaflet & OpenStreetMap, Open-Meteo API, CSS moderne (responsive & accessible).

**Spec:** PROMPT.md & kit-communes specifications.

## Global Constraints
- Nom du site : L'Essentiel de ma Commune (domaine : `essentiel-commune.vercel.app`)
- Hébergement cible : Vercel (Hobby gratuit)
- Filtre population étape 1 : Communes de moins de 2 000 habitants (`--max-pop=2000`)
- Respect de la vie privée : Zéro collecte de données personnelles superflue, aucun cookie tiers, conformité RGPD stricte
- Éditeur : Nicolas Ratisbonne (particulier, projet citoyen indépendant et non commercial, non affilié aux mairies)
- Hébergeur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
- Restitution : À la fin de chaque étape, exécution des tests et présentation d'un résumé de 5 lignes.

## Review Focus
- Résilience si l'API externe (météo / gouv) est indisponible ou lente.
- Fluidité de la carte sur mobile et desktop avec un grand volume de communes.
- Performance de chargement initial (First Contentful Paint < 1.2s, bundle léger).
- Accessibilité (contraste des couleurs, navigation clavier, conformité RGAA).
- Déploiement Vercel prêt à l'emploi (configuration `vercel.json` et build sans erreur).

---

### Étape 1 : Données (`communes-data-pipeline`)
**Files:**
- Create/Verify: `.agents/skills/communes-data-pipeline/scripts/fetch_geo.mjs`
- Create: `data/communes.json` (et `public/data/communes.json`)
- Test: `tests/data-pipeline.test.mjs`

- [x] **Step 1:** Vérifier et exécuter `fetch_geo.mjs` avec le paramètre `--max-pop=2000`.
- [x] **Step 2:** Valider l'intégrité du fichier généré (structure JSON, présence du nom, code Insee, codes postaux, coordonnées centre).
- [x] **Step 3:** Créer un script de test unitaire pour valider qu'aucune commune ne dépasse 2 000 habitants et que les coordonnées sont valides.
- [x] **Step 4:** Copier les données vers `public/data/communes.json` pour la consommation client.
- [x] **Step 5:** Synthèse de validation en 5 lignes.

---

### Étape 2 : Carte Interactive (`france-map-explorer`)
**Files:**
- Create: `index.html`
- Create: `src/main.js`, `src/map.js`, `src/style.css`
- Test: `tests/map.test.mjs`

- [x] **Step 1:** Initialiser la structure de l'application (Vite / bundling web).
- [x] **Step 2:** Intégrer Leaflet avec tuiles OpenStreetMap adaptées et légères.
- [x] **Step 3:** Implémenter le chargement et le clustering / affichage optimisé des communes.
- [x] **Step 4:** Ajouter la barre de recherche par nom et code postal avec autocomplétion rapide.
- [x] **Step 5:** Tests d'interaction et synthèse de validation en 5 lignes.

---

### Étape 3 : Fiche Rapide de Commune (`commune-card`)
**Files:**
- Create: `src/components/CommuneCard.js`
- Create: `src/services/weather.js`
- Test: `tests/weather.test.mjs`

- [x] **Step 1:** Créer le composant de fiche synthétique (nom, département, population, code postal).
- [x] **Step 2:** Intégrer l'appel à l'API Open-Meteo pour afficher la météo actuelle et les prévisions sans clé d'API.
- [x] **Step 3:** Gérer les états de chargement, d'erreur et mode hors-ligne.
- [x] **Step 4:** Permettre le partage du lien direct vers la commune via URL hash/query param.
- [x] **Step 5:** Tests fonctionnels et synthèse de validation en 5 lignes.

---

### Étape 4 : Page Newsletter / Actualités Locales (`commune-newsletter-page`)
**Files:**
- Create: `src/pages/newsletter.js`
- Create: `src/components/NewsletterTemplate.js`
- Test: `tests/newsletter.test.mjs`

- [x] **Step 1:** Concevoir le modèle de page de publication locale (bulletin d'informations territoriales).
- [x] **Step 2:** Intégrer un système de flux / actualités locales éditoriales adaptées aux petites communes.
- [x] **Step 3:** Assurer la navigation fluide entre la carte, la fiche et la page actualités.
- [x] **Step 4:** Adapter le design pour une lecture optimale sur mobile et impression (PDF / print stylesheet).
- [x] **Step 5:** Tests d'affichage et synthèse de validation en 5 lignes.

---

### Étape 5 : SEO et Performance (`site-seo-performance`)
**Files:**
- Create: `public/robots.txt`
- Create: `scripts/generate_sitemap.mjs`
- Create: `vercel.json`
- Test: `tests/seo.test.mjs`

- [x] **Step 1:** Configurer les balises meta (Open Graph, Twitter Card, Description, Canonical URL).
- [x] **Step 2:** Générer le fichier `sitemap.xml` recensant les communes.
- [x] **Step 3:** Créer `robots.txt` et optimiser les assets (compression, cache headers).
- [x] **Step 4:** Configurer `vercel.json` pour le routage SPA et la politique de cache.
- [x] **Step 5:** Tests de build de production (`npm run build`) et synthèse de validation en 5 lignes.

---

### Étape 6 : Conformité Juridique (`conformite-juridique`)
**Files:**
- Create: `mentions-legales.html` (ou modal/page intégrée)
- Create: `politique-confidentialite.html`
- Create: `src/components/LegalNotice.js`
- Test: `tests/legal.test.mjs`

- [x] **Step 1:** Rédiger les mentions légales complètes avec les coordonnées transmises (Éditeur : Nicolas Ratisbonne, Hébergeur : Vercel Inc.).
- [x] **Step 2:** Rédiger la politique de confidentialité (absence de cookies traceurs, respect strict du RGPD).
- [x] **Step 3:** Intégrer le formulaire / lien de signalement et de demande de retrait.
- [x] **Step 4:** Valider les critères d'accessibilité RGAA de base (contrastes, balises ARIA, alternatives textuelles).
- [x] **Step 5:** Validation juridique globale et synthèse de validation en 5 lignes.
