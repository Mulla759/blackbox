import type { DispatcherCase, EscalationPacket } from "./types";

type TribeStoreState = {
  packets: EscalationPacket[];
  cases: DispatcherCase[];
};

const KEY = "__BLACKBOX_TRIBE_V2_STORE__";
const MAX_ROWS = 1000;

function state(): TribeStoreState {
  const g = globalThis as unknown as Record<string, TribeStoreState | undefined>;
  if (!g[KEY]) {
    g[KEY] = {
      packets: [],
      cases: [],
    };
  }
  return g[KEY]!;
}

export function upsertDispatcherCase(row: DispatcherCase): DispatcherCase {
  const s = state();
  const idx = s.cases.findIndex((c) => c.id === row.id);
  if (idx >= 0) s.cases[idx] = row;
  else s.cases.unshift(row);
  if (s.cases.length > MAX_ROWS) s.cases.length = MAX_ROWS;
  return row;
}

export function appendEscalationPacket(packet: EscalationPacket): EscalationPacket {
  const s = state();
  s.packets.unshift(packet);
  if (s.packets.length > MAX_ROWS) s.packets.length = MAX_ROWS;
  return packet;
}

export function listDispatcherCases(): DispatcherCase[] {
  return [...state().cases];
}

export function listEscalationPackets(): EscalationPacket[] {
  return [...state().packets];
}

