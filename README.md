# DriveSpot — socle Node.js sans base de données

DriveSpot est le projet de départ du TP SGBD des B3 Développement Web de MyDigitalSchool des 2 et 3 novembre 2026. Une auto-école peut choisir une adresse et visualiser les aménagements routiers utiles aux leçons de conduite dans un carré de **5 km × 5 km** centré sur cette adresse.

Cette version est volontairement **100 % sans base de données**. Elle sert de référence fonctionnelle avant que les étudiants ajoutent la persistance et comparent plusieurs SGBD.

## Fonctionnalités

- suggestions d'adresse avec le service d'autocomplétion GeoGouv en mode réel ;
- saisie d'adresse utilisable sans sélectionner une suggestion, avec coordonnées en repli ;
- récupération des données OSM via Overpass, ou fixtures locales hors ligne ;
- carré de 5 km de côté, soit environ 2,5 km dans chaque direction ;
- normalisation des nodes et ways OSM en un POI représentatif ;
- dix catégories d'aménagements ;
- clusters métier en JavaScript par arrondi à 3 décimales, à partir de 5 POI ;
- carte Leaflet avec POI individuels, cases de clusters et liste navigable ;
- mesure unique du clic jusqu'au rendu des couches et listes ;
- annulation logique des recherches concurrentes ;
- tests automatisés sans appels réseau externes.

## Prérequis et lancement

Node.js 22 LTS ou une version supérieure, puis :

    npm install
    npm run dev

Ouvrir http://localhost:3000. Le mode par défaut est fixture : il fonctionne sans GeoGouv ni Overpass et reproduit les dix catégories autour de l'adresse choisie. Leaflet est servi localement ; seules les tuiles de fond restent externes et leur absence n'empêche pas le rendu des POI et clusters. Pour lancer sans surveillance :

    npm start

Pour utiliser les services publics réels, copier .env.example vers .env, définir DATA_MODE=live, renseigner un PUBLIC_USER_AGENT qui identifie le projet, puis relancer npm start. Node charge automatiquement ce fichier lorsqu'il existe.

Le fichier .env est ignoré par Git. Aucune clé n'est nécessaire pour GeoGouv, Overpass ou le mode démo.

## Tests

    npm test

Les tests couvrent la bounding box, les nodes et ways, le sommet fermé répété, les coordonnées négatives, les seuils 4/5/6, la déduplication, les tags superposés, les réponses anormales, les timeouts et un parcours API complet sans réseau externe.

## Parcours de vérification manuelle

1. Lancer en mode fixture.
2. Choisir « Place Bellecour » et cliquer sur **Rechercher**.
3. Vérifier le carré bleu de 5 km, les 15 POI et la case orange de 6 POI.
4. Ouvrir le cluster et sélectionner un POI de sa liste.
5. Vérifier que les dix catégories apparaissent dans la synthèse.
6. Relancer la recherche et comparer le temps total affiché.
7. Saisir « Gare Part-Dieu Lyon » sans cliquer une suggestion : la recherche doit fonctionner.
8. En mode réel, tester une adresse lyonnaise puis repasser en fixture si le service public est indisponible.

Le chronomètre démarre au clic et s'arrête après le retour API, la mise à jour des marqueurs, clusters et listes, puis deux passages de rendu navigateur. Il n'attend pas les tuiles cartographiques.

## Architecture

    src/
      app.js
      server.js
      routes/api.js
      providers/
        index.js
        fixtureProvider.js
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
    fixtures/
      addresses.json
      overpass.json
    tests/

Le fournisseur de POI expose fetchPois({ center, bounds, signal }). La suite SQL pourra le remplacer sans changer la route HTTP, le format de réponse ni le chronomètre frontend. Voir POINTS_EXTENSION_SQL.md.

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
- un way ouvert utilise le point situé à mi-longueur cumulée ;
- un way fermé utilise la moyenne de ses sommets sans répéter le dernier ;
- le centre fourni par Overpass sert de repli si la géométrie manque ;
- seul le point représentatif situé dans le carré est conservé ;
- les relations OSM ne sont pas interprétées ;
- deux objets OSM distincts décrivant le même aménagement peuvent subsister ;
- le balisage contributif peut être incomplet ou hétérogène ;
- aucune intersection n'est inventée ;
- la conversion kilomètres/degrés est une approximation locale.

Les requêtes publiques ont un timeout, un espacement minimal côté Overpass et un user-agent configurable. Les tests n'appellent jamais ces services. Le mode fixture est un jeu statique, pas un cache de recherches.

Références de tagging vérifiées : documentation officielle [Overpass QL](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL), [highway=crossing](https://wiki.openstreetmap.org/wiki/Tag:highway%3Dcrossing), [cycleway=crossing](https://wiki.openstreetmap.org/wiki/Tag:cycleway%3Dcrossing) et [traffic_calming](https://wiki.openstreetmap.org/wiki/Key:traffic_calming). Les deux modificateurs Overpass `geom` et `center` sont demandés : la géométrie complète est prioritaire et le centre de bounding box ne sert que de repli.

## Progression SQL laissée aux étudiants

1. Mesurer et comprendre cette version 100 % OSM.
2. Constater les limites et dépendances des appels externes.
3. Brancher un SGBD différent par groupe et détecter les zones déjà disponibles.
4. Comparer appel externe, premier import et lecture en base pour la même action métier.
5. Transférer les clusters vers SQL, puis explorer vues, tables de clusters et triggers.
6. Restituer les résultats dans des conditions aussi homogènes que possible.

Les mesures bout en bout incluent navigateur, API, réseau et services externes. Elles ne permettent pas d'attribuer tout écart au seul SGBD.

## Crédits

Données et tuiles © contributeurs OpenStreetMap. Autocomplétion via le service de géocodage de la Géoplateforme GeoGouv, alimenté notamment par la Base Adresse Nationale. Données OSM via Overpass API. Carte interactive Leaflet. Le serveur standard de tuiles OSM doit rester réservé à un usage pédagogique raisonnable.

