import twilio from "twilio";
import { findOrCreateContact, logCommunication, updateContact } from "./repository";
import { templateForLanguage } from "./templates";

function twilioClient() {
  const sid = process.env["TWILIO_ACCOUNT_SID"]?.trim();
  const token = process.env["TWILIO_AUTH_TOKEN"]?.trim();
  if (!sid || !token) throw new Error("Missing Twilio credentials");
  return twilio(sid, token);
}

function fromPhone() {
  const from =
    process.env["TWILIO_VOICE_FROM_NUMBER"]?.trim() ??
    process.env["TWILIO_PHONE_NUMBER"]?.trim();
  if (!from) throw new Error("Missing TWILIO_VOICE_FROM_NUMBER/TWILIO_PHONE_NUMBER");
  return from;
}

function baseUrl() {
  return process.env["PUBLIC_APP_URL"]?.trim() ?? "https://blackbox-70gc.onrender.com";
}

export async function sendTwilioSms(phone_number: string, message?: string) {
  const { contact, needsIntake } = await findOrCreateContact(phone_number);
  if (needsIntake) {
    return { ok: false as const, needs_intake: true, error: "Contact intake required before outreach." };
  }
  if (contact.opted_out_sms) {
    return { ok: false as const, error: "Contact has opted out of SMS (STOP)." };
  }
  const body = message ?? templateForLanguage(contact.preferred_language);
  const client = twilioClient();
  const msg = await client.messages.create({
    to: contact.phone_number,
    from: process.env["TWILIO_PHONE_NUMBER"]?.trim() ?? fromPhone(),
    body,
  });
  await logCommunication({
    contact_id: contact.id,
    phone_number: contact.phone_number,
    direction: "OUTBOUND",
    channel: "TWILIO_SMS",
    status: msg.status ?? "queued",
    message_body: body,
    language_used: contact.preferred_language ?? "English",
  });
  return { ok: true as const, sid: msg.sid, status: msg.status };
}

export async function startTwilioCall(phone_number: string) {
  const { contact, needsIntake } = await findOrCreateContact(phone_number);
  if (needsIntake) {
    return { ok: false as const, needs_intake: true, error: "Contact intake required before calling." };
  }
  const client = twilioClient();
  const url = new URL("/api/twilio/inbound/voice", baseUrl());
  url.searchParams.set("contact_id", contact.id);
  const call = await client.calls.create({
    from: fromPhone(),
    to: contact.phone_number,
    url: url.toString(),
    method: "POST",
  });
  await logCommunication({
    contact_id: contact.id,
    phone_number: contact.phone_number,
    direction: "OUTBOUND",
    channel: "TWILIO_VOICE",
    status: call.status ?? "queued",
    language_used: contact.preferred_language ?? "English",
  });
  return { ok: true as const, sid: call.sid, status: call.status };
}

export async function handleInboundSms(form: FormData) {
  const from = String(form.get("From") ?? "");
  const body = String(form.get("Body") ?? "").trim();
  const { contact } = await findOrCreateContact(from);
  const upper = body.toUpperCase();

  if (upper === "STOP") {
    await updateContact(contact.id, { opted_out_sms: 1 });
    await logCommunication({
      contact_id: contact.id,
      phone_number: contact.phone_number,
      direction: "INBOUND",
      channel: "TWILIO_SMS",
      status: "received",
      message_body: body,
      language_used: contact.preferred_language ?? "English",
    });
    return "You are opted out from future SMS. Reply START to re-enable.";
  }
  if (upper === "START") {
    await updateContact(contact.id, { opted_out_sms: 0 });
    return "SMS notifications re-enabled.";
  }
  if (upper === "HELP") {
    await logCommunication({
      contact_id: contact.id,
      phone_number: contact.phone_number,
      direction: "INBOUND",
      channel: "TWILIO_SMS",
      status: "received",
      message_body: body,
      language_used: contact.preferred_language ?? "English",
    });
    return "Emergency support: reply 1 safe, 2 need help, 3 emergency. Call 911 for immediate danger.";
  }

  await logCommunication({
    contact_id: contact.id,
    phone_number: contact.phone_number,
    direction: "INBOUND",
    channel: "TWILIO_SMS",
    status: "received",
    message_body: body,
    language_used: contact.preferred_language ?? "English",
  });
  return "Message received. Dispatch is reviewing your update.";
}
