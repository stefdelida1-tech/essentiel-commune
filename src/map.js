/**
 * src/map.js
 * Gestionnaire de la carte interactive Leaflet pour l'exploration des communes
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix des icônes par défaut de Leaflet avec les bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export class FranceMapExplorer {
  constructor(containerId, onSelectCommune) {
    this.containerId = containerId;
    this.onSelectCommune = onSelectCommune;
    this.map = null;
    this.canvasRenderer = null;
    this.markersLayer = null;
    this.selectedMarker = null;
    this.communes = [];
  }

  init() {
    // Centrage sur la France métropolitaine
    this.map = L.map(this.containerId, {
      center: [46.603354, 1.888334],
      zoom: 6,
      minZoom: 5,
      maxZoom: 18,
      zoomControl: false
    });

    // Contrôles de zoom positionnés en bas à droite pour mobile & ergonomie
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Fond de carte OpenStreetMap clair et lisible
    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap France | Données &copy; <a href="https://geo.api.gouv.fr/">geo.api.gouv.fr</a>',
      maxZoom: 19
    }).addTo(this.map);

    // Moteur de rendu Canvas pour des performances maximales (60 FPS)
    this.canvasRenderer = L.canvas({ padding: 0.5 });
    this.markersLayer = L.layerGroup().addTo(this.map);

    // Mise à jour des marqueurs visibles lors du déplacement de la carte
    this.map.on('moveend', () => this.renderVisibleMarkers());

    return this;
  }

  setCommunes(communes) {
    this.communes = communes;
    this.renderVisibleMarkers();
  }

  renderVisibleMarkers() {
    if (!this.map || this.communes.length === 0) return;

    const zoom = this.map.getZoom();
    const bounds = this.map.getBounds();

    this.markersLayer.clearLayers();

    // Si le zoom est trop faible, on limite la densité pour éviter la surcharge visuelle
    if (zoom < 8) {
      return;
    }

    const maxToDisplay = zoom >= 12 ? 800 : zoom >= 10 ? 350 : 150;
    let count = 0;

    for (let i = 0; i < this.communes.length; i++) {
      const c = this.communes[i];
      if (!c.centre || !c.centre.coordinates) continue;

      const [lng, lat] = c.centre.coordinates;
      if (bounds.contains([lat, lng])) {
        const marker = L.circleMarker([lat, lng], {
          renderer: this.canvasRenderer,
          radius: zoom >= 13 ? 7 : zoom >= 10 ? 5 : 4,
          fillColor: '#1d70b8',
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.85
        });

        marker.on('click', () => {
          this.selectCommune(c, false);
        });

        marker.bindTooltip(`<strong>${c.nom}</strong> (${c.codesPostaux?.[0] || ''})<br>Pop: ${c.population?.toLocaleString('fr-FR')} hab.`, {
          direction: 'top',
          offset: [0, -5]
        });

        this.markersLayer.addLayer(marker);
        count++;
        if (count >= maxToDisplay) break;
      }
    }
  }

  selectCommune(commune, triggerFly = true) {
    if (!commune || !commune.centre || !commune.centre.coordinates) return;

    const [lng, lat] = commune.centre.coordinates;

    if (this.selectedMarker) {
      this.map.removeLayer(this.selectedMarker);
    }

    // Marqueur mis en valeur
    this.selectedMarker = L.marker([lat, lng]).addTo(this.map);
    this.selectedMarker.bindPopup(`
      <div class="map-popup-content">
        <h3>${commune.nom}</h3>
        <p><strong>Code Insee :</strong> ${commune.code}</p>
        <p><strong>Code postal :</strong> ${commune.codesPostaux?.join(', ') || 'N/A'}</p>
        <p><strong>Population :</strong> ${commune.population?.toLocaleString('fr-FR')} hab.</p>
      </div>
    `).openPopup();

    if (triggerFly) {
      this.map.flyTo([lat, lng], 13, { duration: 1.2 });
    }

    if (typeof this.onSelectCommune === 'function') {
      this.onSelectCommune(commune);
    }
  }
}
