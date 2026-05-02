import { extractCoordinates } from "./geometry";
import type { DisasterAlert, GeoJSONGeometry, NwsAlertFeature } from "./types";

function asGeometry(raw: unknown): GeoJSONGeometry | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as { type?: string };
  if (g.type === "Point" || g.type === "Polygon" || g.type === "MultiPolygon") {
    return raw as GeoJSONGeometry;
  }
  return null;
}

function descriptionFrom(props: {
  headline?: string | null;
  description?: string | null;
}): string {
  const headline = props.headline?.trim();
  const description = props.description?.trim();
  if (headline) return headline;
  if (description) return description;
  return "";
}

/**
 * Maps one NWS GeoJSON feature to our canonical disaster alert shape.
 */
export function mapNwsFeatureToAlert(feature: NwsAlertFeature): DisasterAlert | null {
  const props = feature.properties;
  if (!props || typeof props !== "object") return null;

  const type = typeof props.event === "string" ? props.event.trim() : "";
  const location = typeof props.areaDesc === "string" ? props.areaDesc.trim() : "";
  const severity = typeof props.severity === "string" ? props.severity.trim() : "";
  const urgency = typeof props.urgency === "string" ? props.urgency.trim() : "";

  if (!type && !location && !descriptionFrom(props)) {
    return null;
  }

  const geometry = asGeometry(feature.geometry);
  const coords = geometry ? extractCoordinates(geometry) : undefined;

  const sourceId =
    typeof feature.id === "string" && feature.id.trim().length > 0
      ? feature.id.trim()
      : undefined;

  const alert: DisasterAlert = {
    type: type || "Unknown event",
    location: location || "Unknown area",
    severity: severity || "Unknown",
    urgency: urgency || "Unknown",
    description: descriptionFrom(props),
  };

  if (coords?.length) alert.coordinates = coords;
  if (sourceId) alert.sourceId = sourceId;

  return alert;
}
