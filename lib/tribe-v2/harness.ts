import { buildDashboardData } from "@/lib/disaster-intel/service";
import type { DisasterDashboardData, Hotspot } from "@/lib/disaster-intel/types";
import { normalizePhoneNumber } from "@/lib/communications/phone";
import { getProfileById, getProfileByPhone } from "@/lib/registry/store";
import type { PersonProfile } from "@/lib/registry/types";
import { scorePersonaRisk } from "./scoring";
import { appendEscalationPacket, upsertDispatcherCase } from "./store";
import { tokenizeSignal } from "./tokenizer";
import type {
  DispatcherCase,
  EscalationPacket,
  LiveDecision,
  RawSignal,
  SignalChannel,
  TribeCritique,
  TribeScore,
  TribeTokenState,
} from "./types";

function fallbackProfile(idOrPhone: string): PersonProfile {
  const phone = idOrPhone.startsWith("+") ? normalizePhoneNumber(idOrPhone) : "+15550000000";
  return {
    id: idOrPhone || "unknown-profile",
    phone_number: phone,
    label: "Unknown caller",
    location: "Unknown",
    preferred_language: "English",
  };
}

function resolveProfile(params: { household_id?: string; phone_number?: string }): PersonProfile {
  if (params.household_id) {
    const byId = getProfileById(params.household_id);
    if (byId) return byId;
  }
  if (params.phone_number) {
    const byPhone = getProfileByPhone(params.phone_number);
    if (byPhone) return byPhone;
  }
  return fallbackProfile(params.household_id ?? params.phone_number ?? "unknown-profile");
}

function nearestHotspot(
  profile: PersonProfile,
  disasterContext?: DisasterDashboardData | null
): Hotspot | undefined {
  if (!disasterContext || typeof profile.latitude !== "number" || typeof profile.longitude !== "number") {
    return undefined;
  }
  return [...disasterContext.hotspots].sort((a, b) => {
    const da = Math.hypot(a.latitude - profile.latitude!, a.longitude - profile.longitude!);
    const db = Math.hypot(b.latitude - profile.latitude!, b.longitude - profile.longitude!);
    return da - db;
  })[0];
}

function preferredLanguage(profile: PersonProfile): string {
  return profile.preferred_language?.trim() || "English";
}

function openingRegister(profile: PersonProfile): string {
  const cadence = profile.communication_preferences?.cadence;
  if (cadence === "slow") return "Use a slow, clear cadence and one question at a time.";
  if (cadence === "urgent") return "Use direct, short questions and confirm critical needs quickly.";
  return "Use plain, calm language.";
}

function nextLiveUtterance(profile: PersonProfile, tokenState: TribeTokenState, score: TribeScore): string {
  const language = preferredLanguage(profile).toLowerCase();
  const disability = (profile.disability ?? "").toLowerCase();

  if (score.hard_threshold || score.band === "CRITICAL") {
    if (language.includes("spanish")) {
      return "Entiendo. Voy a avisar al equipo de despacho ahora. Quedese conmigo. ?Cual es el peligro mas urgente?";
    }
    return "Okay. I am alerting the dispatcher now. Stay on the line with me. What is the most urgent danger right now?";
  }

  if (disability.includes("oxygen") && !tokenState.infrastructure_terms.includes("oxygen")) {
    return "Do you still have working power for your oxygen equipment, and roughly how much oxygen do you have left?";
  }

  if (disability.includes("deaf") || disability.includes("asl")) {
    return "I can continue by text or send an ASL video link. Are you safe where you are right now?";
  }

  if (language.includes("spanish")) {
    return "Gracias. ?Esta seguro ahora, o necesita ayuda para evacuar, medicina, electricidad o transporte?";
  }

  if (tokenState.no_response) {
    return "I did not hear a response. If you need urgent help, say emergency or press 3. Are you safe right now?";
  }

  return "Thank you. Are you safe right now, or do you need help with power, medicine, evacuation, or transportation?";
}

function recommendedAction(score: TribeScore, profile: PersonProfile, tokenState: TribeTokenState): string {
  const disability = (profile.disability ?? "").toLowerCase();
  if (score.band === "CRITICAL" && disability.includes("oxygen")) return "Dispatch portable oxygen or power support and call emergency contact.";
  if (score.band === "CRITICAL" && disability.includes("dialysis")) return "Escalate medical continuity check and confirm medication refrigeration.";
  if (score.band === "CRITICAL") return "Open dispatcher case, keep caller engaged, and contact emergency support.";
  if (score.band === "ELEVATED" && tokenState.no_response) return "Retry contact by alternate modality and notify emergency contact.";
  if (score.band === "ELEVATED") return "Queue dispatcher review and send targeted follow-up.";
  if (score.band === "WATCH") return "Continue monitoring and schedule follow-up.";
  return "No immediate escalation; record the check-in.";
}

function buildCritiques(profile: PersonProfile, tokenState: TribeTokenState, score: TribeScore): TribeCritique[] {
  const disability = (profile.disability ?? "").toLowerCase();
  return [
    {
      name: "medical_fragility",
      finding:
        tokenState.medical_terms.length > 0 || disability.includes("oxygen") || disability.includes("dialysis")
          ? "Medical dependency is relevant to the current signal."
          : "No specific medical fragility token found.",
      severity_delta: tokenState.medical_terms.length > 0 ? 8 : 0,
    },
    {
      name: "dignity",
      finding: "Use direct, non-alarming language and ask only one question per turn.",
      severity_delta: 0,
    },
    {
      name: "modality",
      finding:
        disability.includes("deaf") || profile.communication_preferences?.modality === "asl_video"
          ? "Voice-only communication is not sufficient; prefer SMS or ASL link."
          : `Preferred language is ${preferredLanguage(profile)}. ${openingRegister(profile)}`,
      severity_delta: disability.includes("deaf") ? 5 : 0,
    },
    {
      name: "continuity",
      finding:
        score.band === "CRITICAL"
          ? "Dispatcher needs a live case with emergency contact and location visible."
          : "Record for follow-up cadence and compare against future signals.",
      severity_delta: score.band === "CRITICAL" ? 6 : 0,
    },
  ];
}

function brief(profile: PersonProfile, score: TribeScore, tokenState: TribeTokenState, channel: SignalChannel): string {
  const name = profile.label ?? profile.phone_number;
  const reason = score.reasons.slice(0, 3).join("; ");
  return `${name} is ${score.band.toLowerCase()} risk from ${channel}. ${reason}. Location: ${profile.location}.`;
}

function caseId(profile: PersonProfile, callId?: string): string {
  return `tribe-${profile.id}-${callId ?? "active"}`;
}

function upsertCaseFromParts(params: {
  profile: PersonProfile;
  score: TribeScore;
  transcript: string;
  channel: SignalChannel;
  status: DispatcherCase["status"];
  disaster_id?: string;
  disaster_name?: string;
  packet_id?: string;
  call_id?: string;
  tokenState: TribeTokenState;
}): DispatcherCase {
  const { profile, score, transcript, channel, status, disaster_id, disaster_name, packet_id, call_id, tokenState } = params;
  return upsertDispatcherCase({
    id: caseId(profile, call_id),
    household_id: profile.id,
    profile,
    status,
    severity: score.band,
    score: score.score,
    location: {
      label: profile.location,
      latitude: profile.latitude,
      longitude: profile.longitude,
    },
    disaster_id,
    disaster_name,
    channel,
    brief: brief(profile, score, tokenState, channel),
    latest_transcript: transcript,
    recommended_action: recommendedAction(score, profile, tokenState),
    updated_at: new Date().toISOString(),
    packet_id,
  });
}

export async function evaluateLive(params: {
  household_id: string;
  full_transcript: string;
  latest_turn: string;
  call_id?: string;
  disaster_id?: string;
}): Promise<LiveDecision> {
  const profile = resolveProfile({ household_id: params.household_id });
  const disasterContext = params.disaster_id ? buildDashboardData(params.disaster_id) : null;
  const tokenState = tokenizeSignal(`${params.full_transcript}\n${params.latest_turn}`);
  const score = scorePersonaRisk({ tokenState, profile, disasterContext });
  const escalateNow = score.hard_threshold || score.band === "CRITICAL";
  const dispatcherCase = escalateNow
    ? upsertCaseFromParts({
        profile,
        score,
        transcript: params.full_transcript || params.latest_turn,
        channel: "voice",
        status: "in_progress",
        disaster_id: disasterContext?.disaster.id ?? params.disaster_id,
        disaster_name: disasterContext?.disaster.title,
        call_id: params.call_id,
        tokenState,
      })
    : undefined;

  return {
    household_id: profile.id,
    call_id: params.call_id,
    mode: "live",
    say: nextLiveUtterance(profile, tokenState, score),
    continue: !tokenState.all_clear || escalateNow,
    end_call: tokenState.all_clear && !escalateNow,
    escalate_now: escalateNow,
    escalate_reason: escalateNow ? score.reasons[0] ?? "critical threshold crossed" : null,
    score,
    token_state: tokenState,
    dispatcher_case_id: dispatcherCase?.id,
  };
}

export async function evaluateSignal(rawSignal: RawSignal): Promise<EscalationPacket> {
  const profile = resolveProfile({
    household_id: rawSignal.household_id,
    phone_number: rawSignal.phone_number,
  });
  const disasterContext = rawSignal.disaster_id ? buildDashboardData(rawSignal.disaster_id) : null;
  const tokenState = tokenizeSignal(rawSignal.transcript);
  const score = scorePersonaRisk({ tokenState, profile, disasterContext });
  const critiques = buildCritiques(profile, tokenState, score);
  const now = new Date().toISOString();
  const hotspot = nearestHotspot(profile, disasterContext);
  const packet: EscalationPacket = {
    id: `packet-${crypto.randomUUID()}`,
    household_id: profile.id,
    mode: "post_signal",
    status: "final",
    created_at: now,
    updated_at: now,
    profile,
    channel: rawSignal.channel,
    disaster: disasterContext?.disaster
      ? {
          id: disasterContext.disaster.id,
          title: disasterContext.disaster.title,
          severity: disasterContext.disaster.severity,
          urgency: disasterContext.disaster.urgency,
          location_name: disasterContext.disaster.location_name,
        }
      : undefined,
    nearest_hotspot: hotspot
      ? {
          id: hotspot.id,
          risk_level: hotspot.risk_level,
          reason: hotspot.reason,
          intensity_score: hotspot.intensity_score,
          latitude: hotspot.latitude,
          longitude: hotspot.longitude,
        }
      : undefined,
    token_state: tokenState,
    score,
    critiques,
    brief: brief(profile, score, tokenState, rawSignal.channel),
    recommended_action: recommendedAction(score, profile, tokenState),
    escalation_required: score.band === "CRITICAL" || score.band === "ELEVATED" || score.hard_threshold,
    transcript: rawSignal.transcript,
    audio_url: rawSignal.audio_url,
  };

  appendEscalationPacket(packet);
  upsertCaseFromParts({
    profile,
    score,
    transcript: rawSignal.transcript,
    channel: rawSignal.channel,
    status: "final",
    disaster_id: disasterContext?.disaster.id ?? rawSignal.disaster_id,
    disaster_name: disasterContext?.disaster.title ?? rawSignal.disaster_name,
    packet_id: packet.id,
    call_id: rawSignal.call_id,
    tokenState,
  });

  return packet;
}

