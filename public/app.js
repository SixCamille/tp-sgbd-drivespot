// Références DOM partagées par les fonctions de rendu et les gestionnaires d'événements.
const elements = {
  form: document.querySelector('#search-form'),
  address: document.querySelector('#address'),
  button: document.querySelector('#search-button'),
  suggestions: document.querySelector('#suggestions'),
  error: document.querySelector('#error-message'),
  time: document.querySelector('#search-time'),
  source: document.querySelector('#data-source'),
  count: document.querySelector('#result-count'),
  categorySummary: document.querySelector('#category-summary'),
  clusterList: document.querySelector('#cluster-list'),
};

// Carte et couches indépendantes pour pouvoir remplacer POI, clusters et périmètre séparément.
const map = L.map('map', { preferCanvas: true }).setView([45.7578, 4.832], 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; contributeurs OpenStreetMap',
}).addTo(map);

const poiLayer = L.layerGroup().addTo(map);
const clusterLayer = L.layerGroup().addTo(map);
let boundsLayer;
let selectedAddress;
let suggestionController;
let searchController;
let suggestionTimer;
let requestSequence = 0;
// Ces index relient les boutons HTML aux objets Leaflet correspondants.
const markersById = new Map();
const clustersById = new Map();

// Les popups Leaflet utilisent des chaînes HTML : toute donnée distante y est échappée.
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function hideSuggestions() {
  elements.suggestions.hidden = true;
  elements.address.setAttribute('aria-expanded', 'false');
}

function showError(message) {
  elements.error.textContent = message;
  elements.error.hidden = false;
}

function clearError() {
  elements.error.hidden = true;
  elements.error.textContent = '';
}

function chooseSuggestion(suggestion) {
  selectedAddress = suggestion;
  elements.address.value = suggestion.label;
  hideSuggestions();
  elements.address.focus();
}

// --- Autocomplétion d'adresse ------------------------------------------------

function renderSuggestions(suggestions) {
  elements.suggestions.replaceChildren();
  if (suggestions.length === 0) return hideSuggestions();
  for (const suggestion of suggestions) {
    const item = document.createElement('li');
    item.setAttribute('role', 'option');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = suggestion.label;
    button.addEventListener('click', () => chooseSuggestion(suggestion));
    item.append(button);
    elements.suggestions.append(item);
  }
  elements.suggestions.hidden = false;
  elements.address.setAttribute('aria-expanded', 'true');
}

async function fetchSuggestions() {
  suggestionController?.abort();
  const query = elements.address.value.trim();
  if (query.length < 3) return hideSuggestions();
  suggestionController = new AbortController();
  try {
    const response = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`, {
      signal: suggestionController.signal,
    });
    if (!response.ok) throw new Error();
    const payload = await response.json();
    renderSuggestions(payload.suggestions);
  } catch (error) {
    if (error.name !== 'AbortError') hideSuggestions();
  }
}

elements.address.addEventListener('input', () => {
  selectedAddress = undefined;
  // Le délai évite un appel GeoGouv à chaque frappe.
  clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(fetchSuggestions, 400);
});

elements.address.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideSuggestions();
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.address-field')) hideSuggestions();
});

// --- Navigation et représentation cartographique ----------------------------

function markerColor(category) {
  const colors = {
    giratoire: '#ec171c',
    mini_giratoire: '#ff5349',
    feu_tricolore: '#c7090f',
    stop: '#99151a',
    cedez_le_passage: '#ee7030',
    passage_pieton: '#1f628d',
    dos_ane: '#9a7410',
    plateau_ralentisseur: '#d78e00',
    passage_niveau: '#0b1d2d',
    traversee_cyclable: '#2a7a62',
  };
  return colors[category] ?? '#0b1d2d';
}

function focusPoi(id) {
  const marker = markersById.get(id);
  if (!marker) return;
  map.setView(marker.getLatLng(), 18);
  marker.openPopup();
}

function focusCluster(id) {
  const cluster = clustersById.get(id);
  if (!cluster) return;
  map.setView(cluster.center, 18);
  cluster.layer.openPopup();
}

function summarizeClusterCategories(cluster) {
  const categories = new Map();
  for (const poi of cluster.pois) {
    const current = categories.get(poi.category) ?? {
      category: poi.category,
      label: poi.categoryLabel,
      count: 0,
    };
    current.count += 1;
    categories.set(poi.category, current);
  }
  return [...categories.values()].sort(
    (left, right) => right.count - left.count || left.label.localeCompare(right.label, 'fr'),
  );
}

function renderPois(pois) {
  poiLayer.clearLayers();
  markersById.clear();
  for (const poi of pois) {
    const marker = L.circleMarker([poi.latitude, poi.longitude], {
      radius: 6,
      weight: 2,
      color: '#ffffff',
      fillColor: markerColor(poi.category),
      fillOpacity: 0.95,
    }).bindPopup(
      `<strong>${escapeHtml(poi.name)}</strong><br>` +
        `${escapeHtml(poi.categoryLabel)}<br>` +
        `<small>OSM : ${escapeHtml(poi.osmType)}/${escapeHtml(poi.osmId)}</small>`,
    );
    marker.addTo(poiLayer);
    markersById.set(poi.id, marker);
  }
}

function renderClusters(clusters) {
  clusterLayer.clearLayers();
  clustersById.clear();
  for (const cluster of clusters) {
    // Le backend regroupe par arrondi à 3 décimales, soit une case de 0,001°.
    const cellBounds = [
      [cluster.gridLatitude - 0.0005, cluster.gridLongitude - 0.0005],
      [cluster.gridLatitude + 0.0005, cluster.gridLongitude + 0.0005],
    ];
    const list = cluster.pois
      .map(
        (poi) =>
          `<li><button type="button" data-poi-id="${escapeHtml(poi.id)}">` +
          `${escapeHtml(poi.categoryLabel)} · ${escapeHtml(poi.name)}</button></li>`,
      )
      .join('');
    const layer = L.rectangle(cellBounds, {
      color: '#e59b00',
      weight: 3,
      fillColor: '#ffc43d',
      fillOpacity: 0.24,
    })
      .bindPopup(
        `<div class="cluster-popup"><strong>${cluster.count} aménagements · ` +
          `${cluster.categoryCount} types dans ce cluster</strong>` +
          `<ul>${list}</ul></div>`,
      )
      .addTo(clusterLayer);
    clustersById.set(cluster.id, {
      center: [cluster.latitude, cluster.longitude],
      layer,
    });
  }
}

document.querySelector('#map').addEventListener('click', (event) => {
  const button = event.target.closest('[data-poi-id]');
  if (button) focusPoi(button.dataset.poiId);
});

// --- Synthèse latérale et périmètre ------------------------------------------

function renderSummary(pois, clusters) {
  const counts = new Map();
  for (const poi of pois) {
    const current = counts.get(poi.category) ?? {
      category: poi.category,
      label: poi.categoryLabel,
      count: 0,
    };
    current.count += 1;
    counts.set(poi.category, current);
  }
  elements.categorySummary.replaceChildren();
  if (counts.size === 0) {
    elements.categorySummary.innerHTML =
      '<p class="empty-state">Aucun aménagement retenu dans cette zone.</p>';
  } else {
    for (const category of [...counts.values()].sort((a, b) => b.count - a.count)) {
      const row = document.createElement('div');
      row.className = 'category-row';
      const label = document.createElement('span');
      label.className = 'category-name';
      const swatch = document.createElement('span');
      swatch.className = 'category-swatch';
      swatch.style.backgroundColor = markerColor(category.category);
      swatch.setAttribute('aria-hidden', 'true');
      label.append(swatch, category.label);
      const count = document.createElement('strong');
      count.textContent = category.count;
      row.append(label, count);
      elements.categorySummary.append(row);
    }
  }

  elements.clusterList.replaceChildren();
  const title = document.createElement('h3');
  title.textContent = 'Zones clusters';
  elements.clusterList.append(title);
  if (clusters.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Aucun cluster ne réunit trois types de POI dans cette zone.';
    elements.clusterList.append(empty);
  }
  for (const [index, cluster] of clusters.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    const heading = document.createElement('span');
    heading.textContent =
      `Cluster ${index + 1} · ${cluster.categoryCount} types · ${cluster.count} aménagements`;
    const details = document.createElement('small');
    details.className = 'cluster-categories';
    for (const category of summarizeClusterCategories(cluster)) {
      const item = document.createElement('span');
      item.className = 'cluster-category';
      const swatch = document.createElement('span');
      swatch.className = 'category-swatch';
      swatch.style.backgroundColor = markerColor(category.category);
      swatch.setAttribute('aria-hidden', 'true');
      item.append(swatch, `${category.label} × ${category.count}`);
      details.append(item);
    }
    button.append(heading, details);
    button.addEventListener('click', () => focusCluster(cluster.id));
    elements.clusterList.append(button);
  }
  elements.count.textContent = `${pois.length} aménagement${pois.length > 1 ? 's' : ''}`;
}

function renderBounds(bounds) {
  boundsLayer?.remove();
  const leafletBounds = [
    [bounds.south, bounds.west],
    [bounds.north, bounds.east],
  ];
  boundsLayer = L.rectangle(leafletBounds, {
    color: '#1f628d',
    weight: 2,
    fillOpacity: 0.03,
  }).addTo(map);
  map.fitBounds(leafletBounds, { padding: [24, 24] });
}

function afterBrowserRender() {
  // Deux frames laissent au navigateur le temps d'appliquer les mises à jour Leaflet et DOM.
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

// --- Parcours principal de recherche ----------------------------------------

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideSuggestions();
  clearError();
  searchController?.abort();
  searchController = new AbortController();
  // Le numéro de séquence empêche une ancienne réponse d'écraser la plus récente.
  const thisRequest = ++requestSequence;
  const startedAt = performance.now();
  elements.button.disabled = true;
  elements.button.textContent = 'Analyse…';
  elements.time.textContent = 'En cours…';

  const body = selectedAddress
    ? { ...selectedAddress, address: selectedAddress.label }
    : { address: elements.address.value.trim() };

  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: searchController.signal,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'La recherche a échoué.');
    if (thisRequest !== requestSequence) return;

    renderPois(payload.pois);
    renderClusters(payload.clusters);
    renderBounds(payload.bounds);
    renderSummary(payload.pois, payload.clusters);
    elements.source.textContent = payload.source;
    // Le chronomètre inclut volontairement le rendu, pas seulement l'appel HTTP.
    await afterBrowserRender();
    elements.time.textContent = `${Math.round(performance.now() - startedAt)} ms`;
  } catch (error) {
    if (error.name === 'AbortError') return;
    elements.time.textContent = 'Échec';
    showError(error.message);
  } finally {
    if (thisRequest === requestSequence) {
      elements.button.disabled = false;
      elements.button.textContent = 'Analyser la zone';
    }
  }
});

elements.address.value = 'Place Bellecour, 69002 Lyon, France';

