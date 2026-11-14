/**
 * src/components/CommuneCard.js
 * Composant d'affichage de la fiche synthétique d'une commune
 */

import { fetchWeather } from '../services/weather.js';

export class CommuneCardComponent {
  constructor(panelId) {
    this.panel = document.getElementById(panelId);
    this.currentCommune = null;
    this.nameEl = document.getElementById('card-commune-name');
    this.subtitleEl = document.getElementById('card-commune-subtitle');
    this.popEl = document.getElementById('card-commune-pop');
    this.inseeEl = document.getElementById('card-commune-insee');
    this.postalEl = document.getElementById('card-commune-postal');
    this.deptEl = document.getElementById('card-commune-dept');
    this.weatherContent = document.getElementById('weather-content');
    this.weatherTemp = document.getElementById('weather-temp');
    this.weatherDesc = document.getElementById('weather-desc');
    this.btnShare = document.getElementById('btn-share-commune');
    this.btnNewsletter = document.getElementById('btn-newsletter-page');
    this.closeBtn = document.getElementById('close-card-btn');

    this.initEvents();
  }

  initEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.btnShare) {
      this.btnShare.addEventListener('click', () => this.shareCommune());
    }

    if (this.btnNewsletter) {
      this.btnNewsletter.addEventListener('click', (e) => {
        if (!this.currentCommune) return;
        e.preventDefault();
        window.location.hash = `newsletter=${this.currentCommune.code}`;
      });
    }
  }

  async render(commune) {
    if (!commune) return;
    this.currentCommune = commune;

    if (this.nameEl) this.nameEl.textContent = commune.nom;
    if (this.subtitleEl) {
      this.subtitleEl.textContent = `Département ${commune.codeDepartement} • Code Insee : ${commune.code}`;
    }
    if (this.popEl) {
      this.popEl.textContent = commune.population !== undefined 
        ? `${commune.population.toLocaleString('fr-FR')} hab.` 
        : 'Non renseignée';
    }
    if (this.inseeEl) this.inseeEl.textContent = commune.code;
    if (this.postalEl) this.postalEl.textContent = commune.codesPostaux?.join(', ') || 'N/A';
    if (this.deptEl) this.deptEl.textContent = commune.codeDepartement;

    // Mise à jour de l'URL hash sans recharger
    window.location.hash = `commune=${commune.code}`;

    // Ouvrir le panneau
    if (this.panel) {
      this.panel.classList.add('open');
      this.panel.setAttribute('aria-hidden', 'false');
    }

    // Récupération météo si coordonnées présentes
    if (commune.centre && commune.centre.coordinates) {
      const [lng, lat] = commune.centre.coordinates;
      this.loadWeather(lat, lng);
    }
  }

  async loadWeather(lat, lng) {
    if (this.weatherTemp) this.weatherTemp.textContent = '--°C';
    if (this.weatherDesc) this.weatherDesc.textContent = 'Mise à jour...';

    const weather = await fetchWeather(lat, lng);

    if (weather.success) {
      if (this.weatherTemp) {
        this.weatherTemp.textContent = `${weather.icon} ${weather.temperature}°C`;
      }
      if (this.weatherDesc) {
        let details = weather.label;
        if (weather.tempMin !== null && weather.tempMax !== null) {
          details += ` (${weather.tempMin}°C / ${weather.tempMax}°C)`;
        }
        if (weather.windspeed) {
          details += ` • Vent: ${weather.windspeed} km/h`;
        }
        this.weatherDesc.textContent = details;
      }
    } else {
      if (this.weatherTemp) this.weatherTemp.textContent = '⛅ --°C';
      if (this.weatherDesc) this.weatherDesc.textContent = 'Météo momentanément indisponible';
    }
  }

  shareCommune() {
    if (!this.currentCommune) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}#commune=${this.currentCommune.code}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        const originalText = this.btnShare.textContent;
        this.btnShare.textContent = '✅ Lien copié !';
        setTimeout(() => {
          this.btnShare.textContent = originalText;
        }, 2000);
      }).catch(() => {
        prompt('Copiez ce lien :', shareUrl);
      });
    } else {
      prompt('Copiez ce lien :', shareUrl);
    }
  }

  close() {
    if (this.panel) {
      this.panel.classList.remove('open');
      this.panel.setAttribute('aria-hidden', 'true');
    }
    if (window.location.hash.startsWith('#commune=')) {
      history.pushState(null, document.title, window.location.pathname);
    }
  }
}
