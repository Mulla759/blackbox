import type { Tier } from "@/lib/types";

const LABEL: Record<Tier, string> = {
  stable: "STABLE",
  watch: "WATCH",
  critical: "CRITICAL",
  recovery: "RECOVERY",
};

const STYLES: Record<Tier, string> = {
  stable:
    "bg-transparent text-state-stable border-state-stable/40",
  watch:
    "bg-transparent text-state-watch border-state-watch/60",
  critical:
    "bg-state-critical text-accent-foreground border-state-critical pulse-critical",
  recovery:
    "bg-transparent text-state-recovery border-state-recovery/50",
};

export function StateBadge({
  tier,
  size = "md",
}: {
  tier: Tier;
  size?: "sm" | "md" | "lg";
}) {
  const sizing =
    size === "lg"
      ? "text-xs px-3 py-1.5"
      : size === "sm"
        ? "text-[10px] px-1.5 py-0.5"
        : "text-[11px] px-2 py-1";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-mono uppercase tracking-[0.18em] ${sizing} ${STYLES[tier]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {LABEL[tier]}
    </span>
  );
}
