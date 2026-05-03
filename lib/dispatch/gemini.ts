import { recentLogs } from "./repository";

export async function summarizeRecentCallLogs(): Promise<string> {
  const key = process.env["GEMINI_API_KEY"]?.trim();
  const logs = await recentLogs(40);
  const callLogs = logs.filter((l) => l.channel === "TWILIO_VOICE" || l.channel === "VAPI_VOICE");
  if (!key || callLogs.length === 0) return "No recent call logs to summarize.";

  const prompt =
    "Summarize these emergency call logs for dispatchers. Keep it practical and concise. " +
    "Do not reveal private personal data. Focus on needs, urgency, and recommended next action.\n\n" +
    JSON.stringify(callLogs);
  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 350 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return "Recent calls include mixed statuses. Review urgent escalations first.";
    const payload = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return (
      payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ??
      "Recent calls include mixed statuses. Review urgent escalations first."
    );
  } catch {
    return "Recent calls include mixed statuses. Review urgent escalations first.";
  } finally {
    clearTimeout(timeout);
  }
}
