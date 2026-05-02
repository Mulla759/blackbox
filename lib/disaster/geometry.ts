import type { GeoJSONGeometry } from "./types";

type LonLat = [number, number];

function isFinitePair(lng: unknown, lat: unknown): boolean {
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    Number.isFinite(lng) &&
    Number.isFinite(lat)
  );
}

/**
 * Flattens GeoJSON geometry into lon/lat pairs for mapping or downstream geospatial use.
 */
export function extractCoordinates(
  geometry: GeoJSONGeometry | null | undefined
): LonLat[] | undefined {
  if (!geometry || typeof geometry !== "object") return undefined;

  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates;
    if (isFinitePair(lng, lat)) return [[lng, lat]];
    return undefined;
  }

  if (geometry.type === "Polygon") {
    const outer = geometry.coordinates?.[0];
    if (!Array.isArray(outer)) return undefined;
    const pts: LonLat[] = [];
    for (const pos of outer) {
      if (Array.isArray(pos) && isFinitePair(pos[0], pos[1])) pts.push([pos[0], pos[1]]);
    }
    return pts.length ? pts : undefined;
  }

  if (geometry.type === "MultiPolygon") {
    const pts: LonLat[] = [];
    for (const polygon of geometry.coordinates ?? []) {
      const outer = polygon?.[0];
      if (!Array.isArray(outer)) continue;
      for (const pos of outer) {
        if (Array.isArray(pos) && isFinitePair(pos[0], pos[1])) pts.push([pos[0], pos[1]]);
      }
    }
    return pts.length ? pts : undefined;
  }

  return undefined;
}
