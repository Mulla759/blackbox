import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findContactByPhone,
  findOrCreateContact,
  updateContact,
  logCommunication,
  recentLogs,
  searchContacts,
} from "@/lib/dispatch/repository";
import { recommendCommunicationChannel } from "@/lib/dispatch/channel";
import { templateForLanguage } from "@/lib/dispatch/templates";
import { handleInboundSms, sendTwilioSms, startTwilioCall } from "@/lib/dispatch/twilio";
import { startVapiCall } from "@/lib/dispatch/vapi";

vi.mock("twilio", () => {
  const messagesCreate = vi.fn(async () => ({ sid: "SM123", status: "queued" }));
  const callsCreate = vi.fn(async () => ({ sid: "CA123", status: "queued" }));
  const fn = vi.fn(() => ({
    messages: { create: messagesCreate },
    calls: { create: callsCreate },
  }));
  return { default: fn };
});

describe("dispatcher communication system", () => {
  beforeEach(() => {
    process.env["TWILIO_ACCOUNT_SID"] = "AC_test";
    process.env["TWILIO_AUTH_TOKEN"] = "token";
    process.env["TWILIO_PHONE_NUMBER"] = "+16125559999";
    process.env["TWILIO_VOICE_FROM_NUMBER"] = "+16125559999";
    process.env["PUBLIC_APP_URL"] = "https://example.test";
    process.env["VAPI_API_KEY"] = "vapi_key";
    process.env["VAPI_ASSISTANT_ID"] = "1d54238a-39e4-4931-8fcb-c651f4fd1337";
    process.env["VAPI_PHONE_NUMBER_ID"] = "11111111-2222-3333-4444-555555555555";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("contact lookup by phone number works", async () => {
    const maria = await findContactByPhone("+16125550101");
    expect(maria?.full_name).toBe("Maria Lopez");
  });

  it("new contact intake is required for unknown number", async () => {
    const out = await findOrCreateContact("+16125558888");
    expect(out.needsIntake).toBe(true);
    expect(out.contact.profile_complete).toBe(0);
  });

  it("deaf/hard-of-hearing contacts recommend SMS", async () => {
    const sarah = await findContactByPhone("+16125550104");
    expect(sarah).toBeTruthy();
    const rec = recommendCommunicationChannel(sarah!);
    expect(rec.recommended).toBe("TWILIO_SMS");
  });

  it("spanish contacts get spanish template", () => {
    expect(templateForLanguage("Spanish")).toContain("Alerta de emergencia");
  });

  it("twilio sms send function succeeds for completed contact", async () => {
    const maria = await findContactByPhone("+16125550101");
    if (maria?.id) await updateContact(maria.id, { opted_out_sms: 0 });
    const out = await sendTwilioSms("+16125550101");
    expect(out.ok).toBe(true);
  });

  it("twilio voice call function succeeds for completed contact", async () => {
    const out = await startTwilioCall("+16125550103");
    expect(out.ok).toBe(true);
  });

  it("vapi call receives language context from contact profile", async () => {
    const fetchMock = vi.fn(async (_u: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        metadata?: { preferred_language?: string };
      };
      expect(body.metadata?.preferred_language?.toLowerCase()).toContain("spanish");
      return new Response(JSON.stringify({ id: "vapi_1", status: "queued" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const out = await startVapiCall("+16125550101");
    expect(out.ok).toBe(true);
  });

  it("communication logs are saved", async () => {
    await logCommunication({
      phone_number: "+16125550101",
      direction: "OUTBOUND",
      channel: "TWILIO_SMS",
      status: "queued",
      message_body: "test",
    });
    const logs = await recentLogs(20);
    expect(logs.length).toBeGreaterThan(0);
  });

  it("STOP opt-out prevents future SMS", async () => {
    const form = new FormData();
    form.set("From", "+16125550101");
    form.set("Body", "STOP");
    await handleInboundSms(form);
    const out = await sendTwilioSms("+16125550101");
    expect(out.ok).toBe(false);
  });

  it("search by language and accessibility need works", async () => {
    const byLang = await searchContacts({ language: "Somali" });
    expect(byLang.some((x) => x.full_name === "Ahmed Hassan")).toBe(true);
    const byNeed = await searchContacts({ accessibility_need: "mobility" });
    expect(byNeed.some((x) => x.full_name === "Maria Lopez")).toBe(true);
  });
});
