import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function translatePoint(point, latitudeDelta, longitudeDelta) {
  return {
    ...point,
    lat: point.lat + latitudeDelta,
    lon: point.lon + longitudeDelta,
  };
}

export function createFixtureProvider(config) {
  let fixturePromise;
  const loadFixture = () => {
    fixturePromise ??= readFile(resolve(config.fixtureDirectory, 'overpass.json'), 'utf8').then(
      JSON.parse,
    );
    return fixturePromise;
  };

  return {
    async fetchPois({ center }) {
      const fixture = await loadFixture();
      const latitudeDelta = center.latitude - fixture.meta.center.latitude;
      const longitudeDelta = center.longitude - fixture.meta.center.longitude;
      const elements = fixture.elements.map((element) => ({
        ...element,
        ...(Number.isFinite(element.lat)
          ? { lat: element.lat + latitudeDelta, lon: element.lon + longitudeDelta }
          : {}),
        ...(element.center
          ? { center: translatePoint(element.center, latitudeDelta, longitudeDelta) }
          : {}),
        ...(element.geometry
          ? {
              geometry: element.geometry.map((point) =>
                translatePoint(point, latitudeDelta, longitudeDelta),
              ),
            }
          : {}),
      }));
      return { elements };
    },
  };
}

