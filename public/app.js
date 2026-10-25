const elements = {
  form: document.querySelector('#search-form'),
  address: document.querySelector('#address'),
  button: document.querySelector('#search-button'),
  suggestions: document.querySelector('#suggestions'),
  error: document.querySelector('#error-message'),
  time: document.querySelector('#search-time'),
  source: document.querySelector('#data-source'),
  count: document.querySelector('#result-count'),
  clusterCount: document.querySelector('#cluster-count'),
  categorySummary: document.querySelector('#category-summary'),
  poiList: document.querySelector('#poi-list'),
};

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
const markersById = new Map();

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
  clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(fetchSuggestions, 400);
});

elements.address.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideSuggestions();
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.address-field')) hideSuggestions();
});

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
  for (const cluster of clusters) {
    const cellBounds = [
      [cluster.gridLatitude - 0.0005, cluster.gridLongitude - 0.0005],
      [cluster.gridLatitude + 0.0005, cluster.gridLongitude + 0.0005],
    ];
    const list = cluster.pois
      .map(
        (poi) =>
          `<li><button type="button" data-poi-id="${escapeHtml(poi.id)}">` +
          `${escapeHtml(poi.categoryLabel)} — ${escapeHtml(poi.name)}</button></li>`,
      )
      .join('');
    L.rectangle(cellBounds, {
      color: '#e59b00',
      weight: 3,
      fillColor: '#ffc43d',
      fillOpacity: 0.24,
    })
      .bindPopup(
        `<div class="cluster-popup"><strong>${cluster.count} aménagements dans cette zone</strong>` +
          `<ul>${list}</ul></div>`,
      )
      .addTo(clusterLayer);
  }
}

document.querySelector('#map').addEventListener('click', (event) => {
  const button = event.target.closest('[data-poi-id]');
  if (button) focusPoi(button.dataset.poiId);
});

function renderSummary(pois, clusters) {
  const counts = new Map();
  for (const poi of pois) {
    const current = counts.get(poi.category) ?? { label: poi.categoryLabel, count: 0 };
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
      row.innerHTML = `<span>${escapeHtml(category.label)}</span><strong>${category.count}</strong>`;
      elements.categorySummary.append(row);
    }
  }

  elements.poiList.replaceChildren();
  const title = document.createElement('h3');
  title.textContent = 'Tous les aménagements';
  elements.poiList.append(title);
  for (const poi of pois) {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML =
      `<span>${escapeHtml(poi.name)}</span>` +
      `<small>${escapeHtml(poi.categoryLabel)} · ${escapeHtml(poi.id)}</small>`;
    button.addEventListener('click', () => focusPoi(poi.id));
    elements.poiList.append(button);
  }

  elements.clusterCount.textContent =
    `${clusters.length} zone${clusters.length > 1 ? 's' : ''} ` +
    `dense${clusters.length > 1 ? 's' : ''}`;
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
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideSuggestions();
  clearError();
  searchController?.abort();
  searchController = new AbortController();
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

async function initialize() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    elements.address.value = 'Place Bellecour, 69002 Lyon, France';
    if (config.dataMode === 'fixture') {
      selectedAddress = {
        label: elements.address.value,
        latitude: config.defaultCenter.latitude,
        longitude: config.defaultCenter.longitude,
      };
    }
  } catch {
    elements.address.value = '';
  }
}

initialize();

