# Assistant local avec Ollama

En mode développement, le bulletin communal affiche un assistant qui répond à partir des informations de la commune et des actualités chargées. Le navigateur envoie ses requêtes au proxy Vite, qui les transmet à Ollama sur le même ordinateur. Aucune clé API n'est nécessaire.

## Démarrage

1. Installer le modèle une fois : `ollama pull qwen3:1.7b`
2. Laisser l'application Ollama ouverte.
3. Démarrer le site avec `npm run dev`, puis ouvrir un bulletin communal.

Le modèle tourne principalement sur le processeur sur les machines sans carte graphique compatible.

## Mise en ligne

L'assistant est volontairement absent du site Vercel : un site statique ne peut pas accéder à l'Ollama installé sur le PC du visiteur. Une version publique nécessitera un backend accessible en ligne et une stratégie d'hébergement du modèle. Ne jamais exposer une clé API dans le code navigateur.
