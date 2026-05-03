import { findOrCreateContact, logCommunication } from "./repository";

function vapiHeaders() {
  const key = process.env["VAPI_API_KEY"]?.trim();
  if (!key) throw new Error("Missing VAPI_API_KEY");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function vapiPhoneNumberId() {
  const id =
    process.env["VAPI_PHONE_NUMBER_ID"]?.trim() ??
    process.env["VAPI_NUMBER_ID"]?.trim();

  if (!id) throw new Error("Missing VAPI_PHONE_NUMBER_ID");
  if (id.startsWith("+")) {
    throw new Error(
      "VAPI_PHONE_NUMBER_ID must be the Vapi phone-number UUID, not the visible phone number."
    );
  }
  return id;
}

function normalizePhone(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export async function startVapiCall(phone_number: string) {
  const assistantId = process.env["VAPI_ASSISTANT_ID"]?.trim();
  if (!assistantId) throw new Error("Missing VAPI_ASSISTANT_ID");

  const phoneNumberId = vapiPhoneNumberId();
  const normalizedPhone = normalizePhone(phone_number);
  if (!normalizedPhone) throw new Error("phone_number required");

  // Keep the Vapi agent as an add-on: the home page can call any entered number.
  // If the number exists in the dispatcher registry, we include its context.
  // If it is new/incomplete, we still place the call and let Vapi do the safety check.
  const { contact, needsIntake } = await findOrCreateContact(normalizedPhone);

  const language = contact.preferred_language ?? "English";
  const emergencyPrompt =
    "You are Lifeline, the BlackBox emergency-response voice agent. " +
    "Ask whether the person is safe right now. Listen for panic, emergency, help, support, danger, unsafe, hurt, injured, trapped, no power, medical device failure, medication issue, or any request for a human. " +
    "If any urgent keyword or panic condition appears, say that you are transferring the caller to a real person and use the configured transferCall tool. " +
    "Keep responses short, calm, and direct. Do not claim to be 911 or emergency services.";

  const payload = {
    assistantId,
    phoneNumberId,
    customer: {
      number: normalizedPhone,
      name: contact.full_name ?? "Lifeline contact",
    },
    metadata: {
      source: "blackbox-home-vapi-add-on",
      contact_id: contact.id,
      profile_complete: contact.profile_complete === 1,
      needs_intake: needsIntake,
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
          ? "Hola, soy Lifeline de BlackBox. Estoy llamando para verificar su seguridad. ¿Está a salvo ahora mismo?"
          : "This is Lifeline from BlackBox. I’m calling to check on your safety. Are you safe right now?",
      variableValues: {
        preferredLanguage: language,
        emergencyPrompt,
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
      phone_number: normalizedPhone,
      direction: "OUTBOUND",
      channel: "VAPI_VOICE",
      status: "failed",
      call_summary: err.slice(0, 500),
      language_used: language,
    });
    return { ok: false as const, error: `Vapi error: ${err.slice(0, 300)}` };
  }

  const data = (await res.json()) as { id?: string; status?: string };
  await logCommunication({
    contact_id: contact.id,
    phone_number: normalizedPhone,
    direction: "OUTBOUND",
    channel: "VAPI_VOICE",
    status: data.status ?? "queued",
    call_summary: needsIntake
      ? "Home-page Vapi add-on call started before full contact intake."
      : "Home-page Vapi add-on call started.",
    language_used: language,
  });

  return {
    ok: true as const,
    call_id: data.id,
    status: data.status,
    to: normalizedPhone,
    needs_intake: needsIntake,
  };
}
