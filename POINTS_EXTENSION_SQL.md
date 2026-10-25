# Points d'extension pour la suite SQL

Le socle ne contient volontairement aucune base de données.

## 1. Fournisseur de POI

Le fichier src/providers/index.js sélectionne un fournisseur qui expose :

    provider.fetchPois({ center, bounds, signal })

Dans la suite, un fournisseur composite pourra vérifier si la zone est couverte, lire la base si elle l'est, ou appeler Overpass puis persister le résultat. Le commentaire TODO STUDENTS marque ce point.

## 2. Repository et stockage

Le point d'orchestration est src/services/search.js, après la normalisation. Un futur repository pourra proposer :

    repository.findCoveredArea(bounds)
    repository.saveSearch({ center, bounds, pois })
    repository.findPois(bounds)
    repository.saveClusters(searchId, clusters)

Les signatures exactes restent à concevoir par chaque groupe. Le socle ne fournit ni fausse implémentation SQL ni schéma imposé.

## 3. Calcul des clusters

La référence JavaScript est src/services/clusters.js. Son appel dans src/services/search.js est marqué TODO STUDENTS.

Ce comportement devra être reproduit avec ROUND, GROUP BY, COUNT et AVG. Le seuil reste cinq POI. Conserver la version JavaScript au début permet de vérifier la parité de la version SQL.

## 4. Vues, table de clusters et triggers

Ces éléments n'existent pas encore. Ils viendront après la première persistance : vue calculée à la lecture, table de clusters, trigger de synchronisation et éventuellement notification propre au moteur.

Les migrations ou scripts devront être rangés par SGBD. La logique SQL ne doit pas aller dans public/app.js.

## 5. Chronomètre à préserver

Le chronomètre métier se trouve dans public/app.js. Il mesure le clic jusqu'au rendu terminé et ne doit pas être remplacé par une mesure limitée au SQL ou au HTTP.

La réponse de POST /api/search doit continuer à fournir center, bounds, pois, clusters et source. L'interface reste ainsi comparable entre OSM, premier import et lecture en base.

## 6. Fichiers probablement modifiés par les étudiants

- src/providers/index.js : sélectionner le nouveau fournisseur ;
- nouveau dossier src/repositories/ : accès au SGBD ;
- src/services/search.js : couverture, import et lecture ;
- src/services/clusters.js : référence à comparer au calcul SQL ;
- configuration et .env.example : connexion sans secret ;
- tests : parité fonctionnelle et erreurs ;
- README : moteur, installation et mesures.

Le frontend ne devrait pas dépendre du SGBD.

