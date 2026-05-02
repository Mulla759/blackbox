import { findOrCreateContact, logCommunication } from "./repository";

function vapiHeaders() {
  const key = process.env["VAPI_API_KEY"]?.trim();
  if (!key) throw new Error("Missing VAPI_API_KEY");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function voiceFromPhone() {
  const from =
    process.env["TWILIO_VOICE_FROM_NUMBER"]?.trim() ??
    process.env["TWILIO_PHONE_NUMBER"]?.trim();
  if (!from) throw new Error("Missing TWILIO_VOICE_FROM_NUMBER/TWILIO_PHONE_NUMBER");
  return from;
}

export async function startVapiCall(phone_number: string) {
  const assistantId = process.env["VAPI_ASSISTANT_ID"]?.trim();
  if (!assistantId) throw new Error("Missing VAPI_ASSISTANT_ID");
  const { contact, needsIntake } = await findOrCreateContact(phone_number);
  if (needsIntake) {
    return { ok: false as const, needs_intake: true, error: "Contact intake form is required before Vapi call." };
  }

  const language = contact.preferred_language ?? "English";
  const prompt =
    "You are an emergency response assistant. Speak in the contact's preferred language. " +
    "Ask if they are safe, whether they need medical help, transportation, shelter, mobility assistance, power for medical equipment, or other urgent support. " +
    "Keep the call calm, short, and clear. Summarize the response for dispatchers. Do not diagnose medical conditions.";

  const payload = {
    assistantId,
    customer: {
      number: contact.phone_number,
      name: contact.full_name ?? "Unknown contact",
    },
    phoneNumberId: undefined,
    phoneNumber: {
      twilioPhoneNumber: voiceFromPhone(),
    },
    metadata: {
      contact_id: contact.id,
      preferred_language: language,
      address: contact.address,
      city: contact.city,
      state: contact.state,
      accessibility_needs: contact.accessibility_needs,
      notes: contact.notes,
    },
    assistantOverrides: {
      firstMessage:
        language.toLowerCase().includes("spanish")
          ? "Hola, soy un asistente de respuesta de emergencia de BlackBox. Quiero verificar su seguridad."
          : "Hello, this is BlackBox emergency response assistant calling to check on your safety.",
      variableValues: {
        preferredLanguage: language,
        emergencyPrompt: prompt,
      },
    },
  };

  const res = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: vapiHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    await logCommunication({
      contact_id: contact.id,
      phone_number: contact.phone_number,
      direction: "OUTBOUND",
      channel: "VAPI_VOICE",
      status: "failed",
      call_summary: err.slice(0, 500),
      language_used: language,
    });
    return { ok: false as const, error: `Vapi error: ${err.slice(0, 200)}` };
  }
  const data = (await res.json()) as { id?: string; status?: string };
  await logCommunication({
    contact_id: contact.id,
    phone_number: contact.phone_number,
    direction: "OUTBOUND",
    channel: "VAPI_VOICE",
    status: data.status ?? "queued",
    language_used: language,
  });
  return { ok: true as const, call_id: data.id, status: data.status };
}
