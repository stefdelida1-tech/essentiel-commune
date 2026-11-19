/**
 * src/pages/newsletter.js
 * Gestionnaire d'affichage de la page bulletin d'information / newsletter
 */

import { fetchCommuneDetails } from '../services/communeDetails.js';
import { fetchCommuneNews, fetchCivicAlerts } from '../services/news.js';
import { fetchCommuneEvents } from '../services/events.js';
import { fetchServicesPublics } from '../services/annuaire.js';
import { generateCommuneBulletin, renderBulletinHtml } from '../components/NewsletterTemplate.js';
import { LocalCommuneAssistant } from '../components/LocalCommuneAssistant.js';

export class NewsletterPageView {
  constructor(overlayId) {
    this.overlay = document.getElementById(overlayId);
    this.contentEl = document.getElementById('newsletter-content');
    this.closeBtn = document.getElementById('newsletter-close-btn');
    this.printBtn = document.getElementById('newsletter-print-btn');
    this.currentCommune = null;
    this.showRequestId = 0;
    this.assistant = null;

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
    const requestId = ++this.showRequestId;
    this.assistant?.destroy();
    this.assistant = null;
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
      // Chaque service est isolé : l'échec d'un seul ne doit pas faire
      // basculer tout le bulletin sur les contenus génériques.
      const safe = (p, fallback) => p.catch(err => { console.warn('Service indisponible:', err); return fallback; });
      const [localNews, travauxNews, sortiesNews, economieNews, santeNews, seniorsNews, dechetsNews, civicAlerts, events, servicesPublics] = await Promise.all([
        safe(fetchCommuneNews(base, 'general'), []),
        safe(fetchCommuneNews(base, 'travaux'), []),
        safe(fetchCommuneNews(base, 'sorties'), []),
        safe(fetchCommuneNews(base, 'economie'), []),
        safe(fetchCommuneNews(base, 'sante'), []),
        safe(fetchCommuneNews(base, 'seniors'), []),
        safe(fetchCommuneNews(base, 'dechets'), []),
        safe(fetchCivicAlerts(base), { pollen: [], meteo: [] }),
        safe(fetchCommuneEvents(base), []),
        safe(fetchServicesPublics(base), [])
      ]);
      const enrichedData = { ...base, localNews, travauxNews, sortiesNews, economieNews, santeNews, seniorsNews, dechetsNews, civicAlerts, events, servicesPublics };
      const bulletinData = generateCommuneBulletin(enrichedData);
      const html = renderBulletinHtml(bulletinData);

      if (requestId !== this.showRequestId) return;
      if (this.contentEl) {
        this.contentEl.innerHTML = html;
        this.mountLocalAssistant(enrichedData);
      }
    } catch (err) {
      console.error('Erreur enrichissement bulletin:', err);
      if (requestId !== this.showRequestId) return;
      // Fallback avec données de base
      const bulletinData = generateCommuneBulletin(commune);
      const html = renderBulletinHtml(bulletinData);
      if (this.contentEl) {
        this.contentEl.innerHTML = html;
        this.mountLocalAssistant(commune);
      }
    }

    if (requestId !== this.showRequestId) return;
    if (this.closeBtn) {
      this.closeBtn.focus();
    }
  }

  mountLocalAssistant(commune) {
    if (import.meta.env.DEV && this.contentEl) {
      this.assistant = new LocalCommuneAssistant(commune);
      this.assistant.mount(this.contentEl);
    }
  }

  hide() {
    if (!this.overlay) return;
    this.showRequestId++;
    this.assistant?.destroy();
    this.assistant = null;
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
