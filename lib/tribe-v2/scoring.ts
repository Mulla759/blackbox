import type { DisasterDashboardData } from "@/lib/disaster-intel/types";
import type { PersonProfile } from "@/lib/registry/types";
import type { TribeScore, TribeTokenState } from "./types";

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scorePersonaRisk(params: {
  tokenState: TribeTokenState;
  profile: PersonProfile;
  disasterContext?: DisasterDashboardData | null;
}): TribeScore {
  const { tokenState, profile, disasterContext } = params;
  const reasons: string[] = [];
  let score = 10;

  if (typeof profile.age === "number" && profile.age >= 75) {
    score += 12;
    reasons.push("older adult profile");
  }
  const disability = (profile.disability ?? "").toLowerCase();
  if (disability.includes("oxygen") || disability.includes("breathing") || disability.includes("ventilator")) {
    score += 22;
    reasons.push("respiratory equipment dependency");
  }
  if (disability.includes("dialysis") || disability.includes("insulin") || disability.includes("medication")) {
    score += 18;
    reasons.push("critical medication or dialysis dependency");
  }
  if (disability.includes("wheelchair") || disability.includes("elevator")) {
    score += 14;
    reasons.push("mobility or evacuation dependency");
  }
  if (disability.includes("deaf") || disability.includes("asl")) {
    score += 8;
    reasons.push("voice-only alerts may fail");
  }

  if (tokenState.explicit_emergency) {
    score += 40;
    reasons.push("explicit emergency language");
  }
  if (tokenState.help_requested) {
    score += 24;
    reasons.push("help requested");
  }
  if (tokenState.no_response) {
    score += 18;
    reasons.push("no response or silence");
  }
  if (tokenState.cadence === "distressed") {
    score += 14;
    reasons.push("distressed cadence");
  }
  if (tokenState.infrastructure_terms.length > 0) {
    score += Math.min(24, tokenState.infrastructure_terms.length * 8);
    reasons.push(`infrastructure risk: ${tokenState.infrastructure_terms.join(", ")}`);
  }
  if (tokenState.medical_terms.length > 0) {
    score += Math.min(24, tokenState.medical_terms.length * 8);
    reasons.push(`medical risk: ${tokenState.medical_terms.join(", ")}`);
  }
  if (tokenState.all_clear && !tokenState.help_requested && !tokenState.explicit_emergency) {
    score -= 18;
    reasons.push("person reports safe");
  }

  const disaster = disasterContext?.disaster;
  if (disaster?.severity === "SEVERE") {
    score += 10;
    reasons.push("active severe disaster context");
  }
  if (disaster?.urgency === "IMMEDIATE" || disaster?.urgency === "EXPECTED") {
    score += 6;
    reasons.push(`disaster urgency: ${disaster.urgency.toLowerCase()}`);
  }

  const finalScore = clamp(score);
  const hardThreshold =
    tokenState.explicit_emergency ||
    (tokenState.infrastructure_terms.includes("oxygen") && disability.includes("oxygen")) ||
    (tokenState.infrastructure_terms.includes("power") && disability.includes("oxygen")) ||
    finalScore >= 78;

  return {
    score: finalScore,
    band:
      finalScore >= 78 || hardThreshold
        ? "CRITICAL"
        : finalScore >= 58
          ? "ELEVATED"
          : finalScore >= 35
            ? "WATCH"
            : "LOW",
    reasons: reasons.length > 0 ? reasons : ["no elevated risk tokens"],
    hard_threshold: hardThreshold,
  };
}

