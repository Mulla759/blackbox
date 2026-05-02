import type { SafetyResponseType } from "./types";

/**
 * Maps SMS digits (and simple synonyms) to structured safety responses.
 * — "1" → safe
 * — "2" → needs_help
 * — "3" → emergency
 * — anything else → unknown
 */
export function parseSafetyReply(raw: string): SafetyResponseType {
  const t = raw.trim().toLowerCase();
  if (t === "1" || t === "safe" || t === "ok") return "safe";
  if (t === "2" || t === "help") return "needs_help";
  if (t === "3" || t === "911" || t === "emergency") return "emergency";
  return "unknown";
}
