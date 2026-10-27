# Bilan d'implémentation

## Fonctionnalités couvertes

- serveur Express et interface statique ;
- recherche OSM via Overpass ;
- suggestions d'adresses via GeoGouv ;
- carré de 3 km tenant compte de la latitude ;
- dix catégories OSM ;
- normalisation des nodes et représentation des ways par leur centre Overpass ;
- déduplication et priorité traversée cyclable ;
- clusters à partir de trois catégories de POI distinctes ;
- accès aux POI depuis la carte et la liste ;
- mesure navigateur du clic au rendu ;
- chargement, erreurs et recherches concurrentes.

## Commandes de vérification

    npm install
    npm test
    npm start

Résultat du 27 octobre 2026 : 29 tests sur 29 réussis. Le parcours HTTP est couvert sans réseau par des doubles de GeoGouv et Overpass. Il vérifie 15 POI, les 10 catégories et un cluster réunissant 6 POI de 6 catégories. Les contrats des services externes restent couverts par des tests unitaires sans appel réseau, notamment la configuration NextGIS, la propagation de son indisponibilité et l'annulation d'une requête. Le contrat du fournisseur est également vérifié avec des POI déjà normalisés afin de préserver son remplacement futur.

La capture visuelle automatisée n'a pas été menée à son terme : l'outil de contrôle de Chrome n'a pas pu déterminer l'URL active avec assez de certitude et s'est arrêté par sécurité. Le parcours visuel manuel reste documenté dans le README.

L'application dépend de GeoGouv, Overpass et des tuiles OpenStreetMap. Leur disponibilité et la qualité des tags ne sont pas garanties.

## Limites connues

- approximation locale pour convertir 1,5 km en degrés ;
- ways représentés par le centre de leur bounding box calculé par Overpass ;
- géométrie détaillée des ways volontairement ignorée ;
- relations OSM ignorées ;
- pas de fusion entre deux identités OSM distinctes ;
- tags couverts documentés mais non exhaustifs ;
- temps réel influencé par le réseau et les services publics.

