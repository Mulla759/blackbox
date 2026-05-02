import { normalizePhoneNumber } from "@/lib/communications/phone";

/**
 * Comma- or space-separated E.164 numbers in profile order (demo 1 … demo 4).
 * Example: BLACKBOX_DEMO_PRESENTERS=+15551230101,+15551230102,+15551230103,+15551230104
 */
export function presenterPhonesFromEnv(): string[] {
  const raw = process.env["BLACKBOX_DEMO_PRESENTERS"]?.trim();
  if (!raw) return [];
  const parts = raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  return parts.map((p) => normalizePhoneNumber(p));
}

export function seededPhoneForSlot(
  slotIndexZeroBased: number,
  fallback555: string,
  perProfileEnvKey: string
): string {
  const presenters = presenterPhonesFromEnv();
  if (presenters[slotIndexZeroBased]) return presenters[slotIndexZeroBased];
  const single = process.env[perProfileEnvKey]?.trim();
  if (single) return normalizePhoneNumber(single);
  return normalizePhoneNumber(fallback555);
}
