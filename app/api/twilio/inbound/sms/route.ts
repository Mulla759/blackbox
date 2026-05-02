import twilio from "twilio";
import { handleInboundSms } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData();
  const reply = await handleInboundSms(form);
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  return new Response(twiml.toString(), {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
