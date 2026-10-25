# Bilan d'implémentation

## Fonctionnalités couvertes

- serveur Express et interface statique ;
- recherche en mode fixture sans réseau ;
- suggestions d'adresses locales ou Photon ;
- carré de 5 km tenant compte de la latitude ;
- dix catégories OSM ;
- normalisation node, way ouvert et way fermé ;
- déduplication et priorité traversée cyclable ;
- clusters à partir de cinq POI ;
- accès aux POI depuis la carte et la liste ;
- mesure navigateur du clic au rendu ;
- chargement, erreurs et recherches concurrentes.

## Commandes de vérification

    npm install
    npm test
    npm start

Résultat du 25 octobre 2026 : installation réussie sans vulnérabilité signalée, 20 tests sur 20 réussis, contrôles syntaxiques réussis et parcours HTTP fixture vérifié. La page, Leaflet local et l'API répondent en HTTP 200 ; le résultat contient 15 POI, les 10 catégories et un cluster de 6 POI.

La capture visuelle automatisée n'a pas été menée à son terme : l'outil de contrôle de Chrome n'a pas pu déterminer l'URL active avec assez de certitude et s'est arrêté par sécurité. Le parcours visuel manuel reste documenté dans le README.

Le mode réel dépend de Photon, Overpass et des tuiles OpenStreetMap. Leur disponibilité et la qualité des tags ne sont pas garanties.

## Limites connues

- approximation locale pour convertir 2,5 km en degrés ;
- centre d'un way fermé calculé par moyenne, pas par centroïde surfacique ;
- repli sur le centre Overpass si une géométrie manque ;
- relations OSM ignorées ;
- pas de fusion entre deux identités OSM distinctes ;
- tags couverts documentés mais non exhaustifs ;
- temps réel influencé par le réseau et les services publics.

