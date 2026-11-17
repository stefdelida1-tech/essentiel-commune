/**
 * src/pages/newsletter.js
 * Gestionnaire d'affichage de la page bulletin d'information / newsletter
 */

import { fetchCommuneDetails } from '../services/communeDetails.js';
import { fetchCommuneNews, fetchCivicAlerts } from '../services/news.js';
import { generateCommuneBulletin, renderBulletinHtml } from '../components/NewsletterTemplate.js';

export class NewsletterPageView {
  constructor(overlayId) {
    this.overlay = document.getElementById(overlayId);
    this.contentEl = document.getElementById('newsletter-content');
    this.closeBtn = document.getElementById('newsletter-close-btn');
    this.printBtn = document.getElementById('newsletter-print-btn');
    this.currentCommune = null;

    this.initEvents();
  }

  initEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hide());
    }

    if (this.printBtn) {
      this.printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Fermeture avec la touche Échap
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay && !this.overlay.classList.contains('hidden')) {
        this.hide();
      }
    });
  }

  async show(commune) {
    if (!commune || !this.overlay) return;
    this.currentCommune = commune;

    // Affichage initial pendant le chargement des détails enrichis
    if (this.contentEl) {
      this.contentEl.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: #64748b;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>
          <p>Collecte des informations officielles et territoriales de <strong>${commune.nom}</strong>...</p>
        </div>
      `;
    }

    this.overlay.classList.remove('hidden');
    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Enrichissement dynamique via APIs ouvertes (détails territoriaux + actualités + alertes civiques)
    try {
      const enriched = await fetchCommuneDetails(commune);
      const base = enriched || commune;
      const [localNews, travauxNews, sortiesNews, economieNews, civicAlerts] = await Promise.all([
        fetchCommuneNews(base, 'general'),
        fetchCommuneNews(base, 'travaux'),
        fetchCommuneNews(base, 'sorties'),
        fetchCommuneNews(base, 'economie'),
        fetchCivicAlerts(base)
      ]);
      const bulletinData = generateCommuneBulletin({ ...base, localNews, travauxNews, sortiesNews, economieNews, civicAlerts });
      const html = renderBulletinHtml(bulletinData);

      if (this.contentEl) {
        this.contentEl.innerHTML = html;
      }
    } catch (err) {
      console.error('Erreur enrichissement bulletin:', err);
      // Fallback avec données de base
      const bulletinData = generateCommuneBulletin(commune);
      const html = renderBulletinHtml(bulletinData);
      if (this.contentEl) {
        this.contentEl.innerHTML = html;
      }
    }

    if (this.closeBtn) {
      this.closeBtn.focus();
    }
  }

  hide() {
    if (!this.overlay) return;
    this.overlay.classList.add('hidden');
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Revenir sur le hash de la commune
    if (this.currentCommune) {
      window.location.hash = `commune=${this.currentCommune.code}`;
    } else {
      history.pushState(null, document.title, window.location.pathname);
    }
  }
}
