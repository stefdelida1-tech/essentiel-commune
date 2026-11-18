# Essentiel Commune

Plateforme web d'information, d'exploration cartographique et de communication territoriale pour les communes de France.

## Architecture du projet

``text
essentiel-commune/
├── PROMPT.md
├── README.md
├── optionnel/
│   └── newsletter-subscription-rgpd/
└── .agents/
    ├── AGENTS.md
    └── skills/
        ├── communes-data-pipeline/
        ├── france-map-explorer/
        ├── commune-card/
        ├── commune-newsletter-page/
        ├── site-seo-performance/
        └── conformite-juridique/
``

## Données et fraîcheur

Le bulletin municipal agrège des sources ouvertes, toutes filtrées par une règle anti-obsolescence (rien de plus de 60 jours n'est affiché) :

- **Actualités** : flux RSS Google News (proxy `/gnrss`), filtrées par date de publication.
- **Élus / maire** : Répertoire National des Élus via `tabular-api.data.gouv.fr` + coordonnées via `api-lannuaire.service-public.fr`.
- **Météo / qualité de l'air** : Open-Meteo.
- **Repères** : `geo.api.gouv.fr`, Wikipedia, Wikidata.

### Événements locaux (optionnel)

La rubrique « Que faire » utilise DATAtourisme et/ou OpenAgenda si des clés API gratuites sont fournies via des variables d'environnement Vite :

```bash
VITE_DATATOURISME_API_KEY=...   # https://www.datatourisme.fr/utiliser-les-donnees
VITE_OPENAGENDA_API_KEY=...     # https://openagenda.com/
```

Sans clé, la rubrique retombe sur les actualités « sorties » (déjà limitées à 60 jours).
