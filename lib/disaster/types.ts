/** Normalized alert returned by the disaster detection layer. */
export type DisasterAlert = {
  /** Stable id from NWS GeoJSON feature when present (URI or URN). */
  sourceId?: string;
  type: string;
  location: string;
  severity: string;
  urgency: string;
  description: string;
  /** [longitude, latitude] pairs when geometry is present on the feature. */
  coordinates?: [number, number][];
};

/** Raw GeoJSON-ish feature from api.weather.gov (subset). */
export type NwsAlertFeature = {
  id?: string;
  type?: string;
  geometry?: GeoJSONGeometry | null;
  properties?: NwsAlertProperties | null;
};

export type NwsAlertProperties = {
  event?: string;
  areaDesc?: string;
  severity?: string;
  urgency?: string;
  headline?: string | null;
  description?: string | null;
};

export type GeoJSONGeometry =
  | { type: "Point"; coordinates: [number, number] | number[] }
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type ActiveAlertsResult =
  | { ok: true; alerts: DisasterAlert[] }
  | { ok: false; error: string; statusCode: number };
