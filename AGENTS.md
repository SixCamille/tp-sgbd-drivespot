# Consignes du projet

## Objectif

Ce dépôt héberge le projet `tp-sgbd-drivespot`. Tant que le code et la documentation du projet ne précisent pas davantage son périmètre, ne pas inventer de contraintes métier ou techniques.

## Principes de travail

- Privilégier un code lisible, simple et facile à maintenir.
- Éviter la duplication et limiter les dépendances externes au strict nécessaire.
- Ne pas ajouter de compatibilité legacy sans demande explicite ; préférer une migration nette et supprimer les anciens chemins devenus inutiles.
- Préserver les changements hors sujet déjà présents dans le dépôt.
- Si une information manque, le signaler clairement au lieu de l'inventer.

## Avant toute modification

- Lire les fichiers de documentation et les éventuels `AGENTS.md` plus proches de la zone modifiée.
- Rechercher une implémentation équivalente avant d'ajouter une nouvelle abstraction.
- Vérifier que les commandes proposées existent réellement dans le dépôt.

## Vérification et fin de tâche

- Exécuter les tests, linters ou commandes de validation pertinents lorsqu'ils existent.
- Une tâche est terminée quand le changement demandé est implémenté, vérifié, documenté si nécessaire et que `git status` ne contient aucun fichier sensible.
- Ne jamais committer de `.env`, clé API, token, secret, export sensible, log privé ou donnée réelle de compte.

## Git

- Travailler directement sur `main` sauf demande contraire.
- Produire un seul commit cohérent par session qui modifie le dépôt.
- Ne pousser vers le dépôt distant que sur demande explicite.
