/**
 * src/pages/newsletter.js
 * Gestionnaire d'affichage de la page bulletin d'information / newsletter
 */

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

  show(commune) {
    if (!commune || !this.overlay) return;
    this.currentCommune = commune;

    const bulletinData = generateCommuneBulletin(commune);
    const html = renderBulletinHtml(bulletinData);

    if (this.contentEl) {
      this.contentEl.innerHTML = html;
    }

    this.overlay.classList.remove('hidden');
    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus sur le bouton fermer
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
