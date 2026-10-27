# DriveSpots — cartographie des parcours de conduite

DriveSpots aide les responsables d’agence et les moniteurs d’auto-école à préparer leurs parcours. À partir d’une adresse, l’application visualise les aménagements routiers utiles aux leçons de conduite dans un carré de **3 km × 3 km** centré sur ce point de départ.

Cette version est volontairement **100 % sans base de données**. Elle constitue une référence fonctionnelle avant l’ajout éventuel d’une couche de persistance et la comparaison de plusieurs SGBD.

## Fonctionnalités

- suggestions d'adresse avec le service d'autocomplétion GeoGouv ;
- saisie d'adresse utilisable sans sélectionner une suggestion, avec coordonnées en repli ;
- récupération des données OSM via Overpass ;
- carré de 3 km de côté, soit environ 1,5 km dans chaque direction ;
- normalisation des nodes et ways OSM en un POI représentatif ;
- dix catégories d'aménagements ;
- clusters métier en JavaScript par arrondi à 3 décimales, à partir de 3 catégories de POI distinctes ;
- carte Leaflet avec POI individuels, cases de clusters et liste navigable des clusters avec le détail rapide de leurs catégories ;
- mesure unique du clic jusqu'au rendu des couches et listes ;
- annulation logique des recherches concurrentes ;
- tests automatisés sans appels réseau externes.

## Prérequis et lancement

Node.js 22 LTS ou une version supérieure, puis :

    npm install
    npm run dev

Ouvrir http://localhost:3000. L'application interroge GeoGouv pour les adresses et Overpass pour les aménagements routiers. Leaflet est servi localement ; les tuiles de fond sont également externes, mais leur absence n'empêche pas le rendu des POI et clusters. Pour lancer sans surveillance :

    npm start

Pour personnaliser la configuration, copier .env.example vers .env, renseigner un PUBLIC_USER_AGENT qui identifie le projet et l'URL personnelle complète fournie par NextGIS dans `NEXTGIS_OVERPASS_URL`, puis relancer npm start. Node charge automatiquement ce fichier lorsqu'il existe. Cette URL contient la clé et doit rester uniquement dans `.env`. Elle est obligatoire : si NextGIS expire, est indisponible ou renvoie une erreur HTTP, l'erreur est renvoyée sans essayer une autre instance Overpass.

Le fichier .env est ignoré par Git. Aucune clé n'est nécessaire pour GeoGouv ; l'URL NextGIS ne doit jamais être commitée.

## Tests

    npm test

Les tests couvrent la bounding box, les nodes et ways, les coordonnées négatives, le seuil de trois catégories distinctes, la déduplication, les tags superposés, la validation des entrées HTTP, les réponses anormales, les timeouts et un parcours API complet sans réseau externe.

## Parcours de vérification manuelle

1. Lancer l'application et vérifier que GeoGouv et Overpass sont accessibles.
2. Choisir « Place Bellecour » et cliquer sur **Analyser la zone**.
3. Vérifier le carré bleu de 3 km et les POI renvoyés par Overpass.
4. Ouvrir le cluster et sélectionner un POI de sa liste.
5. Vérifier que les catégories présentes apparaissent dans la synthèse.
6. Relancer la recherche et comparer le temps total affiché.
7. Saisir « Gare Part-Dieu Lyon » sans cliquer une suggestion : la recherche doit fonctionner.
8. Tester une autre adresse lyonnaise et vérifier le déplacement de la zone analysée.

Le chronomètre démarre au clic et s'arrête après le retour API, la mise à jour des marqueurs, clusters et listes, puis deux passages de rendu navigateur. Il n'attend pas les tuiles cartographiques.

## Architecture

    src/
      app.js
      server.js
      routes/api.js
      providers/
        index.js
        osmProvider.js
      services/
        bounds.js
        geocoding.js
        osm.js
        normalizePoi.js
        clusters.js
        search.js
    public/
      index.html
      app.js
      styles.css
    tests/

Le fournisseur de POI expose une propriété `source` et la méthode `fetchPois({ center, bounds, signal })`, qui renvoie des POI déjà normalisés. La suite SQL pourra le remplacer sans connaître le format Overpass et sans changer la route HTTP, le format de réponse ni le chronomètre frontend. Voir POINTS_EXTENSION_SQL.md.

## Catégories et tags OSM

| Catégorie | Tags interprétés |
| --- | --- |
| Giratoire | junction=roundabout |
| Mini-giratoire | highway=mini_roundabout |
| Feu tricolore | highway=traffic_signals |
| Stop | highway=stop |
| Cédez-le-passage | highway=give_way |
| Passage piéton | highway=crossing |
| Dos-d'âne | traffic_calming=bump ou hump |
| Plateau ralentisseur | traffic_calming=table |
| Passage à niveau | railway=level_crossing |
| Traversée cyclable | highway=crossing + bicycle=yes ou highway=cycleway + cycleway=crossing |

La traversée cyclable est testée avant le passage piéton afin qu'un objet portant plusieurs tags ne soit pas compté deux fois. Une identité type/id déduplique les réponses répétées.

## Géométrie et limites

- un node conserve ses coordonnées ;
- un way utilise le centre fourni par Overpass ;
- la géométrie détaillée des ways n'est ni demandée ni interprétée ;
- seul le point représentatif situé dans le carré est conservé ;
- les relations OSM ne sont pas interprétées ;
- deux objets OSM distincts décrivant le même aménagement peuvent subsister ;
- le balisage contributif peut être incomplet ou hétérogène ;
- aucune intersection n'est inventée ;
- la conversion kilomètres/degrés est une approximation locale.

Les requêtes ont un timeout, un espacement minimal côté Overpass et un user-agent configurable. Aucun endpoint de repli n'est appelé en cas d'échec. Les tests n'appellent jamais ces services : ils remplacent les réponses HTTP par des doubles contrôlés.

Références de tagging vérifiées : documentation officielle [Overpass QL](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL), [highway=crossing](https://wiki.openstreetmap.org/wiki/Tag:highway%3Dcrossing), [cycleway=crossing](https://wiki.openstreetmap.org/wiki/Tag:cycleway%3Dcrossing) et [traffic_calming](https://wiki.openstreetmap.org/wiki/Key:traffic_calming). La requête demande le modificateur Overpass `center` afin de représenter les ways sans transférer leur géométrie complète.

## Feuille de route pour la persistance

1. Mesurer et comprendre cette version 100 % OSM.
2. Constater les limites et dépendances des appels externes.
3. Brancher un SGBD différent par groupe et détecter les zones déjà disponibles.
4. Comparer appel externe, premier import et lecture en base pour la même action métier.
5. Transférer les clusters vers SQL, puis explorer vues, tables de clusters et triggers.
6. Restituer les résultats dans des conditions aussi homogènes que possible.

Les mesures bout en bout incluent navigateur, API, réseau et services externes. Elles ne permettent pas d'attribuer tout écart au seul SGBD.

## Crédits

Données et tuiles © contributeurs OpenStreetMap. Autocomplétion via le service de géocodage de la Géoplateforme GeoGouv, alimenté notamment par la Base Adresse Nationale. Données OSM via Overpass API. Carte interactive Leaflet. L’utilisation du serveur standard de tuiles OSM doit respecter sa politique d’usage.

