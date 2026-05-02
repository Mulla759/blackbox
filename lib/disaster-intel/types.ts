export type DisasterEvent = {
  id: string;
  event_type: string;
  title: string;
  severity: string;
  urgency: string;
  location_name: string;
  county: string;
  state: string;
  latitude: number;
  longitude: number;
  affected_radius_miles: number;
  affected_population: number;
  description: string;
  source: string;
  issued_at: string;
  expires_at: string;
  created_at: string;
};

export type Shelter = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_occupancy: number;
  wheelchair_accessible: boolean;
  has_medical_support: boolean;
  has_power_backup: boolean;
  has_transportation_support: boolean;
  has_interpreters: boolean;
  created_at: string;
};

export type HotspotRiskLevel = "LOW" | "MODERATE" | "HIGH" | "EXTREME";

export type Hotspot = {
  id: string;
  disaster_id: string;
  latitude: number;
  longitude: number;
  intensity_score: number;
  risk_level: HotspotRiskLevel;
  reason: string;
  estimated_people_affected: number;
  estimated_accessibility_needs: number;
  created_at: string;
};

export type AccessibilityImpact = {
  disaster_id: string;
  estimated_people_with_disabilities_affected: number;
  estimated_mobility_support_needs: number;
  estimated_hearing_vision_support_needs: number;
  high_priority_shelters: number;
};

export type ShelterWithPriority = Shelter & {
  distance_from_disaster_miles: number;
  high_priority: boolean;
  priority_reason: string;
};

export type DisasterDashboardData = {
  disaster: DisasterEvent;
  accessibility_impact: AccessibilityImpact;
  shelters: ShelterWithPriority[];
  hotspots: Hotspot[];
  map_center: { lat: number; lng: number };
};
