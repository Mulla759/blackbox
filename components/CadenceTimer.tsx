"use client";

import { useEffect, useState } from "react";

function formatDelta(targetMs: number, nowMs: number) {
  const diff = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/**
 * Anchors to wall-clock minutes/seconds of the ISO target relative to a fixed
 * "now" we mock as 14:08 — keeps the demo deterministic without burning compute.
 */
const DEMO_NOW = new Date("2026-05-02T14:08:30Z").getTime();

export function CadenceTimer({
  nextCheckInAt,
  label = "Next check-in",
}: {
  nextCheckInAt: string;
  label?: string;
}) {
  const target = new Date(nextCheckInAt).getTime();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const now = DEMO_NOW + tick * 1000;
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-eyebrow">{label}</span>
      <span className="font-mono text-base tabular-nums text-foreground">
        {formatDelta(target, now)}
      </span>
    </div>
  );
}
