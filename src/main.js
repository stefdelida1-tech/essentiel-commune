/**
 * src/main.js
 * Point d'entrée principal de l'application "L'Essentiel de ma Commune"
 */

import { FranceMapExplorer } from './map.js';
import { CommuneSearchEngine } from './search.js';
import { CommuneCardComponent } from './components/CommuneCard.js';
import { NewsletterPageView } from './pages/newsletter.js';
import { LegalNoticeModal } from './components/LegalNotice.js';

let communes = [];
let searchEngine = null;
let mapExplorer = null;
let cardComponent = null;
let newsletterView = null;
let legalModal = null;

const statIndicator = document.getElementById('stat-indicator');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchClear = document.getElementById('search-clear');

async function loadCommunesData() {
  try {
    if (statIndicator) statIndicator.textContent = 'Chargement des communes...';

    const response = await fetch('/data/communes.json');
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    communes = await response.json();
    if (statIndicator) {
      statIndicator.textContent = `📍 ${communes.length.toLocaleString('fr-FR')} communes (< 2 000 hab)`;
    }

    // Initialiser la fiche de commune
    cardComponent = new CommuneCardComponent('commune-card');

    // Initialiser la vue newsletter
    newsletterView = new NewsletterPageView('newsletter-overlay');

    // Initialiser la modale d'informations légales & RGPD
    legalModal = new LegalNoticeModal('legal-overlay');

    // Initialiser le moteur de recherche
    searchEngine = new CommuneSearchEngine(communes);

    // Initialiser la carte Leaflet
    mapExplorer = new FranceMapExplorer('map', (selectedCommune) => {
      if (cardComponent) {
        cardComponent.render(selectedCommune);
      }
    });
    mapExplorer.init();
    mapExplorer.setCommunes(communes);

    // Vérifier si une commune est demandée dans l'URL hash
    checkUrlHash();

    // Écouter les changements d'ancre (hash)
    window.addEventListener('hashchange', checkUrlHash);

  } catch (err) {
    console.error('Erreur chargement communes:', err);
    if (statIndicator) statIndicator.textContent = '⚠️ Erreur de chargement des données';
  }
}

// Gestion de la recherche
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) {
      if (searchClear) searchClear.style.display = 'block';
      const results = searchEngine ? searchEngine.search(query, 8) : [];
      renderSearchResults(results);
    } else {
      if (searchClear) searchClear.style.display = 'none';
      if (searchResults) searchResults.style.display = 'none';
    }
  });

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      if (searchResults) searchResults.style.display = 'none';
      searchInput.focus();
    });
  }
}

function renderSearchResults(results) {
  if (!searchResults) return;

  if (results.length === 0) {
    searchResults.innerHTML = '<div style="padding: 0.8rem; font-size: 0.85rem; color: #64748b;">Aucune commune trouvée</div>';
    searchResults.style.display = 'block';
    return;
  }

  searchResults.innerHTML = results.map(c => `
    <div class="search-result-item" data-code="${c.code}" role="option">
      <div>
        <div class="result-name">${c.nom}</div>
        <div class="result-dept">Dép. ${c.codeDepartement} • ${c.codesPostaux?.[0] || ''}</div>
      </div>
      <div class="result-pop">${c.population ? c.population.toLocaleString('fr-FR') + ' hab.' : ''}</div>
    </div>
  `).join('');

  searchResults.style.display = 'block';

  // Événements de clic sur chaque résultat
  searchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const insee = item.getAttribute('data-code');
      const commune = communes.find(c => c.code === insee);
      if (commune) {
        searchResults.style.display = 'none';
        searchInput.value = commune.nom;
        if (mapExplorer) {
          mapExplorer.selectCommune(commune, true);
        }
      }
    });
  });
}

// Navigation par URL Hash (#commune=codeInsee ou #newsletter=codeInsee)
function checkUrlHash() {
  const hash = window.location.hash;
  if (hash.startsWith('#newsletter=')) {
    const code = hash.replace('#newsletter=', '').trim();
    const commune = communes.find(c => c.code === code);
    if (commune && newsletterView) {
      newsletterView.show(commune);
    }
  } else if (hash.startsWith('#commune=')) {
    const code = hash.replace('#commune=', '').trim();
    const commune = communes.find(c => c.code === code);
    if (commune) {
      if (mapExplorer) mapExplorer.selectCommune(commune, true);
      if (cardComponent) cardComponent.render(commune);
    }
  }
}

// Initialisation dès chargement du DOM
document.addEventListener('DOMContentLoaded', loadCommunesData);
