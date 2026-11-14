/**
 * src/components/LegalNotice.js
 * Gestionnaire des fenêtres modales légales et RGPD dans l'application
 */

export class LegalNoticeModal {
  constructor(overlayId) {
    this.overlay = document.getElementById(overlayId);
    this.titleEl = document.getElementById('legal-modal-title');
    this.bodyEl = document.getElementById('legal-modal-body');
    this.closeBtn = document.getElementById('legal-modal-close');

    this.initEvents();
  }

  initEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hide());
    }

    // Liens du pied de page
    const linkMentions = document.getElementById('link-mentions');
    if (linkMentions) {
      linkMentions.addEventListener('click', (e) => {
        e.preventDefault();
        this.showMentions();
      });
    }

    const linkRgpd = document.getElementById('link-rgpd');
    if (linkRgpd) {
      linkRgpd.addEventListener('click', (e) => {
        e.preventDefault();
        this.showPrivacy();
      });
    }

    // Touche Échap
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay && !this.overlay.classList.contains('hidden')) {
        this.hide();
      }
    });
  }

  showMentions() {
    if (!this.overlay) return;
    this.titleEl.textContent = 'Mentions Légales';
    this.bodyEl.innerHTML = `
      <section style="line-height: 1.6; display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <h3 style="color: #0b4fba; margin-bottom: 0.3rem;">1. Éditeur</h3>
          <p><strong>Nicolas Ratisbonne</strong> (particulier, projet citoyen indépendant et non commercial, non affilié aux mairies).</p>
        </div>
        <div>
          <h3 style="color: #0b4fba; margin-bottom: 0.3rem;">2. Hébergeur</h3>
          <p><strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.</p>
        </div>
        <div>
          <h3 style="color: #0b4fba; margin-bottom: 0.3rem;">3. Données ouvertes</h3>
          <p>Données administratives issues de <strong>geo.api.gouv.fr</strong> sous Licence Ouverte 2.0 (Etalab). Météo gracieuse via <strong>Open-Meteo.com</strong>.</p>
        </div>
        <div>
          <h3 style="color: #0b4fba; margin-bottom: 0.3rem;">4. Signalement ou Retrait</h3>
          <p>Pour toute demande de mise à jour ou de signalement, contactez l'éditeur par courrier ou e-mail.</p>
        </div>
      </section>
    `;
    this.open();
  }

  showPrivacy() {
    if (!this.overlay) return;
    this.titleEl.textContent = 'Confidentialité & RGPD';
    this.bodyEl.innerHTML = `
      <section style="line-height: 1.6; display: flex; flex-direction: column; gap: 1rem;">
        <div style="background: #dcfce7; color: #166534; padding: 0.6rem; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">
          🛡️ Protection de la vie privée garantie dès la conception (Privacy by Design)
        </div>
        <div>
          <h3 style="color: #0b4fba; margin-bottom: 0.3rem;">Zéro cookie traceur</h3>
          <p>Ce site n'utilise aucun cookie publicitaire, aucun traceur d'analyse invasif et aucun cookie tiers.</p>
        </div>
        <div>
          <h3 style="color: #0b4fba; margin-bottom: 0.3rem;">Données personnelles</h3>
          <p>Aucune donnée personnelle n'est collectée pour explorer la carte, consulter les fiches communales ou lire les bulletins locaux.</p>
        </div>
        <div>
          <h3 style="color: #0b4fba; margin-bottom: 0.3rem;">Exercice des droits RGPD</h3>
          <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et d'effacement de toute donnée que vous nous auriez adressée lors d'un signalement.</p>
        </div>
      </section>
    `;
    this.open();
  }

  open() {
    this.overlay.classList.remove('hidden');
    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (this.closeBtn) this.closeBtn.focus();
  }

  hide() {
    if (!this.overlay) return;
    this.overlay.classList.add('hidden');
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}
