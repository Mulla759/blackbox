import twilio from "twilio";
import { appendCommunicationLog, appendSafetyResponse } from "@/lib/communications/store";
import { normalizePhoneNumber } from "@/lib/communications/phone";
import { getPublicAppBaseUrl } from "@/lib/communications/public-app-url";
import { getActiveDisasterTypesForState } from "@/lib/disaster";
import { resolveTribeDisasterIdForScoring } from "@/lib/communications/tribe-context";
import { evaluateSignal } from "@/lib/tribe-v2";

export const dynamic = "force-dynamic";

function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function buildStageAction(
  stage: string,
  phone: string,
  eventId: string,
  eventName: string,
  extras?: Record<string, string>
): string {
  const next = new URL("/api/communications/voice/wellness/gather", getPublicAppBaseUrl());
  next.searchParams.set("stage", stage);
  next.searchParams.set("phone", phone);
  next.searchParams.set("event_id", eventId);
  next.searchParams.set("event_name", eventName);
  for (const [k, v] of Object.entries(extras ?? {})) {
    next.searchParams.set(k, v);
  }
  return next.toString();
}

function responseTypeFromDigit(digits: string): "safe" | "needs_help" | "emergency" | "unknown" {
  if (digits === "1") return "needs_help";
  if (digits === "2") return "safe";
  if (digits === "3") return "emergency";
  return "unknown";
}

function finalStatusMessage(responseType: "safe" | "needs_help" | "emergency" | "unknown"): string {
  if (responseType === "needs_help") return "Thank you. We recorded that you need help and will escalate support.";
  if (responseType === "safe") return "Thank you. We recorded that you are currently safe.";
  if (responseType === "emergency") return "Emergency recorded. We are escalating immediately.";
  return "Thank you for checking in with Blackbox.";
}

async function aiStatusMessage(params: {
  responseType: "safe" | "needs_help" | "emergency" | "unknown";
  eventName: string;
  callerPhone: string;
}): Promise<string> {
  const key = process.env["GEMINI_API_KEY"]?.trim();
  const fallback = finalStatusMessage(params.responseType);
  if (!key) return fallback;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    const res = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "Write one calm emergency IVR sentence (max 25 words). Use aggregate language only. " +
                  `Response type: ${params.responseType}. Event: ${params.eventName}.`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 80 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return fallback;
    const payload = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ??
      "";
    return text || fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

function escalationPhoneNumber(): string {
  const configured = process.env["ESCALATION_PHONE_NUMBER"]?.trim();
  const raw = configured || "+6124331186";
  const normalized = normalizePhoneNumber(raw);
  // Keep current requested default while also handling common missing-country-code input.
  if (normalized === "+6124331186") return "+16124331186";
  return normalized;
}

function twilioCallerId(): string | undefined {
  const from =
    process.env["TWILIO_VOICE_FROM_NUMBER"]?.trim() ??
    process.env["TWILIO_PHONE_NUMBER"]?.trim();
  return from ? normalizePhoneNumber(from) : undefined;
}

function appendEscalationBridge(
  twiml: twilio.twiml.VoiceResponse,
  params: {
    responseType: "safe" | "needs_help" | "emergency" | "unknown";
    callerPhone: string;
    eventId: string;
    eventName: string;
  }
): void {
  if (params.responseType !== "needs_help" && params.responseType !== "emergency") {
    twiml.hangup();
    return;
  }

  const escalationTo = escalationPhoneNumber();
  const callerId = twilioCallerId();
  appendCommunicationLog({
    channel: "voice",
    direction: "outbound",
    phone_number: escalationTo,
    body: `Escalation bridge requested for caller ${params.callerPhone}.`,
    provider: "twilio_voice",
    delivery_status: "queued",
    disaster_event_id: params.eventId,
    disaster_event_name: params.eventName,
  });

  twiml.say({ voice: "alice" }, "Please hold while we connect you to the Blackbox response lead now.");
  const dial = callerId
    ? twiml.dial({ callerId, answerOnBridge: true, timeout: 22 })
    : twiml.dial({ answerOnBridge: true, timeout: 22 });
  dial.number(escalationTo);
  twiml.say(
    { voice: "alice" },
    "We could not reach the response lead right now. If this is life threatening, call 9 1 1 immediately."
  );
  twiml.hangup();
}

async function evaluateVoiceCheckpoint(params: {
  phone: string;
  responseType: "safe" | "needs_help" | "emergency" | "unknown";
  eventId: string;
  eventName: string;
  raw: string;
  suffix?: string;
}) {
  const statusText =
    params.responseType === "needs_help"
      ? "needs help"
      : params.responseType === "emergency"
        ? "emergency"
        : params.responseType === "safe"
          ? "safe"
          : "unknown";
  await evaluateSignal({
    phone_number: params.phone,
    channel: "voice",
    transcript: `Voice check-in response: ${statusText}. ${params.suffix ?? ""} Raw input: ${params.raw}`,
    disaster_id: resolveTribeDisasterIdForScoring(params.eventId),
    disaster_name: params.eventName,
  });
}

const KEYPAD_GROUPS: Record<string, string> = {
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
};

function decodeLetterPair(key: string, pos: string): string | null {
  const group = KEYPAD_GROUPS[key];
  if (!group) return null;
  const idx = Number(pos) - 1;
  if (!Number.isInteger(idx) || idx < 0 || idx >= group.length) return null;
  return group[idx] ?? null;
}

function decodeStateAbbrFromDigits(input: string): string | null {
  const digits = input.trim();
  if (!/^\d{4}$/.test(digits)) return null;
  const first = decodeLetterPair(digits[0] ?? "", digits[1] ?? "");
  const second = decodeLetterPair(digits[2] ?? "", digits[3] ?? "");
  if (!first || !second) return null;
  return `${first}${second}`;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const stage = url.searchParams.get("stage") ?? "primary";
    const phone = normalizePhoneNumber(url.searchParams.get("phone") ?? "");
    const eventId = url.searchParams.get("event_id") ?? "wellness-check";
    const eventName = url.searchParams.get("event_name") ?? "Wellness check";

    const form = await req.formData();
    const digits = typeof form.get("Digits") === "string" ? String(form.get("Digits")) : "";
    const raw = digits || "(no input)";

    appendCommunicationLog({
      channel: "voice",
      direction: "inbound",
      phone_number: phone,
      body: `Stage ${stage}: ${raw}`,
      provider: "twilio_voice",
      delivery_status: "delivered",
      disaster_event_id: eventId,
      disaster_event_name: eventName,
    });

    const twiml = new twilio.twiml.VoiceResponse();

    if (stage === "primary") {
      const responseType = responseTypeFromDigit(digits);

      appendSafetyResponse({
        phone_number: phone,
        response_type: responseType,
        disaster_event_id: eventId,
        disaster_event_name: eventName,
        raw_message: raw,
      });

      await evaluateVoiceCheckpoint({
        phone,
        responseType,
        eventId,
        eventName,
        raw,
      });

      if (responseType === "unknown") {
        twiml.say({ voice: "alice" }, "Sorry, I could not understand your response. Please call again and use 1, 2, or 3.");
        twiml.hangup();
        return xmlResponse(twiml.toString());
      }

      twiml.say({ voice: "alice" }, finalStatusMessage(responseType));
      const gather = twiml.gather({
        numDigits: 4,
        input: ["dtmf"],
        action: buildStageAction("state_collect", phone, eventId, eventName, {
          response_type: responseType,
        }),
        method: "POST",
      });
      gather.say(
        { voice: "alice" },
        "Now enter your two letter state code using keypad letter positions. For each letter, press the number key then the letter position. Example: M N is 6 1 6 2. Enter four digits now."
      );
      twiml.say({ voice: "alice" }, "No state code received. Please call again to complete location check in.");
      twiml.hangup();
      return xmlResponse(twiml.toString());
    }

    if (stage === "state_collect" || stage === "state_collect_retry") {
      const responseType =
        (url.searchParams.get("response_type") as
          | "safe"
          | "needs_help"
          | "emergency"
          | "unknown") ?? "unknown";
      const state = decodeStateAbbrFromDigits(digits);
      const isRetry = stage === "state_collect_retry";

      if (!state) {
        if (isRetry) {
          twiml.say(
            { voice: "alice" },
            "Sorry, state code was not recognized. We will continue without state-specific disaster matching."
          );
          twiml.hangup();
          return xmlResponse(twiml.toString());
        }
        const retryGather = twiml.gather({
          numDigits: 4,
          input: ["dtmf"],
          action: buildStageAction("state_collect_retry", phone, eventId, eventName, {
            response_type: responseType,
          }),
          method: "POST",
        });
        retryGather.say(
          { voice: "alice" },
          "I could not decode that state abbreviation. Try once more. Enter four digits, two per letter."
        );
        twiml.say({ voice: "alice" }, "No valid state code received. Goodbye.");
        twiml.hangup();
        return xmlResponse(twiml.toString());
      }

      twiml.say({ voice: "alice" }, `State recorded as ${state}.`);
      const gather = twiml.gather({
        numDigits: 1,
        input: ["dtmf"],
        action: buildStageAction("active_disaster_check", phone, eventId, eventName, {
          state,
          response_type: responseType,
        }),
        method: "POST",
      });
      gather.say(
        { voice: "alice" },
        "Are you currently in an active disaster in your state? Press 1 for yes or 2 for no."
      );
      twiml.say({ voice: "alice" }, "No answer received. Goodbye.");
      twiml.hangup();
      return xmlResponse(twiml.toString());
    }

    if (stage === "active_disaster_check") {
      const state = (url.searchParams.get("state") ?? "").toUpperCase();
      const responseType =
        (url.searchParams.get("response_type") as
          | "safe"
          | "needs_help"
          | "emergency"
          | "unknown") ?? "unknown";

      if (digits === "2") {
        twiml.say({ voice: "alice" }, "Understood. No active disaster reported for your location.");
        twiml.say(
          { voice: "alice" },
          await aiStatusMessage({ responseType, eventName, callerPhone: phone })
        );
        appendEscalationBridge(twiml, {
          responseType,
          callerPhone: phone,
          eventId,
          eventName,
        });
        return xmlResponse(twiml.toString());
      }

      if (digits !== "1") {
        twiml.say({ voice: "alice" }, "Invalid selection. Please call again and press 1 for yes or 2 for no.");
        twiml.hangup();
        return xmlResponse(twiml.toString());
      }

      const likely = await getActiveDisasterTypesForState(state, 9);
      if (likely.length === 0) {
        twiml.say(
          { voice: "alice" },
          `I could not find active state level alerts for ${state} right now.`
        );
        twiml.say(
          { voice: "alice" },
          await aiStatusMessage({ responseType, eventName, callerPhone: phone })
        );
        appendEscalationBridge(twiml, {
          responseType,
          callerPhone: phone,
          eventId,
          eventName,
        });
        return xmlResponse(twiml.toString());
      }

      const menuAction = buildStageAction("disaster_select", phone, eventId, eventName, {
        state,
        response_type: responseType,
      });
      const menuUrl = new URL(menuAction);
      likely.forEach((event, idx) => {
        menuUrl.searchParams.set(`opt${idx + 1}`, event);
      });

      const gather = twiml.gather({
        numDigits: 1,
        input: ["dtmf"],
        action: menuUrl.toString(),
        method: "POST",
      });
      const spoken = likely.map((event, idx) => `press ${idx + 1} for ${event}`).join(", ");
      gather.say({ voice: "alice" }, `Select the most likely active disaster: ${spoken}.`);
      twiml.say({ voice: "alice" }, "No disaster selected. Goodbye.");
      twiml.hangup();
      return xmlResponse(twiml.toString());
    }

    if (stage === "disaster_select") {
      const responseType =
        (url.searchParams.get("response_type") as
          | "safe"
          | "needs_help"
          | "emergency"
          | "unknown") ?? "unknown";
      const selection = Number(digits);
      const selected =
        Number.isInteger(selection) && selection >= 1 && selection <= 9
          ? url.searchParams.get(`opt${selection}`) ?? ""
          : "";

      if (!selected) {
        twiml.say({ voice: "alice" }, "No valid disaster option selected.");
        twiml.say(
          { voice: "alice" },
          await aiStatusMessage({ responseType, eventName, callerPhone: phone })
        );
        appendEscalationBridge(twiml, {
          responseType,
          callerPhone: phone,
          eventId,
          eventName,
        });
        return xmlResponse(twiml.toString());
      }

      appendCommunicationLog({
        channel: "voice",
        direction: "inbound",
        phone_number: phone,
        body: `Selected disaster type: ${selected}`,
        provider: "twilio_voice",
        delivery_status: "delivered",
        disaster_event_id: eventId,
        disaster_event_name: selected,
      });

      await evaluateVoiceCheckpoint({
        phone,
        responseType,
        eventId,
        eventName: selected,
        raw,
        suffix: `Caller selected active disaster type: ${selected}.`,
      });

      twiml.say({ voice: "alice" }, `You selected ${selected}.`);
      twiml.say(
        { voice: "alice" },
        await aiStatusMessage({ responseType, eventName: selected, callerPhone: phone })
      );
      appendEscalationBridge(twiml, {
        responseType,
        callerPhone: phone,
        eventId,
        eventName: selected,
      });
      return xmlResponse(twiml.toString());
    }

    twiml.say({ voice: "alice" }, "Call flow stage was not recognized. Please try again.");
    twiml.hangup();
    return xmlResponse(twiml.toString());
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unexpected error";
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(
      { voice: "alice" },
      "Blackbox hit a temporary error processing your reply. Please try calling again shortly."
    );
    twiml.hangup();
    console.error("[voice/wellness/gather]", detail);
    return xmlResponse(twiml.toString());
  }
}
