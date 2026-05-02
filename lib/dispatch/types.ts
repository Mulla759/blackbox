export type Channel =
  | "TWILIO_SMS"
  | "TWILIO_VOICE"
  | "VAPI_VOICE";

export type Direction = "OUTBOUND" | "INBOUND";

export type ContactRecord = {
  id: string;
  full_name: string | null;
  phone_number: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  preferred_language: string | null;
  accessibility_needs: string | null;
  is_deaf_or_hard_of_hearing: number;
  requires_interpreter: number;
  interpreter_language: string | null;
  prefers_sms: number;
  prefers_voice: number;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  opted_out_sms: number;
  profile_complete: number;
  created_at: string;
  updated_at: string;
};

export type ResponderRecord = {
  id: string;
  full_name: string;
  phone_number: string;
  role: string;
  preferred_language: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunicationLogRecord = {
  id: string;
  contact_id: string | null;
  phone_number: string;
  direction: Direction;
  channel: Channel;
  status: string;
  message_body: string | null;
  call_summary: string | null;
  language_used: string | null;
  created_at: string;
};
