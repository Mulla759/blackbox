import type {
  CommunicationLogRecord,
  SafetyCheckResponse,
} from "./types";
import { normalizePhoneNumber } from "./phone";
import { WELLNESS_EVENT_ID } from "./wellness-constants";

type DisasterContext = {
  disaster_event_id: string;
  disaster_event_name: string;
};

type CommunicationStoreState = {
  logs: CommunicationLogRecord[];
  responses: SafetyCheckResponse[];
  /** Last outbound disaster linkage per recipient (for inbound SMS matching). */
  phoneContext: Map<string, DisasterContext>;
};

const STORE_KEY = "__BLACKBOX_COMMUNICATIONS_STORE__";

function getState(): CommunicationStoreState {
  const g = globalThis as unknown as Record<string, CommunicationStoreState | undefined>;
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = {
      logs: [],
      responses: [],
      phoneContext: new Map(),
    };
  }
  return g[STORE_KEY];
}

const MAX_LOGS = 2500;
const MAX_RESPONSES = 5000;

export function appendCommunicationLog(
  entry: Omit<CommunicationLogRecord, "id" | "timestamp">
): CommunicationLogRecord {
  const row: CommunicationLogRecord = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const s = getState();
  s.logs.unshift(row);
  if (s.logs.length > MAX_LOGS) s.logs.length = MAX_LOGS;
  return row;
}

export function appendSafetyResponse(
  entry: Omit<SafetyCheckResponse, "id" | "timestamp">
): SafetyCheckResponse {
  const row: SafetyCheckResponse = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const s = getState();
  s.responses.unshift(row);
  if (s.responses.length > MAX_RESPONSES) s.responses.length = MAX_RESPONSES;
  return row;
}

export function attachOutboundDisasterContext(
  phone_number: string,
  disaster_event_id: string,
  disaster_event_name: string
): void {
  const phone = normalizePhoneNumber(phone_number);
  getState().phoneContext.set(phone, {
    disaster_event_id,
    disaster_event_name,
  });
}

export function getDisasterContextForPhone(
  phone_number: string
): DisasterContext | undefined {
  return getState().phoneContext.get(normalizePhoneNumber(phone_number));
}

export function exportCommunicationSnapshot(): {
  logs: CommunicationLogRecord[];
  responses: SafetyCheckResponse[];
} {
  const s = getState();
  return { logs: [...s.logs], responses: [...s.responses] };
}

/** Newest wellness reply at or after `sinceIso` (for polling after a send). */
export function getLatestWellnessReplyAfter(
  phone_number: string,
  sinceIso: string
): SafetyCheckResponse | null {
  const phone = normalizePhoneNumber(phone_number);
  const sinceMs = Date.parse(sinceIso);
  if (Number.isNaN(sinceMs)) return null;
  const { responses } = getState();
  for (const r of responses) {
    if (normalizePhoneNumber(r.phone_number) !== phone) continue;
    if (r.disaster_event_id !== WELLNESS_EVENT_ID) continue;
    if (Date.parse(r.timestamp) < sinceMs) continue;
    return r;
  }
  return null;
}

/** Conversation rows (SMS + voice) for one number, oldest → newest. */
export function getConversationThreadForPhone(phone_number: string): Array<{
  id: string;
  timestamp: string;
  channel: "sms" | "voice";
  direction: "outbound" | "inbound";
  body: string;
  delivery_status?: string;
}> {
  const phone = normalizePhoneNumber(phone_number);
  const rows = getState().logs.filter(
    (row) => normalizePhoneNumber(row.phone_number) === phone
  );
  rows.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    channel: row.channel,
    direction: row.direction as "outbound" | "inbound",
    body: row.body ?? "",
    delivery_status: row.delivery_status,
  }));
}
