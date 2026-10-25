# Consignes du projet

## Objectif

Ce dépôt fournit le socle Node.js sans base de données du TP DriveSpot. Il permet de rechercher des aménagements routiers OpenStreetMap dans un carré de 5 km, de les normaliser en POI et de calculer des clusters métier en JavaScript.

La persistance et le travail SQL sont volontairement réservés aux étudiants. Ne pas ajouter de base de données, ORM, migration, schéma SQL, vue, trigger, cache métier persistant ou benchmark automatisé de SGBD dans le socle.

## Principes de travail

- Privilégier un code lisible, simple et facile à maintenir.
- Éviter la duplication et limiter les dépendances externes au strict nécessaire.
- Ne pas ajouter de compatibilité legacy sans demande explicite.
- Préserver les changements hors sujet déjà présents dans le dépôt.
- Si une information manque, le signaler clairement au lieu de l'inventer.

## Architecture

- Séparer géocodage, récupération OSM, normalisation, clusters, orchestration, API et interface.
- Le fournisseur de POI doit rester remplaçable sans modifier l'interface ni le chronomètre.
- Conserver les points d'extension `TODO STUDENTS` visibles sans implémenter une fausse couche SQL.
- Les tests automatisés ne doivent effectuer aucun appel réseau externe.

## Vérification et fin de tâche

- Exécuter `npm test` après toute modification fonctionnelle.
- Vérifier le parcours hors ligne avec `DATA_MODE=fixture`.
- Une tâche est terminée quand le changement demandé est implémenté, vérifié et documenté si nécessaire.
- Ne jamais committer de `.env`, clé API, token, secret, export sensible, log privé ou donnée réelle de compte.

## Git

- Travailler directement sur `main` sauf demande contraire.
- Produire un seul commit cohérent par session qui modifie le dépôt.
- Ne pousser vers le dépôt distant que sur demande explicite.
