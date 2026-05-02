export type SafetyResponseType = "safe" | "needs_help" | "emergency" | "unknown";

export type DeliveryStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "unknown";

/** Parsed inbound SMS mapped to workflow semantics. */
export type SafetyCheckResponse = {
  id: string;
  phone_number: string;
  response_type: SafetyResponseType;
  timestamp: string;
  disaster_event_id: string;
  disaster_event_name: string;
  raw_message: string;
};

/** Unified timeline for analytics / dispatchers. */
export type CommunicationLogRecord = {
  id: string;
  timestamp: string;
  channel: "sms" | "voice";
  direction: "outbound" | "inbound";
  phone_number: string;
  /** Outbound text or inbound raw body. */
  body?: string;
  disaster_event_id?: string;
  disaster_event_name?: string;
  delivery_status?: DeliveryStatus;
  /** Set for inbound rows after parsing. */
  response_type?: SafetyResponseType;
  provider: string;
  provider_message_id?: string;
  error?: string;
};

export type SendMessageResult = {
  log_id: string;
  delivery_status: DeliveryStatus;
  provider_message_id?: string;
  error?: string;
  /** twilio | simulated | … — simulated sends no carrier SMS. */
  provider: string;
};
