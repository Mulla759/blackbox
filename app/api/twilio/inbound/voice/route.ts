import twilio from "twilio";
import { getContactById, logCommunication } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const contactId = url.searchParams.get("contact_id")?.trim();
  const contact = contactId ? await getContactById(contactId) : null;
  const twiml = new twilio.twiml.VoiceResponse();
  const lang = (contact?.preferred_language ?? "english").toLowerCase();
  const spanish = lang.includes("spanish");
  const somali = lang.includes("somali");
  const message = spanish
    ? "Hola, este es BlackBox. Estamos verificando su seguridad. Si necesita ayuda inmediata, por favor diga o marque 3."
    : somali
      ? "Salaan, kani waa BlackBox. Waxaan hubineynaa badbaadadaada. Haddii aad u baahan tahay gargaar degdeg ah, fadlan dheh ama guji 3."
      : "Hello, this is BlackBox checking your safety. If you need immediate help, please say or press 3.";
  twiml.say({ voice: "alice" }, message);
  twiml.hangup();

  if (contact) {
    await logCommunication({
      contact_id: contact.id,
      phone_number: contact.phone_number,
      direction: "INBOUND",
      channel: "TWILIO_VOICE",
      status: "answered",
      call_summary: "Twilio inbound voice instruction played.",
      language_used: contact.preferred_language ?? "English",
    });
  }
  return new Response(twiml.toString(), {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
