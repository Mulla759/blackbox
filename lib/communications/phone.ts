/** Best-effort E.164 for US numbers; passes through values that already include '+'. */
export function normalizePhoneNumber(input: string): string {
  const d = input.replace(/\D/g, "");
  if (input.trim().startsWith("+")) {
    return `+${d}`;
  }
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (d.length > 0) return `+${d}`;
  return input.trim();
}

/** Strict US E.164 checker for smoke-test flows (+1 followed by 10 digits). */
export function isUsE164(phone: string): boolean {
  return /^\+1\d{10}$/.test(phone.trim());
}

/** NANP area code for coarse regional analytics (US-centric). */
export function extractAreaCode(e164: string): string | null {
  const d = e164.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return d.slice(1, 4);
  if (d.length === 10) return d.slice(0, 3);
  return null;
}
