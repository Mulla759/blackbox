import { SEEDED_DISASTER, SEEDED_SHELTERS } from "./mock-data";
import type {
  AccessibilityImpact,
  DisasterDashboardData,
  DisasterEvent,
  Hotspot,
  Shelter,
  ShelterWithPriority,
} from "./types";

const RATES = {
  disability_rate: 0.14,
  mobility_support_rate: 0.32,
  hearing_vision_support_rate: 0.16,
} as const;

function round(value: number): number {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function milesBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const q = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

export function listDisasters(): DisasterEvent[] {
  return [SEEDED_DISASTER];
}

export function getDisasterById(id: string): DisasterEvent | null {
  if (id === SEEDED_DISASTER.id) return SEEDED_DISASTER;
  return null;
}

export function estimateAccessibilityImpact(disaster: DisasterEvent): AccessibilityImpact {
  const disabled = round(disaster.affected_population * RATES.disability_rate);
  const mobility = round(disabled * RATES.mobility_support_rate);
  const hearingVision = round(disabled * RATES.hearing_vision_support_rate);
  const prioritized = prioritizeSheltersForDisaster(disaster, SEEDED_SHELTERS, mobility + hearingVision);
  const highPriorityShelters = prioritized.filter((s) => s.high_priority).length;

  return {
    disaster_id: disaster.id,
    estimated_people_with_disabilities_affected: disabled,
    estimated_mobility_support_needs: mobility,
    estimated_hearing_vision_support_needs: hearingVision,
    high_priority_shelters: highPriorityShelters,
  };
}

export function prioritizeSheltersForDisaster(
  disaster: DisasterEvent,
  shelters: Shelter[],
  estimatedAccessibilityNeeds: number
): ShelterWithPriority[] {
  return shelters.map((shelter) => {
    const distance = milesBetween(
      disaster.latitude,
      disaster.longitude,
      shelter.latitude,
      shelter.longitude
    );
    const occupancyRate = shelter.current_occupancy / Math.max(1, shelter.capacity);
    const nearDisasterZone = distance <= disaster.affected_radius_miles;
    const highOccupancy = occupancyRate >= 0.7;
    const accessibilityReady =
      shelter.wheelchair_accessible ||
      shelter.has_medical_support ||
      shelter.has_transportation_support ||
      shelter.has_interpreters;
    const largeNeed = estimatedAccessibilityNeeds >= 5000;
    const highPriority =
      nearDisasterZone || highOccupancy || (accessibilityReady && largeNeed);

    const reason = nearDisasterZone
      ? "near disaster zone"
      : highOccupancy
        ? "high occupancy"
        : accessibilityReady
          ? "supports accessibility needs"
          : "baseline coverage";

    return {
      ...shelter,
      distance_from_disaster_miles: Number(distance.toFixed(1)),
      high_priority: highPriority,
      priority_reason: reason,
    };
  });
}

function riskLevel(score: number): Hotspot["risk_level"] {
  if (score >= 80) return "EXTREME";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MODERATE";
  return "LOW";
}

export function generateHotspots(
  disaster: DisasterEvent,
  shelters: ShelterWithPriority[],
  accessibilityNeeds: number
): Hotspot[] {
  const now = new Date().toISOString();
  const templates = [
    {
      id: "h1",
      reason: "Downtown Janesville flood zone",
      latitude: 42.6853,
      longitude: -89.0214,
      checkIns: 420,
      popWeight: 0.34,
    },
    {
      id: "h2",
      reason: "Beloit river-adjacent neighborhood",
      latitude: 42.5076,
      longitude: -89.0372,
      checkIns: 360,
      popWeight: 0.26,
    },
    {
      id: "h3",
      reason: "Rural Rock County access-limited zone",
      latitude: 42.7341,
      longitude: -89.227,
      checkIns: 190,
      popWeight: 0.21,
    },
    {
      id: "h4",
      reason: "Senior housing cluster near floodplain",
      latitude: 42.7112,
      longitude: -89.0563,
      checkIns: 280,
      popWeight: 0.19,
    },
  ] as const;

  const shelterPressure = shelters.filter((s) => s.high_priority).length;

  return templates.map((t) => {
    const distance = milesBetween(disaster.latitude, disaster.longitude, t.latitude, t.longitude);
    const distanceScore = Math.max(0, 100 - distance * 3.2);
    const severityScore = disaster.severity === "SEVERE" ? 22 : 14;
    const checkInScore = Math.min(30, t.checkIns / 15);
    const shelterScore = Math.min(20, shelterPressure * 2.4);
    const accessibilityScore = Math.min(25, accessibilityNeeds / 650);
    const intensity = round(
      distanceScore * 0.25 +
        checkInScore * 0.2 +
        shelterScore * 0.2 +
        accessibilityScore * 0.2 +
        severityScore * 0.15
    );
    const estimatedPeople = round(disaster.affected_population * t.popWeight);
    const estimatedAccessNeeds = round(accessibilityNeeds * t.popWeight);
    return {
      id: t.id,
      disaster_id: disaster.id,
      latitude: t.latitude,
      longitude: t.longitude,
      intensity_score: intensity,
      risk_level: riskLevel(intensity),
      reason: t.reason,
      estimated_people_affected: estimatedPeople,
      estimated_accessibility_needs: estimatedAccessNeeds,
      created_at: now,
    };
  });
}

export function buildDashboardData(disasterId: string): DisasterDashboardData | null {
  const disaster = getDisasterById(disasterId);
  if (!disaster) return null;

  const accessibility = estimateAccessibilityImpact(disaster);
  const shelters = prioritizeSheltersForDisaster(
    disaster,
    SEEDED_SHELTERS,
    accessibility.estimated_mobility_support_needs +
      accessibility.estimated_hearing_vision_support_needs
  );
  const hotspots = generateHotspots(
    disaster,
    shelters,
    accessibility.estimated_mobility_support_needs +
      accessibility.estimated_hearing_vision_support_needs
  );

  return {
    disaster,
    accessibility_impact: accessibility,
    shelters,
    hotspots,
    map_center: { lat: disaster.latitude, lng: disaster.longitude },
  };
}
