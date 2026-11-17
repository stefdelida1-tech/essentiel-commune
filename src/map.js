/**
 * src/map.js
 * Explorateur cartographique hiérarchique de la France :
 * Régions → Départements → Communes (Leaflet + GeoJSON chargés à la demande)
 *
 * Sources de contours : github.com/gregoiredavid/france-geojson
 * (régions simplifiées ~225 Ko au chargement initial,
 *  un fichier GeoJSON par département chargé au clic)
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

const REGIONS_GEOJSON_URL = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions-version-simplifiee.geojson';
const DEPT_GEOJSON_BASE = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements';
const GEO_API = 'https://geo.api.gouv.fr';

const REGION_PALETTE = [
  '#2563eb', '#0891b2', '#059669', '#65a30d', '#ca8a04', '#ea580c',
  '#dc2626', '#db2777', '#9333ea', '#4f46e5', '#0d9488', '#78716c', '#475569'
];

const FETCH_TIMEOUT_MS = 10000;
const MAX_COMMUNE_MARKERS = 1500;

function slugify(nom) {
  return (nom || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Fusionne un tableau de L.LatLngBounds en une seule bounds. */
function mergeBounds(bounds) {
  const merged = L.latLngBounds();
  bounds.forEach(b => merged.extend(b));
  return merged;
}

export class FranceMapExplorer {
  constructor(containerId, onSelectCommune) {
    this.containerId = containerId;
    this.onSelectCommune = onSelectCommune;
    this.map = null;
    this.canvasRenderer = null;
    this.communes = [];

    // Navigation hiérarchique
    this.level = 'region'; // 'region' | 'departement' | 'commune'
    this.regionsData = null;
    this.regionsLayer = null;
    this.deptLayer = null;
    this.communeLayer = null;
    this.selectedMarker = null;
    this.currentRegion = null;
    this.currentDept = null;
    this.deptGeoCache = new Map();
    this.deptInfoCache = new Map();

    // Éléments UI
    this.navEl = document.getElementById('map-nav');
    this.backBtn = document.getElementById('map-back-btn');
    this.breadcrumbEl = document.getElementById('map-breadcrumb');
    this.statusEl = document.getElementById('map-status');
    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => this.back());
    }
  }

  init() {
    this.map = L.map(this.containerId, {
      center: [46.6, 2.5],
      zoom: 5,
      minZoom: 5,
      maxZoom: 18,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap France | Contours © geo.api.gouv.fr / IGN',
      maxZoom: 19
    }).addTo(this.map);

    // tolerance : marge de détection des clics sur les marqueurs canvas
    this.canvasRenderer = L.canvas({ padding: 0.5, tolerance: 12 });
    this.regionsLayer = L.layerGroup().addTo(this.map);
    this.deptLayer = L.layerGroup().addTo(this.map);
    this.communeLayer = L.layerGroup().addTo(this.map);

    this.updateNavUI();
    this.loadRegions();

    // Diagnostic : la carte doit avoir une taille non nulle pour s'afficher
    const checkSize = () => {
      const size = this.map.getSize();
      if (size.x === 0 || size.y === 0) {
        this.setStatus('⚠️ Carte sans dimension — problème de mise en page.');
      }
    };
    requestAnimationFrame(checkSize);
    setTimeout(checkSize, 1500);

    return this;
  }

  setCommunes(communes) {
    this.communes = communes;
    if (this.level === 'commune') this.renderDeptCommunes();
  }

  // ---------- Chargement des contours ----------

  async loadRegions() {
    this.setStatus('Chargement des régions…');
    const geojson = await fetchJson(REGIONS_GEOJSON_URL);
    if (!geojson || !geojson.features) {
      this.setStatus('Contours indisponibles — utilisez la recherche.');
      return;
    }
    this.regionsData = geojson;
    try {
      this.renderRegions();
      this.setStatus(`${geojson.features.length} régions affichées — cliquez pour explorer.`);
    } catch (err) {
      this.setStatus('Erreur rendu carte : ' + err.message);
      console.error(err);
    }
  }

  async getDeptGeoJson(code, nom) {
    const key = `${code}-${slugify(nom)}`;
    if (this.deptGeoCache.has(key)) return this.deptGeoCache.get(key);

    const url = `${DEPT_GEOJSON_BASE}/${key}/departement-${key}.geojson`;
    const geojson = await fetchJson(url);
    this.deptGeoCache.set(key, geojson);
    return geojson;
  }

  async getDeptInfo(code) {
    if (this.deptInfoCache.has(code)) return this.deptInfoCache.get(code);
    const data = await fetchJson(`${GEO_API}/departements/${code}?fields=nom,code,codeRegion`);
    const info = data ? { code: data.code || code, nom: data.nom || code, codeRegion: data.codeRegion } : null;
    this.deptInfoCache.set(code, info);
    return info;
  }

  // ---------- Rendu par niveau ----------

  clearOverlays() {
    this.regionsLayer.clearLayers();
    this.deptLayer.clearLayers();
    this.communeLayer.clearLayers();
    if (this.selectedMarker) {
      this.map.removeLayer(this.selectedMarker);
      this.selectedMarker = null;
    }
  }

  renderRegions() {
    this.level = 'region';
    this.currentRegion = null;
    this.currentDept = null;
    this.clearOverlays();

    const bounds = [];
    this.regionsData.features.forEach((feature, i) => {
      const nom = feature.properties?.nom || feature.properties?.code || '';
      const color = REGION_PALETTE[i % REGION_PALETTE.length];

      const layer = L.geoJSON(feature, {
        style: {
          color: '#ffffff',
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.35
        }
      });

      layer.eachLayer(path => {
        path.bindTooltip(`<strong>${nom}</strong><br>Cliquez pour explorer`, { sticky: true });
        path.on('mouseover', () => path.setStyle({ fillOpacity: 0.65, weight: 2.5 }));
        path.on('mouseout', () => path.setStyle({ fillOpacity: 0.35, weight: 1.5 }));
        path.on('click', () => this.openRegion(feature));
      });

      this.regionsLayer.addLayer(layer);
      bounds.push(layer.getBounds());
    });

    if (bounds.length > 0) {
      this.map.fitBounds(mergeBounds(bounds), { padding: [20, 20] });
    }
    this.setStatus(null);
    this.updateNavUI();
  }

  async openRegion(feature) {
    const props = feature.properties || {};
    this.currentRegion = { code: props.code, nom: props.nom };
    this.level = 'departement';
    this.currentDept = null;
    this.clearOverlays();
    this.setStatus(`Chargement des départements de ${props.nom}…`);
    this.updateNavUI();

    const depts = await fetchJson(`${GEO_API}/departements?codeRegion=${props.code}&fields=nom,code`);
    if (!depts || depts.length === 0) {
      this.setStatus('Départements indisponibles.');
      return;
    }

    const bounds = [];
    let rendered = 0;
    await Promise.all(depts.map(async (dept) => {
      const geojson = await this.getDeptGeoJson(dept.code, dept.nom);
      if (!geojson) return;
      this.addDeptPath(geojson, dept, bounds);
      rendered++;
    }));

    if (bounds.length > 0) {
      this.map.flyToBounds(mergeBounds(bounds), { padding: [20, 20], duration: 0.8 });
    }
    this.setStatus(`${rendered}/${depts.length} départements affichés — cliquez sur l'un d'eux.`);
    this.updateNavUI();
  }

  addDeptPath(geojson, dept, bounds, interactive = true) {
    const layer = L.geoJSON(geojson, {
      style: {
        color: '#1d4ed8',
        weight: 1.2,
        fillColor: '#3b82f6',
        fillOpacity: 0.22
      }
    });

    if (interactive) {
      layer.eachLayer(path => {
        path.bindTooltip(`<strong>${dept.nom}</strong> (${dept.code})<br>Cliquez pour voir les communes`, { sticky: true });
        path.on('mouseover', () => path.setStyle({ fillOpacity: 0.5, weight: 2 }));
        path.on('mouseout', () => path.setStyle({ fillOpacity: 0.22, weight: 1.2 }));
        path.on('click', () => {
          this.setStatus(`Département ${dept.nom} sélectionné…`);
          this.openDepartment(dept);
        });
      });
    } else {
      // Contour décoratif au niveau commune : pas de tooltip ni de clic
      layer.eachLayer(path => { path.options.interactive = false; });
    }

    this.deptLayer.addLayer(layer);
    if (bounds) bounds.push(layer.getBounds());
    return layer;
  }

  async openDepartment(dept) {
    try {
      this.currentDept = dept;
      this.level = 'commune';
      this.clearOverlays();
      this.setStatus(`Chargement des communes de ${dept.nom}…`);
      this.updateNavUI();

      const geojson = await this.getDeptGeoJson(dept.code, dept.nom);
      if (geojson) {
        const outline = this.addDeptPath(geojson, dept, null, false);
        outline.eachLayer(path => path.setStyle({
          color: '#0f172a',
          weight: 2,
          fillColor: '#93c5fd',
          fillOpacity: 0.15
        }));
        this.map.flyToBounds(outline.getBounds(), { padding: [30, 30], duration: 0.8 });
      } else {
        this.setStatus(`Contour ${dept.nom} indisponible — communes seules.`);
      }

      this.renderDeptCommunes();
      const count = this.communes.filter(c => c.codeDepartement === this.currentDept.code).length;
      this.setStatus(count > 0
        ? `${count} communes — cliquez sur un point pour ouvrir son bulletin.`
        : 'Aucune commune trouvée pour ce département (code ' + this.currentDept.code + ').');
      this.updateNavUI();
    } catch (err) {
      this.setStatus('Erreur département : ' + err.message);
      console.error(err);
    }
  }

  renderDeptCommunes() {
    this.communeLayer.clearLayers();
    if (this.level !== 'commune' || !this.currentDept) return;

    const deptCommunes = this.communes.filter(c => c.codeDepartement === this.currentDept.code);
    if (deptCommunes.length === 0) return;

    const shown = deptCommunes.slice(0, MAX_COMMUNE_MARKERS);
    shown.forEach(c => {
      const coords = c.centre?.coordinates;
      if (!coords) return;
      const [lng, lat] = coords;
      // Renderer SVG (DOM) : clics garantis, contrairement au canvas
      const marker = L.circleMarker([lat, lng], {
        radius: 7,
        fillColor: '#1d70b8',
        color: '#ffffff',
        weight: 1.5,
        fillOpacity: 0.9
      });
      marker.bindTooltip(`<strong>${c.nom}</strong><br>${c.population?.toLocaleString('fr-FR') || ''} hab. — cliquez pour le bulletin`, { direction: 'top', offset: [0, -4] });
      marker.on('click', () => {
        this.setStatus(`Ouverture du bulletin de ${c.nom}…`);
        if (typeof this.onSelectCommune === 'function') this.onSelectCommune(c);
      });
      this.communeLayer.addLayer(marker);
    });
  }

  // ---------- Navigation ----------

  back() {
    if (this.level === 'commune') {
      // Retour au niveau départements de la région courante
      const regionFeature = this.regionsData?.features.find(
        f => String(f.properties?.code) === String(this.currentRegion?.code)
      );
      if (regionFeature) {
        this.openRegion(regionFeature);
      } else {
        this.renderRegions();
      }
    } else if (this.level === 'departement') {
      this.renderRegions();
    }
  }

  /** Centre la carte sur une commune (usage recherche / hash #commune=). */
  async focusCommune(commune) {
    if (!commune) return;
    await this.ensureRegionsLoaded();

    // Ouvrir le département de la commune pour afficher son contour
    // (limitée à la France métropolitaine : codes département à 2 caractères)
    if (commune.codeDepartement && String(commune.codeDepartement).length === 2) {
      const deptInfo = await this.getDeptInfo(commune.codeDepartement);
      if (deptInfo) {
        const regionFeature = this.regionsData?.features.find(
          f => String(f.properties?.code) === String(deptInfo.codeRegion || commune.codeRegion)
        );
        if (regionFeature) this.currentRegion = { code: regionFeature.properties.code, nom: regionFeature.properties.nom };
        await this.openDepartment({ code: deptInfo.code, nom: deptInfo.nom });
      }
    }
    this.selectCommune(commune, true);
  }

  async ensureRegionsLoaded() {
    if (!this.regionsData) {
      await this.loadRegions();
    }
  }

  selectCommune(commune, triggerFly = true) {
    if (!commune || !commune.centre || !commune.centre.coordinates) return;
    const [lng, lat] = commune.centre.coordinates;

    if (this.selectedMarker) this.map.removeLayer(this.selectedMarker);
    this.selectedMarker = L.marker([lat, lng]).addTo(this.map);
    this.selectedMarker.bindPopup(`
      <div class="map-popup-content">
        <h3>${commune.nom}</h3>
        <p><strong>Population :</strong> ${commune.population?.toLocaleString('fr-FR') || 'N/A'} hab.</p>
      </div>
    `).openPopup();

    if (triggerFly) this.map.flyTo([lat, lng], 13, { duration: 1.0 });
  }

  // ---------- UI ----------

  setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text || '';
  }

  updateNavUI() {
    if (this.backBtn) this.backBtn.classList.toggle('hidden', this.level === 'region');

    if (this.breadcrumbEl) {
      const parts = ['<span class="crumb">France</span>'];
      if (this.currentRegion?.nom) {
        parts.push(`<span class="crumb-sep">›</span><span class="crumb">${this.currentRegion.nom}</span>`);
      }
      if (this.currentDept?.nom) {
        parts.push(`<span class="crumb-sep">›</span><span class="crumb crumb-active">${this.currentDept.nom} (${this.currentDept.code})</span>`);
      }
      this.breadcrumbEl.innerHTML = parts.join('');
    }
  }
}
