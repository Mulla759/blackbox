import type { PersonProfile } from "@/lib/registry/types";
import type { DisasterEvent, Hotspot } from "@/lib/disaster-intel/types";

export type TribeMode = "live" | "post_signal";

export type SignalChannel = "voice" | "sms" | "asl_video" | "unknown";

export type TribeTokenState = {
  distress_terms: string[];
  infrastructure_terms: string[];
  medical_terms: string[];
  location_terms: string[];
  communication_terms: string[];
  explicit_emergency: boolean;
  no_response: boolean;
  help_requested: boolean;
  all_clear: boolean;
  cadence: "unknown" | "calm" | "distressed" | "fragmented" | "silent";
};

export type TribeRiskBand = "LOW" | "WATCH" | "ELEVATED" | "CRITICAL";

export type TribeScore = {
  score: number;
  band: TribeRiskBand;
  reasons: string[];
  hard_threshold: boolean;
};

export type LiveDecision = {
  household_id: string;
  call_id?: string;
  mode: "live";
  say: string;
  continue: boolean;
  end_call: boolean;
  escalate_now: boolean;
  escalate_reason: string | null;
  score: TribeScore;
  token_state: TribeTokenState;
  dispatcher_case_id?: string;
};

export type RawSignal = {
  household_id?: string;
  phone_number?: string;
  channel: SignalChannel;
  transcript: string;
  latest_turn?: string;
  call_id?: string;
  disaster_id?: string;
  disaster_name?: string;
  audio_url?: string;
};

export type TribeCritique = {
  name: "medical_fragility" | "dignity" | "modality" | "continuity";
  finding: string;
  severity_delta: number;
};

export type EscalationPacket = {
  id: string;
  household_id: string;
  mode: "post_signal";
  status: "preliminary" | "final";
  created_at: string;
  updated_at: string;
  profile: PersonProfile;
  channel: SignalChannel;
  disaster?: Pick<DisasterEvent, "id" | "title" | "severity" | "urgency" | "location_name">;
  nearest_hotspot?: Pick<Hotspot, "id" | "risk_level" | "reason" | "intensity_score" | "latitude" | "longitude">;
  token_state: TribeTokenState;
  score: TribeScore;
  critiques: TribeCritique[];
  brief: string;
  recommended_action: string;
  escalation_required: boolean;
  transcript: string;
  audio_url?: string;
};

export type DispatcherCase = {
  id: string;
  household_id: string;
  profile: PersonProfile;
  status: "in_progress" | "final";
  severity: TribeRiskBand;
  score: number;
  location: {
    label: string;
    latitude?: number;
    longitude?: number;
  };
  disaster_id?: string;
  disaster_name?: string;
  channel: SignalChannel;
  brief: string;
  latest_transcript: string;
  recommended_action: string;
  updated_at: string;
  packet_id?: string;
};

