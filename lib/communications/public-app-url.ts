/**
 * Base URL Twilio must use for voice webhooks. Do not derive this from Request.url — in dev or
 * behind proxies, origin is often wrong (e.g. localhost), so callbacks in TwiML would fail.
 */
export function getPublicAppBaseUrl(): string {
  const raw = process.env["PUBLIC_APP_URL"]?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://blackbox-70gc.onrender.com";
}
