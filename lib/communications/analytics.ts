import { extractAreaCode } from "./phone";
import { getSmsProvider } from "./resolve-sms-provider";
import { exportCommunicationSnapshot } from "./store";
import type { CommunicationLogRecord, SafetyCheckResponse } from "./types";

export type CommunicationAnalytics = {
  provider: string;
  summary: {
    outbound_sms: number;
    inbound_sms: number;
    outbound_voice_attempts: number;
    failed_outbound: number;
    replies_safe: number;
    replies_needs_help: number;
    replies_emergency: number;
    replies_unknown: number;
  };
  /** Reply counts grouped by linked disaster event name (proxy for incident load). */
  responses_by_disaster_event: Record<string, number>;
  area_code_counts: Record<string, number>;
  recent_logs: CommunicationLogRecord[];
  responses: SafetyCheckResponse[];
};

export function buildCommunicationAnalytics(): CommunicationAnalytics {
  const { logs, responses } = exportCommunicationSnapshot();
  const provider = getSmsProvider().name;

  let outbound_sms = 0;
  let inbound_sms = 0;
  let outbound_voice_attempts = 0;

  for (const row of logs) {
    if (row.channel === "sms" && row.direction === "outbound") outbound_sms += 1;
    if (row.channel === "sms" && row.direction === "inbound") inbound_sms += 1;
    if (row.channel === "voice" && row.direction === "outbound") outbound_voice_attempts += 1;
  }

  const failed_outbound = logs.filter(
    (r) =>
      r.direction === "outbound" &&
      r.provider !== "voice_placeholder" &&
      (r.delivery_status === "failed" || Boolean(r.error))
  ).length;

  let replies_safe = 0;
  let replies_needs_help = 0;
  let replies_emergency = 0;
  let replies_unknown = 0;

  for (const r of responses) {
    if (r.response_type === "safe") replies_safe += 1;
    else if (r.response_type === "needs_help") replies_needs_help += 1;
    else if (r.response_type === "emergency") replies_emergency += 1;
    else replies_unknown += 1;
  }

  const area_code_counts: Record<string, number> = {};
  for (const r of responses) {
    const ac = extractAreaCode(r.phone_number);
    if (!ac) continue;
    area_code_counts[ac] = (area_code_counts[ac] ?? 0) + 1;
  }

  const responses_by_disaster_event: Record<string, number> = {};
  for (const r of responses) {
    const label = r.disaster_event_name || "Unknown event";
    responses_by_disaster_event[label] = (responses_by_disaster_event[label] ?? 0) + 1;
  }

  return {
    provider,
    summary: {
      outbound_sms,
      inbound_sms,
      outbound_voice_attempts,
      failed_outbound,
      replies_safe,
      replies_needs_help,
      replies_emergency,
      replies_unknown,
    },
    responses_by_disaster_event,
    area_code_counts,
    recent_logs: logs.slice(0, 300),
    responses: responses.slice(0, 500),
  };
}
